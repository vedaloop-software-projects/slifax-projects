import type { Prisma, PrismaClient } from "@prisma/client";
import { businessDayRange } from "../system/business-time.ts";
import type { Account } from "../auth/contracts.ts";
import type { KotItem, KotStore, ReservationInput } from "./contracts.ts";
type Db = PrismaClient | Prisma.TransactionClient;
const n = (v: unknown) => Number(v),
  day = (d: Date) => {
    const x = new Date(d);
    x.setUTCHours(0, 0, 0, 0);
    return x;
  },
  statusName = (x: number) =>
    ["Unknown", "Pending", "Preparing", "Ready", "Served", "Cancelled"][x] ??
    "Unknown";
export class PrismaKotStore implements KotStore {
  private readonly p: PrismaClient;
  constructor(p: PrismaClient) {
    this.p = p;
  }
  async categories(c: bigint, l: number) {
    const rows = await this.p.categories.findMany({
        where: { client_id: c, status: 1, trash: 0 },
        orderBy: { category_name: "asc" },
        take: l + 1,
      }),
      subs = await this.p.subCategories.findMany({
        where: {
          client_id: c,
          category_id: { in: rows.slice(0, l).map((x) => x.id) },
          status: 1,
          trash: 0,
        },
        orderBy: { sub_category_name: "asc" },
      });
    return {
      rows: rows
        .slice(0, l)
        .map((x) => ({
          id: n(x.id),
          categoryCode: x.category_code,
          categoryName: x.category_name,
          printerPath: x.printer_path,
          subCategoryCount: subs.filter((y) => y.category_id === x.id).length,
          subCategories: subs
            .filter((y) => y.category_id === x.id)
            .map((y) => ({
              id: n(y.id),
              subCategoryCode: y.sub_category_code,
              subCategoryName: y.sub_category_name,
            })),
        })),
      truncated: rows.length > l,
    };
  }
  async products(
    c: bigint,
    f: { search?: string; categoryId?: bigint; subCategoryId?: bigint },
    l: number,
  ) {
    const where: Prisma.ProductsWhereInput = {
        client_id: c,
        status: 1,
        trash: 0,
        ...(f.categoryId ? { category_id: f.categoryId } : {}),
        ...(f.subCategoryId ? { sub_category_id: f.subCategoryId } : {}),
        ...(f.search
          ? {
              OR: [
                { product_full_name: { contains: f.search } },
                { product_short_name: { contains: f.search } },
                { product_code: { contains: f.search } },
              ],
            }
          : {}),
      },
      rows = await this.p.products.findMany({
        where,
        orderBy: { product_full_name: "asc" },
        take: l + 1,
      }),
      variants = await this.p.productVariants.findMany({
        where: {
          client_id: c,
          product_id: { in: rows.slice(0, l).map((x) => x.id) },
          status: 1,
          trash: 0,
        },
        orderBy: { priority: "asc" },
      }),
      units = await this.p.unitTypes.findMany({
        where: {
          client_id: c,
          id: {
            in: rows.flatMap((x) => (x.unit_type_id ? [x.unit_type_id] : [])),
          },
        },
      });
    return {
      rows: rows.slice(0, l).flatMap((x) => {
        const v = variants.find((y) => y.product_id === x.id);
        if (!v) return [];
        return [
          {
            productId: n(x.id),
            productCode: x.product_code,
            productFullName: x.product_full_name,
            productShortName: x.product_short_name,
            image: x.product_image,
            unitTypeId: x.unit_type_id ? n(x.unit_type_id) : null,
            unitTypeName:
              units.find((y) => y.id === x.unit_type_id)?.unit_type_name ??
              null,
            variantId: n(v.id),
            packSize: v.pack_size,
            salePrice: n(v.sale_price),
            costPrice: n(v.cost_price),
            mrp: n(v.mrp),
            wholeSalePrice: n(v.whole_sale_price),
            dineInPrice: n(v.dine_in_price),
            takeAwayPrice: n(v.take_away_price),
          },
        ];
      }),
      truncated: rows.length > l,
    };
  }
  async variants(c: bigint, p: bigint, l: number) {
    if (
      !(await this.p.products.findFirst({
        where: { id: p, client_id: c, status: 1, trash: 0 },
      }))
    )
      return null;
    return (
      await this.p.productVariants.findMany({
        where: { client_id: c, product_id: p, status: 1, trash: 0 },
        orderBy: { priority: "asc" },
        take: l,
      })
    ).map((v) => ({
      variantId: n(v.id),
      packSize: v.pack_size,
      salePrice: n(v.sale_price),
      costPrice: n(v.cost_price),
      wholeSalePrice: n(v.whole_sale_price),
      dineInPrice: n(v.dine_in_price),
      takeAwayPrice: n(v.take_away_price),
      mrp: n(v.mrp),
      priority: v.priority,
    }));
  }
  async layout(
    c: bigint,
    f: { floorId?: bigint; persons?: number; ac?: number; status?: number },
    l: number,
  ) {
    let tables = await this.p.tables.findMany({
      where: {
        client_id: c,
        status: 1,
        trash: 0,
        ...(f.floorId ? { floor_id: f.floorId } : {}),
        ...(f.persons ? { capacity: { gte: f.persons } } : {}),
        ...(f.ac ? { ac_non_ac: f.ac } : {}),
      },
      orderBy: { table_name: "asc" },
      take: l + 1,
    });
    const ids = tables.slice(0, l).map((x) => x.id),
      now = new Date(),
      [sessions, reservations, floors, types] = await Promise.all([
        this.p.tableSessions.findMany({
          where: {
            client_id: c,
            table_id: { in: ids },
            session_status: 1,
            checkout_time: null,
          },
        }),
        this.overlappingReservations(this.p, c, ids, now, 30),
        this.p.floors.findMany({
          where: { client_id: c, id: { in: tables.map((x) => x.floor_id) } },
        }),
        this.p.tableTypes.findMany({
          where: {
            client_id: c,
            id: { in: tables.map((x) => x.table_type_id) },
          },
        }),
      ]);
    const summary = { occupied: 0, reserved: 0, available: 0, maintenance: 0 },
      rows = tables.slice(0, l).map((t) => {
        const session = sessions.find((x) => x.table_id === t.id),
          reservation = reservations
            .filter((x) => x.table_id === t.id)
            .sort((a, b) => +a.reservation_time - +b.reservation_time)[0];
        let status = t.table_under_maintenance
          ? 4
          : session
            ? 1
            : reservation
              ? 2
              : 3;
        summary[
          status === 1
            ? "occupied"
            : status === 2
              ? "reserved"
              : status === 3
                ? "available"
                : "maintenance"
        ]++;
        return {
          tableId: n(t.id),
          tableCode: t.table_code,
          tableName: t.table_name,
          capacity: t.capacity,
          acOrNonAc: t.ac_non_ac,
          floorId: n(t.floor_id),
          floorName:
            floors.find((x) => x.id === t.floor_id)?.floor_name ?? null,
          tableTypeId: n(t.table_type_id),
          tableType:
            types.find((x) => x.id === t.table_type_id)?.table_type ?? null,
          status,
          statusName: ["", "Occupied", "Reserved", "Available", "Maintenance"][
            status
          ],
          tableSessionId: session ? n(session.id) : null,
          reservationId: reservation ? n(reservation.id) : null,
        };
      });
    return {
      rows: f.status ? rows.filter((x: any) => x.status === f.status) : rows,
      summary,
      truncated: tables.length > l,
    };
  }
  async table(c: bigint, id: bigint) {
    const t = await this.p.tables.findFirst({
      where: { id, client_id: c, status: 1, trash: 0 },
    });
    if (!t) return null;
    const [s, r] = await Promise.all([
      this.p.tableSessions.findFirst({
        where: {
          client_id: c,
          table_id: id,
          session_status: 1,
          checkout_time: null,
        },
      }),
      this.p.tableReservations.findFirst({
        where: {
          client_id: c,
          table_id: id,
          reservation_status: 1,
          reservation_time: { gte: new Date() },
        },
        orderBy: { reservation_time: "asc" },
      }),
    ]);
    return {
      tableId: n(t.id),
      tableCode: t.table_code,
      tableName: t.table_name,
      capacity: t.capacity,
      acOrNonAc: t.ac_non_ac,
      maintenance: t.table_under_maintenance,
      session: s
        ? { id: n(s.id), customerId: s.customer_id ? n(s.customer_id) : null }
        : null,
      nextReservation: r ? { id: n(r.id), at: r.reservation_time } : null,
    };
  }
  async tableReservations(c: bigint, id: bigint, d: Date, l: number) {
    if (
      !(await this.p.tables.findFirst({
        where: { id, client_id: c, status: 1, trash: 0 },
      }))
    )
      return null;
    return this.reservationRows(
      c,
      {
        table_id: id,
        reservation_time: businessDayRange(d),
        reservation_status: 1,
      },
      l,
    );
  }
  async availability(
    c: bigint,
    t: bigint,
    at: Date,
    duration: number,
    exclude?: bigint,
  ) {
    const table = await this.p.tables.findFirst({
      where: { id: t, client_id: c, status: 1, trash: 0 },
    });
    if (!table) return null;
    if (table.table_under_maintenance) return { available: false };
    return this.slotAvailability(this.p, c, t, at, duration, exclude);
  }

  private async lockTable(db: Db, clientId: bigint, tableId: bigint) {
    await db.$queryRaw`SELECT id FROM tables WHERE id = ${tableId} AND client_id = ${clientId} FOR UPDATE`;
  }

  private async overlappingReservations(
    db: Db, clientId: bigint, tableIds: bigint[], at: Date, duration: number, exclude?: bigint,
  ) {
    if (!tableIds.length) return [];
    const end = new Date(+at + duration * 60_000);
    const rows = await db.tableReservations.findMany({
      where: {
        client_id: clientId,
        table_id: { in: tableIds },
        reservation_status: { in: [1, 5] },
        ...(exclude ? { id: { not: exclude } } : {}),
        reservation_time: { lt: end },
      },
      orderBy: { reservation_time: "asc" },
    });
    const overlaps = rows.filter(row => +row.reservation_time + row.duration_minutes * 60_000 > +at);
    const completed = await this.completedReservations(clientId, overlaps
      .filter(row => row.reservation_status === 5).map(row => row.id));
    return overlaps.filter(row => !completed.has(row.id));

  }

  async availableReservationTables(c: bigint, at: Date, duration: number, persons: number, exclude?: bigint) {
    const tables = await this.p.tables.findMany({
      where: { client_id: c, status: 1, trash: 0, table_under_maintenance: 0, capacity: { gte: persons } },
      orderBy: [{ capacity: "asc" }, { id: "asc" }],
    });
    const [floors, types] = await Promise.all([
      this.p.floors.findMany({ where: { client_id: c, id: { in: tables.map(table => table.floor_id) }, status: 1, trash: 0 } }),
      this.p.tableTypes.findMany({ where: { client_id: c, id: { in: tables.map(table => table.table_type_id) } } }),
    ]);
    const namesByFloor = new Map(floors.map(floor => [floor.id, floor.floor_name]));
    const namesByType = new Map(types.map(type => [type.id, type.table_type]));
    const conflicts = await this.overlappingReservations(this.p, c, tables.map(table => table.id), at, duration, exclude);
    const blocked = new Set(conflicts.map(row => row.table_id));
    return tables.filter(table => namesByFloor.has(table.floor_id) && !blocked.has(table.id)).map(table => ({
      id: n(table.id), name: table.table_name, code: table.table_code, seats: table.capacity,
      floorName: namesByFloor.get(table.floor_id), tableType: namesByType.get(table.table_type_id) ?? null,
    }));
  }

  private async slotAvailability(db: Db, c: bigint, t: bigint, at: Date, duration: number, exclude?: bigint) {
    const [conflict] = await this.overlappingReservations(db, c, [t], at, duration, exclude);
    return conflict
      ? {
          available: false,
          conflict: {
            reservationId: n(conflict.id),
            reservedFrom: conflict.reservation_time,
            reservedTo: new Date(
              +conflict.reservation_time + conflict.duration_minutes * 60000,
            ),
          },
        }
      : { available: true };
  }
  async customer(
    db: Db,
    c: bigint,
    name: string,
    mobile: string,
    user: bigint,
  ) {
    let x = await db.customers.findFirst({
      where: { client_id: c, mobile, trash: 0 },
    });
    if (!x)
      x = await db.customers.create({
        data: {
          client_id: c,
          customer_name: name,
          mobile,
          status: 1,
          trash: 0,
          created_by: Number(user),
          updated_by: Number(user),
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    return x;
  }
  async createReservation(a: Account, i: ReservationInput) {
    return this.p.$transaction(async (tx) => {
      const clientId = a.client.id;
      await this.lockTable(tx, clientId, i.tableId);
      const t = await tx.tables.findFirst({
        where: { id: i.tableId, client_id: clientId, status: 1, trash: 0 },
      });
      if (!t) return "table_missing";
      if (t.capacity < i.persons) return "capacity";
      if (t.table_under_maintenance) return "maintenance";
      if (!(await this.slotAvailability(tx, clientId, i.tableId, i.at, i.duration)).available)
        return "conflict";
      const c = await this.customer(
        tx,
        a.client.id,
        i.customerName,
        i.customerMobile,
        a.user.id,
      );
      await tx.tableReservations.create({
        data: {
          client_id: a.client.id,
          table_id: i.tableId,
          customer_id: c.id,
          no_of_persons: i.persons,
          reservation_time: i.at,
          duration_minutes: i.duration,
          remarks: i.remarks,
          reservation_status: 1,
          created_by: a.user.id,
          updated_by: a.user.id,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      return "created";
    }, { isolationLevel: "ReadCommitted" });
  }
  async reservationRows(
    c: bigint,
    where: Prisma.TableReservationsWhereInput,
    l: number,
    byId = false,
  ) {
    const rows = await this.p.tableReservations.findMany({
        where: { client_id: c, ...where },
        orderBy: byId ? { id: "asc" } : [{ reservation_time: "asc" }, { id: "asc" }],
        take: l,
      }),
      [tables, customers, completed] = await Promise.all([
        this.p.tables.findMany({
          where: { client_id: c, id: { in: rows.map((x) => x.table_id) } },
        }),
        this.p.customers.findMany({
          where: {
            client_id: c,
            id: {
              in: rows.flatMap((x) => (x.customer_id ? [x.customer_id] : [])),
            },
          },
        }),
        this.completedReservations(c, rows.filter(row => row.reservation_status === 5).map(row => row.id)),
      ]);
    return rows
      .slice(0, l)
      .map((x) => ({
        reservationId: n(x.id),
        tableId: n(x.table_id),
        tableCode: tables.find((t) => t.id === x.table_id)?.table_code ?? null,
        tableName: tables.find((t) => t.id === x.table_id)?.table_name ?? null,
        customerId: x.customer_id ? n(x.customer_id) : null,
        customerName:
          customers.find((y) => y.id === x.customer_id)?.customer_name ?? null,
        customerMobile:
          customers.find((y) => y.id === x.customer_id)?.mobile ?? null,
        noOfPersons: x.no_of_persons,
        reservationTime: x.reservation_time,
        durationMinutes: x.duration_minutes,
        remarks: x.remarks,
        status: x.reservation_status === 5 && completed.has(x.id) ? 3 : x.reservation_status,
      }));
  }
  private async completedReservations(clientId: bigint, reservations?: bigint[]) {
    if (reservations?.length === 0) return new Set<bigint>();
    const sessions = await this.p.tableSessions.findMany({
      where: {
        client_id: clientId,
        checkout_time: { not: null },
        reservation_id: reservations ? { in: reservations } : { not: null },
      },
      select: { reservation_id: true },
    });
    return new Set(sessions.flatMap(session => session.reservation_id === null ? [] : [session.reservation_id]));
  }

  async listReservations(
    c: bigint,
    f: { search?: string; date?: Date; status?: number; afterId?: bigint },
    l: number,
  ) {
    const completed = f.status === 3 || f.status === 5 ? [...await this.completedReservations(c)] : [];
    const statusFilter = f.status === 3 ? { in: [3, 5] } : f.status ?? { in: [1, 2, 3, 4, 5] };
    const rows = await this.reservationRows(c, {
      reservation_status: statusFilter,
      ...(f.date ? { reservation_time: businessDayRange(f.date) } : {}),
      ...(f.afterId === undefined ? {} : { id: { gt: f.afterId } }),
      AND: [
        ...(f.status === 3 ? [{ OR: [{ reservation_status: 3 }, { id: { in: completed } }] }] : []),
        ...(f.status === 5 ? [{ id: { notIn: completed } }] : []),
      ],
      ...(f.search ? {
        rel_customer_id: { client_id: c, OR: [
          { customer_name: { contains: f.search } },
          { mobile: { contains: f.search } },
        ] },
      } : {}),
    }, l + 1, f.afterId !== undefined);
    return { rows: rows.slice(0, l), truncated: rows.length > l };
  }
  async reservation(c: bigint, id: bigint) {
    return (await this.reservationRows(c, { id }, 1))[0] ?? null;
  }
  async updateReservation(
    a: Account,
    id: bigint,
    i: Omit<ReservationInput, "customerName" | "customerMobile" | "duration">,
  ) {
    return this.p.$transaction(async (tx) => {
      const clientId = a.client.id;
      await this.lockTable(tx, clientId, i.tableId);
      const where = { id, client_id: clientId, reservation_status: 1 };
      const r = await tx.tableReservations.findFirst({ where });
      if (!r) return "missing";
      const t = await tx.tables.findFirst({
        where: { id: i.tableId, client_id: clientId, status: 1, trash: 0 },
      });
      if (!t) return "table_missing";
      if (t.capacity < i.persons) return "capacity";
      if (t.table_under_maintenance) return "maintenance";
      if (!(await this.slotAvailability(tx, clientId, i.tableId, i.at, r.duration_minutes, id)).available)
        return "conflict";
      const result = await tx.tableReservations.updateMany({
        where: { ...where, table_id: r.table_id, reservation_time: r.reservation_time },
        data: {
          table_id: i.tableId,
          no_of_persons: i.persons,
          reservation_time: i.at,
          remarks: i.remarks,
          updated_by: a.user.id,
          updated_at: new Date(),
        },
      });
      return result.count === 1 ? "updated" : "conflict";
    }, { isolationLevel: "ReadCommitted" });
  }

  async markReservationNoShow(a: Account, id: bigint) {
    const result = await this.p.tableReservations.updateMany({
      where: {
        id, client_id: a.client.id, reservation_status: 1,
        reservation_time: { lte: new Date() },
      },
      data: { reservation_status: 2, updated_by: a.user.id, updated_at: new Date() },
    });
    return result.count === 1;
  }
  async cancelReservation(a: Account, id: bigint, remarks: string | null) {
    return (
      (
        await this.p.tableReservations.updateMany({
          where: { id, client_id: a.client.id, reservation_status: 1 },
          data: {
            reservation_status: 4,
            remarks,
            updated_by: a.user.id,
            updated_at: new Date(),
          },
        })
      ).count === 1
    );
  }
  async validItems(db: Db, c: bigint, items: KotItem[]) {
    const ps = [...new Set(items.map((x) => x.productId))],
      vs = [...new Set(items.map((x) => x.variantId))],
      [products, variants] = await Promise.all([
        db.products.findMany({
          where: { client_id: c, id: { in: ps }, status: 1, trash: 0 },
        }),
        db.productVariants.findMany({
          where: { client_id: c, id: { in: vs }, status: 1, trash: 0 },
        }),
      ]);
    return (
      products.length === ps.length &&
      variants.length === vs.length &&
      items.every((x) =>
        variants.some(
          (v) => v.id === x.variantId && v.product_id === x.productId,
        ),
      )
    );
  }
  async startSession(
    a: Account,
    i: {
      reservationId?: bigint;
      tableId?: bigint;
      customerName?: string;
      customerMobile?: string;
      persons?: number;
      remarks: string | null;
      items: KotItem[];
    },
  ) {
    return this.p.$transaction(
      async (tx) => {
        const reservation = i.reservationId
          ? await tx.tableReservations.findFirst({
              where: {
                id: i.reservationId,
                client_id: a.client.id,
                reservation_status: 1,
              },
            })
          : null;
        if (i.reservationId && !reservation) return "missing";
        const tableId = reservation?.table_id ?? i.tableId!;
        const t = await tx.tables.findFirst({
          where: { id: tableId, client_id: a.client.id, status: 1, trash: 0 },
        });
        if (!t) return "table_missing";
        if (t.table_under_maintenance) return "maintenance";
        if ((reservation?.no_of_persons ?? i.persons ?? 0) > t.capacity)
          return "capacity";
        if (
          await tx.tableSessions.findFirst({
            where: {
              client_id: a.client.id,
              table_id: tableId,
              session_status: 1,
              checkout_time: null,
            },
          })
        )
          return "occupied";
        if (!(await this.validItems(tx, a.client.id, i.items)))
          return "product_missing";
        if (reservation) {
          const claim = await tx.tableReservations.updateMany({
            where: { id: reservation.id, client_id: a.client.id, table_id: tableId, reservation_status: 1 },
            data: { reservation_status: 5, updated_by: a.user.id, updated_at: new Date() },
          });
          if (claim.count !== 1) return "missing";
        }
        const customer = reservation
            ? reservation.customer_id && await tx.customers.findFirst({
                where: { id: reservation.customer_id, client_id: a.client.id },
              })
            : await this.customer(
                tx,
                a.client.id,
                i.customerName!,
                i.customerMobile!,
                a.user.id,
              ),
          now = new Date(),
          session = await tx.tableSessions.create({
            data: {
              client_id: a.client.id,
              table_id: tableId,
              waiter_id: a.user.id,
              customer_id: customer ? customer.id : null,
              reservation_id: reservation?.id ?? null,
              session_status: 1,
              checkin_time: now,
              created_by: a.user.id,
              updated_by: a.user.id,
              created_at: now,
              updated_at: now,
            },
          });
        if (i.items.length) {
          const last = await tx.kotMast.findFirst({
            where: { client_id: a.client.id, kot_date: day(now) },
            orderBy: { kot_no: "desc" },
          }),
          kot = await tx.kotMast.create({
            data: {
              client_id: a.client.id,
              kot_no: String(Number(last?.kot_no ?? 0) + 1),
              kot_date: day(now),
              table_session_id: session.id,
              table_id: tableId,
              waiter_id: a.user.id,
              kot_status: 1,
              remarks: i.remarks,
              created_by: a.user.id,
              updated_by: a.user.id,
              created_at: now,
              updated_at: now,
            },
          });
          for (const x of i.items) {
            const variant = await tx.productVariants.findFirst({
                where: {
                  id: x.variantId,
                  product_id: x.productId,
                  client_id: a.client.id,
                  status: 1,
                  trash: 0,
                },
              }),
              price = Number(variant!.dine_in_price);
            await tx.kotTran.create({
              data: {
                client_id: a.client.id,
                kot_id: kot.id,
                product_id: x.productId,
                variant_id: x.variantId,
                qty: x.qty,
                price,
                amount: x.qty * price,
                item_status: 1,
                remarks: x.remarks,
                created_at: now,
                updated_at: now,
              },
            });
          }
        }
        return "created";
      },
      { isolationLevel: "Serializable" },
    );
  }
  async shift(a: Account, sid: bigint, to: bigint) {
    const s = await this.p.tableSessions.findFirst({
      where: {
        id: sid,
        client_id: a.client.id,
        session_status: 1,
        checkout_time: null,
      },
    });
    if (!s) return "session_missing";
    const t = await this.p.tables.findFirst({
      where: { id: to, client_id: a.client.id, status: 1, trash: 0 },
    });
    if (!t) return "table_missing";
    if (s.table_id === to) return "same";
    if (t.table_under_maintenance) return "maintenance";
    if (
      await this.p.tableSessions.findFirst({
        where: {
          client_id: a.client.id,
          table_id: to,
          session_status: 1,
          checkout_time: null,
        },
      })
    )
      return "occupied";
    const near = await this.p.tableReservations.findFirst({
      where: {
        client_id: a.client.id,
        table_id: to,
        reservation_status: 1,
        reservation_time: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 60000),
        },
      },
    });
    if (near) return "reserved";
    await this.p.$transaction([
      this.p.tableSessions.updateMany({
        where: { id: sid, client_id: a.client.id },
        data: { table_id: to, updated_by: a.user.id, updated_at: new Date() },
      }),
      this.p.kotMast.updateMany({
        where: {
          client_id: a.client.id,
          table_session_id: sid,
          kot_status: { not: 5 },
        },
        data: { table_id: to, updated_by: a.user.id, updated_at: new Date() },
      }),
    ]);
    return "shifted";
  }
  async sessionData(c: bigint, sid: bigint, status?: number) {
    const s = await this.p.tableSessions.findFirst({
      where: { id: sid, client_id: c, session_status: 1, checkout_time: null },
    });
    if (!s) return null;
    const [kots, table, customer, waiter] = await Promise.all([
        this.p.kotMast.findMany({
          where: {
            client_id: c,
            table_session_id: sid,
            ...(status ? { kot_status: status } : {}),
          },
          orderBy: { id: "asc" },
        }),
        this.p.tables.findFirst({ where: { id: s.table_id, client_id: c } }),
        s.customer_id
          ? this.p.customers.findFirst({
              where: { id: s.customer_id, client_id: c },
            })
          : null,
        s.waiter_id
          ? this.p.clientUsers.findFirst({
              where: { id: s.waiter_id, client_id: c },
            })
          : null,
      ]),
      items = await this.p.kotTran.findMany({
        where: { client_id: c, kot_id: { in: kots.map((x) => x.id) } },
        orderBy: { id: "asc" },
      }),
      products = await this.p.products.findMany({
        where: { client_id: c, id: { in: items.map((x) => x.product_id) } },
      }),
      variants = await this.p.productVariants.findMany({
        where: { client_id: c, id: { in: items.map((x) => x.variant_id) } },
      });
    return {
      tableSessionId: n(s.id),
      tableId: n(s.table_id),
      tableName: table?.table_name ?? null,
      customerName: customer?.customer_name ?? null,
      customerMobile: customer?.mobile ?? null,
      waiterName: waiter?.name ?? null,
      kots: kots.map((k) => ({
        kotId: n(k.id),
        kotNo: k.kot_no,
        kotStatus: k.kot_status,
        kotStatusName: statusName(k.kot_status),
        remarks: k.remarks,
        items: items
          .filter((x) => x.kot_id === k.id)
          .map((x) => ({
            kotTranId: n(x.id),
            productId: n(x.product_id),
            productFullName:
              products.find((p) => p.id === x.product_id)?.product_full_name ??
              null,
            variantId: n(x.variant_id),
            packSize:
              variants.find((v) => v.id === x.variant_id)?.pack_size ?? null,
            qty: n(x.qty),
            price: n(x.price),
            amount: n(x.amount),
            itemStatus: x.item_status,
            itemStatusName: statusName(x.item_status),
            remarks: x.remarks,
          })),
      })),
    };
  }
  async session(c: bigint, id: bigint) {
    return this.sessionData(c, id);
  }
  async allSessions(c: bigint, status: number | undefined, l: number) {
    const sessions = await this.p.tableSessions.findMany({
        where: { client_id: c, session_status: 1, checkout_time: null },
        orderBy: { created_at: "asc" },
        take: l + 1,
      }),
      rows = [];
    for (const s of sessions.slice(0, l)) {
      const x = await this.sessionData(c, s.id, status);
      if (x && (x as any).kots.length) rows.push(x);
    }
    const [
        totalKots,
        pendingKots,
        preparingKots,
        readyKots,
        servedKots,
        cancelledKots,
      ] = await Promise.all([
        this.p.kotMast.count({ where: { client_id: c } }),
        ...([1, 2, 3, 4, 5] as const).map((kot_status) =>
          this.p.kotMast.count({ where: { client_id: c, kot_status } }),
        ),
      ]),
      counts = {
        totalKots,
        pendingKots,
        preparingKots,
        readyKots,
        servedKots,
        cancelledKots,
      };
    return { rows, counts, truncated: sessions.length > l };
  }
}

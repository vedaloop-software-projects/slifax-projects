import { Router, type Request, type Response } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import multer from "multer";
import {
  authenticate,
  type AuthenticatedLocals,
} from "../../middlewares/auth/authenticate.ts";
import type { Account, AuthStore } from "../../models/auth/contracts.ts";
import type { ProductImageStorage } from "../../models/product/contracts.ts";
import { ApiError, type AuthService } from "../auth/service.ts";

const id = z
  .union([z.string(), z.number().int().positive().safe()])
  .transform(String)
  .pipe(z.string().regex(/^[1-9]\d{0,19}$/))
  .transform(BigInt)
  .refine((value) => value <= 18446744073709551615n);
const paging = z.object({
  search: z.string().trim().max(150).nullish().transform(value => value ?? ""),
  page: z.number().int().min(1).max(100_000).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
});
const types = z.enum(["fixed", "customizable"]);
const statuses = z.union([z.literal(0), z.literal(1)]);
const item = z.object({
  variantId: id,
  quantity: z.number().int().min(1).max(1000),
});
const group = z
  .object({
    name: z.string().trim().min(1).max(100),
    min: z.number().int().min(0).max(100),
    max: z.number().int().min(1).max(100),
    variantIds: z.array(id).min(1).max(100),
  })
  .refine(
    (g) =>
      g.min <= g.max &&
      g.max <= new Set(g.variantIds).size &&
      new Set(g.variantIds).size === g.variantIds.length,
    "Invalid group limits or duplicate options.",
  );
const definition = z.object({
  parentVariantId: id,
  comboName: z.string().trim().min(1).max(520),
  description: z.string().trim().max(2000).nullish().transform(value => value ?? ""),
  sellingPrice: z
    .union([z.string(), z.number().finite()])
    .transform(String)
    .pipe(z.string().regex(/^\d{1,12}(\.\d{1,2})?$/))
    .transform((value) => new Prisma.Decimal(value))
    .refine((value) => value.gt(0), "Selling price must be greater than zero."),
  status: statuses,
});
const save = z.discriminatedUnion("comboType", [
  definition.extend({
    comboType: z.literal("fixed"),
    items: z.array(item).min(1).max(100),
    groups: z.tuple([]).optional(),
  }),
  definition.extend({
    comboType: z.literal("customizable"),
    groups: z.array(group).min(1).max(20),
    items: z.tuple([]).optional(),
  }),
]);
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 256 * 1024,
  },
}).single("comboImage");
type Db = Prisma.TransactionClient;
type Variant = {
  variantId: bigint;
  productId: bigint;
  name: string;
  packSize: string;
  salePrice: number;
  image: string | null;
};

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError(
      422,
      issue
        ? [issue.path.join("."), issue.message].filter(Boolean).join(": ")
        : "Invalid combo data.",
    );
  }
  return result.data;
}

function catalog(clientId: bigint, flag?: number) {
  return Prisma.sql`FROM product_variants v
    JOIN products p ON p.id = v.product_id AND p.client_id = v.client_id
    WHERE v.client_id = ${clientId}
    ${
      flag === undefined
        ? Prisma.empty
        : Prisma.sql`AND v.status = 1 AND v.trash = 0 AND p.status = 1 AND p.trash = 0
      AND EXISTS (SELECT 1 FROM product_controls c
        WHERE c.client_id = v.client_id AND c.product_id = v.product_id AND c.is_combo = ${flag})`
    }`;
}
const fields = Prisma.sql`SELECT v.id AS variantId, p.id AS productId, p.product_full_name AS name,
  v.pack_size AS packSize, v.sale_price AS salePrice, p.product_image AS image`;

export function createComboRouter(
  auth: AuthService,
  authStore: AuthStore,
  db: PrismaClient,
  images: ProductImageStorage,
  baseUrl: string,
) {
  const router = Router();
  const imageUrl = (path: string | null) =>
    path
      ? `${baseUrl.replace(/\/$/, "")}/${path.startsWith("uploads/") ? path : `uploads/products/${path}`}`
      : null;
  const variant = (row: Variant) => ({
    id: String(row.variantId),
    variantId: String(row.variantId),
    productId: String(row.productId),
    label: [row.name, row.packSize].filter(Boolean).join(" · "),
    productName: row.name,
    displayLabel: [row.name, row.packSize].filter(Boolean).join(" · "),
    salePrice: Number(row.salePrice),
    image: imageUrl(row.image),
  });
  function endpoint(
    path: string,
    permission: "view" | "add" | "edit",
    action: (account: Account, request: Request) => Promise<unknown>,
    image = false,
  ) {
    const access = async (
      _request: Request,
      response: Response,
      next: (error?: unknown) => void,
    ) => {
      const account = (response.locals as AuthenticatedLocals).account;
      const permissions = await authStore.listPermissions(
        account.client.id,
        account.user.roleId,
      );
      if (
        !permissions.some(
          (row) =>
            row[permission] === 1 &&
            /product/i.test(row.subFeature ?? row.feature),
        )
      ) {
        throw new ApiError(403, "You do not have permission to manage combos.");
      }
      next();
    };
    router.post(
      path,
      authenticate(auth),
      access,
      ...(image ? [upload] : []),
      async (request, response) => {
        const data = await action(
          (response.locals as AuthenticatedLocals).account,
          request,
        );
        response.json({ success: true, data });
      },
    );
  }
  async function variants(
    tx: Db,
    clientId: bigint,
    ids: bigint[],
    flag?: number,
  ) {
    if (!ids.length) return new Map<bigint, Variant>();
    const rows = await tx.$queryRaw<
      Variant[]
    >`${fields} ${catalog(clientId, flag)} AND v.id IN (${Prisma.join(ids)})`;
    return new Map(rows.map((row) => [row.variantId, row]));
  }
  function summary(row: Prisma.CombosGetPayload<object>) {
    return {
      id: String(row.id),
      parentVariantId: String(row.parent_variant_id),
      comboName: row.name,
      comboType: row.combo_type,
      description: row.description,
      status: row.status,
      sellingPrice: row.selling_price.toFixed(2),
      originalPrice: row.original_price?.toFixed(2) ?? null,
      image: imageUrl(row.image_path),
    };
  }
  async function detail(tx: Db, clientId: bigint, comboId: bigint) {
    const row = await tx.combos.findFirst({
      where: { id: comboId, client_id: clientId, live: 1 },
    });
    if (!row) throw new ApiError(404, "Combo not found.");
    const items = await tx.comboFixedItems.findMany({
      where: { combo_id: row.id },
      orderBy: { id: "asc" },
    });
    const groups = await tx.comboGroups.findMany({
      where: { combo_id: row.id },
      orderBy: { id: "asc" },
    });
    const options = await tx.comboGroupOptions.findMany({
      where: { group_id: { in: groups.map((g) => g.id) } },
      orderBy: { id: "asc" },
    });
    const products = await variants(tx, clientId, [
      ...new Set([
        row.parent_variant_id,
        ...items.map((i) => i.variant_id),
        ...options.map((o) => o.variant_id),
      ]),
    ]);
    const parent = products.get(row.parent_variant_id);
    return {
      ...summary(row),
      image: imageUrl(row.image_path ?? parent?.image ?? null),
      parent: parent ? variant(parent) : null,
      menuItems: [...products.values()]
        .filter((option) => option.variantId !== row.parent_variant_id)
        .map(variant),
      items: items.map((i) => ({
        itemId: String(i.variant_id),
        quantity: i.quantity,
      })),
      groups: groups.map((g) => ({
        id: String(g.id),
        name: g.name,
        min: g.min_selection,
        max: g.max_selection,
        itemIds: options
          .filter((o) => o.group_id === g.id)
          .map((o) => String(o.variant_id)),
      })),
    };
  }

  endpoint("/getCombos", "view", async (account, request) => {
    const query = parse(
      paging.extend({ type: types.optional(), status: statuses.optional() }),
      request.body,
    );
    const where = {
      client_id: account.client.id,
      live: 1,
      combo_type: query.type,
      status: query.status,
      ...(query.search ? { name: { contains: query.search } } : {}),
    };
    return db.$transaction(async (tx) => {
      const total = await tx.combos.count({ where });
      const lastPage = Math.max(1, Math.ceil(total / query.pageSize));
      const page = Math.min(query.page, lastPage);
      const rows = await tx.combos.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (page - 1) * query.pageSize,
        take: query.pageSize,
      });
      const ids = rows.map((row) => row.id);
      const itemCounts = await tx.comboFixedItems.groupBy({
        by: ["combo_id"],
        where: { combo_id: { in: ids } },
        _sum: { quantity: true },
      });
      const groupCounts = await tx.comboGroups.groupBy({
        by: ["combo_id"],
        where: { combo_id: { in: ids } },
        _count: { _all: true },
      });
      const parents = await variants(
        tx,
        account.client.id,
        rows.map((row) => row.parent_variant_id),
      );
      return {
        rows: rows.map((row) => ({
          ...summary(row),
          image: imageUrl(
            row.image_path ?? parents.get(row.parent_variant_id)?.image ?? null,
          ),
          contentsCount:
            row.combo_type === "fixed"
              ? (itemCounts.find((count) => count.combo_id === row.id)?._sum
                  .quantity ?? 0)
              : (groupCounts.find((count) => count.combo_id === row.id)?._count
                  ._all ?? 0),
        })),
        pagination: { total, page, lastPage },
      };
    });
  });
  endpoint("/getComboById", "view", (account, request) =>
    db.$transaction((tx) =>
      detail(tx, account.client.id, parse(z.object({ id }), request.body).id),
    ),
  );

  for (const [path, flag] of [
    ["/getComboParents", 1],
    ["/getComboComponents", 0],
  ] as const) {
    endpoint(path, "view", async (account, request) => {
      const { page, pageSize, search } = parse(paging, request.body);
      const term = `%${search.replace(/[!%_]/g, (char) => `!${char}`)}%`;
      const match = search
        ? Prisma.sql`AND (p.product_full_name LIKE ${term} ESCAPE '!' OR
        v.variant_code LIKE ${term} ESCAPE '!' OR v.pack_size LIKE ${term} ESCAPE '!')`
        : Prisma.empty;
      const rows = await db.$queryRaw<
        Variant[]
      >`${fields} ${catalog(account.client.id, flag)} ${match}
        ORDER BY p.product_full_name, v.id LIMIT ${pageSize + 1} OFFSET ${(page - 1) * pageSize}`;
      return {
        rows: rows.slice(0, pageSize).map(variant),
        hasMore: rows.length > pageSize,
      };
    });
  }

  async function write(account: Account, request: Request, update: boolean) {
    let body: unknown = request.body;
    if (request.is("multipart/form-data")) {
      try {
        body = JSON.parse(request.body?.definition);
      } catch {
        throw new ApiError(422, "Invalid combo definition.");
      }
    }
    const input = parse(save, body);
    const comboId = update ? parse(z.object({ id }), body).id : null;
    const items = input.comboType === "fixed" ? input.items : [];
    const groups = input.comboType === "customizable" ? input.groups : [];
    if (new Set(items.map((row) => row.variantId)).size !== items.length)
      throw new ApiError(422, "Duplicate fixed items are not allowed.");
    const componentIds = [
      ...new Set([
        ...items.map((row) => row.variantId),
        ...groups.flatMap((row) => row.variantIds),
      ]),
    ];
    let imagePath: string | undefined;
    if (request.file) {
      try {
        imagePath = await images.save({
          buffer: request.file.buffer,
          mimeType: request.file.mimetype,
        });
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_PRODUCT_IMAGE")
          throw new ApiError(422, "Choose a PNG, JPEG or WebP image.");
        throw error;
      }
    }
    try {
      return await db.$transaction(async (tx) => {
        const clientId = account.client.id;
        const parents = await variants(
          tx,
          clientId,
          [input.parentVariantId],
          1,
        );
        if (!parents.has(input.parentVariantId))
          throw new ApiError(422, "Choose an active combo product variant.");
        const components = await variants(tx, clientId, componentIds, 0);
        if (
          components.size !== componentIds.length ||
          componentIds.includes(input.parentVariantId)
        ) {
          throw new ApiError(
            422,
            "Choose active regular product variants for all components.",
          );
        }
        let original: Prisma.Decimal | null = null;
        if (input.comboType === "fixed") {
          original = new Prisma.Decimal(0);
          for (const row of items) {
            const price = Number(components.get(row.variantId)?.salePrice);
            if (!Number.isFinite(price) || price <= 0)
              throw new ApiError(
                422,
                "All fixed items must have a valid sale price.",
              );
            original = original.plus(
              new Prisma.Decimal(price).times(row.quantity),
            );
          }
          original = original.toDecimalPlaces(2);
          if (
            original.gte("10000000000000") ||
            original.lt(input.sellingPrice)
          ) {
            throw new ApiError(
              422,
              "The selling price must not exceed the original price, and the original price must fit the supported range.",
            );
          }
        }
        const data = {
          parent_variant_id: input.parentVariantId,
          name: input.comboName,
          combo_type: input.comboType,
          description: input.description,
          selling_price: input.sellingPrice,
          original_price: original,
          status: input.status,
          ...(imagePath ? { image_path: imagePath } : {}),
        };
        let savedId: bigint;
        if (comboId) {
          const result = await tx.combos.updateMany({
            where: { id: comboId, client_id: clientId, live: 1 },
            data,
          });
          if (!result.count) throw new ApiError(404, "Combo not found.");
          savedId = comboId;
          await tx.comboGroups.deleteMany({ where: { combo_id: savedId } });
          await tx.comboFixedItems.deleteMany({ where: { combo_id: savedId } });
        } else {
          savedId = (
            await tx.combos.create({ data: { ...data, client_id: clientId } })
          ).id;
        }
        if (items.length)
          await tx.comboFixedItems.createMany({
            data: items.map((row) => ({
              combo_id: savedId,
              variant_id: row.variantId,
              quantity: row.quantity,
            })),
          });
        for (const row of groups) {
          const saved = await tx.comboGroups.create({
            data: {
              combo_id: savedId,
              name: row.name,
              min_selection: row.min,
              max_selection: row.max,
            },
          });
          await tx.comboGroupOptions.createMany({
            data: row.variantIds.map((variantId) => ({
              group_id: saved.id,
              variant_id: variantId,
            })),
          });
        }
        return detail(tx, clientId, savedId);
      });
    } catch (error) {
      if (imagePath) await images.remove(imagePath).catch(() => undefined);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ApiError(
          409,
          "This product variant already has a combo definition.",
        );
      }
      throw error;
    }
  }
  endpoint(
    "/addCombo",
    "add",
    (account, request) => write(account, request, false),
    true,
  );
  endpoint(
    "/updateCombo",
    "edit",
    (account, request) => write(account, request, true),
    true,
  );
  endpoint("/archiveCombo", "edit", async (account, request) => {
    const input = parse(z.object({ id }), request.body);
    const result = await db.combos.updateMany({
      where: { id: input.id, client_id: account.client.id, live: 1 },
      data: { live: null, status: 0 },
    });
    if (!result.count) throw new ApiError(404, "Combo not found.");
    return { id: String(input.id) };
  });
  router.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      next: (error: unknown) => void,
    ) => {
      if (error instanceof ApiError)
        response.status(error.status).json({ errors: error.message });
      else if (error instanceof multer.MulterError)
        response
          .status(422)
          .json({ errors: "Upload one combo image up to 2 MB." });
      else next(error);
    },
  );
  return router;
}

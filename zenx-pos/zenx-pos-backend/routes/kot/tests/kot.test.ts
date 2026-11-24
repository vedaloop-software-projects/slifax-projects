import assert from'node:assert/strict';import{test}from'node:test';import type{Account,AuthStore,PermissionRow}from'../../../models/auth/contracts.ts';import type{KotStore,ReservationInput,KotItem}from'../../../models/kot/contracts.ts';import{ApiError}from'../../auth/service.ts';import{KotService}from'../service.ts';const account:Account={user:{id:3n,clientId:7n,name:'Waiter',mobile:'9',email:'a@x',passwordHash:null,roleId:4,updatedAt:null},client:{id:7n,businessTypeId:2,businessName:'Cafe',logo:null,address:'',city:'',startDate:new Date('2025-01-01'),endDate:new Date('2030-01-01')},businessType:'Restaurant',roleTitle:'Admin'};class Auth implements AuthStore{permissions:PermissionRow[]=[{featureId:1n,feature:'KOT',featurePriority:1,subFeatureId:null,subFeature:null,subFeaturePriority:null,view:1,add:1,edit:1}];async findAccountByLogin(){return null}async findAccountByIdentity(){return null}async listPermissions(){return this.permissions}async getProfile(){return null}async recordAudit(){}async changePassword(){return new Date()}}
class Store implements KotStore{clientIds:bigint[]=[];reservationInput?:ReservationInput;sessionInput?:{items:KotItem[]};outcome:any='created';track(c:bigint){this.clientIds.push(c)}async categories(c:bigint){this.track(c);return{rows:[{id:1}],truncated:false}}async products(c:bigint){this.track(c);return{rows:[{productId:1}],truncated:false}}async variants(c:bigint){this.track(c);return[{variantId:2}]}async layout(c:bigint){this.track(c);return{rows:[{tableId:1}],summary:{available:1},truncated:false}}async table(c:bigint){this.track(c);return{tableId:1}}async tableReservations(c:bigint){this.track(c);return[{reservationId:5}]}async availability(c:bigint){this.track(c);return{available:true}}async availableReservationTables(c:bigint){this.track(c);return[{id:1}]}async markReservationNoShow(a:Account){this.track(a.client.id);return true}async createReservation(a:Account,i:ReservationInput){this.track(a.client.id);this.reservationInput=i;return this.outcome}async listReservations(c:bigint){this.track(c);return{rows:[{reservationId:5}],truncated:false}}async reservation(c:bigint){this.track(c);return{reservationId:5}}async updateReservation(a:Account){this.track(a.client.id);return this.outcome}async cancelReservation(a:Account){this.track(a.client.id);return this.outcome!=='missing'}async startSession(a:Account,i:{items:KotItem[]}){this.track(a.client.id);this.sessionInput=i;return this.outcome}async shift(a:Account){this.track(a.client.id);return this.outcome==='created'?'shifted':this.outcome}async session(c:bigint){this.track(c);return{tableSessionId:9,kots:[]}}async allSessions(c:bigint){this.track(c);return{rows:[{tableSessionId:9}],counts:{totalKots:1},truncated:false}}}
test('17 KOT front-of-house operations are validated, permissioned, bounded and tenant scoped',async()=>{const s=new Store(),v=new KotService(s,new Auth(),20),reservation={tableId:1,customerName:'Nila',customerMobile:'9876543210',noOfPersons:2,reserveDate:'08-10-2026',reserveTime:'19:30',durationMinutes:90,remarks:null},order={items:[{productId:1,variantId:2,qty:2,price:999,remarks:null}]};assert.equal((await v.categories(account)as any[]).length,1);assert.equal((await v.products(account,{searchStr:null,categoryId:null,subCategoryId:null})as any[]).length,1);assert.equal((await v.variants(account,{productId:1})as any[]).length,1);assert.equal((await v.layout(account,{floorId:null,noofPersons:null,acOrNonac:null,status:null})as any).rows.length,1);assert.deepEqual(await v.table(account,{tableId:1}),{tableId:1});assert.equal((await v.tableReservations(account,{tableId:1,reserveDate:'08-10-2026'})as any[])[0].reservationId,5);assert.equal((await v.availability(account,{tableId:1,reserveDate:'08-10-2026',reserveTime:'19:30',durationMinutes:90,reservationId:null})).available,true);await v.createReservation(account,reservation);assert.equal(s.reservationInput?.tableId,1n);assert.equal((await v.reservations(account,{searchStr:null,reservationDate:null,status:null})as any[])[0].reservationId,5);assert.deepEqual(await v.reservationDetails(account,{reservationId:5}),{reservationId:5});await v.updateReservation(account,{reservationId:5,tableId:1,reserveDate:'08-10-2026',reserveTime:'20:00',noOfPersons:3,remarks:null});await v.cancel(account,{reservationId:5,remarks:null});await v.checkIn(account,{reservationId:5,remarks:null,...order});assert.equal(s.sessionInput?.items[0]?.variantId,2n);await v.createSession(account,{tableId:1,customerName:'Nila',customerMobile:'9876543210',noOfPersons:2,remarks:null,...order});await v.shift(account,{tableSessionId:9,toTableId:2});assert.deepEqual(await v.session(account,{tableSessionId:9}),{tableSessionId:9,kots:[]});assert.equal((await v.all(account,{status:null})).counts.totalKots,1);assert.ok(s.clientIds.every(x=>x===7n));assert.equal(s.clientIds.length,17)});
test('KOT rejects calendar errors, duplicate items, missing grants, overflow and domain conflicts',async()=>{const s=new Store(),a=new Auth(),v=new KotService(s,a,2);await assert.rejects(()=>v.createReservation(account,{tableId:1,customerName:'Nila',customerMobile:'9876543210',noOfPersons:2,reserveDate:'31-02-2026',reserveTime:'19:30',durationMinutes:90,remarks:null}),(e:ApiError)=>e.status===422);const duplicate={tableId:1,customerName:'Nila',customerMobile:'9876543210',noOfPersons:2,remarks:null,items:[{productId:1,variantId:2,qty:1,price:10,remarks:null},{productId:1,variantId:2,qty:1,price:10,remarks:null}]};await assert.rejects(()=>v.createSession(account,duplicate),(e:ApiError)=>e.status===422);s.outcome='occupied';await assert.rejects(()=>v.createSession(account,{...duplicate,items:duplicate.items.slice(0,1)}),(e:ApiError)=>e.status===409);a.permissions[0]!.view=0;await assert.rejects(()=>v.categories(account),(e:ApiError)=>e.status===403);a.permissions[0]!.view=1;s.categories=async()=>({rows:[],truncated:true});await assert.rejects(()=>v.categories(account),(e:ApiError)=>e.status===422)});

test('reservation availability and cursor pages expose the ZPR response contract', async () => {
  const store = new Store();
  const service = new KotService(store, new Auth());
  const slot = {
    reserveDate: '08-10-2026',
    reserveTime: '19:30',
    durationMinutes: 15,
    noOfPersons: 2,
    reservationId: null,
  };
  assert.deepEqual(await service.availableReservationTables(account, slot), [{ id: 1 }]);
  assert.deepEqual(
    await service.reservations(account, { searchStr: null, reservationDate: null, status: null, afterId: 0 }),
    { rows: [{ reservationId: 5 }], nextAfterId: null },
  );
  await service.checkIn(account, { reservationId: 5, remarks: null, items: [] });
  assert.deepEqual(store.sessionInput?.items, []);
  await service.markReservationNoShow(account, { reservationId: 5 });
  assert.ok(store.clientIds.every(clientId => clientId === 7n));
});

test('a reservation crossing midnight blocks the next day but allows adjacent bookings', async () => {
  const existing = {
    id: 10n,
    table_id: 1n,
    reservation_status: 1,
    reservation_time: new Date('2026-10-08T23:30:00Z'),
    duration_minutes: 90,
  };
  const database = {
    tables: { findFirst: async () => ({ table_under_maintenance: 0 }) },
    tableReservations: {
      findMany: async ({ where }: { where: { reservation_time: { lt: Date; gte?: Date }; id?: { not: bigint } } }) => {
        assert.equal(where.reservation_time.gte, undefined);
        return existing.reservation_time < where.reservation_time.lt && where.id?.not !== existing.id ? [existing] : [];
      },
    },
  };
  const { PrismaKotStore } = await import('../../../models/kot/prisma-store.ts');
  const store = new PrismaKotStore(database as never);
  const midnight = new Date('2026-10-09T00:15:00Z');
  assert.equal((await store.availability(7n, 1n, midnight, 30))?.available, false);
  assert.equal((await store.availability(7n, 1n, midnight, 30, existing.id))?.available, true);
  assert.equal((await store.availability(7n, 1n, new Date('2026-10-09T01:00:00Z'), 30))?.available, true);
});

test('the Table Reservation permission grants reservation access without granting kitchen order access', async () => {
  const auth = new Auth();
  auth.permissions[0] = { ...auth.permissions[0]!, feature: 'Restaurant', subFeature: 'Table Reservation' };
  const service = new KotService(new Store(), auth);
  assert.deepEqual(
    await service.reservations(account, { searchStr: null, reservationDate: null, status: null }),
    [{ reservationId: 5 }],
  );
  await assert.rejects(() => service.categories(account), (error: ApiError) => error.status === 403);
});

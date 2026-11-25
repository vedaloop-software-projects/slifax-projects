import assert from'node:assert/strict';import{test}from'node:test';import type{Account,AuthStore,PermissionRow}from'../../../models/auth/contracts.ts';import{advancedKotOperations,type AdvancedKotOperation,type KotAdvancedStore}from'../../../models/kot/advanced-contracts.ts';import{ApiError}from'../../auth/service.ts';import{KotAdvancedService}from'../advanced-service.ts';
import type{PrismaClient}from'@prisma/client';import{PrismaKotAdvancedStore}from'../../../models/kot/advanced-store.ts';
const account:Account={user:{id:3n,clientId:7n,name:'Waiter',mobile:'9876543210',email:'a@x',passwordHash:null,roleId:4,updatedAt:null},client:{id:7n,businessTypeId:2,businessName:'Cafe',logo:null,address:'',city:'',startDate:new Date('2025-01-01'),endDate:new Date('2030-01-01')},businessType:'Restaurant',roleTitle:'Waiter'};
class Auth implements AuthStore{permissions:PermissionRow[]=[{featureId:1n,feature:'KOT',featurePriority:1,subFeatureId:null,subFeature:null,subFeaturePriority:null,view:1,add:1,edit:1}];async findAccountByLogin(){return null}async findAccountByIdentity(){return null}async listPermissions(){return this.permissions}async getProfile(){return null}async recordAudit(){}async changePassword(){return new Date()}}
class Store implements KotAdvancedStore{calls:AdvancedKotOperation[]=[];async execute(operation:AdvancedKotOperation){this.calls.push(operation);return{operation}}}

test('table checkout rejects a different session and catches a KOT added after loading the draft', async () => {
  const draft = { table_session_id: 1n, product_id: 10n, variant_id: 20n, qty: 1, price: 100 };
  const database = {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run(database),
    kotTempTran: { findMany: async () => [draft] },
    tableSessions: { findFirst: async ({ where }: { where: { id: bigint } }) => ({ id: where.id }) },
    kotMast: { findMany: async () => [{ id: 1n }, { id: 2n }] },
    kotTran: { findMany: async () => [draft, { ...draft, variant_id: 21n }] },
  };
  const service = new KotAdvancedService(new PrismaKotAdvancedStore(database as unknown as PrismaClient), new Auth());
  const payment = [{ paymentModeId: 1, amount: 100 }];
  await assert.rejects(service.execute('saveTableBill', account, { tableSessionId: 2, totalAmount: 100, payment }), /different table session/);
  await assert.rejects(service.execute('saveTableBill', account, { tableSessionId: 1, totalAmount: 100, payment }), /Bill items changed/);
  await assert.rejects(service.execute('saveTakeawayBill', account, { billType: 2, totalAmount: 100, payment }), /belong to a table session/);
});

test('takeaway quantity removal only deletes the signed-in user’s direct item', async () => {
  let removed: Record<string, unknown> | undefined;
  const database = { kotTempTran: { deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
    removed = where;
    return { count: 1 };
  } } };
  const service = new KotAdvancedService(new PrismaKotAdvancedStore(database as unknown as PrismaClient), new Auth());
  const input = { productId: 1, variantId: 2, billType: 2, qty: 0 };
  await assert.rejects(service.execute('addDirectBillItem', account, input), /Invalid KOT request/);
  assert.deepEqual(await service.execute('addDirectBillItem', account, { ...input, replaceQuantity: true }), { deleted: 1 });
  assert.deepEqual(removed, { client_id: 7n, user_id: 3n, table_session_id: null, product_id: 1n, variant_id: 2n });
});

test('checkout saves both KOT rounds as one paid bill and closes the table', async () => {
  const lines = [100, 75].map((price, index) => ({
    table_session_id: 1n, product_id: BigInt(10 + index), variant_id: BigInt(20 + index),
    qty: 1, price, amount: price, discount_amount: 0, gst_amount: price * 0.05,
  }));
  let header: Record<string, unknown> | undefined;
  let savedLines: Record<string, unknown>[] = [];
  let savedPayments: Record<string, unknown>[] = [];
  let closed = false;
  let released = false;
  const database = {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run(database),
    kotTempTran: { findMany: async () => lines, deleteMany: async () => ({ count: 2 }) },
    tableSessions: {
      findFirst: async () => ({ id: 1n, table_id: 5n, customer_id: null }),
      update: async ({ data }: { data: { session_status: number } }) => { closed = data.session_status === 2; },
    },
    tables: { update: async ({ data }: { data: { table_status: number } }) => { released = data.table_status === 1; } },
    kotMast: { findMany: async () => [{ id: 1n }, { id: 2n }], updateMany: async () => ({ count: 2 }) },
    kotTran: { findMany: async () => lines },
    paymentModes: { findMany: async () => [{ id: 1n }, { id: 2n }] },
    billingSettings: { findFirst: async () => ({ exclusive_gst_billing: 1 }) },
    kotBillMast: {
      findFirst: async () => ({ bill_no: '8' }),
      create: async ({ data }: { data: Record<string, unknown> }) => { header = data; return { id: 9n }; },
    },
    kotBillTran: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => { savedLines = data; } },
    kotBillPayments: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => { savedPayments = data; } },
    productVariants: { updateMany: async () => ({ count: 1 }), aggregate: async () => ({ _sum: { variant_qty: 9 } }) },
    products: { updateMany: async () => ({ count: 1 }) },
    audits: { create: async () => ({}) },
  };
  const service = new KotAdvancedService(new PrismaKotAdvancedStore(database as unknown as PrismaClient), new Auth());
  const result = await service.execute('saveTableBill', account, {
    tableSessionId: 1, totalAmount: 183.75, payment: [{ paymentModeId: 1, amount: 100 }, { paymentModeId: 2, amount: 83.75 }],
  });
  assert.equal((result as { billNumber: string }).billNumber, '9');
  assert.equal(header?.table_session_id, 1n);
  assert.deepEqual(savedLines.map(line => line.bill_no), ['9', '9']);
  assert.deepEqual(savedPayments.map(payment => payment.amount), [100, 83.75]);
  assert.ok(closed && released);
});

test('bill discount allocates exact cents and recalculates GST on the discounted amount', async () => {
  const changes: Array<{ discount_amount: number; gst_amount: number }> = [];
  const database = {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run(database),
    kotTempTran: {
      findMany: async () => [1n, 2n, 3n].map(id => ({ id, amount: 10, gst_percentage: 5 })),
      update: async ({ data }: { data: typeof changes[number] }) => { changes.push(data); },
    },
    billingSettings: { findFirst: async () => ({ exclusive_gst_billing: 1 }) },
  };
  const store = new PrismaKotAdvancedStore(database as unknown as PrismaClient);
  assert.deepEqual(await store.execute('applyBillDiscount', account, { discountAmount: 1 }), { discount: 1 });
  assert.deepEqual(changes.map(row => row.discount_amount), [0.33, 0.34, 0.33]);
  assert.equal(changes[1]?.gst_amount, 0.48);
});

test('KDS item updates persist ticket status for table history', async () => {
  const items = [{ id: 2n, item_status: 1 }, { id: 3n, item_status: 1 }];
  let ticketStatus = 1;
  const database = {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run(database),
    kotMast: {
      findFirst: async () => ({ id: 1n }),
      update: async ({ data }: { data: { kot_status: number } }) => { ticketStatus = data.kot_status; },
    },
    kotTran: {
      findFirst: async ({ where }: { where: { id: bigint } }) => items.find(item => item.id === where.id),
      findMany: async () => items,
      update: async ({ where, data }: { where: { id: bigint }; data: { item_status: number } }) => {
        items.find(item => item.id === where.id)!.item_status = data.item_status;
      },
    },
  };
  const store = new PrismaKotAdvancedStore(database as unknown as PrismaClient);
  const update = (operation: AdvancedKotOperation, kotTranId: number) => store.execute(operation, account, { kotId: 1, kotTranId });
  await update('updateKotItemPreparing', 2);
  await update('updateKotItemReady', 2);
  assert.equal(ticketStatus, 2);
  await update('cancelKotItem', 3);
  assert.equal(ticketStatus, 3);
  await update('updateKotItemServed', 2);
  assert.equal(ticketStatus, 4);
  await update('updateKotItemServed', 2);
  await assert.rejects(update('updateKotItemReady', 2), /status changed/);
});

test('a second KOT uses the same business date for lookup and save', async () => {
  let lookupDate: Date | undefined;
  let savedItem: Record<string, unknown> | undefined;
  const database = {
    $transaction: async (run: (db: unknown) => Promise<unknown>) => run(database),
    tableSessions: { findFirst: async () => ({ id: 1n, table_id: 5n, waiter_id: 3n }) },
    products: { findMany: async () => [{ id: 1n }] },
    productVariants: { findMany: async () => [{ id: 2n, product_id: 1n, dine_in_price: 100 }] },
    kotMast: {
      findFirst: async ({ where }: { where: { kot_date: Date } }) => {
        assert.ok(where.kot_date instanceof Date);
        lookupDate = where.kot_date;
        return { kot_no: '1' };
      },
      create: async ({ data }: { data: { kot_date: Date; kot_no: string; table_session_id: bigint } }) => {
        assert.equal(data.kot_date.toISOString(), lookupDate?.toISOString());
        assert.equal(data.kot_date.getUTCHours(), 0);
        assert.equal(data.table_session_id, 1n);
        return { id: 9n, kot_no: data.kot_no };
      },
    },
    kotTran: { createMany: async ({ data }: { data: Record<string, unknown>[] }) => { savedItem = data[0]; } },
  };
  const store = new PrismaKotAdvancedStore(database as unknown as PrismaClient);
  const result = await store.execute('addMoreItems', account, {
    tableSessionId: 1, items: [{ productId: 1, variantId: 2, qty: 1, price: 100 }],
  });
  assert.deepEqual(result, { id: 9n, kotNumber: '2' });
  assert.equal(savedItem?.kot_id, 9n);
});
const ids={kotId:1,kotTranId:2},pay=[{paymentModeId:1,amount:100}],valid:Record<AdvancedKotOperation,unknown>={addMoreItems:{tableSessionId:1,items:[{productId:1,variantId:2,qty:1,price:100,remarks:null}],remarks:null},updateKotItemPreparing:ids,updateKotItemReady:ids,updateKotItemServed:ids,cancelKotItem:ids,addToTemp:{tableId:1},getKotTempBillItems:{},applyCoupon:{customerId:1,totalAmount:100,couponCode:'SAVE'},applyBillDiscount:{discountPercentage:10,couponId:null},saveTableBill:{tableSessionId:1,totalAmount:100,payment:pay},addDirectBillItem:{productId:1,variantId:2,qty:1,billType:2},saveTakeawayBill:{billType:2,totalAmount:100,payment:pay},KotClearTempBill:{},KotSuspendBill:{customerName:'Nila',customerMobile:null},KotResumeSuspendedBill:{suspendedNumber:'K1'},getKotDayCloseReport:{date:'08-10-2026'},kotDayClose:{},kotOveringBill:{billDate:'08-10-2026',billNo:'1'},getKotPrint:{billDate:'08-10-2026',billNumber:'1'}};
test('all remaining 19 KOT operations validate and enforce server permissions',async()=>{const store=new Store(),service=new KotAdvancedService(store,new Auth());for(const operation of advancedKotOperations)assert.deepEqual(await service.execute(operation,account,valid[operation]),{operation});assert.deepEqual(store.calls,advancedKotOperations)});
test('advanced KOT rejects invalid inputs and missing grants',async()=>{const auth=new Auth(),service=new KotAdvancedService(new Store(),auth);await assert.rejects(()=>service.execute('addMoreItems',account,{tableSessionId:1,items:[]}),(e:ApiError)=>e.status===422);auth.permissions[0]!.edit=0;await assert.rejects(()=>service.execute('cancelKotItem',account,ids),(e:ApiError)=>e.status===403)});
test('direct takeaway uses canonical takeaway price and tenant tax settings',async()=>{let created:Record<string,unknown>|undefined;const fake={products:{findFirst:async(_x:unknown)=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:10,dine_in_price:500,take_away_price:420})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:1})},kotTempTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};const store=new PrismaKotAdvancedStore(fake as unknown as PrismaClient);await store.execute('addDirectBillItem',account,{productId:1,variantId:2,qty:2,billType:2});assert.equal(created?.price,420);assert.equal(created?.amount,840);assert.equal(created?.gst_amount,42)});
test('direct KOT billing permits unavailable stock when negative inventory is enabled',async()=>{let created:Record<string,unknown>|undefined;const fake={products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:-3,dine_in_price:500,take_away_price:420})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0,allow_negative_inventory:1})},kotTempTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};const store=new PrismaKotAdvancedStore(fake as unknown as PrismaClient);await store.execute('addDirectBillItem',account,{productId:1,variantId:2,qty:2,billType:2});assert.equal(created?.qty,2)});
test('direct KOT billing rejects unavailable stock when negative inventory is disabled',async()=>{const fake={products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:0,dine_in_price:500,take_away_price:420})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0,allow_negative_inventory:0})},kotTempTran:{findFirst:async()=>null}};const store=new PrismaKotAdvancedStore(fake as unknown as PrismaClient);await assert.rejects(()=>store.execute('addDirectBillItem',account,{productId:1,variantId:2,qty:2,billType:2}),/Insufficient stock/)});
test('direct KOT billing allows unavailable stock when billing settings are absent',async()=>{let created:Record<string,unknown>|undefined;const fake={products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:0,dine_in_price:500,take_away_price:420})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>null},kotTempTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};const store=new PrismaKotAdvancedStore(fake as unknown as PrismaClient);await store.execute('addDirectBillItem',account,{productId:1,variantId:2,qty:2,billType:2});assert.equal(created?.qty,2)});

test('cancelling a KOT bill returns its stock and resyncs product quantities',async()=>{
  const increments:Array<[bigint,number]>=[],qoh:Array<[bigint,number]>=[];let mode=1,isolation:unknown
  const fake={
    $transaction:async(run:(t:unknown)=>Promise<unknown>,options:{isolationLevel?:string})=>(isolation=options?.isolationLevel,run(fake)),
    kotBillMast:{findFirst:async({where}:{where:{bill_mode:{not:number}}})=>mode===where.bill_mode.not?null:{id:5n,bill_no:'K7',bill_date:new Date('2026-10-30T06:00:00Z')},update:async({data}:{data:{bill_mode:number}})=>(mode=data.bill_mode,{})},
    kotBillTran:{findMany:async({where}:{where:{bill_no:string}})=>where.bill_no==='K7'?[{product_id:1n,variant_id:2n,qty:3},{product_id:1n,variant_id:4n,qty:1}]:[]},
    productVariants:{updateMany:async({where,data}:{where:{id:bigint},data:{variant_qty:{increment:number}}})=>(increments.push([where.id,data.variant_qty.increment]),{count:1}),aggregate:async()=>({_sum:{variant_qty:12}})},
    products:{updateMany:async({where,data}:{where:{id:bigint},data:{qoh:number}})=>(qoh.push([where.id,data.qoh]),{count:1})},
  }
  const store=new PrismaKotAdvancedStore(fake as unknown as PrismaClient)
  assert.deepEqual(await store.execute('kotOveringBill',account,{billDate:'30-10-2026',billNo:'K7'}),{cancelled:true})
  assert.deepEqual(increments,[[2n,3],[4n,1]]);assert.deepEqual(qoh,[[1n,12]]);assert.equal(mode,5);assert.equal(isolation,'Serializable')
  // A second cancel finds no open bill, so stock is not returned twice.
  await assert.rejects(()=>store.execute('kotOveringBill',account,{billDate:'30-10-2026',billNo:'K7'}),/KOT bill not found/)
  assert.equal(increments.length,2)
})

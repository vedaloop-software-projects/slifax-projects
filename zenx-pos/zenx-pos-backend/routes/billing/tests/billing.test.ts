import assert from'node:assert/strict';import{test}from'node:test';import type{Account,AuthStore,PermissionRow}from'../../../models/auth/contracts.ts';import{billingOperations,type BillingOperation,type BillingPayload,type BillingStore}from'../../../models/billing/contracts.ts';import{ApiError}from'../../auth/service.ts';import{BillingService}from'../service.ts';
import type{PrismaClient}from'@prisma/client';import{PrismaBillingStore}from'../../../models/billing/prisma-store.ts';
import{billingSuccessResponse}from'../response.ts';
const account:Account={user:{id:3n,clientId:7n,name:'Cashier',mobile:'9876543210',email:'a@x',passwordHash:null,roleId:4,updatedAt:null},client:{id:7n,businessTypeId:1,businessName:'Store',logo:null,address:'',city:'',startDate:new Date('2025-01-01'),endDate:new Date('2030-01-01')},businessType:'Retail',roleTitle:'Cashier'};
class Auth implements AuthStore{permissions:PermissionRow[]=[{featureId:1n,feature:'Billing',featurePriority:1,subFeatureId:null,subFeature:null,subFeaturePriority:null,view:1,add:1,edit:1}];async findAccountByLogin(){return null}async findAccountByIdentity(){return null}async listPermissions(){return this.permissions}async getProfile(){return null}async recordAudit(){}async changePassword(){return new Date()}}
class Store implements BillingStore{calls:Array<{operation:BillingOperation;payload:BillingPayload}>=[];async execute(operation:BillingOperation,_account:Account,payload:BillingPayload){this.calls.push({operation,payload});return{operation}}}
const withTempSummary=(fake:any,created:()=>Record<string,unknown>|undefined)=>({
  ...fake,
  products:{...fake.products,findMany:async()=>[{...(await fake.products.findFirst()),product_code:'P1',product_full_name:'Tea',product_short_name:'Tea',hsn_code:'0902'}]},
  productVariants:{...fake.productVariants,findMany:async()=>[{...(await fake.productVariants.findFirst()),ean_code:'8901',pack_size:'1 kg'}]},
  tempBillTran:{...fake.tempBillTran,findMany:async()=>created()?[{id:1n,client_id:7n,user_id:3n,product_id:1n,variant_id:2n,line_num:1,void_flag:0,free_prod_id:0n,free_variant_id:0n,free_qty:0,sm_id:null,...created()}]:[]},
  salesMans:{findMany:async()=>[]},productControls:{findMany:async()=>[]},
});
const pair={productId:1,variantId:2},payments=[{paymentModeId:1,amount:100}],valid:Record<BillingOperation,unknown>={searchEanCode:{searchStr:'123'},getCustomerByMobile:{mobile:'9876543210'},addProductToTemp:{...pair,qty:1,mrp:100,salePrice:100,wholeSalePrice:90,costPrice:50,gstPercentage:5,billMode:1,customerType:0,smId:null},updateTempProductQty:{...pair,qty:2},updateTempProductSalePrice:{...pair,salePrice:90},clearTempBill:{},updateVoid:{...pair,voidFlag:1},updateTempProductDiscount:{...pair,discountPercentage:10},getShortcutKeys:{},suspendBill:{customerName:'Nila',customerMobile:null},getProductDetails:pair,getSuspendedItems:{searchStr:null},resumeSuspendedBill:{suspendedNumber:'S1'},getTempBillItems:{},getTempBillItem:pair,updateManualDiscount:{discountValue:5},clearManualDiscount:{},getFreeProductDetails:{},saveBill:{subTotal:100,total:100,billMode:1,paymentModes:payments},getApplicableBillBuster:{totalAmount:100},applyBillBuster:{...pair,qty:1},overingBill:{billDate:'08-10-2026',billNo:1},checkRefundBill:{billDate:'08-10-2026',billNo:1},addRefundProductToTemp:{...pair,qty:1,billDate:'08-10-2026',billNumber:1},saveRefundBill:{subTotal:100,total:100,billDate:'08-10-2026',billNumber:1,paymentModes:payments},getPrint:{billDate:'08-10-2026',billNumber:1},getDayCloseReport:{date:'08-10-2026'},dayClose:{},getPendingDayCloses:{},getBillFormats:{}};
test('all 30 retail billing operations validate, authorize and reach the tenant store',async()=>{const store=new Store(),service=new BillingService(store,new Auth());for(const operation of billingOperations)assert.deepEqual(await service.execute(operation,account,valid[operation]),{operation});assert.equal(store.calls.length,30);assert.deepEqual(store.calls.map(call=>call.operation),billingOperations)});
test('billing rejects malformed totals, conflicting discounts and missing server grants',async()=>{const auth=new Auth(),service=new BillingService(new Store(),auth);await assert.rejects(()=>service.execute('saveBill',account,{subTotal:0,total:1,billMode:1,paymentModes:payments}),(e:ApiError)=>e.status===422);await assert.rejects(()=>service.execute('updateManualDiscount',account,{discountValue:1,discountPercentage:1}),(e:ApiError)=>e.status===422);auth.permissions[0]!.add=0;await assert.rejects(()=>service.execute('saveBill',account,valid.saveBill),(e:ApiError)=>e.status===403)});
test('retail temp rows ignore manipulated request prices, costs and tax',async()=>{let created:Record<string,unknown>|undefined;const fake={dayCloseDetails:{findFirst:async()=>null},products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:10,mrp:600,sale_price:500,whole_sale_price:450,cost_price:300})},taxes:{findFirst:async()=>({tax_percent:18})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0})},itemWiseDiscounts:{findMany:async()=>[]},tempBillTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};const store=new PrismaBillingStore(withTempSummary(fake,()=>created) as unknown as PrismaClient);await store.execute('addProductToTemp',account,{productId:1,variantId:2,qty:1,mrp:1,salePrice:1,wholeSalePrice:1,costPrice:1,gstPercentage:0,billMode:1,customerType:1});assert.equal(created?.sale_price,500);assert.equal(created?.price_override,500);assert.equal(created?.mrp,600);assert.equal(created?.cost_price,300);assert.equal(created?.gst_percentage,18)});
test('addProductToTemp accepts legacy numeric strings and server-owned catalogue fields may be omitted',async()=>{const store=new Store(),service=new BillingService(store,new Auth());await service.execute('addProductToTemp',account,{productId:'1',variantId:'2',qty:'1',billMode:'1',customerType:'',smId:''});assert.deepEqual(store.calls[0]?.payload,{productId:1,variantId:2,qty:1,billMode:1,customerType:null,smId:null})});
test('legacy empty optional numbers do not cause 422 responses',async()=>{const store=new Store(),service=new BillingService(store,new Auth());await service.execute('updateTempProductDiscount',account,{productId:'1',variantId:'2',discountPercentage:null,discountValue:'20'});assert.deepEqual(store.calls[0]?.payload,{productId:1,variantId:2,discountPercentage:undefined,discountValue:20});await service.execute('addProductToTemp',account,{productId:'1',variantId:'2',qty:'1',billMode:'4',mrp:null});assert.equal(store.calls[1]?.payload.billMode,4)});
test('temporary bill construction permits an item to be added before stock is available',async()=>{let created:Record<string,unknown>|undefined;const fake={dayCloseDetails:{findFirst:async()=>null},products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:0,mrp:600,sale_price:500,whole_sale_price:450,cost_price:300})},taxes:{findFirst:async()=>({tax_percent:18})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0})},itemWiseDiscounts:{findMany:async()=>[]},tempBillTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};const store=new PrismaBillingStore(withTempSummary(fake,()=>created) as unknown as PrismaClient);await store.execute('addProductToTemp',account,{productId:1,variantId:2,qty:1,billMode:1,customerType:null,smId:null});assert.equal(created?.qty,1)});
test('saveBill accepts legacy cash change and normalizes it numerically',async()=>{const store=new Store(),service=new BillingService(store,new Auth());await service.execute('saveBill',account,{subTotal:'100',total:'90',billMode:'1',paymentModes:[{paymentModeId:'1',amount:'100',cashChange:'10'}]});assert.deepEqual(store.calls[0]?.payload.paymentModes,[{paymentModeId:1,amount:100,cashChange:10}])});
test('active item-wise discount is applied when a product enters the temporary bill',async()=>{let created:Record<string,unknown>|undefined;const fake={dayCloseDetails:{findFirst:async()=>null},products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,mrp:100,sale_price:100,whole_sale_price:90,cost_price:60})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0})},itemWiseDiscounts:{findMany:async()=>[{id:4n,purchase_qty:2,discount_percentage:10,discount_value:0,free_product_id:0n,free_variant_id:0n,free_qty:0}]},tempBillTran:{findFirst:async()=>null,create:async({data}:{data:Record<string,unknown>})=>(created=data)}};await new PrismaBillingStore(withTempSummary(fake,()=>created) as unknown as PrismaClient).execute('addProductToTemp',account,{productId:1,variantId:2,qty:2,billMode:1,customerType:null,smId:null});assert.equal(created?.manual_discount_value,20);assert.equal(created?.manual_discount_percentage,10);assert.equal(created?.scheme_type,2);assert.equal(Number(created?.gst_amount).toFixed(3),'8.571')});
test('shortcut keys use active master rows because client settings have no status column',async()=>{let settingsWhere:unknown;const fake={dayCloseDetails:{findFirst:async()=>null},keyMappingMasters:{findMany:async()=>[{id:2n,key_name:'Price Override'}]},keyMappingSettings:{findMany:async({where}:{where:unknown})=>(settingsWhere=where,[{id:7n,key_mapping_id:2n,short_key:'F6'}])}};const store=new PrismaBillingStore(fake as unknown as PrismaClient),rows=await store.execute('getShortcutKeys',account,{}) as Array<Record<string,unknown>>;assert.deepEqual(settingsWhere,{client_id:7n,key_mapping_id:{in:[2n]}});assert.deepEqual(rows,[{id:7,keyMappingId:2,keyName:'Price Override',shortKey:'F6'}])});
test('applicable bill busters query real columns and include product details',async()=>{let query:Record<string,unknown>|undefined;const fake={dayCloseDetails:{findFirst:async()=>null},billBusters:{findMany:async(value:Record<string,unknown>)=>(query=value,[{id:30n,client_id:7n,scheme_name:'Festival',bill_amount:500,discount_percentage:10,from_date:new Date('2026-10-01T00:00:00+05:30'),to_date:new Date('2026-10-31T00:00:00+05:30'),status:1}])},childBillBusters:{findMany:async()=>[{id:31n,client_id:7n,bill_buster_id:30n,product_id:2n,variant_id:3n,free_qty:1,discount_percentage:0}]},products:{findMany:async()=>[{id:2n,product_full_name:'Tea'}]},productVariants:{findMany:async()=>[{id:3n,product_id:2n,pack_size:'1 kg'}]}};const store=new PrismaBillingStore(fake as unknown as PrismaClient),rows=await store.execute('getApplicableBillBuster',account,{totalAmount:600}) as Array<Record<string,unknown>>;const where=query?.where as Record<string,unknown>;assert.equal(where.client_id,7n);assert.equal(where.status,1);assert.deepEqual(where.bill_amount,{lte:600});assert.equal('trash'in where,false);assert.equal('min_amount'in where,false);assert.deepEqual(query?.orderBy,{bill_amount:'desc'});assert.deepEqual(rows,[{id:30,schemeName:'Festival',billAmount:'500.00',discountPercentage:'10.00',fromDate:'01-10-2026',toDate:'31-10-2026',childBillBusters:[{id:31,productId:2,productName:'Tea',variantId:3,packSize:'1 kg',freeQty:1,discountPercentage:0}]}])});
test('applyBillBuster accepts the deployed frontend freeQty alias',async()=>{const store=new Store(),service=new BillingService(store,new Auth());await service.execute('applyBillBuster',account,{productId:'1',variantId:'2',freeQty:'2',discountPercentage:null});assert.deepEqual(store.calls[0]?.payload,{productId:1,variantId:2,freeQty:2,discountPercentage:undefined})});
test('bill-level manual and automatic discounts use only the highest offer',async()=>{const updates:Array<Record<string,unknown>>=[];const row={id:4n,client_id:7n,user_id:3n,product_id:1n,variant_id:2n,qty:1,sale_price:100,gst_percentage:5,void_flag:0};const fake={dayCloseDetails:{findFirst:async()=>null},tempBillTran:{findMany:async()=>[row],update:async({data}:{data:Record<string,unknown>})=>(updates.push(data),data)},billingSettings:{findFirst:async()=>({exclusive_gst_billing:0})},itemWiseDiscounts:{findMany:async()=>[{id:9n,purchase_qty:1,discount_percentage:10,discount_value:0,free_product_id:0n,free_variant_id:0n,free_qty:0}]},$transaction:async(values:Array<Promise<unknown>>)=>Promise.all(values)};const store=new PrismaBillingStore(fake as unknown as PrismaClient);const automatic=await store.execute('updateManualDiscount',account,{discountPercentage:5}) as{discount:number};assert.equal(automatic.discount,10);assert.equal(Number(updates[0]?.manual_discount_value),10);assert.equal(updates[0]?.scheme_type,2);assert.equal(Number(updates[0]?.gst_amount).toFixed(3),'4.286');const manual=await store.execute('updateManualDiscount',account,{discountPercentage:20}) as{discount:number};assert.equal(manual.discount,20);assert.equal(Number(updates[1]?.manual_discount_value),20);assert.equal(updates[1]?.scheme_type,1);assert.equal(updates[1]?.free_prod_id,0n);assert.equal(Number(updates[1]?.gst_amount).toFixed(3),'3.810');await store.execute('clearManualDiscount',account,{});assert.equal(Number(updates[2]?.manual_discount_value),10);assert.equal(updates[2]?.scheme_type,2);assert.equal(Number(updates[2]?.gst_amount).toFixed(3),'4.286')});
test('getProductDetails returns display values, controls and active promotions instead of raw IDs alone',async()=>{const activeFrom=new Date('2026-10-01'),activeTo=new Date('2026-10-31');const fake={dayCloseDetails:{findFirst:async()=>null},products:{findFirst:async()=>({id:1n,client_id:7n,product_code:'P1',product_short_name:'Tea',product_full_name:'Tea Pack',category_id:10n,sub_category_id:11n,brand_id:12n,unit_type_id:13n,qoh:4,hsn_code:'0902',tax_id:14n,product_image:null,status:1,trash:0}),findMany:async()=>[]},productVariants:{findFirst:async()=>({id:2n,product_id:1n,client_id:7n,variant_code:'P1-1KG',ean_code:'8901',pack_size:'1kg',size_id:15n,colour_id:16n,basic_cost:70,cost_price:80,mrp:120,sale_price:100,whole_sale_price:95,dine_in_price:0,take_away_price:0,salon_duration:0,variant_qty:4,priority:1,status:1,trash:0}),findMany:async()=>[]},categories:{findFirst:async()=>({category_name:'Beverages'})},subCategories:{findFirst:async()=>({sub_category_name:'Tea'})},brands:{findFirst:async()=>({brand_name:'Zen'})},unitTypes:{findFirst:async()=>({unit_type_name:'Kilograms'})},taxes:{findFirst:async()=>({tax_name:'GST 5%',tax_percent:5})},sizes:{findFirst:async()=>({size_name:'Large'})},colours:{findFirst:async()=>({colour_name:'Green'})},productControls:{findFirst:async()=>({allow_weighing_scale:1,allow_decimals:1,allow_discount:1,allow_price_override:0,kot_required:0,kit:0})},groupWiseDiscounts:{findMany:async()=>[{id:20n,group_type:1,group_id:10n,discount:5,from_date:activeFrom,to_date:activeTo,status:1}]},itemWiseDiscounts:{findMany:async()=>[]},purchaseWiseDiscounts:{findMany:async()=>[]},childHappyHours:{findMany:async()=>[]},childGroupWiseHappyHours:{findMany:async()=>[]},childPurchaseWiseDiscounts:{findMany:async()=>[]},happyHours:{findMany:async()=>[]},groupWiseHappyHours:{findMany:async()=>[]}};const data=await new PrismaBillingStore(fake as unknown as PrismaClient).execute('getProductDetails',account,{productId:1,variantId:2}) as any;assert.equal(data.product.categoryName,'Beverages');assert.equal(data.product.brandName,'Zen');assert.equal(data.product.taxPercentage,5);assert.equal(data.variant.eanCode,'8901');assert.equal(data.controls.allowWeighingScale,1);assert.deepEqual(data.promotions.groupWise[0],{id:20,groupType:1,groupId:10,groupName:'Beverages',discount:5,fromDate:'01-10-2026',toDate:'31-10-2026',status:1})});

const tempRows = [
  { id: 4n, client_id: 7n, user_id: 3n, product_id: 1n, variant_id: 2n, qty: 3, mrp: 60, sale_price: 55,
    price_override: 55, cost_price: 45, line_num: 1, gst_percentage: 5, gst_amount: 7.857,
    manual_discount_percentage: 0, manual_discount_value: 0, scheme_type: 0, void_flag: 0,
    free_prod_id: 0n, free_variant_id: 0n, free_qty: 0, bill_mode: 1, sm_id: null },
  { id: 5n, client_id: 7n, user_id: 3n, product_id: 3n, variant_id: 4n, qty: 2, mrp: 20, sale_price: 10,
    price_override: 10, cost_price: 8, line_num: 2, gst_percentage: 5, gst_amount: 0.952,
    manual_discount_percentage: 10, manual_discount_value: 2, scheme_type: null, void_flag: 1,
    free_prod_id: 6n, free_variant_id: 7n, free_qty: 1, bill_mode: 1, sm_id: 9n },
]

function tempStore() {
  const fake = {
    tempBillTran: { findMany: async () => tempRows },
    products: { findMany: async () => [
      { id: 1n, product_code: 'PR001', product_full_name: 'Coca Cola', product_short_name: 'Coke', ean_code: '123456789', hsn_code: '220210' },
      { id: 3n, product_code: 'PR003', product_full_name: 'Chips', product_short_name: 'Chips', ean_code: null, hsn_code: '190590' },
      { id: 6n, product_code: 'FREE1', product_full_name: 'Gift', product_short_name: 'Gift', ean_code: 'FREE-EAN', hsn_code: '950300' },
    ] },
    productVariants: { findMany: async () => [
      { id: 2n, product_id: 1n, variant_code: 'PR001-1L', ean_code: '123456789', pack_size: '1L', mrp: 60, sale_price: 55 },
      { id: 4n, product_id: 3n, variant_code: 'PR003-100G', ean_code: null, pack_size: '100g', mrp: 20, sale_price: 10 },
      { id: 7n, product_id: 6n, variant_code: 'FREE1-1PC', ean_code: 'FREE-EAN', pack_size: '1pc', mrp: 5, sale_price: 4 },
    ] },
    salesMans: { findMany: async () => [{ id: 9n, sm_code: 'S9', sm_name: 'Sam' }] },
    productControls: { findMany: async () => [
      { product_id: 1n, allow_weighing_scale: 1, allow_decimals: 1, allow_discount: 1, allow_price_override: 0, kot_required: 0, kit: 0 },
      { product_id: 3n, allow_weighing_scale: 0, allow_decimals: 0, allow_discount: 1, allow_price_override: 1, kot_required: 0, kit: 0 },
    ] },
  }
  return new PrismaBillingStore(fake as unknown as PrismaClient)
}

test('getTempBillItems preserves the complete Laravel response contract and aggregate rules', async () => {
  const data = await tempStore().execute('getTempBillItems', account, {}) as any
  assert.deepEqual({ totalItems: data.totalItems, totalQty: data.totalQty, subTotal: data.subTotal, totalDiscount: data.totalDiscount, totalGst: data.totalGst, roundOff: data.roundOff },
    { totalItems: 1, totalQty: 3, subTotal: 165, totalDiscount: 0, totalGst: 7.857, roundOff: 0 })
  assert.equal(data.items.length, 2)
  assert.deepEqual(data.items[0], {
    id: 4, productId: 1, variantId: 2, productCode: 'PR001', productFullName: 'Coca Cola', productShortName: 'Coke',
    eanCode: '123456789', hsnCode: '220210', qty: '3.000', packSize: '1L', mrp: '60.00', salePrice: '55.000', priceOverride: '55.000',
    costPrice: '45.000', lineNum: 1, discountPercentage: '0.00', discountAmount: '0.00', gstPercentage: '5.00',
    gstAmount: '7.857', schemeType: 0, freeProductId: 0, freeVariantId: 0, freeQty: '0.000', freeProductName: null,
    freeProductShortName: null, freeProductCode: null, freeProductEanCode: null, freeVariantName: null, freePackSize: null,
    freeVariantMrp: null, freeVariantSalePrice: null, allowWeighingScale: 1, allowDecimals: 1, allowDiscount: 1,
    allowPriceOverride: 0, kotRequired: 0, kit: 0, voidFlag: 0,
    billMode: 1, smId: null, salesmanCode: null, salesmanName: null,
  })
  assert.equal(typeof data.items[0].productId, 'number')
  assert.equal(data.items[1].freeProductName, 'Gift')
  assert.equal(data.items[1].salesmanName, 'Sam')
})

test('getFreeProductDetails returns the free catalogue item and its variant prices', async () => {
  const data = await tempStore().execute('getFreeProductDetails', account, {}) as any[]
  assert.equal(data.length, 1)
  assert.deepEqual({
    freeProductId: data[0].freeProductId,
    freeProductName: data[0].freeProductName,
    freeProductCode: data[0].freeProductCode,
    freeProductEanCode: data[0].freeProductEanCode,
    freeVariantId: data[0].freeVariantId,
    freePackSize: data[0].freePackSize,
    freeQty: data[0].freeQty,
    mrp: data[0].mrp,
    salePrice: data[0].salePrice,
  }, {
    freeProductId: 6,
    freeProductName: 'Gift',
    freeProductCode: 'FREE1',
    freeProductEanCode: 'FREE-EAN',
    freeVariantId: 7,
    freePackSize: '1pc',
    freeQty: '1.000',
    mrp: 5,
    salePrice: 4,
  })
})

test('getTempBillItem filters only items while keeping totals for the entire active bill', async () => {
  const data = await tempStore().execute('getTempBillItem', account, { productId: 3, variantId: 4 }) as any
  assert.equal(data.totalItems, 1)
  assert.equal(data.subTotal, 165)
  assert.equal(data.items.length, 1)
  assert.equal(data.items[0].productId, 3)
})

test('billing response presenter returns the refreshed add result and hides other internal mutation rows', () => {
  assert.deepEqual(billingSuccessResponse('addProductToTemp', { totalItems: 1, items: [{ productId: 2 }] }),
    { success: true, message: 'Product added successfully.', data: { totalItems: 1, items: [{ productId: 2 }] } })
  assert.deepEqual(billingSuccessResponse('updateTempProductQty', { id: 99n }), { success: true, message: 'Quantity updated successfully.', data: null })
  assert.deepEqual(billingSuccessResponse('getTempBillItems', { items: [] }), { success: true, message: 'Billing items fetched successfully.', data: { items: [] } })
  assert.deepEqual(billingSuccessResponse('saveBill', { id: 8n, billNumber: 12, billDate: 'now', total: 100 }),
    { success: true, message: 'Bill generated successfully.', data: { billId: 8, billNo: 12, billDate: 'now', total: 100 } })
})

test('bill buster accepts the deployed dual quantity payload', async () => {
 const store = new Store(); await new BillingService(store, new Auth()).execute('applyBillBuster', account, { productId: 1, variantId: 2, qty: 1, freeQty: 2, discountPercentage: 0 });
 assert.equal(store.calls[0]?.payload.freeQty, 2);
});
test('closed day rejects billing writes before any stock or bill mutation', async () => {
 const fake = { dayCloseDetails: { findFirst: async () => ({ id: 1n }) } };
 await assert.rejects(() => new PrismaBillingStore(fake as unknown as PrismaClient).execute('addProductToTemp', account, { productId: 1, variantId: 2, qty: 1 }), (error: ApiError) => error.status === 409);
});

test('billing preserves the intentional day-close conflict status', async () => {
 const store = {execute:async()=>{throw new ApiError(409,'Day is closed. Billing resumes on the next business date.')}} as unknown as BillingStore;
 await assert.rejects(()=>new BillingService(store,new Auth()).execute('addProductToTemp',account,valid.addProductToTemp),(error:ApiError)=>error.status===409)
})
test('day close reports retain archived sales and expenses after current tables are emptied', async () => {
 const billDate=new Date('2026-10-23T05:00:00Z'); let expenseRange:any;
 const fake={billMaster:{findMany:async()=>[]},prevBillMaster:{findMany:async()=>[{bill_num:1,bill_date:billDate,user_id:3n,net_amount:100}]},billPayments:{findMany:async()=>[]},prevBillPayments:{findMany:async()=>[{bill_num:1,bill_date:billDate,payment_mode_id:1n,amount:100,tendered_change:1}]},paymentModes:{findMany:async()=>[{id:1n,payment_mode:'Cash'}]},taxBreakup:{findMany:async()=>[]},expenses:{findMany:async({where}:any)=>{expenseRange=where.transaction_date;return [{expense_head_id:1n,expense_type:2,amount:10}]}},expenseHeads:{findMany:async()=>[{id:1n,expense_head:'Supplies'}]},clientUsers:{findMany:async()=>[{id:3n,name:'Cashier'}]},users:{findFirst:async()=>null},dayCloseDetails:{findFirst:async()=>({id:1n})}};
 const result=await new PrismaBillingStore(fake as unknown as PrismaClient).execute('getDayCloseReport',account,{date:'23-10-2026'}) as any;
 assert.equal(result.totalBills,1);assert.equal(result.totalSales,100);assert.equal(result.expenses.totalExpense,10);assert.equal(result.dayClosed,true);assert.equal(expenseRange.gte.toISOString(),'2026-10-23T00:00:00.000Z')
})

test('disabled negative inventory rejects adding an unavailable item before a temp write',async()=>{
 let written=false;
 const fake={dayCloseDetails:{findFirst:async()=>null},products:{findFirst:async()=>({id:1n,tax_id:9n})},productVariants:{findFirst:async()=>({id:2n,product_id:1n,variant_qty:0,mrp:100,sale_price:100})},taxes:{findFirst:async()=>({tax_percent:5})},billingSettings:{findFirst:async()=>({allow_negative_inventory:0})},tempBillTran:{findFirst:async()=>null,create:async()=>{written=true}}};
 await assert.rejects(()=>new PrismaBillingStore(fake as unknown as PrismaClient).execute('addProductToTemp',account,{productId:1,variantId:2,qty:1}),(error:ApiError)=>error.status===409&&/Insufficient stock/.test(error.message));assert.equal(written,false)
})

test('getPrint accepts latest-bill read requests and preserves existing explicit lookups',async()=>{
 const store=new Store(),service=new BillingService(store,new Auth());
 await service.execute('getPrint',account,{latest:true});assert.deepEqual(store.calls[0]?.payload,{latest:true});
 await service.execute('getPrint',account,{billNumber:10,billDate:'24-10-2026'});assert.deepEqual(store.calls[1]?.payload,{billNumber:10,billDate:'24-10-2026'});
 await assert.rejects(()=>service.execute('getPrint',account,{latest:false}),(error:ApiError)=>error.status===422)
});
test('last saved bill lookup selects the newest cashier sale across current and archive without mutations',async()=>{
 for(const archiveWins of [false,true]){
  const queries:any[]=[];
  const current={bill_num:20,bill_date:new Date('2026-10-24T07:00:00Z'),created_at:new Date('2026-10-24T07:00:00Z')};
  const archived={bill_num:19,bill_date:new Date('2026-10-24T06:00:00Z'),created_at:new Date(archiveWins?'2026-10-24T08:00:00Z':'2026-10-24T06:00:00Z')};
  const fake={billMaster:{findFirst:async(q:any)=>{queries.push(q);return current}},prevBillMaster:{findFirst:async(q:any)=>{queries.push(q);return archived}}};
  const store=new PrismaBillingStore(fake as unknown as PrismaClient);let requested:any[]=[];
  (store as any).printBill=async(...args:any[])=>{requested=args;return{billDetails:{billNumber:args[1]}}};
  const data=await store.execute('getPrint',account,{latest:true}) as any;
  assert.equal(data.billDetails.billNumber,archiveWins?19:20);assert.equal(requested[0],7n);
  for(const query of queries)assert.deepEqual(query.where,{client_id:7n,user_id:3n,bill_mode:1});
 }
});
test('last saved bill returns a clear empty state when the cashier has no sales',async()=>{
 const fake={billMaster:{findFirst:async()=>null},prevBillMaster:{findFirst:async()=>null}};
 await assert.rejects(()=>new PrismaBillingStore(fake as unknown as PrismaClient).execute('getPrint',account,{latest:true}),(error:ApiError)=>error.status===404&&/No saved bills/.test(error.message))
});


test('bill numbering uses archived maxima when reset is off and India calendar dates when on', async () => {
 const { nextBillNumber } = await import('../../../models/billing/prisma-store.ts');
 let locked = false;
 const now = new Date('2026-10-24T19:00:00Z');
 const fake = {
  $queryRaw: async (_sql: unknown, tenant: bigint) => { assert.equal(tenant, 7n); locked = true; },
  billMaster: { aggregate: async ({ where }: any) => { assert.ok(locked); assert.equal(where.client_id, 7n); return { _max: { bill_num: null } }; } },
  prevBillMaster: { aggregate: async ({ where }: any) => {
   assert.ok(locked); assert.equal(where.client_id, 7n);
   if (where.bill_date) { assert.equal(where.bill_date.gte.toISOString(), '2026-10-24T18:30:00.000Z'); assert.equal(where.bill_date.lt.toISOString(), '2026-10-25T18:30:00.000Z'); }
   return { _max: { bill_num: where.bill_date ? null : 59 } };
  } },
 };
 assert.equal(await nextBillNumber(fake as any, 7n, now, false), 60);
 assert.equal(await nextBillNumber(fake as any, 7n, now, true), 1);
 fake.billMaster.aggregate = async () => ({ _max: { bill_num: 3 } }) as any;
 assert.equal(await nextBillNumber(fake as any, 7n, now, true), 4);
});

test('day close report groups tax for every bill mode', async () => {
 const d=new Date('2026-10-23T05:00:00Z');
 const modes=[{bill_num:1,bill_date:d,bill_mode:1},{bill_num:2,bill_date:d,bill_mode:4},{bill_num:3,bill_date:d,bill_mode:5}];
 const fake={billMaster:{findMany:async({select}:any)=>select?.bill_mode?modes:[]},prevBillMaster:{findMany:async()=>[]},billPayments:{findMany:async()=>[]},prevBillPayments:{findMany:async()=>[]},paymentModes:{findMany:async()=>[]},taxBreakup:{findMany:async()=>[{bill_num:1,bill_date:d,tax_percentage:5,amount:5,tax_amount:100},{bill_num:2,bill_date:d,tax_percentage:5,amount:-1,tax_amount:-20},{bill_num:3,bill_date:d,tax_percentage:12,amount:12,tax_amount:100}]},expenses:{findMany:async()=>[]},expenseHeads:{findMany:async()=>[]},clientUsers:{findMany:async()=>[]},users:{findFirst:async()=>null},dayCloseDetails:{findFirst:async()=>null}};
 const result=await new PrismaBillingStore(fake as unknown as PrismaClient).execute('getDayCloseReport',account,{date:'23-10-2026'}) as any;
 assert.deepEqual(result.taxByBillMode.map((row:any)=>[row.billModeName,row.totalGstAmount,row.totalTaxable]),[['Sale',5,100],['Refund',-1,-20],['Cancelled',12,100]])
})

test('save and cancel responses carry the bill mode and its tax breakup', () => {
 const taxBreakup=[{taxPercentage:5,gstAmount:-1,taxableAmount:-20}];
 assert.deepEqual(billingSuccessResponse('saveRefundBill',{id:9n,billNumber:4,billDate:'now',total:21,billMode:4,billModeName:'Refund',taxBreakup}).data,{billId:9,billNo:4,billDate:'now',total:21,billMode:4,billModeName:'Refund',taxBreakup});
 assert.deepEqual(billingSuccessResponse('overingBill',{cancelled:true,billMode:5,taxBreakup}).data,{cancelled:true,billMode:5,taxBreakup})
})

test('day close of a past date requires earlier days first and archives only up to that date', async () => {
 const { closeBusinessDay, reopenBusinessDay, pendingDayCloses } = await import('../../../models/billing/day-close.ts')
 const day = (v: string) => new Date(`${v}T06:00:00Z`), now = day('2026-10-27')
 let live = [{ id: 1n, client_id: 7n, bill_date: day('2026-10-25') }, { id: 2n, client_id: 7n, bill_date: day('2026-10-26') }, { id: 3n, client_id: 7n, bill_date: day('2026-10-27') }]
 let archived: any[] = [], closes: any[] = []
 const inRange = (d: Date, w: any) => (!w?.gte || d >= w.gte) && (!w?.lt || d < w.lt)
 const table = (get: () => any[], set: (v: any[]) => void) => ({
  findMany: async ({ where }: any) => get().filter(r => inRange(r.bill_date, where?.bill_date)),
  findFirst: async ({ where }: any) => get().filter(r => inRange(r.bill_date, where?.bill_date)).sort((a, b) => a.bill_date - b.bill_date)[0] ?? null,
  createMany: async ({ data }: any) => { set([...get(), ...data]) },
  deleteMany: async ({ where }: any) => { set(get().filter(r => !inRange(r.bill_date, where?.bill_date))) },
 })
 const empty = { findMany: async () => [], createMany: async () => {}, deleteMany: async () => {} }
 const tx: any = {
  $queryRaw: async () => [], audits: { create: async () => {} },
  billMaster: table(() => live, v => { live = v }), prevBillMaster: table(() => archived, v => { archived = v }),
  billTran: empty, billPayments: empty, prevBillTran: empty, prevBillPayments: empty,
  dayCloseDetails: { findFirst: async ({ where }: any) => closes.find(r => inRange(r.day_close_date, where.day_close_date)) ?? null, findMany: async ({ where }: any) => closes.filter(r => inRange(r.day_close_date, where.day_close_date)), create: async ({ data }: any) => { closes.push({ id: BigInt(closes.length + 1), ...data }) }, update: async ({ where, data }: any) => { Object.assign(closes.find(r => r.id === where.id), data) }, deleteMany: async ({ where }: any) => { closes = closes.filter(r => !where.id.in.includes(r.id)) } },
 }
 const db: any = { ...tx, $transaction: async (fn: any) => fn(tx) }
 const actor = { clientId: 7n, userId: 3n, auditDescription: 'test' }
 assert.deepEqual(await pendingDayCloses(db, 7n, now), ['25-10-2026', '26-10-2026'])
 await assert.rejects(() => closeBusinessDay(db, actor, day('2026-10-26'), now), (e: ApiError) => e.status === 409 && /25-10-2026 first/.test(e.message))
 await assert.rejects(() => closeBusinessDay(db, actor, day('2026-10-28'), now), (e: ApiError) => e.status === 422)
 await closeBusinessDay(db, actor, day('2026-10-25'), now)
 assert.deepEqual(live.map(r => r.id), [2n, 3n]); assert.equal(closes[0].day_close_date.toISOString(), '2026-10-25T18:29:59.000Z')
 await closeBusinessDay(db, actor, day('2026-10-26'), now)
 assert.deepEqual(live.map(r => r.id), [3n])
 await closeBusinessDay(db, actor, day('2026-10-26'), now); assert.equal(closes.length, 2, 're-closing re-stamps the existing row')
 await reopenBusinessDay(db, actor, day('2026-10-26'), now)
 assert.deepEqual(live.map(r => r.bill_date.toISOString().slice(0, 10)).sort(), ['2026-10-26', '2026-10-27']); assert.equal(closes.length, 1)
})

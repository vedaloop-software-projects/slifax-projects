import { z } from 'zod'
import type { Account, AuthStore } from '../../models/auth/contracts.ts'
import type { AdvancedKotOperation, KotAdvancedStore } from '../../models/kot/advanced-contracts.ts'
import { ApiError } from '../auth/service.ts'

const id=z.number().int().positive().safe(),amount=z.number().finite().min(0).max(1e9),qty=z.number().finite().positive().max(1000),nullable=z.string().trim().max(255).nullable().optional(),date=z.string().regex(/^\d{2}-\d{2}-\d{4}$/),payment=z.object({paymentModeId:id,amount}).strict(),item=z.object({productId:id,variantId:id,qty,price:amount,remarks:nullable}).strict(),object=(shape:z.ZodRawShape)=>z.object(shape).strict()
const schemas:Record<AdvancedKotOperation,z.ZodType>={
 addMoreItems:object({tableSessionId:id,items:z.array(item).min(1).max(100),remarks:nullable}),
 updateKotItemPreparing:object({kotId:id,kotTranId:id}),updateKotItemReady:object({kotId:id,kotTranId:id}),updateKotItemServed:object({kotId:id,kotTranId:id}),cancelKotItem:object({kotId:id,kotTranId:id}),
 addToTemp:object({tableId:id}),getKotTempBillItems:object({}),
 applyCoupon:object({customerId:id,totalAmount:amount,couponCode:z.string().trim().min(1).max(50)}),
 applyBillDiscount:object({discountPercentage:amount.max(100).optional(),discountAmount:amount.optional(),couponId:id.nullable().optional()}).refine(v=>(v.discountPercentage===undefined)!==(v.discountAmount===undefined),'Choose one discount type.'),
 saveTableBill:object({tableSessionId:id,totalAmount:amount,payment:z.array(payment).min(1).max(20),additionalCharges:amount.optional(),roundOffValue:z.number().finite().min(-1000).max(1000).optional(),billMode:z.number().int().min(1).max(4).optional()}),
 addDirectBillItem:object({productId:id,variantId:id,qty,billType:z.union([z.literal(1),z.literal(2)])}),
 saveTakeawayBill:object({billType:z.union([z.literal(1),z.literal(2)]),totalAmount:amount,payment:z.array(payment).min(1).max(20),additionalCharges:amount.optional(),roundOffValue:z.number().finite().min(-1000).max(1000).optional(),customerId:id.nullable().optional(),billMode:z.number().int().min(1).max(4).optional()}),
 KotClearTempBill:object({}),KotSuspendBill:object({customerName:nullable,customerMobile:z.string().regex(/^[6-9]\d{9}$/).nullable().optional()}).refine(v=>Boolean(v.customerName||v.customerMobile),'Customer is required.'),KotResumeSuspendedBill:object({suspendedNumber:z.string().trim().min(1).max(255)}),
 getKotDayCloseReport:object({date}),kotDayClose:object({}),kotOveringBill:object({billDate:date,billNo:z.union([id,z.string().trim().min(1).max(255)])}),getKotPrint:object({billDate:date,billNumber:z.union([id,z.string().trim().min(1).max(255)])}),
}
const edits=new Set<AdvancedKotOperation>(['updateKotItemPreparing','updateKotItemReady','updateKotItemServed','cancelKotItem','KotClearTempBill','applyBillDiscount','kotDayClose','kotOveringBill'])
const adds=new Set<AdvancedKotOperation>(['addMoreItems','addToTemp','saveTableBill','addDirectBillItem','saveTakeawayBill','KotSuspendBill','KotResumeSuspendedBill'])
const norm=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,'')
export class KotAdvancedService{private readonly store:KotAdvancedStore;private readonly auth:AuthStore;constructor(store:KotAdvancedStore,auth:AuthStore){this.store=store;this.auth=auth}async execute(operation:AdvancedKotOperation,account:Account,body:unknown={}){const grant=edits.has(operation)?'edit':adds.has(operation)?'add':'view',permissions=await this.auth.listPermissions(account.client.id,account.user.roleId);if(!permissions.some(p=>p[grant]===1&&norm(p.subFeature??p.feature).includes('kot')))throw new ApiError(403,'You do not have permission to perform this action.');const parsed=schemas[operation].safeParse(body);if(!parsed.success)throw new ApiError(422,'Invalid KOT request.');try{return await this.store.execute(operation,account,parsed.data as Record<string,unknown>)}catch(error){if(error instanceof Error&&/^(Invalid|No |Table |KOT |Final |Duplicate|Coupon|Discount|Bill |Payment|Insufficient|Clear |A suspended|Day is|Suspended)/.test(error.message)){const status=/not found|unavailable/i.test(error.message)?404:/changed|already|Final|current/i.test(error.message)?409:422;throw new ApiError(status,error.message)}throw error}}}

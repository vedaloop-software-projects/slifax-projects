import { z } from 'zod';
import type { Account, AuthStore } from '../../models/auth/contracts.ts';
import type { SettingsStore } from '../../models/settings/contracts.ts';
import { ApiError } from '../auth/service.ts';

const flag = z.union([z.literal(0), z.literal(1)]).default(0);
const text = z.string().trim().max(255).nullable().default(null);
const description = z.object({ id: z.number().int().positive().safe().nullable().default(null), description: z.string().trim().min(1).max(255) });
const hardware = z.object({
  printerPath: text, networkPath: text, kotPrinterPath: text,
  barcodePath: text, barcodePrinterName: text, barcodePort: text,
  weighingMachineBrand: text, weighingMachinePort: text,
  printMode: z.enum(['escpos', 'image']).default('escpos'),
  paperWidth: z.union([z.literal(58), z.literal(80)]).default(80),
  weighingBaudRate: z.union([1200, 2400, 4800, 9600, 19200, 38400].map(value => z.literal(value))).default(9600),
  weighingDataBits: z.union([z.literal(7), z.literal(8)]).default(8),
  weighingStopBits: z.union([z.literal(1), z.literal(2)]).default(1),
  weighingParity: z.enum(['none', 'even', 'odd']).default('none'),
  cashDrawer: flag,
  cashDrawerPin: z.union([z.literal(0), z.literal(1)]).default(0),
  openDrawerAfterSale: z.union([z.literal(0), z.literal(1)]).default(1),
});
const billing = z.object({billPrefix:text,billCaption:text,paymentModeId:z.number().int().min(0).safe().default(0),billFormatNumber:text,refundDays:text,discountOnDiscountedItems:flag,companyLogoOnBills:flag,confirmationToPrintBill:flag,askSalesmanCode:flag,happyHours:flag,askQtyWhileAddingItems:flag,printTokenCategoryWise:flag,enableSplitSummary:flag,resetBillNoAfterDayClose:flag,qrCodeInBill:flag,exclusiveGstBilling:flag,allowNegativeInventory:z.coerce.number().int().min(0).max(1).optional(),descriptions:z.array(description).max(20).default([])});
const kot = z.object({kotPrefix:text,enableKot:flag,enableKds:flag,printKotCategoryWise:flag,enableTakeAway:flag,descriptions:z.array(description).max(20).default([])});
const one = z.object({id:z.number().int().positive().safe()});
const norm = (value:string) => value.toLowerCase().replace(/[^a-z0-9]/g,'');

export class SettingsService {
  private readonly s: SettingsStore;
  private readonly a: AuthStore;
  constructor(s: SettingsStore, a: AuthStore) { this.s = s; this.a = a; }
  private async auth(account:Account, operation:'view'|'add'|'edit', term:string) {
    const permissions=await this.a.listPermissions(account.client.id,account.user.roleId);
    if(!permissions.some(item=>item[operation]===1&&(norm(item.subFeature??item.feature).includes(term)||(item.subFeature===null&&norm(item.feature)==='settings')))) throw new ApiError(403,'You do not have permission to perform this action.');
  }
  private result(value:string) { if(value==='saved')return; if(value==='payment_mode_missing')throw new ApiError(422,'Payment mode not found.'); throw new ApiError(404,'Description not found.'); }
  async getHardware(account:Account){await this.auth(account,'view','hardware');return this.s.getHardware(account.client.id)}
  async saveHardware(account:Account,input:unknown){await this.auth(account,'edit','hardware');const parsed=hardware.safeParse(input);if(!parsed.success)throw new ApiError(422,'Invalid hardware settings.');await this.s.saveHardware(account,parsed.data)}
  async getBilling(account:Account){await this.auth(account,'view','billing');const value=await this.s.getBilling(account.client.id);return{...value,descriptions:value.descriptions.map(item=>({...item,id:Number(item.id)}))}}
  async saveBilling(account:Account,input:unknown){await this.auth(account,'edit','billing');const parsed=billing.safeParse(input);if(!parsed.success)throw new ApiError(422,'Invalid billing settings.');this.result(await this.s.saveBilling(account,{...parsed.data,descriptions:parsed.data.descriptions.map(item=>({...item,id:item.id===null?null:BigInt(item.id)}))}))}
  async deleteBilling(account:Account,input:unknown){await this.auth(account,'edit','billing');const parsed=one.safeParse(input);if(!parsed.success)throw new ApiError(422,'Invalid description ID.');this.result(await this.s.deleteBillingDescription(account,BigInt(parsed.data.id)))}
  async getKot(account:Account){await this.auth(account,'view','kot');const value=await this.s.getKot(account.client.id);return{...value,descriptions:value.descriptions.map(item=>({...item,id:Number(item.id)}))}}
  async saveKot(account:Account,input:unknown){await this.auth(account,'edit','kot');const parsed=kot.safeParse(input);if(!parsed.success)throw new ApiError(422,'Invalid KOT settings.');this.result(await this.s.saveKot(account,{...parsed.data,descriptions:parsed.data.descriptions.map(item=>({...item,id:item.id===null?null:BigInt(item.id)}))}))}
  async deleteKot(account:Account,input:unknown){await this.auth(account,'edit','kot');const parsed=one.safeParse(input);if(!parsed.success)throw new ApiError(422,'Invalid description ID.');this.result(await this.s.deleteKotDescription(account,BigInt(parsed.data.id)))}
}

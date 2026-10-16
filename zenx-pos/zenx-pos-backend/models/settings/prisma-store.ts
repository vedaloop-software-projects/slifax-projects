import type { PrismaClient } from '@prisma/client';
import type { Account } from '../auth/contracts.ts';
import type { BillingInput, HardwareInput, KotInput, SettingsStore } from './contracts.ts';

const audit=(a:Account,type:string,description:string,n:Date)=>({client_id:a.client.id,user_id:a.user.id,type,description,created_at:n,updated_at:n});

export class PrismaSettingsStore implements SettingsStore {
  private readonly p: PrismaClient;
  constructor(p: PrismaClient) { this.p = p; }

  async getHardware(clientId: bigint): Promise<HardwareInput> {
    const value=await this.p.hardwareSettings.findFirst({where:{client_id:clientId}});
    return {
      printerPath:value?.printer_path??null, networkPath:value?.network_path??null,
      kotPrinterPath:value?.kot_printer_path??null, barcodePath:value?.barcode_path??null,
      barcodePrinterName:value?.barcode_printer_name??null, barcodePort:value?.barcode_port??null,
      weighingMachineBrand:value?.weighing_machine_brand??null, weighingMachinePort:value?.weighing_machine_port??null,
      printMode:value?.print_mode==='image'?'image':'escpos', paperWidth:value?.paper_width===58?58:80,
      weighingBaudRate:value?.weighing_baud_rate??9600, weighingDataBits:value?.weighing_data_bits===7?7:8,
      weighingStopBits:value?.weighing_stop_bits===2?2:1,
      weighingParity:value?.weighing_parity==='even'||value?.weighing_parity==='odd'?value.weighing_parity:'none',
      cashDrawer:value?.cash_drawer??0, cashDrawerPin:value?.cash_drawer_pin===1?1:0,
      openDrawerAfterSale:value?.open_drawer_after_sale??1,
    };
  }

  async saveHardware(a:Account,v:HardwareInput) {
    await this.p.$transaction(async t=>{
      const current=await t.hardwareSettings.findFirst({where:{client_id:a.client.id}}),n=new Date();
      const data={printer_path:v.printerPath,network_path:v.networkPath,kot_printer_path:v.kotPrinterPath,barcode_path:v.barcodePath,barcode_printer_name:v.barcodePrinterName,barcode_port:v.barcodePort,weighing_machine_brand:v.weighingMachineBrand,weighing_machine_port:v.weighingMachinePort,print_mode:v.printMode??'escpos',paper_width:v.paperWidth??80,weighing_baud_rate:v.weighingBaudRate??9600,weighing_data_bits:v.weighingDataBits??8,weighing_stop_bits:v.weighingStopBits??1,weighing_parity:v.weighingParity??'none',cash_drawer:v.cashDrawer,cash_drawer_pin:v.cashDrawerPin??0,open_drawer_after_sale:v.openDrawerAfterSale??1};
      if(current)await t.hardwareSettings.update({where:{id:current.id},data:{...data,updated_by:Number(a.user.id),updated_at:n}});
      else await t.hardwareSettings.create({data:{client_id:a.client.id,...data,created_by:Number(a.user.id),created_at:n}});
      await t.audits.create({data:audit(a,current?'update':'add',`Hardware settings ${current?'update':'add'}`,n)});
    });
  }

  async getBilling(c:bigint){const x=await this.p.billingSettings.findFirst({where:{client_id:c}}),descriptions=await this.p.billingSettingsDescriptions.findMany({where:{client_id:c},orderBy:{id:'asc'}});let paymentModeName:string|null=null;if(x?.payment_mode_id){const mode=await this.p.paymentModes.findFirst({where:{id:BigInt(x.payment_mode_id),client_id:c,status:1,trash:0}});paymentModeName=mode?.payment_mode??null}return{billPrefix:x?.bill_prefix??null,billCaption:x?.bill_caption??null,paymentModeId:x?.payment_mode_id??0,paymentModeName,billFormatNumber:x?.bill_format_number??null,refundDays:x?.refund_days??null,discountOnDiscountedItems:x?.discount_on_discounted_items??0,companyLogoOnBills:x?.company_logo_on_bills??0,confirmationToPrintBill:x?.confirmation_to_print_bill??0,askSalesmanCode:x?.ask_salesman_code??0,happyHours:x?.happy_hours??0,askQtyWhileAddingItems:x?.ask_qty_while_adding_items??0,printTokenCategoryWise:x?.print_token_category_wise??0,enableSplitSummary:x?.enable_split_summary??0,resetBillNoAfterDayClose:x?.reset_bill_no_after_day_close??0,qrCodeInBill:x?.qr_code_in_bill??0,exclusiveGstBilling:x?.exclusive_gst_billing??0,allowNegativeInventory:x?.allow_negative_inventory??1,descriptions:descriptions.map(d=>({id:d.id,description:d.description}))}}
  async saveBilling(a:Account,v:BillingInput){return this.p.$transaction(async t=>{if(v.paymentModeId&&!await t.paymentModes.findFirst({where:{id:BigInt(v.paymentModeId),client_id:a.client.id,status:1,trash:0}}))return'payment_mode_missing'as const;const current=await t.billingSettings.findFirst({where:{client_id:a.client.id}}),n=new Date(),data={bill_prefix:v.billPrefix,bill_caption:v.billCaption,payment_mode_id:v.paymentModeId,bill_format_number:v.billFormatNumber,refund_days:v.refundDays,discount_on_discounted_items:v.discountOnDiscountedItems,company_logo_on_bills:v.companyLogoOnBills,confirmation_to_print_bill:v.confirmationToPrintBill,ask_salesman_code:v.askSalesmanCode,happy_hours:v.happyHours,ask_qty_while_adding_items:v.askQtyWhileAddingItems,print_token_category_wise:v.printTokenCategoryWise,enable_split_summary:v.enableSplitSummary,reset_bill_no_after_day_close:v.resetBillNoAfterDayClose,qr_code_in_bill:v.qrCodeInBill,exclusive_gst_billing:v.exclusiveGstBilling,...(v.allowNegativeInventory===undefined?{}:{allow_negative_inventory:v.allowNegativeInventory})};if(current)await t.billingSettings.update({where:{id:current.id},data:{...data,updated_by:Number(a.user.id),updated_at:n}});else await t.billingSettings.create({data:{client_id:a.client.id,...data,created_by:Number(a.user.id),created_at:n}});for(const d of v.descriptions){if(d.id!==null){const result=await t.billingSettingsDescriptions.updateMany({where:{id:d.id,client_id:a.client.id},data:{description:d.description,updated_by:Number(a.user.id),updated_at:n}});if(!result.count)return'description_missing'as const}else await t.billingSettingsDescriptions.create({data:{client_id:a.client.id,description:d.description,created_by:Number(a.user.id),created_at:n}})}await t.audits.create({data:audit(a,current?'update':'add',`Billing settings ${current?'update':'add'}`,n)});return'saved'as const})}
  async deleteBillingDescription(a:Account,id:bigint){return this.p.$transaction(async t=>{const x=await t.billingSettingsDescriptions.deleteMany({where:{id,client_id:a.client.id}});if(!x.count)return'description_missing'as const;const n=new Date();await t.audits.create({data:audit(a,'delete','Billing description deleted',n)});return'saved'as const})}
  async getKot(c:bigint){const x=await this.p.kotSettings.findFirst({where:{client_id:c}}),d=await this.p.kotSettingsDescriptions.findMany({where:{client_id:c},orderBy:{id:'asc'}});return{kotPrefix:x?.kot_prefix??null,enableKot:x?.enable_kot??0,enableKds:x?.enable_kds??0,printKotCategoryWise:x?.print_kot_category_wise??0,enableTakeAway:x?.enable_take_away??0,descriptions:d.map(x=>({id:x.id,description:x.description}))}}
  async saveKot(a:Account,v:KotInput){return this.p.$transaction(async t=>{const current=await t.kotSettings.findFirst({where:{client_id:a.client.id}}),n=new Date(),data={kot_prefix:v.kotPrefix,enable_kot:v.enableKot,enable_kds:v.enableKds,print_kot_category_wise:v.printKotCategoryWise,enable_take_away:v.enableTakeAway};if(current)await t.kotSettings.update({where:{id:current.id},data:{...data,updated_by:Number(a.user.id),updated_at:n}});else await t.kotSettings.create({data:{client_id:a.client.id,...data,created_by:Number(a.user.id),created_at:n}});for(const d of v.descriptions){if(d.id!==null){const result=await t.kotSettingsDescriptions.updateMany({where:{id:d.id,client_id:a.client.id},data:{description:d.description,updated_by:Number(a.user.id),updated_at:n}});if(!result.count)return'description_missing'as const}else await t.kotSettingsDescriptions.create({data:{client_id:a.client.id,description:d.description,created_by:Number(a.user.id),created_at:n}})}await t.audits.create({data:audit(a,current?'update':'add',`Kot settings ${current?'update':'add'}`,n)});return'saved'as const})}
  async deleteKotDescription(a:Account,id:bigint){return this.p.$transaction(async t=>{const x=await t.kotSettingsDescriptions.deleteMany({where:{id,client_id:a.client.id}});if(!x.count)return'description_missing'as const;const n=new Date();await t.audits.create({data:audit(a,'delete','Kot description deleted',n)});return'saved'as const})}
}

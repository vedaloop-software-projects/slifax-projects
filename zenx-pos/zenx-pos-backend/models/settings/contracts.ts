import type { Account } from '../auth/contracts.ts';

export type DescriptionInput = { id: bigint | null; description: string };
export type HardwareInput = {
  printerPath: string | null; networkPath: string | null; kotPrinterPath: string | null;
  barcodePath: string | null; barcodePrinterName: string | null; barcodePort: string | null;
  weighingMachineBrand: string | null; weighingMachinePort: string | null;
  printMode?: 'escpos' | 'image'; paperWidth?: 58 | 80;
  weighingBaudRate?: number; weighingDataBits?: 7 | 8; weighingStopBits?: 1 | 2;
  weighingParity?: 'none' | 'even' | 'odd'; cashDrawer: number; cashDrawerPin?: 0 | 1;
  openDrawerAfterSale?: number;
};
export type BillingInput = {billPrefix:string|null;billCaption:string|null;paymentModeId:number;billFormatNumber:string|null;refundDays:string|null;discountOnDiscountedItems:number;companyLogoOnBills:number;confirmationToPrintBill:number;askSalesmanCode:number;happyHours:number;askQtyWhileAddingItems:number;printTokenCategoryWise:number;enableSplitSummary:number;resetBillNoAfterDayClose:number;qrCodeInBill:number;exclusiveGstBilling:number;allowNegativeInventory?:number;descriptions:DescriptionInput[]};
export type KotInput={kotPrefix:string|null;enableKot:number;enableKds:number;printKotCategoryWise:number;enableTakeAway:number;descriptions:DescriptionInput[]};
export type SettingsResult='saved'|'missing'|'payment_mode_missing'|'description_missing';
export interface SettingsStore{getHardware(clientId:bigint):Promise<HardwareInput>;saveHardware(a:Account,input:HardwareInput):Promise<void>;getBilling(clientId:bigint):Promise<Omit<BillingInput,'descriptions'>&{paymentModeName:string|null;descriptions:{id:bigint;description:string|null}[]}>;saveBilling(a:Account,input:BillingInput):Promise<SettingsResult>;deleteBillingDescription(a:Account,id:bigint):Promise<SettingsResult>;getKot(clientId:bigint):Promise<Omit<KotInput,'descriptions'>&{descriptions:{id:bigint;description:string|null}[]}>;saveKot(a:Account,input:KotInput):Promise<SettingsResult>;deleteKotDescription(a:Account,id:bigint):Promise<SettingsResult>}

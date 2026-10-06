import {
  retailBill,
  textileBill,
  textileGstBill,
  retailGstBill,
  duplicateBill,
  retailBillNoTax,
  billQrRetail,
  billQrGst,
  billQrNoTax,
  billQrPlain,
} from './receiptData';

export const RECEIPT_SAMPLES = [
  { key: 'retailBill',     label: 'Retail',        data: retailBill },
  { key: 'retailGstBill',  label: 'Retail + GST',  data: retailGstBill },
  { key: 'textileGstBill', label: 'Textile + GST', data: textileGstBill },
  { key: 'duplicateBill',  label: 'Duplicate',     data: duplicateBill },
  { key: 'textileBill',    label: 'Textile',       data: textileBill },
  { key: 'a5Clothes',      label: 'A5 Clothes',    type: 'clothes' },
  { key: 'a5Grocery',      label: 'A5 Grocery',    type: 'grocery' },
  { key: 'bill',           label: '3" Bill',       data: billQrRetail },
  { key: 'RbillQr',        label: '3" RBill-QR',   data: billQrGst },
  { key: 'Rbillwotax',     label: '3" RBill-w/o tax', data: billQrNoTax },
  { key: 'Rbill',          label: 'RBill',         data: billQrPlain },
  { key: 'KOTOrder',       label: 'KOT Order' },
];
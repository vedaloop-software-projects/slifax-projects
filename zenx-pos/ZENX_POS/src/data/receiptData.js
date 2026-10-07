// data/receiptData.js

const store = {
  name: 'SRI SAI VIJETHA SUPER MARKET',
  contact: '9110333043',
  gstNo: '9876543210',
  address1: 'F8JV+VGC, Kondapur, Venkateshwara Nagar,',
  address2: 'Serilingampalle (M), Telangana 500084',
};

const customer = {
  name: 'Praveen K',
  phone: '9876543210',
  taxNo: 'TX9876543210',
};

const commonTotals = {
  totalItems: 6,
  totalQty: 5432,
  subtotal: 5432,
  discount: 32,
  roundOff: 5432,
  additionalCharge: 10,
  grandTotal: 2500,
};

const commonPayment = {
  cash: 500,
  upi: 2000,
  card: 0,
};

/*
|--------------------------------------------------------------------------
| 1. NORMAL RETAIL RECEIPT
|--------------------------------------------------------------------------
*/

export const retailBill = {
  type: 'retail',
  gstMode: 'none',
  copyType: 'ORIGINAL',

  store,

  billNo: 'B0231',
  date: '26-03-2026',
  time: '2:34 PM',

  customer,

  items: [
    {
      id: 1,
      name: 'Basmati Rice-5 KG',
      hsn: '544321',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 2,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 3,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 4,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 5,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 6,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },
  ],

  totals: commonTotals,
  payment: commonPayment,

  gst: null,
  showQr: false,

  amountSaved: null,

  barcode: 'B0231',

  footerText: 'Thankyou! Visit Again',
};

/*
|--------------------------------------------------------------------------
| 1b. RETAIL WITHOUT TAX
|--------------------------------------------------------------------------
*/

export const retailBillNoTax = {
  ...retailBill,
  gstMode: 'none',
  gst: null,
  amountSaved: null,
  showQr: false,
};

/*
|--------------------------------------------------------------------------
| 2. TEXTILE / SIZE / COLOUR
|--------------------------------------------------------------------------
*/

export const textileBill = {
  type: 'textile',
  gstMode: 'none',
  copyType: 'ORIGINAL',

  store,

  billNo: 'B0231',
  date: '26-03-2026',
  time: '2:34 PM',

  customer,

  items: [
    {
      id: 1,
      name: 'T-Shirt',
      hsn: '544321',

      size: 'XS',
      colour: 'Red',

      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 2,
      name: 'T-Shirt',
      hsn: '544321',

      size: 'XS',
      colour: 'Red',

      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 3,
      name: 'T-Shirt',
      hsn: '544321',

      size: 'XS',
      colour: 'Red',

      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 4,
      name: 'T-Shirt',
      hsn: '544321',

      size: 'XS',
      colour: 'Red',

      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },
  ],

  totals: {
    totalItems: 4,
    totalQty: 16,
    subtotal: 5432,
    discount: 32,
    roundOff: 5432,
    additionalCharge: 10,
    grandTotal: 2500,
  },

  payment: commonPayment,

  gst: null,
  showQr: false,

  amountSaved: null,

  barcode: 'B0231',

  footerText: 'Thankyou! Visit Again',
};

/*
|--------------------------------------------------------------------------
| 3. TEXTILE + GST ITEM BREAKUP
|--------------------------------------------------------------------------
*/

export const textileGstBill = {
  type: 'textile',
  gstMode: 'itemBreakup',
  copyType: 'ORIGINAL',

  store,

  billNo: 'B0231',
  date: '26-03-2026',
  time: '2:34 PM',

  customer,

  items: [
    {
      id: 1,

      name: 'Basmati Rice-5 KG',
      hsn: '5342467',

      gstPercent: 28,

      mrp: 150,
      rate: 115,
      qty: 4,
      amount: 460,

      cgstPercent: 14,
      cgstValue: 64.4,

      sgstPercent: 14,
      sgstValue: 64.4,

      gstValue: 128.8,
    },

    {
      id: 2,

      name: 'Basmati Rice-5 KG',
      hsn: '5342467',

      gstPercent: 28,

      mrp: 150,
      rate: 115,
      qty: 4,
      amount: 460,

      cgstPercent: 14,
      cgstValue: 64.4,

      sgstPercent: 14,
      sgstValue: 64.4,

      gstValue: 128.8,
    },

    {
      id: 3,

      name: 'Basmati Rice-5 KG',
      hsn: '5342467',

      gstPercent: 28,

      mrp: 150,
      rate: 115,
      qty: 4,
      amount: 460,

      cgstPercent: 14,
      cgstValue: 64.4,

      sgstPercent: 14,
      sgstValue: 64.4,

      gstValue: 128.8,
    },

    {
      id: 4,

      name: 'Basmati Rice-5 KG',
      hsn: '5342467',

      gstPercent: 28,

      mrp: 150,
      rate: 115,
      qty: 4,
      amount: 460,

      cgstPercent: 14,
      cgstValue: 64.4,

      sgstPercent: 14,
      sgstValue: 64.4,

      gstValue: 128.8,
    },
  ],

  totals: {
    totalItems: 4,
    totalQty: 16,
    subtotal: 5432,
    discount: 32,
    roundOff: 5432,
    additionalCharge: 10,
    grandTotal: 2500,
  },

  payment: commonPayment,

  gst: {
    hsn: '544312',
    taxPercent: 5,
    taxable: 750,
    sgst: 18.35,
    cgst: 18.35,
    taxValue: 36,
    totalGst: 36.69,
  },

  amountSaved: 124.69,
  showQr: false,

  barcode: 'B0231',

  footerText: 'Thankyou! Visit Again',
};

/*
|--------------------------------------------------------------------------
| 4. NORMAL RETAIL + GST SUMMARY
|--------------------------------------------------------------------------
*/

export const retailGstBill = {
  type: 'retail',
  gstMode: 'summary',
  copyType: 'ORIGINAL',

  store,

  billNo: 'B0231',
  date: '26-03-2026',
  time: '2:34 PM',

  customer,

  items: [
    {
      id: 1,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 2,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 3,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 4,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 5,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },

    {
      id: 6,
      name: 'Basmati Rice-5 KG',
      hsn: '5342467',
      mrp: 750,
      rate: 150,
      discount: 5,
      qty: 4,
      amount: 695,
    },
  ],

  totals: commonTotals,

  payment: commonPayment,

  gst: {
    hsn: '544312',
    taxPercent: 5,
    taxable: 750,
    sgst: 18.35,
    cgst: 18.35,
    taxValue: 36,
    totalGst: 36.69,
  },

  amountSaved: 124.69,
  showQr: true,

  barcode: 'B0231',

  footerText: 'Thankyou! Visit Again',
};

/*
|--------------------------------------------------------------------------
| 5. DUPLICATE
|--------------------------------------------------------------------------
*/

export const duplicateBill = {
  ...retailBill,

  copyType: 'DUPLICATE',
};

// Shared items for all 4 new designs (matches the image)
const billQrItems = [
  { id: 1, name: 'Special Gongura Chicken Biryani Full', rate: 1000, qty: 12, amount: 11695 },
  { id: 2, name: 'Special Gongura Chicken Biryani Full', rate: 1000, qty: 12, amount: 11695 },
  { id: 3, name: 'Special Gongura Chicken Biryani Full', rate: 1000, qty: 12, amount: 11695 },
  { id: 4, name: 'Special Gongura Chicken Biryani Full', rate: 1000, qty: 12, amount: 11695 },
  { id: 5, name: 'Special Gongura Chicken Biryani Full', rate: 1000, qty: 12, amount: 11695 },
];

// Shared header info for the 4 new designs
const billQrHeader = {
  store,
  billNo: 'B0231',
  date: '26-03-2026',
  time: '2:34 PM',
  customer,
  totals: {
    totalItems: 6,
    totalQty: 5432,
    subtotal: 5432,
    discount: 32,
    roundOff: 5432,
    additionalCharge: 10,
    grandTotal: 2500,
  },
  payment: {
    cash: 500,
    upi: 2000,
    card: 0,
  },
  barcode: 'B0231',
  footerText: 'Thankyou! Visit Again',
};  
/* --- 1. 3" Bill (plain retail, no GST, no QR) --- */
export const billQrRetail = {
  ...billQrHeader,
  type: 'retail',
    variant: 'plainRetail',    // ← ADD
  gstMode: 'summary',
  copyType: 'ORIGINAL',
  items: billQrItems,
  // gst: null,
  gst: {
    hsn: '544312',
    taxPercent: 5,
    taxable: 750,
    sgst: 18.35,
    cgst: 18.35,
    taxValue: 36,
    totalGst: 36.69,
  },
  amountSaved: null,
  showQr: false,
};

/* --- 2. 3" RBill-QR (retail + GST + QR) --- */
export const billQrGst = {
  ...billQrHeader,
  type: 'retail',
  gstMode: 'summary',
  copyType: 'ORIGINAL',
    variant: 'retailQr',       // ← ADD

  items: billQrItems,
  gst: {
    hsn: '544312',
    taxPercent: 5,
    taxable: 750,
    sgst: 18.35,
    cgst: 18.35,
    taxValue: 36,
    totalGst: 36.69,
  },
  amountSaved: 124.69,
  showQr: true,
};

/* --- 3. 3" RBill-w/o tax (plain retail, no GST, no QR) --- */
export const billQrNoTax = {
  ...billQrHeader,
  type: 'retail',
  gstMode: 'none',
  copyType: 'ORIGINAL',
  items: billQrItems,
    variant: 'retailNoTax',    // ← ADD

  gst: null,
  amountSaved: null,
  showQr: false,
};

/* --- 4. RBill (retail + GST summary, no QR) --- */
export const billQrPlain = {
  ...billQrHeader,
  type: 'retail',
  gstMode: 'summary',
  copyType: 'ORIGINAL',
    variant: 'retailGst',      // ← ADD

  items: billQrItems,
  gst:null,
  amountSaved: 124.69,
  showQr: false,
};
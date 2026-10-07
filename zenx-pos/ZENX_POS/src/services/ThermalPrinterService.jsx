import {BLEPrinter} from 'react-native-thermal-receipt-printer-image-qr';

import {
  PermissionsAndroid,
  Platform,
} from 'react-native';

const WIDTH = 48;
const LINE = '-'.repeat(WIDTH);

// =========================================================
// BASIC HELPERS
// =========================================================

const money = value => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '0.00';
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number.toFixed(2)
    : '0.00';
};

const text = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value);
};

const padRight = (value, length) => {
  value = text(value);

  if (value.length >= length) {
    return value.substring(0, length);
  }

  return (
    value +
    ' '.repeat(length - value.length)
  );
};

const padLeft = (value, length) => {
  value = text(value);

  if (value.length >= length) {
    return value.substring(0, length);
  }

  return (
    ' '.repeat(length - value.length) +
    value
  );
};

// =========================================================
// TWO COLUMN ROW
// =========================================================

const row = (left, right) => {
  const leftText = text(left);
  const rightText = text(right);

  if (
    leftText.length +
      rightText.length >=
    WIDTH
  ) {
    const availableLeft = Math.max(
      1,
      WIDTH -
        rightText.length -
        1,
    );

    return (
      leftText.substring(
        0,
        availableLeft,
      ) +
      ' ' +
      rightText.substring(
        0,
        WIDTH -
          availableLeft -
          1,
      )
    );
  }

  const spaces =
    WIDTH -
    leftText.length -
    rightText.length;

  return (
    leftText +
    ' '.repeat(spaces) +
    rightText
  );
};

// =========================================================
// ITEM HEADER - LINE 1
//
// Item Name                         HSN Code
// =========================================================

const itemHeaderRow1 = () => {
  const nameWidth = 32;
  const hsnWidth = 16;

  return (
    padRight(
      'Item Name',
      nameWidth,
    ) +
    padLeft(
      'HSN Code',
      hsnWidth,
    )
  );
};

// =========================================================
// ITEM HEADER - LINE 2
//
// MRP       Rate     Disc    Qty        Amount
// =========================================================

const itemHeaderRow2 = () => {
  const mrpWidth = 10;
  const rateWidth = 9;
  const discWidth = 8;
  const qtyWidth = 7;
  const amountWidth = 14;

  return (
    padRight(
      'MRP',
      mrpWidth,
    ) +
    padRight(
      'Rate',
      rateWidth,
    ) +
    padRight(
      'Disc',
      discWidth,
    ) +
    padRight(
      'Qty',
      qtyWidth,
    ) +
    padLeft(
      'Amount',
      amountWidth,
    )
  );
};

// =========================================================
// ITEM FIRST DATA LINE
// =========================================================

const itemRowLine1 = (
  itemName,
  hsn,
) => {
  const nameWidth = 32;
  const hsnWidth = 16;

  let name = text(itemName);

  if (name.length > nameWidth) {
    name =
      name.substring(
        0,
        nameWidth,
      );
  }

  return (
    padRight(
      name,
      nameWidth,
    ) +
    padLeft(
      text(hsn),
      hsnWidth,
    )
  );
};

// =========================================================
// ITEM SECOND DATA LINE
// =========================================================

const itemRowLine2 = (
  mrp,
  rate,
  discount,
  qty,
  amount,
) => {
  const mrpWidth = 10;
  const rateWidth = 9;
  const discWidth = 8;
  const qtyWidth = 7;
  const amountWidth = 14;

  return (
    padRight(
      money(mrp),
      mrpWidth,
    ) +
    padLeft(
      money(rate),
      rateWidth,
    ) +
    padLeft(
      money(discount),
      discWidth,
    ) +
    padLeft(
      money(qty),
      qtyWidth,
    ) +
    padLeft(
      money(amount),
      amountWidth,
    )
  );
};

// =========================================================
// GST HEADER
//
// Tax%     Taxable     SGST     CGST     Tax Value
// =========================================================

const gstHeader = () => {
  const taxWidth = 8;
  const taxableWidth = 12;
  const sgstWidth = 9;
  const cgstWidth = 9;
  const taxValueWidth = 10;

  return (
    padRight(
      'Tax%',
      taxWidth,
    ) +
    padRight(
      'Taxable',
      taxableWidth,
    ) +
    padRight(
      'SGST',
      sgstWidth,
    ) +
    padRight(
      'CGST',
      cgstWidth,
    ) +
    padLeft(
      'Tax Value',
      taxValueWidth,
    )
  );
};

// =========================================================
// GST DATA ROW
// =========================================================

const gstRow = (
  taxPercent,
  taxable,
  sgst,
  cgst,
  taxValue,
) => {
  const taxWidth = 8;
  const taxableWidth = 12;
  const sgstWidth = 9;
  const cgstWidth = 9;
  const taxValueWidth = 10;

  return (
    padRight(
      `${text(taxPercent)}%`,
      taxWidth,
    ) +
    padRight(
      money(taxable),
      taxableWidth,
    ) +
    padRight(
      money(sgst),
      sgstWidth,
    ) +
    padRight(
      money(cgst),
      cgstWidth,
    ) +
    padLeft(
      money(taxValue),
      taxValueWidth,
    )
  );
};

// =========================================================
// BILL NUMBER
// =========================================================

const getBillNumber = bill => {
  if (bill?.billPrefix) {
    return `${bill.billPrefix}${
      bill.billNo || ''
    }`;
  }

  return bill?.billNo || '';
};

// =========================================================
// THERMAL PRINTER SERVICE
// =========================================================

class ThermalPrinterService {
  initialized = false;

  connectedPrinter = null;

  connectedAddress = null;

  // =======================================================
  // BLUETOOTH PERMISSION
  // =======================================================

  async requestBluetoothPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    // Android 12+
    if (Platform.Version >= 31) {
      try {
        const result =
          await PermissionsAndroid.requestMultiple(
            [
              PermissionsAndroid.PERMISSIONS
                .BLUETOOTH_SCAN,

              PermissionsAndroid.PERMISSIONS
                .BLUETOOTH_CONNECT,
            ],
          );

        const scanGranted =
          result[
            PermissionsAndroid.PERMISSIONS
              .BLUETOOTH_SCAN
          ] ===
          PermissionsAndroid.RESULTS
            .GRANTED;

        const connectGranted =
          result[
            PermissionsAndroid.PERMISSIONS
              .BLUETOOTH_CONNECT
          ] ===
          PermissionsAndroid.RESULTS
            .GRANTED;

        if (
          !scanGranted ||
          !connectGranted
        ) {
          console.log(
            'Bluetooth permission denied',
          );

          return false;
        }
      } catch (error) {
        console.log(
          'Bluetooth permission error:',
          error,
        );

        return false;
      }
    }

    return true;
  }

  // =======================================================
  // INITIALIZE BLE
  // =======================================================

  async initBLE() {
    if (this.initialized) {
      return true;
    }

    try {
      const permission =
        await this.requestBluetoothPermission();

      if (!permission) {
        throw new Error(
          'Bluetooth permission is required.',
        );
      }

      await BLEPrinter.init();

      this.initialized = true;

      console.log(
        'BLE printer initialized',
      );

      return true;
    } catch (error) {
      console.log(
        'BLE initialization error:',
        error,
      );

      return false;
    }
  }

  // =======================================================
  // GET BLE PRINTERS
  // =======================================================

  async getBLEPrinters() {
    await this.initBLE();

    try {
      const printers =
        await BLEPrinter.getDeviceList();

      console.log(
        'BLE PRINTERS:',
        JSON.stringify(
          printers,
          null,
          2,
        ),
      );

      return printers || [];
    } catch (error) {
      console.log(
        'GET BLE PRINTERS ERROR:',
        error,
      );

      throw error;
    }
  }

  // =======================================================
  // COMPATIBILITY METHOD
  // BillingScreen uses getDevices()
  // =======================================================

  async getDevices() {
    return await this.getBLEPrinters();
  }

  // =======================================================
  // CONNECT BLE
  // =======================================================

  async connectBLE(printer) {
    try {
      await this.initBLE();

      if (!printer) {
        throw new Error(
          'Printer device is missing.',
        );
      }

      const address =
        printer?.inner_mac_address ||
        printer?.address ||
        printer?.device_id ||
        printer?.id;

      if (!address) {
        throw new Error(
          'Printer Bluetooth address not found.',
        );
      }

      console.log(
        'CONNECTING TO:',
        address,
      );

      await BLEPrinter.connectPrinter(
        address,
      );

      this.connectedAddress =
        address;

      this.connectedPrinter =
        printer;

      console.log(
        'PRINTER CONNECTED:',
        address,
      );

      return true;
    } catch (error) {
      console.log(
        'BLE CONNECTION ERROR:',
        error,
      );

      this.connectedAddress = null;

      this.connectedPrinter = null;

      throw error;
    }
  }

  // =======================================================
  // COMPATIBILITY METHOD
  // BillingScreen uses connect()
  // =======================================================

  async connect(printer) {
    return await this.connectBLE(
      printer,
    );
  }

  // =======================================================
  // PREPARE RECEIPT
  // =======================================================

  prepareBill(bill) {
    let receipt = '';

    // =====================================================
    // STORE HEADER
    // =====================================================

    receipt += '<C><B>';

    receipt += text(
      bill?.store?.name ||
        'STORE',
    );

    receipt += '</B></C>\n\n';

    if (bill?.store?.contact) {
      receipt +=
        `<C>Contact: ${bill.store.contact}\n`;
    }

    if (bill?.store?.gstNo) {
      receipt +=
        `<C>GST.No: ${bill.store.gstNo}\n`;
    }

    if (bill?.store?.address1) {
      receipt +=
        `<C>${bill.store.address1}\n`;
    }

    if (bill?.store?.address2) {
      receipt +=
        `<C>${bill.store.address2}\n`;
    }

    receipt += '\n';

    // =====================================================
    // INVOICE TITLE
    // =====================================================

    receipt += '<C><B>';

    receipt +=
      bill?.billCaption?.trim()
        ? bill.billCaption
        : 'TAX INVOICE';

    receipt += '</B></C>\n';

    receipt += `${LINE}\n`;

    // =====================================================
    // BILL INFO
    // =====================================================

    receipt += row(
      `Bill.No: ${getBillNumber(
        bill,
      )}`,
      `Date: ${bill?.date || ''}`,
    );

    receipt += '\n';

    if (bill?.time) {
      receipt += row(
        'Time:',
        bill.time,
      );

      receipt += '\n';
    }

    receipt += `${LINE}\n`;

    // =====================================================
    // CUSTOMER INFO
    // =====================================================

    const customerName =
      bill?.customer?.name
        ?.trim?.() || '';

    const customerPhone =
      bill?.customer?.phone
        ?.trim?.() || '';

    const customerTaxNo =
      bill?.customer?.taxNo
        ?.trim?.() || '';

    if (
      customerName ||
      customerPhone ||
      customerTaxNo
    ) {
      receipt +=
        'CUSTOMER INFO\n';

      receipt += `${LINE}\n`;

      if (customerName) {
        receipt +=
          `${customerName}\n`;
      }

      if (customerPhone) {
        receipt +=
          `${customerPhone}\n`;
      }

      if (customerTaxNo) {
        receipt +=
          `${customerTaxNo}\n`;
      }

      receipt += `${LINE}\n`;
    }

    // =====================================================
    // ITEMS
    // =====================================================

    // Header - bold
    // receipt += '<B>';

    receipt += itemHeaderRow1();

    receipt += '\n';

    receipt += itemHeaderRow2();

    receipt += '</B>\n';

    receipt += `${LINE}\n`;

    if (
      Array.isArray(
        bill?.items,
      )
    ) {
      bill.items.forEach(
        item => {
          // Item name + HSN
          receipt +=
            itemRowLine1(
              item?.name,
              item?.hsn || '',
            );

          receipt += '\n';

          // MRP + Rate + Discount + Qty + Amount
          receipt +=
            itemRowLine2(
              item?.mrp,
              item?.rate,
              item?.discount,
              item?.qty,
              item?.amount,
            );

          receipt += '\n';

          receipt += '\n';
        },
      );
    }

    receipt += `${LINE}\n`;

    // =====================================================
    // TOTALS
    // =====================================================

    const totals =
      bill?.totals || {};

    receipt += row(
      'Total Items/Qty:',
      `${
        totals.totalItems || 0
      }/${money(
        totals.totalQty,
      )}`,
    );

    receipt += '\n';

    receipt += row(
      'Subtotal:',
      money(
        totals.subtotal,
      ),
    );

    receipt += '\n';

    receipt += row(
      'Discount:',
      money(
        totals.discount,
      ),
    );

    receipt += '\n';

    receipt += row(
      'Additional Charge:',
      money(
        totals.additionalCharge,
      ),
    );

    receipt += '\n';

    receipt += row(
      'Round-off:',
      money(
        totals.roundOff,
      ),
    );

    receipt += '\n';

    receipt += `${LINE}\n`;

    // =====================================================
    // GRAND TOTAL - BOLD
    // =====================================================

    // receipt += '<B>';

    receipt += row(
      'GRAND TOTAL:',
      `Rs.${money(
        totals.grandTotal,
      )}`,
    );

    // receipt += '</B>\n';

    receipt += `${LINE}\n`;

    // =====================================================
    // PAYMENT SUMMARY
    // NORMAL FONT
    // =====================================================

    receipt +=
      'PAYMENT SUMMARY\n';

    const payment =
      bill?.payment || {};

    if (
      Number(
        payment.cash || 0,
      ) > 0
    ) {
      receipt += row(
        'Cash:',
        money(
          payment.cash,
        ),
      );

      receipt += '\n';
    }

    if (
      Number(
        payment.upi || 0,
      ) > 0
    ) {
      receipt += row(
        'UPI:',
        money(
          payment.upi,
        ),
      );

      receipt += '\n';
    }

    if (
      Number(
        payment.card || 0,
      ) > 0
    ) {
      receipt += row(
        'Card:',
        money(
          payment.card,
        ),
      );

      receipt += '\n';
    }

    receipt += `${LINE}\n`;

    // =====================================================
    // GST
    // NORMAL FONT
    // =====================================================

    if (
      bill?.gst &&
      (
        bill?.gstMode ===
          'summary' ||
        bill?.gstMode ===
          'itemBreakup'
      )
    ) {
      const gst =
        bill.gst;

      // Tax header - normal font
      receipt +=
        gstHeader();

      receipt += '\n';

      // Tax values - normal font
      receipt += gstRow(
        gst.taxPercent,
        gst.taxable,
        gst.sgst,
        gst.cgst,
        gst.taxValue,
      );

      receipt += '\n';

      receipt += `${LINE}\n`;

      receipt += row(
        'Total GST:',
        money(
          gst.totalGst,
        ),
      );

      receipt += '\n';

      receipt += `${LINE}\n`;
    }

    // =====================================================
    // SAVED AMOUNT
    // =====================================================

    if (
      Number(
        bill?.amountSaved || 0,
      ) > 0
    ) {
      receipt += row(
        'Amount Saved:',
        money(
          bill.amountSaved,
        ),
      );

      receipt += '\n';

      receipt += `${LINE}\n`;
    }

    // =====================================================
    // FOOTER
    // =====================================================

    if (
      Array.isArray(
        bill?.footerText,
      ) &&
      bill.footerText.length >
        0
    ) {
      bill.footerText.forEach(
        item => {
          receipt +=
            `<C>${text(
              item,
            )}\n`;
        },
      );
    } else {
      receipt +=
        '<C>Thankyou! Visit Again\n';
    }

    // =====================================================
    // DUPLICATE
    // =====================================================

    if (
      bill?.copyType ===
      'DUPLICATE'
    ) {
      receipt += '\n';

      receipt +=
        '<C><B>----- DUPLICATE -----</B>\n';
    }

    // =====================================================
    // PAPER FEED
    // =====================================================

    receipt +=
      '\n\n\n\n';

    return receipt;
  }

  // =======================================================
  // PRINT BILL
  // =======================================================

async printBill(bill) {
  if (!bill) {
    throw new Error('Receipt data is missing.');
  }

  if (!this.connectedAddress) {
    throw new Error(
      'Printer is not connected. Please select a printer first.',
    );
  }

  try {
   // =====================================================
    // LOGO
    // =====================================================

    const logoUrl = bill?.store?.logo;

    console.log('LOGO URL:', logoUrl);
      console.log(
      'showLogo:',
      bill?.showLogo,
    );
    console.log(
      'printImage type:',
      typeof BLEPrinter.printImage,
    );
      console.log(
      'printImageBase64 type:',
      typeof BLEPrinter.printImageBase64,
    );

    if (
      bill?.showLogo &&
      logoUrl &&
      typeof BLEPrinter.printImage === 'function'
    ) {
      console.log('PRINTING LOGO:', logoUrl);

      BLEPrinter.printImage(
        logoUrl,
        {
          // imageWidth: 150,
        },
      );

      // IMPORTANT
      // await new Promise(resolve =>
      //   setTimeout(resolve, 300),
      // );
    }

    const receipt = this.prepareBill(bill);

    console.log('================================');
    console.log('THERMAL RECEIPT');
    console.log(receipt);
    console.log('================================');

    return await new Promise((resolve, reject) => {
  let completed = false;

  const finishSuccess = value => {
    if (completed) return;

    completed = true;
    clearTimeout(timeoutId);

    console.log(
      'THERMAL PRINT SUCCESS:',
      value,
    );

    resolve(true);
  };

  const finishError = error => {
    if (completed) return;

    completed = true;
    clearTimeout(timeoutId);

    console.log(
      'THERMAL PRINT ERROR:',
      error,
    );

    reject(error);
  };

  // Some thermal printers print successfully
  // but do not send the success callback.
  const timeoutId = setTimeout(() => {
    if (completed) return;

    completed = true;

    console.log(
      'PRINT CALLBACK NOT RECEIVED - ASSUMING PRINT COMPLETED',
    );

    resolve(true);
  }, 2000);

  BLEPrinter.printBill(
    receipt,
    {
      beep: true,
      cut: true,
      tailingLine: true,
      encoding: 'UTF8',
      keepConnection: true,
    },
    finishSuccess,
    finishError,
  );
});

    // return await new Promise((resolve, reject) => {
    //   BLEPrinter.printBill(
    //     receipt,
    //     {
    //       beep: true,
    //       cut: true,
    //       tailingLine: true,
    //       encoding: 'UTF8',
    //       keepConnection: true,
    //     },
    //     msg => {
    //       console.log(
    //         'THERMAL PRINT SUCCESS:',
    //         msg,
    //       );

    //       resolve(true);
    //     },
    //     error => {
    //       console.log(
    //         'THERMAL PRINT ERROR:',
    //         error,
    //       );

    //       reject(error);
    //     },
    //   );
    // });
  } catch (error) {
    console.log(
      'PRINT BILL ERROR:',
      error,
    );

    // Important:
    // Don't immediately clear connection for every print error.
    // Otherwise next print needs reconnection.

    throw error;
  }
}

  // =======================================================
  // COMPATIBILITY METHOD
  // BillingScreen uses printReceipt()
  // =======================================================

  async printReceipt(bill) {
    return await this.printBill(
      bill,
    );
  }

  // =======================================================
  // DISCONNECT
  // =======================================================

  async disconnect() {
    try {
      if (
        typeof BLEPrinter.closeConn ===
        'function'
      ) {
        await BLEPrinter.closeConn();
      }
    } catch (error) {
      console.log(
        'DISCONNECT ERROR:',
        error,
      );
    }

    this.connectedPrinter =
      null;

    this.connectedAddress =
      null;

    return true;
  }
}

// =========================================================
// EXPORT SINGLETON
// =========================================================

export default new ThermalPrinterService();
import React from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import ReceiptHeader from './ReceiptHeader';
import ReceiptItems from './ReceiptItems';
import ReceiptTotals from './ReceiptTotals';
import PaymentSummary from './PaymentSummary';
import GstSummary from './GstSummary';
import ReceiptFooters from './ReceiptFooters';
import { rS, rV } from '../../constants/responsive';
import {
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';
import Fonts from '../../constants/Fonts';

const Receipt = ({ bill, printerWidth = null }) => {
  console.log(bill, 'bill');

  const { width: screenWidth } = useWindowDimensions();

  const receiptWidth = printerWidth
    ? printerWidth
    : Math.min(screenWidth - 20, 576);

  const scale = receiptWidth / 576;

  const sizes = {
    storeName: Math.max(15, 23 * scale),
    contact: Math.max(9, 14 * scale),
    address: Math.max(9, 14 * scale),
    invoiceTitle: Math.max(15, 20 * scale),
    normal: Math.max(10, 15 * scale),
    small: Math.max(8, 13 * scale),
    itemName: Math.max(10, 17 * scale),
    itemValue: Math.max(8, 14 * scale),
    section: Math.max(11, 16 * scale),
    grandTotal: Math.max(17, 26 * scale),
    footer: Math.max(10, 18 * scale),
  };

  const styles = createStyles(receiptWidth, sizes);

  if (!bill) {
    return (
      <View style={styles.emptyContainer}>
        <Text>No receipt data</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.receipt}>
        <View
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ReceiptHeader bill={bill} styles={styles} />
        </View>

        <View style={styles.invoiceTitleRow}>
          <View style={styles.dashedLine} />
          <Text style={styles.invoiceTitle}>
            {' '}
            {bill?.billCaption?.trim() ? bill.billCaption : 'TAX INVOICE'}
          </Text>
          <View style={styles.dashedLine} />
        </View>

        <View style={styles.line} />

        <View style={styles.billInfoRow}>
          <Text style={styles.normalText}>
            {' '}
            Bill.No:{' '}
            {bill?.billPrefix
              ? `${bill.billPrefix}${bill.billNo}`
              : bill?.billNo || ''}
          </Text>
          <Text style={styles.normalText}>
            Date: {bill.date}, {bill.time}
          </Text>
        </View>

        <View style={styles.line} />

        {/* {
          bill.variant === 'plainRetail' ||
            bill.variant === 'retailQr' ||
            bill.variant === 'retailNoTax' ||
            bill.variant === 'retailGst'
            ? (
              <View style={styles.customerTitleRowCenter}>
                <View style={styles.customerDashedLineCenter} />
                <Text style={styles.customerTitleCenter}>
                  CUSTOMER INFO
                </Text>
                <View style={styles.customerDashedLineCenter} />
              </View>
            ) : (
              <View style={styles.customerTitleRow}>
                <Text style={styles.customerTitle}>
                  CUSTOMER INFO
                </Text>
                <View style={styles.customerDashedLine} />
              </View>
            )}
        <Text style={styles.normalText}>
          {bill.customer.name}
        </Text>
        <Text style={styles.normalText}>
          {bill.customer.phone}
        </Text>
        <Text style={styles.normalText}>
          {bill.customer.taxNo}
        </Text>

        <View style={styles.line} /> */}
        {/* CUSTOMER INFO — show only when at least one field has value */}
        {(() => {
          const customerName = bill?.customer?.name?.trim?.() || '';
          const customerPhone = bill?.customer?.phone?.trim?.() || '';
          const customerTaxNo = bill?.customer?.taxNo?.trim?.() || '';

          const hasCustomerInfo =
            customerName !== '' || customerPhone !== '' || customerTaxNo !== '';

          if (!hasCustomerInfo) {
            return null;
          }

          const isNewRetailVariant =
            bill.variant === 'plainRetail' ||
            bill.variant === 'retailQr' ||
            bill.variant === 'retailNoTax' ||
            bill.variant === 'retailGst';

          return (
            <>
              {isNewRetailVariant ? (
                <View style={styles.customerTitleRowCenter}>
                  <View style={styles.customerDashedLineCenter} />

                  <Text style={styles.customerTitleCenter}>CUSTOMER INFO</Text>

                  <View style={styles.customerDashedLineCenter} />
                </View>
              ) : (
                <View style={styles.customerTitleRow}>
                  <Text style={styles.customerTitle}>CUSTOMER INFO</Text>

                  <View style={styles.customerDashedLine} />
                </View>
              )}

              {customerName !== '' && (
                <Text style={styles.normalText}>{customerName}</Text>
              )}

              {customerPhone !== '' && (
                <Text style={styles.normalText}>{customerPhone}</Text>
              )}

              {customerTaxNo !== '' && (
                <Text style={styles.normalText}>{customerTaxNo}</Text>
              )}

              <View style={styles.line} />
            </>
          );
        })()}

        <ReceiptItems bill={bill} styles={styles} />

        <ReceiptTotals totals={bill.totals} styles={styles} />

        <PaymentSummary payment={bill.payment} styles={styles} />

        {(bill.gstMode === 'summary' || bill.gstMode === 'itemBreakup') &&
          bill.gst && <GstSummary gst={bill.gst} styles={styles} />}

        <ReceiptFooters bill={bill} styles={styles} scale={scale} />
      </View>
    </ScrollView>
  );
};

const createStyles = (width, sizes) => {
  const padding = width * 0.055;

  const HSN_RIGHT_WIDTH = '22%';

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#ffff',
    },

    screenContent: {
      alignItems: 'center',
      paddingVertical: 10,
    },

    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    receipt: {
      width: width,
      backgroundColor: '#ffffff',
      paddingHorizontal: padding,
      paddingTop: 15,
      paddingBottom: 20,
    },

    /* =========================================================
       HEADER
    ========================================================= */

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingLeft: responsiveWidth(4),
    },

    logo: {
      width: width * 0.11,
      height: width * 0.16,
      marginRight: width * 0.025,
    },

    storeInfo: {
      flex: 1,
    },

    storeName: {
      fontSize: sizes.storeName,
      fontFamily: Fonts.FigtreeBold,
      color: '#111111',
      marginBottom: 5,
    },

    contactRow: {
      width: '80%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    // contactText: {
    //   fontSize: sizes.contact,
    //   fontFamily: Fonts.FigtreeRegular,
    //   color: '#222222',
    // },
    contactText: {
      // flex: 1,
      fontSize: sizes.contact,
      fontFamily: Fonts.FigtreeRegular,
      color: '#222222',
      marginRight: rS(5),
    },

    gstText: {
      // flex: 1,
      fontSize: sizes.contact,
      fontFamily: Fonts.FigtreeRegular,
      color: '#222222',
      // textAlign: 'right',
    },

    /* =========================================================
       ADDRESS
    ========================================================= */

    addressContainer: {
      alignItems: 'center',
      // marginTop: rV(5),
    },

    address: {
      fontSize: sizes.address,
      fontFamily: Fonts.FigtreeRegular,
      textAlign: 'center',
      color: '#222222',
      lineHeight: sizes.address * 1.5,
    },

    /* =========================================================
       TAX INVOICE
    ========================================================= */

    invoiceTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: responsiveHeight(1),
    },

    invoiceTitle: {
      fontSize: sizes.invoiceTitle,
      fontFamily: Fonts.FigtreeBold,
      color: '#111111',

      marginHorizontal: responsiveHeight(2),
    },

    dashedLine: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#555555',
    },

    /* =========================================================
       BILL INFO
    ========================================================= */

    billInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    normalText: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      marginBottom: 1,
    },

    line: {
      borderBottomWidth: 1.4,
      borderBottomColor: '#f2f2f2',
      marginVertical: 9,
    },

    line_summary: {
      borderBottomWidth: 0.5,
      borderBottomColor: '#000000',
      marginVertical: 9,
    },

    customerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 7,
    },

    customerTitle: {
      fontSize: sizes.section,
      fontFamily: Fonts.FigtreeSemiBold,
      fontWeight: '600',
      color: '#111111',
    },

    customerDashedLine: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#777777',
      marginLeft: 10,
    },

    /* =========================================================
       RETAIL HEADER
    ========================================================= */

    retailHeader: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 6,
    },

    retailHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    retailHeaderHsn: {
      width: HSN_RIGHT_WIDTH,
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },

    retailHeaderBottom: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingBottom: 10,
    },

    /* =========================================================
       TEXTILE HEADER (normal)
    ========================================================= */

    textileHeader: {
      backgroundColor: '#eeeeee',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
    },

    textileHeaderTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },

    textileHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    textileHeaderSize: {
      width: '20%',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    textileHeaderColour: {
      width: '20%',
      textAlign: 'right',
      paddingRight: responsiveWidth(1),
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },

    textileHeaderBottom: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    headerCell: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    headerCellRight: {
      flex: 1,
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },

    /* =========================================================
       ITEMS (retail + textile normal)
    ========================================================= */

    retailItem: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },

    textileItem: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },

    retailTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    textileTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    itemName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
      paddingRight: 5,
    },

    hsn: {
      width: HSN_RIGHT_WIDTH,
      textAlign: 'right',
      fontFamily: Fonts.FigtreeRegular,
      fontSize: sizes.itemName,
      color: '#111111',
    },

    size: {
      width: '20%',
      textAlign: 'left',
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    colour: {
      width: '20%',
      textAlign: 'right',
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    itemBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },

    itemCell: {
      flex: 1,
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
    },

    itemAmount: {
      flex: 1,
      textAlign: 'right',
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    /* =========================================================
       TOTALS
    ========================================================= */

    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 4,
    },

    totalLabel: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    totalValue: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    grandTotal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#ededed',
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 7,
    },

    grandTotalText: {
      fontSize: sizes.grandTotal,
      fontFamily: Fonts.FigtreeRegular,
      fontWeight: '700',
      color: '#111111',
    },

    /* =========================================================
       PAYMENT
    ========================================================= */

    paymentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: responsiveHeight(2),
      marginBottom: 5,
    },

    paymentTitle: {
      fontSize: sizes.section,
      fontFamily: Fonts.FigtreeSemiBold,
      fontWeight: '600',
      color: '#111111',
    },

    paymentDashedLine: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#777777',
      marginLeft: 10,
    },

    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 4,
    },

    paymentLabel: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    paymentValue: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },

    /* =========================================================
       GST SUMMARY
    ========================================================= */

    gstSummaryContainer: {
      width: '100%',
    },

    gstSummaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 3,
    },

    gstSummaryCell: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeSemiBold,
      color: '#111111',
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.3,
    },

    gstSummaryCell_Value: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeRegular,
      color: '#000000',
      textAlign: 'center',
    },

    /* =========================================================
       GST ITEM BREAKUP — HEADER
    ========================================================= */

    gstItemHeader: {
      width: '100%',
      backgroundColor: '#eeeeee',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
    },

    gstHeaderRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },

    gstHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    gstHeaderHsn: {
      width: HSN_RIGHT_WIDTH,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'right',
    },

    gstHeaderCell: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },

    gstHeaderCellRight: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'right',
    },

    /* =========================================================
       GST ITEM BREAKUP — DATA ROWS
    ========================================================= */

    gstItem: {
      width: '100%',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f0',
    },

    gstItemRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 5,
    },

    gstItemName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
    },

    gstItemHsn: {
      width: HSN_RIGHT_WIDTH,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    gstItemCell: {
      flex: 1,
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
    },

    gstItemCellRight: {
      flex: 1,
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    /* =========================================================
       SAVED
    ========================================================= */

    savedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginVertical: 5,
    },

    savedText: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeSemiBold,
      fontWeight: '600',
      color: '#111111',
    },

    /* =========================================================
       ✅ QR CODE (NEW)
    ========================================================= */

    qrContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 15,
      width: '100%',
    },

    qrText: {
      fontSize: sizes.normal,
      fontFamily: Fonts.FigtreeSemiBold,
      color: '#555555',
      marginBottom: 10,
      fontWeight: '600',
    },

    qrImage: {
      width: width * 0.35,
      height: width * 0.35,
    },

    /* =========================================================
       FOOTER
    ========================================================= */

    thankYou: {
      textAlign: 'center',
      fontSize: sizes.footer,
      fontFamily: Fonts.FigtreeRegular,
      color: '#838383',
      marginVertical: rV(6)
    },

    barcodeContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      height: responsiveHeight(7),
      overflow: 'hidden',
    },

    barcode: {
      width: '75%',
      resizeMode: 'contain',
    },

    duplicateContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 25,
      marginBottom: 5,
    },

    duplicateLine: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#999999',
    },

    duplicateText: {
      fontSize: sizes.section,
      fontFamily: Fonts.FigtreeRegular,
      fontWeight: '700',
      color: '#666666',
      marginHorizontal: 12,
    },

    /* =========================================================
       4 SEPARATE RETAIL STYLE SETS — one per design
    ========================================================= */

    /* --- 1. 3" Bill (plainRetail) --- */
    plainHeader: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
    },
    plainHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },
    plainHeaderCell: {
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },
    plainItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    plainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    plainName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
      paddingRight: 5,
    },
    plainCell: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },
    plainAmount: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    /* --- 2. 3" RBill-QR (retailQr) --- */
    qrHeader: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
    },
    qrHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },
    qrHeaderCell: {
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },
    qrItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    qrRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    qrName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
      paddingRight: 5,
    },
    qrCell: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },
    qrAmount: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    /* --- 3. 3" RBill-w/o tax (retailNoTax) --- */
    noTaxHeader: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
    },
    noTaxHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },
    noTaxHeaderCell: {
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },
    noTaxItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    noTaxRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    noTaxName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
      paddingRight: 5,
    },
    noTaxCell: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },
    noTaxAmount: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },

    /* --- 4. RBill (retailGst) --- */
    rBillHeader: {
      flexDirection: 'row',
      backgroundColor: '#EDEDED',
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
    },
    rBillHeaderName: {
      flex: 1,
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
      textAlign: 'left',
    },
    rBillHeaderCell: {
      textAlign: 'right',
      fontSize: sizes.small,
      fontFamily: Fonts.FigtreeBold,
      fontWeight: '700',
      color: '#111111',
    },
    rBillItem: {
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e5e5',
    },
    rBillRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    rBillName: {
      flex: 1,
      fontSize: sizes.itemName,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'left',
      paddingRight: 5,
    },
    rBillCell: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
    },
    rBillAmount: {
      fontSize: sizes.itemValue,
      fontFamily: Fonts.FigtreeRegular,
      color: '#111111',
      textAlign: 'right',
    },
    /* =========================================================
   CUSTOMER TITLE — CENTERED (for the 3 new designs)
========================================================= */

    customerTitleRowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 7,
    },

    customerTitleCenter: {
      fontSize: sizes.section,
      fontFamily: Fonts.FigtreeBold,
      // fontWeight: 'bold',
      color: '#0000',
      marginHorizontal: 10,
      // letterSpacing: 0.5,
    },

    customerDashedLineCenter: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#777777',
    },
  });
};

export default Receipt;

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  Image,
} from 'react-native';

import { invoiceData } from '../data/invoiceData';
import Fonts from '../constants/Fonts';
import {
  responsiveFontSize,
  responsiveHeight,
  responsiveWidth,
} from 'react-native-responsive-dimensions';

const A5_WIDTH = 559;
const A5_HEIGHT = 794; // fallback only, real height is measured

// Pass `logoSource={require('../assets/logo.png')}` if you have the real
// multi-colour logo asset. Without it, a lettermark fallback is shown —
// the exact graphic in the sample bills can't be recreated in pure RN
// styles, it needs an actual image/SVG asset.
export default function A5Invoice({ type = 'clothes', logoSource }) {
  const { width: screenWidth } = useWindowDimensions();
  const data = invoiceData[type];
  const isClothes = type === 'clothes';
  const horizontalMargin = responsiveWidth(5.333);
  const scale = Math.min(1, (screenWidth - horizontalMargin) / A5_WIDTH);
  const styles = createResponsiveStyles(scale);
  const barcodeWidth = value =>
    responsiveWidth((value / A5_WIDTH) * 100) *
    scale /
    (responsiveWidth(100) / A5_WIDTH);

  const [contentHeight, setContentHeight] = useState(A5_HEIGHT);

  const handlePageLayout = (e) => {
    const { height } = e.nativeEvent.layout;
    const rounded = Math.round(height);
    if (rounded > 0 && rounded !== Math.round(contentHeight)) {
      setContentHeight(rounded);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingVertical: responsiveHeight(2.5) },
      ]}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.pageWrapper,
          { width: A5_WIDTH * scale, height: contentHeight },
        ]}>
        <View
          onLayout={handlePageLayout}
          style={[
            styles.a5Page,
          ]}>

          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              {/* <Image source={require('../assets/Images/vij1.png')} style={styles.logoImage} resizeMode="contain" /> */}
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.companyName}>
                SRI SAI VIJETHA SUPER MARKET
              </Text>
              <View style={styles.contactRow}>
                <Text style={styles.contactText}>Contact: 9110333043</Text>
                <View style={styles.verticalLine} />
                <Text style={styles.contactText}>GST.No: 9110333043</Text>
              </View>
            </View>
          </View>

          <Text style={styles.address}>
            F8JV+VGC, Kondapur, Venkateshwara Nagar, Serilingampalle (M),
          </Text>
          <Text style={styles.address}>
            Himayat ,Telangana, India -500084
          </Text>

          {/* ================= TAX INVOICE ================= */}
          <View style={styles.titleRow}>
            <View style={styles.dashedLine} />
            <Text style={styles.title}>TAX INVOICE</Text>
            <View style={styles.dashedLine} />
          </View>

          {/* ================= CUSTOMER ================= */}
          <View style={styles.customerBox}>
            <View style={styles.billSection}>
              <Text style={styles.customerText}>Bill.No: {data.billNo}</Text>
              <Text style={styles.customerText}>Date: {data.date}</Text>
            </View>

            <View style={styles.customerDivider} />

            <View style={styles.customerSection}>
              <View style={styles.customerTitleRow}>
                <Text style={styles.customerTitle}>CUSTOMER INFO</Text>
                <View style={styles.customerTitleLine} />
              </View>
              <Text style={styles.customerText}>{data.customer.name}</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.customerText}>{data.customer.phone}</Text>
                <Text style={styles.customerText}>
                  {data.customer.transactionNo}
                </Text>
              </View>
            </View>
          </View>

          {/* ================= PRODUCT TABLE ================= */}
          <View style={styles.productTable}>
            <View style={styles.productHeader}>
              <Text style={[styles.headerCell, styles.sno]}>S.No</Text>
              <Text
                style={[
                  styles.headerCell,
                  isClothes ? styles.itemClothes : styles.itemGrocery,
                ]}>
                Item Name
              </Text>

              {isClothes ? (
                <>
                  <Text style={[styles.headerCell, styles.size]}>Size</Text>
                  <Text style={[styles.headerCell, styles.colour]}>Colour</Text>
                  <Text style={[styles.headerCell, styles.hsn]}>HSN Code</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.headerCell, styles.hsnGrocery]}>
                    HSN Code
                  </Text>
                  <Text style={[styles.headerCell, styles.mrp]}>MRP</Text>
                </>
              )}

              <Text style={[styles.headerCell, styles.rate]}>Rate</Text>
              <Text style={[styles.headerCell, styles.discount]}>Disc.</Text>
              <Text style={[styles.headerCell, styles.qty]}>Qty</Text>
              <Text style={[styles.headerCell, styles.amount]}>Amount</Text>
            </View>

            {data.products.map(item => (
              <View key={item.sno} style={styles.productRow}>
                <Text style={[styles.tableText, styles.sno]}>{item.sno}</Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.tableText,
                    isClothes ? styles.itemClothes : styles.itemGrocery,
                  ]}>
                  {item.itemName}
                </Text>

                {isClothes ? (
                  <>
                    <Text style={[styles.tableText, styles.size]}>
                      {item.size}
                    </Text>
                    <Text style={[styles.tableText, styles.colour]}>
                      {item.colour}
                    </Text>
                    <Text style={[styles.tableText, styles.hsn]}>
                      {item.hsnCode}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.tableText, styles.hsnGrocery]}>
                      {item.hsnCode}
                    </Text>
                    <Text style={[styles.tableText, styles.mrp]}>
                      {item.mrp}
                    </Text>
                  </>
                )}

                <Text style={[styles.tableText, styles.rate]}>{item.rate}</Text>
                <Text style={[styles.tableText, styles.discount]}>
                  {item.discount}
                </Text>
                <Text style={[styles.tableText, styles.qty]}>{item.qty}</Text>
                <Text style={[styles.tableText, styles.amount]}>
                  {item.amount}
                </Text>
              </View>
            ))}
          </View>

          {/* ================= SUMMARY + PAYMENT ================= */}
          <View style={styles.summaryContainer}>
            {/* LEFT */}
            <View style={styles.summaryBox}>
              <SummaryRow
                styles={styles}
                label="Total Items/Qty:"
                value={data.totals.totalItemsQty}
              />
              <SummaryRow styles={styles} label="Subtotal:" value={data.totals.subtotal} />
              <SummaryRow styles={styles} label="Discount:" value={data.totals.discount} />
              <SummaryRow
                styles={styles}
                label="Round-off Value:"
                value={data.totals.roundOff}
              />
              <SummaryRow
                styles={styles}
                label="Additional Charge:"
                value={data.totals.additionalCharge}
              />
              <View style={styles.dashedSeparator} />
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                <Text style={styles.grandTotal}>{data.totals.grandTotal}</Text>
              </View>
            </View>

            {/* RIGHT */}
            <View style={styles.paymentBox}>
              <View style={styles.paymentTitleRow}>
                <Text style={styles.paymentTitle}>PAYMENT SUMMARY</Text>
                <View style={styles.paymentLine} />
              </View>
              <SummaryRow styles={styles} label="Cash:" value={data.payment.cash} />
              <SummaryRow styles={styles} label="UPI:" value={data.payment.upi} />
              <SummaryRow styles={styles} label="Change Cash:" value={data.payment.changeCash} />
            </View>
          </View>

          {/* ================= GST TABLE ================= */}
          <View style={styles.gstTable}>
            <View style={styles.gstHeader}>
              <Text style={[styles.gstText, styles.gstSno, styles.bold_new]}>S.No</Text>
              <Text style={[styles.gstText, styles.gstHsn, styles.bold_new]}>HSN Code</Text>
              <Text style={[styles.gstText, styles.gstTax, styles.bold_new]}>Tax %</Text>
              <Text style={[styles.gstText, styles.gstTaxable, styles.bold_new]}>Taxable</Text>
              <Text style={[styles.gstText, styles.gstSgst, styles.bold_new]}>SGST%</Text>
              <Text style={[styles.gstText, styles.gstCgst, styles.bold_new, styles.side_move]}>CGST %</Text>
              <Text style={[styles.gstText, styles.gstValue, styles.bold_new]}>Tax Value</Text>
            </View>

            {Array.from({ length: 6 }).map((_, index) => (
              <View style={styles.gstRow} key={index}>
                <Text style={[styles.gstText, styles.gstSno]}>{index + 1}</Text>
                <Text style={[styles.gstText, styles.gstHsn]}>B5342467</Text>
                <Text style={[styles.gstText, styles.gstTax]}>VR-21</Text>
                <Text style={[styles.gstText, styles.gstTaxable]}>100.00</Text>
                <Text style={[styles.gstText, styles.gstSgst]}>100.00</Text>
                <Text style={[styles.gstText, styles.gstCgst]}>5.00</Text>
                <Text style={[styles.gstText, styles.gstValue]}>3.00</Text>
              </View>
            ))}

            <View style={styles.gstTotal}>
              <Text style={styles.gstTotalLabel}>Total GST:</Text>
              <Text style={styles.gstTotalValue}>36.69</Text>
            </View>
          </View>

          {/* ================= SAVED ================= */}
          <View style={styles.savedRow}>
            <Text style={styles.savedText}>Total Amount Saved:</Text>
            <Text style={styles.savedText}>{data.totals.totalSaved}</Text>
          </View>

          {/* ================= FOOTER ================= */}
          <Text style={styles.thankYou}>Thankyou! Visit Again</Text>

          {/* Barcode */}
          <View style={styles.barcode}>
            {Array.from({ length: 60 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    width:
                      barcodeWidth(
                        index % 5 === 0 ? 4 :
                          index % 3 === 0 ? 3 :
                            index % 2 === 0 ? 2 : 1,
                      ),
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SummaryRow({ label, value, styles }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function createResponsiveStyles(scale) {
  const widthScale = responsiveWidth(100) / A5_WIDTH;
  const heightScale = responsiveHeight(100) / A5_HEIGHT;
  const fontScale = responsiveFontSize(100) / A5_HEIGHT;
  const responsiveWidthValue = value =>
    responsiveWidth((value / A5_WIDTH) * 100) * scale / widthScale;
  const responsiveHeightValue = value =>
    responsiveHeight((value / A5_HEIGHT) * 100) * scale / heightScale;
  const responsiveFont = value =>
    responsiveFontSize((value / A5_HEIGHT) * 100) * scale / fontScale;
  const responsiveStyleKeys = /^(fontSize|letterSpacing|width|height|minHeight|minWidth|maxHeight|maxWidth|padding|paddingBottom|paddingEnd|paddingHorizontal|paddingLeft|paddingRight|paddingStart|paddingTop|paddingVertical|margin|marginBottom|marginEnd|marginHorizontal|marginLeft|marginRight|marginStart|marginTop|marginVertical|border.*Width)$/;

  const baseStyles = StyleSheet.create({
    container: {
      backgroundColor: '#fff',
      alignItems: 'center',
      paddingVertical: 20,
    },
    pageWrapper: { overflow: 'hidden' },
    a5Page: {
      width: A5_WIDTH,
      backgroundColor: '#fff',
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 20,
    },

    /* ---------- HEADER ---------- */
    header: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoBox: {
      width: 48,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    logoImage: { width: 48, height: 40 },
    logoText: {
      fontSize: 40,
      fontFamily: Fonts.FigtreeBold,
      fontStyle: 'italic',
      color: '#111',
    },
    headerRight: { alignItems: 'flex-start' },
    companyName: { fontSize: 16, fontFamily: Fonts.FigtreeBold, color: '#111' },
    contactRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    contactText: { fontSize: 9, fontFamily: Fonts.FigtreeRegular, color: '#222' },
    verticalLine: {
      width: 1,
      height: 12,
      backgroundColor: '#555',
      marginHorizontal: 10,
    },
    address: {
      textAlign: 'center',
      fontSize: 9,
      fontFamily: Fonts.FigtreeRegular,
      color: '#222',
      marginTop: 2,
    },

    /* ---------- TITLE ---------- */
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 12,
    },
    dashedLine: {
      flex: 1,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#222',
    },
    title: {
      fontSize: 14,
      fontFamily: Fonts.FigtreeBold,
      color: '#111',
      marginHorizontal: 12,
      letterSpacing: 0.5,
    },

    /* ---------- CUSTOMER ---------- */
    customerBox: {
      minHeight: 60,
      borderWidth: 1,
      borderColor: '#222',
      flexDirection: 'row',
    },
    billSection: {
      width: '38%',
      paddingHorizontal: 8,
      paddingVertical: 6,
      justifyContent: 'center',
    },
    customerDivider: { width: 1, backgroundColor: '#222' },
    customerSection: {
      flex: 1,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    customerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    customerTitle: { fontSize: 9.5, fontFamily: Fonts.FigtreeBold, color: '#111' },
    customerTitleLine: {
      flex: 1,
      borderTopWidth: 1,
      borderColor: '#222',
      marginLeft: 6,
    },
    customerText: { fontSize: 10, fontFamily: Fonts.FigtreeRegular, color: '#111', marginTop: 3 },
    phoneRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },

    /* ---------- PRODUCT TABLE ---------- */
    productTable: {
      borderWidth: 1,
      borderColor: '#222',
      marginTop: 8,
    },
    productHeader: {
      minHeight: 26,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: '#222',
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    productRow: {
      minHeight: 18,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    headerCell: { fontSize: 9, fontFamily: Fonts.FigtreeBold, color: '#2A2A2A' },
    tableText: { fontSize: 9, fontFamily: Fonts.FigtreeRegular, color: '#111' },

    // Column widths rebalanced to fit within the ~523px usable page width
    // (A5_WIDTH minus left/right padding) without starving the flexible
    // Amount column.
    sno: { width: 26, textAlign: 'left', paddingLeft: 2, },
    itemClothes: { width: 118 },
    itemGrocery: { width: 148 },
    size: { width: 38, textAlign: 'center' },
    colour: { width: 52, paddingLeft: 4 },
    hsn: { width: 52, paddingLeft: 4 },
    hsnGrocery: { width: 62, paddingLeft: 4 },
    mrp: { width: 54, textAlign: 'right', paddingRight: 4 },
    rate: { width: 50, textAlign: 'right', paddingRight: 4 },
    discount: { width: 42, textAlign: 'right', paddingRight: 4 },
    qty: { width: 38, textAlign: 'right', paddingRight: 4 },
    amount: { flex: 1, textAlign: 'right', paddingRight: 6, minWidth: 50 },

    /* ---------- SUMMARY + PAYMENT ---------- */
    summaryContainer: {
      flexDirection: 'row',
      marginTop: 8,
      minHeight: 132,
    },
    summaryBox: {
      width: '50%',
      borderWidth: 1,
      borderColor: '#222',
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    paymentBox: {
      flex: 1,
      borderWidth: 1,
      borderColor: '#222',
      marginLeft: 8,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    summaryLabel: { fontSize: 10, fontFamily: Fonts.FigtreeRegular, color: '#111' },
    summaryValue: { fontSize: 10, fontFamily: Fonts.FigtreeRegular, color: '#111' },
    dashedSeparator: {
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#222',
      marginVertical: 4,
    },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: 2,
    },
    grandTotalLabel: { fontSize: responsiveFontSize(0.8), color: '#111', fontFamily: Fonts.FigtreeSemiBold },
    grandTotal: { fontSize: 20, fontFamily: Fonts.FigtreeBold, color: '#111' },

    paymentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    paymentTitle: { fontSize: 9.5, fontFamily: Fonts.FigtreeBold, color: '#111', fontWeight: "bold" },
    paymentLine: {
      flex: 1,
      borderTopWidth: 1,
      borderColor: '#222',
      marginLeft: 6,
    },

    /* ---------- GST TABLE ---------- */
    gstTable: {
      borderWidth: 1,
      borderColor: '#222',
      marginTop: 8,
    },
    gstHeader: {
      minHeight: 24,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: '#222',
      paddingHorizontal: 2,
      paddingVertical: 3,
    },
    gstRow: {
      minHeight: 18,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    gstText: { fontSize: 8.5, fontFamily: Fonts.FigtreeRegular, color: '#111' },
    gstSno: { width: 44, textAlign: 'left', paddingLeft: 4 },
    bold_new: {
      fontFamily: Fonts.FigtreeBold
    },
    side_move: {
      paddingLeft: responsiveWidth(0.5),
    },
    gstHsn: { width: 88, paddingLeft: 4 },
    gstTax: { width: 56, textAlign: 'center' },
    gstTaxable: { width: 68, textAlign: 'right', paddingRight: 6 },
    gstSgst: { width: 62, textAlign: 'right', paddingRight: 6 },
    gstCgst: { width: 56, textAlign: 'right' },
    gstValue: { flex: 1, textAlign: 'right', paddingRight: 6, minWidth: 60 },

    gstTotal: {
      minHeight: 26,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#222',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    gstTotalLabel: { fontSize: 10, color: '#111', fontFamily: Fonts.FigtreeSemiBold },
    gstTotalValue: { fontSize: 10, color: '#111', fontFamily: Fonts.FigtreeSemiBold },

    /* ---------- FOOTER ---------- */
    savedRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 4,
    },
    savedText: { fontSize: 10, fontFamily: Fonts.FigtreeRegular, color: '#111' },

    thankYou: {
      textAlign: 'center',
      marginTop: 40,
      fontSize: 12,
      fontFamily: Fonts.FigtreeSemiBold,
      color: '#999',
    },

    barcode: {
      height: 44,
      marginTop: 16,
      marginBottom: 4,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'stretch',
    },
    bar: {
      backgroundColor: '#000',
      marginRight: 2,
    },
  });

  const responsiveStyles = Object.fromEntries(
    Object.entries(baseStyles).map(([styleName, style]) => [
      styleName,
      Object.fromEntries(
        Object.entries(style).map(([property, value]) => {
          if (typeof value !== 'number' || !responsiveStyleKeys.test(property)) {
            return [property, value];
          }

          if (property === 'fontSize') {
            return [property, responsiveFont(value)];
          }

          const isHorizontal = /^(width|marginLeft|marginRight|marginHorizontal|paddingLeft|paddingRight|paddingHorizontal)$/.test(property);
          return [property, isHorizontal ? responsiveWidthValue(value) : responsiveHeightValue(value)];
        }),
      ),
    ]),
  );

  return {
    ...responsiveStyles,
    barcode: {
      ...responsiveStyles.barcode,
      height: responsiveHeight((44 / A5_HEIGHT) * 100) * scale / heightScale,
      marginTop: responsiveHeight((16 / A5_HEIGHT) * 100) * scale / heightScale,
      marginBottom: responsiveHeight((4 / A5_HEIGHT) * 100) * scale / heightScale,
    },
  };
}
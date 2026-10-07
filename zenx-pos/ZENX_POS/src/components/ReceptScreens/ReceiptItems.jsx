import React from 'react';
import {
  View,
  Text,
} from 'react-native';

const money = value => {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '0.00';
  }

  return Number(value).toFixed(2);
};

const renderPlainRetail = (bill, styles) => (
  <>
    <View style={styles.plainHeader}>
      <Text style={styles.plainHeaderName}>Item Name</Text>
      <Text style={[styles.plainHeaderCell, { width: '18%' }]}>Rate</Text>
      <Text style={[styles.plainHeaderCell, { width: '12%' }]}>Qty</Text>
      <Text style={[styles.plainHeaderCell, { width: '25%' }]}>Amount</Text>
    </View>

    {bill.items.map((item, index) => (
      <View key={`${item.id}-${index}`} style={styles.plainItem}>
        <View style={styles.plainRow}>
          <Text style={styles.plainName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.plainCell, { width: '18%', textAlign: 'right' }]}>
            {money(item.rate)}
          </Text>
          <Text style={[styles.plainCell, { width: '12%', textAlign: 'right' }]}>
            {money(item.qty)}
          </Text>
          <Text style={[styles.plainAmount, { width: '25%' }]}>
            {money(item.amount)}
          </Text>
        </View>
      </View>
    ))}
  </>
);
const renderRetailQr = (bill, styles) => (
  <>
    <View style={styles.qrHeader}>
      <Text style={styles.qrHeaderName}>Item Name</Text>
      <Text style={[styles.qrHeaderCell, { width: '18%' }]}>Rate</Text>
      <Text style={[styles.qrHeaderCell, { width: '12%' }]}>Qty</Text>
      <Text style={[styles.qrHeaderCell, { width: '25%' }]}>Amount</Text>
    </View>

    {bill.items.map((item, index) => (
      <View key={`${item.id}-${index}`} style={styles.qrItem}>
        <View style={styles.qrRow}>
          <Text style={styles.qrName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.qrCell, { width: '18%', textAlign: 'right' }]}>
            {money(item.rate)}
          </Text>
          <Text style={[styles.qrCell, { width: '12%', textAlign: 'right' }]}>
            {money(item.qty)}
          </Text>
          <Text style={[styles.qrAmount, { width: '25%' }]}>
            {money(item.amount)}
          </Text>
        </View>
      </View>
    ))}
  </>
);
const renderRetailNoTax = (bill, styles) => (
  <>
    <View style={styles.noTaxHeader}>
      <Text style={styles.noTaxHeaderName}>Item Name</Text>
      <Text style={[styles.noTaxHeaderCell, { width: '18%' }]}>Rate</Text>
      <Text style={[styles.noTaxHeaderCell, { width: '12%' }]}>Qty</Text>
      <Text style={[styles.noTaxHeaderCell, { width: '25%' }]}>Amount</Text>
    </View>

    {bill.items.map((item, index) => (
      <View key={`${item.id}-${index}`} style={styles.noTaxItem}>
        <View style={styles.noTaxRow}>
          <Text style={styles.noTaxName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.noTaxCell, { width: '18%', textAlign: 'right' }]}>
            {money(item.rate)}
          </Text>
          <Text style={[styles.noTaxCell, { width: '12%', textAlign: 'right' }]}>
            {money(item.qty)}
          </Text>
          <Text style={[styles.noTaxAmount, { width: '25%' }]}>
            {money(item.amount)}
          </Text>
        </View>
      </View>
    ))}
  </>
);
const renderRetailGst = (bill, styles) => (
  <>
    <View style={styles.rBillHeader}>
      <Text style={styles.rBillHeaderName}>Item Name</Text>
      <Text style={[styles.rBillHeaderCell, { width: '18%' }]}>Rate</Text>
      <Text style={[styles.rBillHeaderCell, { width: '12%' }]}>Qty</Text>
      <Text style={[styles.rBillHeaderCell, { width: '25%' }]}>Amount</Text>
    </View>

    {bill.items.map((item, index) => (
      <View key={`${item.id}-${index}`} style={styles.rBillItem}>
        <View style={styles.rBillRow}>
          <Text style={styles.rBillName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.rBillCell, { width: '18%', textAlign: 'right' }]}>
            {money(item.rate)}
          </Text>
          <Text style={[styles.rBillCell, { width: '12%', textAlign: 'right' }]}>
            {money(item.qty)}
          </Text>
          <Text style={[styles.rBillAmount, { width: '25%' }]}>
            {money(item.amount)}
          </Text>
        </View>
      </View>
    ))}
  </>
);

const ReceiptItems = ({ bill, styles }) => {

  /* ---- 4 new designs get their own renderers ---- */
  if (bill.variant === 'plainRetail') return renderPlainRetail(bill, styles);
  if (bill.variant === 'retailQr')    return renderRetailQr(bill, styles);
  if (bill.variant === 'retailNoTax') return renderRetailNoTax(bill, styles);
  if (bill.variant === 'retailGst')   return renderRetailGst(bill, styles);

  /* ---- TEXTILE NORMAL ---- */
  if (bill.type === 'textile' && bill.gstMode === 'none') {
    return (
      <>
        <View style={styles.textileHeader}>
          <View style={styles.textileHeaderTopRow}>
            <Text style={styles.textileHeaderName}>Item Name</Text>
            <Text style={styles.textileHeaderSize}>Size</Text>
            <Text style={styles.textileHeaderColour}>Colour</Text>
          </View>
          <View style={styles.textileHeaderBottom}>
            <Text style={styles.headerCell}>HSN Code</Text>
            <Text style={styles.headerCell}>Rate</Text>
            <Text style={styles.headerCell}>Disc</Text>
            <Text style={styles.headerCell}>Qty</Text>
            <Text style={styles.headerCellRight}>Amount</Text>
          </View>
        </View>

        {bill.items.map((item, index) => (
          <View key={`${item.id}-${index}`} style={styles.textileItem}>
            <View style={styles.textileTopRow}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.size}>{item.size}</Text>
              <Text style={styles.colour}>{item.colour}</Text>
            </View>
            <View style={styles.itemBottomRow}>
              <Text style={styles.itemCell}>{item.hsn}</Text>
              <Text style={styles.itemCell}>{money(item.rate)}</Text>
              <Text style={styles.itemCell}>{money(item.discount)}</Text>
              <Text style={styles.itemCell}>{money(item.qty)}</Text>
              <Text style={styles.itemAmount}>{money(item.amount)}</Text>
            </View>
          </View>
        ))}
      </>
    );
  }

  /* ---- Retail GST Format BREAKUP ---- */
  if (bill.type === 'textile' && bill.gstMode === 'itemBreakup') {
    return (
      <>
        <View style={styles.gstItemHeader}>
          <View style={styles.gstHeaderRow}>
            <Text style={styles.gstHeaderName}>Item Name</Text>
            <Text style={styles.gstHeaderHsn}>HSN Code</Text>
          </View>
          <View style={styles.gstHeaderRow}>
            <Text style={styles.gstHeaderCell}>GST%</Text>
            <Text style={styles.gstHeaderCell}>MRP</Text>
            <Text style={styles.gstHeaderCell}>Rate</Text>
            <Text style={styles.gstHeaderCell}>Qty</Text>
            <Text style={styles.gstHeaderCellRight}>Amount</Text>
          </View>
          <View style={styles.gstHeaderRow}>
            <Text style={styles.gstHeaderCell}>CGST%</Text>
            <Text style={styles.gstHeaderCell}>CGST Value</Text>
            <Text style={styles.gstHeaderCell}>SGST%</Text>
            <Text style={styles.gstHeaderCell}>SGST Value</Text>
            <Text style={styles.gstHeaderCellRight}>GST Value</Text>
          </View>
        </View>

        {bill.items.map((item, index) => (
          <View key={`${item.id}-${index}`} style={styles.gstItem}>
            <View style={styles.gstItemRow}>
              <Text style={styles.gstItemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.gstItemHsn}>{item.hsn}</Text>
            </View>
            <View style={styles.gstItemRow}>
              <Text style={styles.gstItemCell}>{item.gstPercent}%</Text>
              <Text style={styles.gstItemCell}>{money(item.mrp)}</Text>
              <Text style={styles.gstItemCell}>{money(item.rate)}</Text>
              <Text style={styles.gstItemCell}>{money(item.qty)}</Text>
              <Text style={styles.gstItemCellRight}>{money(item.amount)}</Text>
            </View>
            <View style={styles.gstItemRow}>
              <Text style={styles.gstItemCell}>{item.cgstPercent}%</Text>
              <Text style={styles.gstItemCell}>{money(item.cgstValue)}</Text>
              <Text style={styles.gstItemCell}>{item.sgstPercent}%</Text>
              <Text style={styles.gstItemCell}>{money(item.sgstValue)}</Text>
              <Text style={styles.gstItemCellRight}>{money(item.gstValue)}</Text>
            </View>
          </View>
        ))}
      </>
    );
  }

  /* ---- OLD RETAIL FALLBACK (Retail / Retail + GST / Duplicate chips) ---- */
  return (
    <>
      <View style={styles.retailHeader}>
        <Text style={styles.retailHeaderName}>Item Name</Text>
        <Text style={styles.retailHeaderHsn}>HSN Code</Text>
      </View>

      <View style={styles.retailHeaderBottom}>
        <Text style={styles.headerCell}>MRP</Text>
        <Text style={styles.headerCell}>Rate</Text>
        <Text style={styles.headerCell}>Disc</Text>
        <Text style={styles.headerCell}>Qty</Text>
        <Text style={styles.headerCellRight}>Amount</Text>
      </View>

      {bill.items.map((item, index) => (
        <View key={`${item.id}-${index}`} style={styles.retailItem}>
          <View style={styles.retailTopRow}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.hsn}>{item.hsn}</Text>
          </View>
          <View style={styles.itemBottomRow}>
            <Text style={styles.itemCell}>{money(item.mrp)}</Text>
            <Text style={styles.itemCell}>{money(item.rate)}</Text>
            <Text style={styles.itemCell}>{money(item.discount)}</Text>
            <Text style={styles.itemCell}>{money(item.qty)}</Text>
            <Text style={styles.itemAmount}>{money(item.amount)}</Text>
          </View>
        </View>
      ))}
    </>
  );
};

export default ReceiptItems;
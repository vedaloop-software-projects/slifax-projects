import React from 'react';
import {
  View,
  Text,
} from 'react-native';

const money = value => {
  if (
    value === null ||
    value === undefined
  ) {
    return '0.00';
  }

  return Number(value).toFixed(2);
};

const GstSummary = ({
  gst,
  styles,
}) => {

  if (!gst) {
    return null;
  }

  return (
    <View style={styles.gstSummaryContainer}>

      <View style={styles.line_summary} />

      {/* HEADER */}

      <View style={styles.gstSummaryRow}>
        {/* <Text style={styles.gstSummaryCell}>
          HSN Code
        </Text> */}
        <Text style={styles.gstSummaryCell}>
          Tax%
        </Text>
        <Text style={styles.gstSummaryCell}>
          Taxable
        </Text>
        <Text style={styles.gstSummaryCell}>
          SGST
        </Text>
        <Text style={styles.gstSummaryCell}>
          CGST
        </Text>
        <Text style={styles.gstSummaryCell}>
          Tax Value
        </Text>
      </View>

      {/* VALUE */}

      <View style={styles.gstSummaryRow}>
        {/* <Text style={styles.gstSummaryCell_Value}>
          {gst.hsn}
        </Text> */}
        <Text style={styles.gstSummaryCell_Value}>
          {gst.taxPercent}
        </Text>
        <Text style={styles.gstSummaryCell_Value}>
          {money(gst.taxable)}
        </Text>
        <Text style={styles.gstSummaryCell_Value}>
          {money(gst.sgst)}
        </Text>
        <Text style={styles.gstSummaryCell_Value}>
          {money(gst.cgst)}
        </Text>
        <Text style={styles.gstSummaryCell_Value}>
          {money(gst.taxValue)}
        </Text>
      </View>

      <View style={styles.line} />

      {/* TOTAL GST */}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Total GST:
        </Text>
        <Text style={styles.totalValue}>
          {money(gst.totalGst)}
        </Text>
      </View>

    </View>
  );
};

export default GstSummary;
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

const ReceiptTotals = ({
  totals,
  styles,
}) => {
  return (
    <>
      {/* <View style={styles.line} /> */}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Total Items/Qty:
        </Text>
        <Text style={styles.totalValue}>
          {totals.totalItems}/{money(totals.totalQty)}
        </Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Subtotal:
        </Text>
        <Text style={styles.totalValue}>
          {money(totals.subtotal)}
        </Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Discount:
        </Text>
        <Text style={styles.totalValue}>
          {money(totals.discount)}
        </Text>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Additional Charge:
        </Text>
        <Text style={styles.totalValue}>
          {money(totals.additionalCharge)}
        </Text>
      </View>


      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>
          Round-off Value:
        </Text>
        <Text style={styles.totalValue}>
          {money(totals.roundOff)}
        </Text>
      </View>

    
      {/* GRAND TOTAL */}

      <View style={styles.grandTotal}>
        <Text style={styles.grandTotalText}>
          Grand Total:
        </Text>
        <Text style={styles.grandTotalText}>
          ₹{money(totals.grandTotal)}
        </Text>
      </View>
    </>
  );
};

export default ReceiptTotals;
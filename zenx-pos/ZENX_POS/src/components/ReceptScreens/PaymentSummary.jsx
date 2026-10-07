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

const PaymentSummary = ({
  payment,
  styles,
}) => {
  return (
    <>
      <View style={styles.paymentTitleRow}>

        <Text style={styles.paymentTitle}>
          PAYMENT SUMMARY
        </Text>

        <View style={styles.paymentDashedLine} />

      </View>

      {payment.cash > 0 && (
        <View style={styles.paymentRow}>

          <Text style={styles.paymentLabel}>
            Cash:
          </Text>

          <Text style={styles.paymentValue}>
            {money(payment.cash)}
          </Text>

        </View>
      )}

      {payment.upi > 0 && (
        <View style={styles.paymentRow}>

          <Text style={styles.paymentLabel}>
            UPI:
          </Text>

          <Text style={styles.paymentValue}>
            {money(payment.upi)}
          </Text>

        </View>
      )}

      {payment.card > 0 && (
        <View style={styles.paymentRow}>

          <Text style={styles.paymentLabel}>
            Card:
          </Text>

          <Text style={styles.paymentValue}>
            {money(payment.card)}
          </Text>

        </View>
      )}
    </>
  );
};

export default PaymentSummary;
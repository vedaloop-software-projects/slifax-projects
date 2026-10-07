import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Fonts from '../constants/Fonts';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const PaymentCollection = () => {
  const pieData = [
     { value: 7500, color: '#4296FF' },  
    { value: 14372, color: '#264B79' }, 
    { value: 4000, color: '#3C7BC9' }, 
  ];

  const LegendItem = ({ color, label, amount }) => (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}:</Text>
      <Text style={styles.legendAmount}>₹{amount.toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>TODAY’S PAYMENT COLLECTION</Text>
      </View>
      <View style={styles.content}>
        {/* Total Row */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Collection:</Text>
          <Text style={styles.totalValue}>₹24,372</Text>
        </View>
        {/* Chart and Legend Row */}
        <View style={styles.chartRow}>
          <PieChart
            donut
            radius={83}
            innerRadius={42}
            data={pieData}
            innerCircleColor={'#FFFFFF'}
          />
          <View style={styles.legendContainer}>
            <LegendItem color="#3C7BC9" label="Cash" amount={4000} />
            <LegendItem color="#4296FF" label="Card" amount={7500} />
            <LegendItem color="#264B79" label="UPI" amount={14372} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    // marginLeft:wp(2)
  },
  header: {
    backgroundColor: '#EEF9FF',
    paddingVertical: 10,
    alignItems: 'center',
  },
  headerText: {
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  totalValue: {
    fontSize: 15,
    color: '#2b4b7c',
    fontFamily: Fonts.FigtreeMedium,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 12,
    color: '#767676',
    fontFamily:Fonts.FigtreeMedium,
  },
  legendAmount: {
    fontSize: 12,
    fontFamily:Fonts.FigtreeMedium,
    color: '#000000',
  },
});

export default PaymentCollection;
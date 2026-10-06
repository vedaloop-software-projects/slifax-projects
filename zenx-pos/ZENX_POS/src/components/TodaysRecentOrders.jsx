// components/RecentOrders.js

import { View, Text, StyleSheet, FlatList } from 'react-native';
import React from 'react';
import Fonts from '../constants/Fonts';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const data = [
  { id: '1', bill: 'A103', qty: 2, amount: 3200, payment: 'Cash', name: 'Puneeth Kumar', type: 'Refund' },
  { id: '2', bill: 'B103', qty: 2, amount: 3200, payment: 'Cash', name: 'Ram Govind', type: 'Refund' },
  { id: '3', bill: 'C203', qty: 2, amount: 3200, payment: 'Cash', name: 'Harsh', type: 'Refund' },
  { id: '4', bill: 'A231', qty: 2, amount: 3200, payment: 'Cash', name: 'Anjali', type: 'Refund' },
  { id: '5', bill: 'C103', qty: 2, amount: 3200, payment: 'Cash', name: 'Jayasree', type: 'Refund' },
];

export default function TodaysRecentOrders() {
  const renderItem = ({ item }) => (
    <View style={styles.row}>
  <Text style={[styles.cell, { flex: 0.8 }]}>{item.bill}</Text>
  <Text style={[styles.cell, { flex: 0.5 }]}>{item.qty}</Text>
  <Text style={[styles.cell, { flex: 1 }]}>₹{item.amount}</Text>
  <Text style={[styles.cell, { flex: 1.2 }]}>{item.payment}</Text>
  <Text style={[styles.cell, { flex: 1.5 }]}>{item.name}</Text>
  <Text style={[styles.cell, { flex: 1,}]}>{item.type}</Text>
</View>
  );

  return (
    <View style={styles.container}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={styles.headerText}>TODAY'S RECENT ORDERS</Text>
      </View>
      {/* Table Header */}
      <View style={styles.tableHeader}>
  <Text style={[styles.headCell, { flex: 0.8 }]}>Bill No.</Text>
  <Text style={[styles.headCell, { flex: 0.5 }]}>Qty</Text>
  <Text style={[styles.headCell, { flex: 1 }]}>Amount(₹)</Text>
  <Text style={[styles.headCell, { flex: 1.2 }]}>Payment Type</Text>
  <Text style={[styles.headCell, { flex: 1.5 }]}>Customer Name</Text>
  <Text style={[styles.headCell, { flex: 1, }]}>Bill Type</Text>
</View>
      {/* List */}
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    marginRight:wp(1.5)
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
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    // backgroundColor: '#F5F7FA',
  },
  headCell: {
    flex: 1,
    fontSize: 14,
    color: '#848484',
    fontFamily: Fonts.FigtreeMedium,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  separator: {
    borderBottomWidth: 0.5,
    borderStyle: 'dashed',
    borderColor: '#777777',
    marginHorizontal: 10,
  },
});
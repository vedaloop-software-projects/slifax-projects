import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Fonts from '../constants/Fonts';
import ExpensesIcon from '../assets/Icons/expensesIcon';
import InIcon from '../assets/Icons/InIcon';
import OutIcon from '../assets/Icons/OutIcon';
import { rMS, rS, rV } from '../constants/responsive';

export default function ExpensesCard() {
  return (
    <View style={styles.card}>   
      {/* Title */}
      <Text style={styles.title}>Today’s Expenses</Text>
      {/* IN / OUT Row */}
      <View style={styles.row}>
        {/* IN */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <InIcon />
          </View>
          <View>
            <Text style={styles.label}>IN</Text>
            <Text style={styles.amount}>₹3500</Text>
          </View>
        </View>
        {/* OUT */}
        <View style={styles.item}>
          <View style={styles.iconBox}>
            <OutIcon />
          </View>
          <View>
            <Text style={styles.label}>OUT</Text>
            <Text style={styles.amount}>₹10500</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:1, 
    backgroundColor: '#FFFFFF',
    borderRadius: rMS(8),
    paddingHorizontal:rS(8),
    paddingVertical:rV(8),
    // marginRight: wp(1.5), 
    // marginTop: hp(2),
    // elevation: 2,
  },
  title: {
    fontSize: 16,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    marginBottom:rV(7),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginRight:wp(0.5)
  },
  iconBox: {
    backgroundColor: '#FFF4FA',
    paddingHorizontal:rS(5),
    paddingVertical:rV(5),
    borderRadius: 8,
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },
  amount: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },
});
// components/DashboardActions.js
import { View, StyleSheet } from 'react-native';
import React from 'react';
import DashboardActionCard from './DashboardActionCard';
import DashboardBillingIcon from '../assets/Icons/DashboardBillingIcon';
import LayoutIcon from '../assets/Icons/LayoutIcon';
import DashboardCustomerIcon from '../assets/Icons/DashboardCustomerIcon';
import KOTOrderIcon from '../assets/Icons/KOTOrderIcon';
import AddExpensesIcon from '../assets/Icons/AddExpensesIcon';
import ReservationIcon from '../assets/Icons/ReservationIcon';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useNavigation } from '@react-navigation/native';

export default function DashboardActions() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <DashboardActionCard title="Sales/ " title1="Billing" Icon={DashboardBillingIcon} />
        <DashboardActionCard title="Table" title1="Layout" Icon={LayoutIcon} onPress={() => navigation.navigate('TableLayout')} />
        <DashboardActionCard title="Add" title1="Customers" Icon={DashboardCustomerIcon} onPress={() => navigation.navigate('RoleAccessScreen')} />
        <DashboardActionCard title="KOT" title1="Orders" Icon={KOTOrderIcon} />
        <DashboardActionCard title="Add" title1="Expenses" Icon={AddExpensesIcon} />
        <DashboardActionCard title="Table" title1="Reservation" Icon={ReservationIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2E4A6B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
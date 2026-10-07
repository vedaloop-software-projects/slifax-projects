import { View, Text, StyleSheet, ScrollView } from 'react-native'
import React, { useCallback, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import CustomHeader from '../components/CustomHeader'
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Fonts from '../constants/Fonts';
import SalesCard from '../components/SalesCard'
import ProfitCard from '../components/ProfitCard'
import BillsCard from '../components/BillsCard'
import ExpensesCard from '../components/ExpensesCard'
import DashboardActions from '../components/DashboardActions'
import TodaysRecentOrders from '../components/TodaysRecentOrders'
import PaymentCollection from '../components/PaymentCollecton'
import SalesComparison from '../components/SalesComparison'
import { rS, rV } from '../constants/responsive';
import { useDispatch, useSelector } from 'react-redux';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import { setBillingAccessRole } from '../redux/roleAccessSlice';
import { refreshPermissions } from '../helper/PermissionService';
import { updatePermissions, updateUser } from '../redux/authSlice';
import { useFocusEffect } from '@react-navigation/native';

export default function DashboardScreen() {
  const user = useSelector((state) => state.auth.user);
  const permissions = useSelector(state => state.auth.permissions);
  const dispatch = useDispatch();
  const {postMethod, getMethod} = HelperModule();

    useEffect(() => {
    if (user?.roleId) {
      fetchLoggedInUserAccess();
      loadPermissions();
    }
  }, [user?.roleId]);
  const fetchLoggedInUserAccess = async () => {
  const response = await postMethod(
    ApiServices.zenxposGetRoleAccessLevels,
    {
      roleId: user?.roleId,
    }
  );
  if (response.success) {
    const { billingAccess } = response.data;

    dispatch(
      setBillingAccessRole({
        allowDiscount: billingAccess.allowDiscount === 1,
        allowPriceOverride: billingAccess.allowPriceOverride === 1,
        allowRefund: billingAccess.allowRefund === 1,
      })
    );
  }
};

const loadPermissions = async () => {
  try {
    console.log('DASHBOARD: REFRESHING PERMISSIONS');

    const result = await refreshPermissions(getMethod);

    if (result?.success) {
      console.log(
        'DASHBOARD: PERMISSIONS UPDATED',
        result.permissions,
      );

      dispatch(updatePermissions(result.permissions));

      dispatch(
        updateUser({
          ...result.user,
          permissions: result.permissions,
        }),
      );
    }
  } catch (error) {
    console.log(
      'DASHBOARD PERMISSION ERROR ===>',
      error?.message,
    );
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />
      <ScrollView>
      <View style={styles.subContainer}>
        <Text style={styles.name}>Welcome, {user?.name}</Text>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 4 }}>
            <View style={styles.cardRow}>
              <SalesCard />
              <ProfitCard />
              <BillsCard />
              <ExpensesCard />
            </View>
             <SalesComparison />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 2 }}>
                <TodaysRecentOrders />
              </View>

              <View style={{ flex: 1 }}>
                <PaymentCollection />
               
              </View>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft:20 }}>
            <DashboardActions />
          </View>
        </View>

      </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: rS(12),
    paddingBottom:rV(5)
  },
  name: {
    marginVertical: rV(10),
    fontSize: 22,
    fontFamily: Fonts.FigtreeMedium,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
})
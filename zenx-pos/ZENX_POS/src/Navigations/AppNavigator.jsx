import { View, Text, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import SplashScreen from '../screens/SplashScreen'
import LoginScreen from '../screens/LoginScreen'
import DrawerNavigator from '../drawer/DrawerNavigator'
import TableLayoutScreen from '../screens/TableLayoutScreen'
import CategoryScreen from '../screens/CategoryScreen'
import SubCategoryScreen from '../screens/SubCategoryScreen'
import BrandScreen from '../screens/BrandScreen'
import UnitScreen from '../screens/UnitScreen'
import ColorScreen from '../screens/ColorScreen'
import SizeScreen from '../screens/SizeScreen'
import SalesManScreen from '../screens/SalesManScreen'
import PaymentModeScreen from '../screens/PaymentModeScreen'
import TaxScreen from '../screens/TaxScreen'
import CustomerFormScreen from '../screens/CustomerFormScreen'
import UserScreen from '../screens/UserScreen'
import RoleAccessScreen from '../screens/RoleAccessScreen'
import TeamScreen from '../screens/TeamScreen'
import RoleMasterScreen from '../screens/RoleMasterScreen'
import CustomerScreen from '../screens/CustomerScreen'
import ExpensesHeadScreen from '../screens/ExpensesHeadScreen'
import GroupWiseDiscountScreen from '../screens/GroupWiseDiscountScreen'
import ItemWiseDiscountScreen from '../screens/ItemWiseDiscountScreen'
import PurchaseWiseSchemesScreen from '../screens/PurchaseWiseSchemesScreen'
import CreateItemWiseDiscountScreen from '../screens/CreateItemWiseDiscountScreen'
import NewProductScreen from '../screens/NewProductScreen'
import TransferNoteScreen from '../screens/TransferNoteScreen'

const Stack = createNativeStackNavigator()

export default function AppNavigator() {
 
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="TableLayout" component={TableLayoutScreen} />
      {/* <Stack.Screen name='CategoryScreen' component={CategoryScreen} /> */}
      {/* <Stack.Screen name="SubCategoryScreen" component={SubCategoryScreen} /> */}
      {/* <Stack.Screen name="BrandScreen" component={BrandScreen} /> */}
      <Stack.Screen name="UnitScreen" component={UnitScreen} />
      <Stack.Screen name="ColorScreen" component={ColorScreen} />
      <Stack.Screen name="SizeScreen" component={SizeScreen} />
      <Stack.Screen name="SalesManScreen" component={SalesManScreen} />
      <Stack.Screen name="PaymentModeScreen" component={PaymentModeScreen} />
      <Stack.Screen name="TaxScreen" component={TaxScreen} />
      <Stack.Screen name="CustomerFormScreen" component={CustomerFormScreen} />
      <Stack.Screen name="UserScreen" component={UserScreen} />
      <Stack.Screen name='RoleAccessScreen' component={RoleAccessScreen} />
      <Stack.Screen name='TeamScreen' component={TeamScreen} />
      <Stack.Screen name="RoleMasterScreen" component={RoleMasterScreen} />
      <Stack.Screen name="CustomerScreen" component={CustomerScreen} />
      <Stack.Screen name="ExpensesHeadScreen" component={ExpensesHeadScreen} />
      <Stack.Screen name="GroupWiseDiscountScreen" component={GroupWiseDiscountScreen} />
      
      {/* <Stack.Screen name='PurchaseWiseSchemesScreen' component={PurchaseWiseSchemesScreen} /> */}
      {/* <Stack.Screen name='NewProductScreen' component={NewProductScreen} /> */}
      {/* <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="TableLayout" component={TableLayoutScreen} />
      <Stack.Screen name='CategoryScreen' component={CategoryScreen} /> */}
       <Stack.Screen name="MainApp" component={DrawerNavigator} />
       <Stack.Screen name="TransferNoteScreen" component={TransferNoteScreen} />
    </Stack.Navigator>

  )
}
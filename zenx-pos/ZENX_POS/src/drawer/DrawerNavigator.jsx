import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DashboardScreen from '../screens/DashboardScreen';
import CategoryScreen from '../screens/CategoryScreen';
import CustomDrawer from './CustomDrawer';
import SubCategoryScreen from '../screens/SubCategoryScreen';
import TableLayoutScreen from '../screens/TableLayoutScreen';
import BrandScreen from '../screens/BrandScreen';
import UnitScreen from '../screens/UnitScreen';
import ColorScreen from '../screens/ColorScreen';
import SizeScreen from '../screens/SizeScreen';
import SalesManScreen from '../screens/SalesManScreen';
import PaymentModeScreen from '../screens/PaymentModeScreen';
import TaxScreen from '../screens/TaxScreen';
import CustomerFormScreen from '../screens/CustomerFormScreen';
import UserScreen from '../screens/UserScreen';
import RoleAccessScreen from '../screens/RoleAccessScreen';
import TeamScreen from '../screens/TeamScreen';
import RoleMasterScreen from '../screens/RoleMasterScreen';
import CustomerScreen from '../screens/CustomerScreen';
import ExpensesHeadScreen from '../screens/ExpensesHeadScreen';
import GroupWiseDiscountScreen from '../screens/GroupWiseDiscountScreen';
import ProductScreen from '../screens/ProductScreen';
import NewProductScreen from '../screens/NewProductScreen';
import PurchaseWiseSchemesScreen from '../screens/PurchaseWiseSchemesScreen';
import NewPurchaseWiseDiscountScreen from '../screens/NewPurchaseWiseDiscountScreen';
import CouponScreen from '../screens/CouponScreen';
import ExpenseScreen from '../screens/ExpenseScreen';
import BillBusterScreen from '../screens/BillBusterScreen';
import AddNewBillBusterScreen from '../screens/AddNewBillBusterScreen';
import HappyHourScreen from '../screens/HappyHourScreen';
import BillingScreen from '../screens/BillingScreen';
import AddNewHappyHourScreen from '../screens/AddNewHappyHourScreen';
import SettingScreen from '../screens/SettingScreen';
import AddNewHotKeyScreen from '../screens/AddNewHotKeyScreen';
import BulkUploadScreen from '../screens/BulkUploadScreen';
import ItemWiseDiscountScreen from '../screens/ItemWiseDiscountScreen';
import CreateItemWiseDiscountScreen from '../screens/CreateItemWiseDiscountScreen';
import BusinessSettingsScreen from '../screens/BusinessSettingsScreen';
import BillFormats from '../screens/BillFormats';
import AuditLogScreen from '../screens/AuditLogScreen';
import SalesReportScreen from '../screens/SalesReportScreen';
import AboutUsScreen from '../screens/AboutUsScreen';
import PaymentCollectionScreen from '../screens/PaymentCollectionScreen';
import BillSummaryReportScreen from '../screens/BillSummaryReportScreen';
import TaxBreakUpReportScreen from '../screens/TaxBreakUpReportScreen';
import BillWiseSalesReport from '../screens/BillWiseSalesReport';
import StockStatusReportScreen from '../screens/StockStatusReportScreen';
import TransferInReportScreen from '../screens/TransferInReportScreen';
import KOTReportScreen from '../screens/KOTReportScreen';
import SalesManReportScreen from '../screens/SalesManReportScreen';
import CustomerSalesReportScreen from '../screens/CustomerSalesReportScreen';
import TransferOutReportScreen from '../screens/TransferOutReportScreen';
import StockAdjustmentScreen from '../screens/StockAdjustmentScreen';
import AddStockAdjustmentScreen from '../screens/AddStockAdjustmentScreen';
import StockTransferInScreen from '../screens/StockTransferInScreen';
import AddStockTransferInScreen from '../screens/AddStockTransferInScreen';
import StockTransferOutScreen from '../screens/StockTransferOutScreen';
import AddStockTransferOutScreen from '../screens/AddStockTransferOutScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      id="RootDrawer"
      drawerContent={props => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerStyle: {
          width: 270,
          backgroundColor: '#17365D',
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="TableLayout" component={TableLayoutScreen} />
      <Drawer.Screen name="CategoryScreen" component={CategoryScreen} />
      <Drawer.Screen name="SubCategoryScreen" component={SubCategoryScreen} />
      <Drawer.Screen name="BrandScreen" component={BrandScreen} />
      <Drawer.Screen name="UnitScreen" component={UnitScreen} />
      <Drawer.Screen name="ColorScreen" component={ColorScreen} />
      <Drawer.Screen name="SizeScreen" component={SizeScreen} />
      <Drawer.Screen name="SalesManScreen" component={SalesManScreen} />
      <Drawer.Screen name="PaymentModeScreen" component={PaymentModeScreen} />
      <Drawer.Screen name="TaxScreen" component={TaxScreen} />
      <Drawer.Screen name="CustomerFormScreen" component={CustomerFormScreen} />
      <Drawer.Screen name="UserScreen" component={UserScreen} />
      <Drawer.Screen name="RoleAccessScreen" component={RoleAccessScreen} />
      <Drawer.Screen name="TeamScreen" component={TeamScreen} />
      <Drawer.Screen name="RoleMasterScreen" component={RoleMasterScreen} />
      <Drawer.Screen name="ExpensesHeadScreen" component={ExpensesHeadScreen} />
      <Drawer.Screen
        name="GroupWiseDiscountScreen"
        component={GroupWiseDiscountScreen}
      />
      <Drawer.Screen name="CustomerScreen" component={CustomerScreen} />
      <Drawer.Screen name="ProductScreen" component={ProductScreen} />
      <Drawer.Screen name="NewProductScreen" component={NewProductScreen} />
      <Drawer.Screen name="BulkUploadScreen" component={BulkUploadScreen} />
      <Drawer.Screen
        name="PurchaseWiseSchemesScreen"
        component={PurchaseWiseSchemesScreen}
      />
      <Drawer.Screen
        name="NewPurchaseWiseDiscountScreen"
        component={NewPurchaseWiseDiscountScreen}
      />
      <Drawer.Screen
        name="ItemWiseDiscountScreen"
        component={ItemWiseDiscountScreen}
      />
      <Drawer.Screen
        name="CreateItemWiseDiscountScreen"
        component={CreateItemWiseDiscountScreen}
      />
      <Drawer.Screen name="CouponScreen" component={CouponScreen} />
      <Drawer.Screen name="ExpenseScreen" component={ExpenseScreen} />
      <Drawer.Screen name="BillBusterScreen" component={BillBusterScreen} />
      <Drawer.Screen
        name="AddNewBillBusterScreen"
        component={AddNewBillBusterScreen}
      />
      <Drawer.Screen name="HappyHourScreen" component={HappyHourScreen} />
      <Drawer.Screen
        name="AddNewHappyHourScreen"
        component={AddNewHappyHourScreen}
      />
      <Drawer.Screen name="BillingScreen" component={BillingScreen} />
      <Drawer.Screen name="SettingScreen" component={SettingScreen} />
      <Drawer.Screen name="AddNewHotKeyScreen" component={AddNewHotKeyScreen} />
      <Drawer.Screen
        name="BusinessSettingsScreen"
        component={BusinessSettingsScreen}
      />
      <Drawer.Screen name="BillFormats" component={BillFormats} />
      <Drawer.Screen name="AboutUsScreen" component={AboutUsScreen} />
      <Drawer.Screen name="AuditLogScreen" component={AuditLogScreen} />
      <Drawer.Screen name="SalesReportScreen" component={SalesReportScreen} />
      <Drawer.Screen
        name="PaymentCollectionScreen"
        component={PaymentCollectionScreen}
      />
      <Drawer.Screen
        name="BillSummaryReportScreen"
        component={BillSummaryReportScreen}
      />
      <Drawer.Screen
        name="TaxBreakUpReportScreen"
        component={TaxBreakUpReportScreen}
      />
      <Drawer.Screen
        name="BillWiseSalesReport"
        component={BillWiseSalesReport}
      />
      <Drawer.Screen
        name="StockStatusReportScreen"
        component={StockStatusReportScreen}
      />
      <Drawer.Screen
        name="TransferInReportScreen"
        component={TransferInReportScreen}
      />
      <Drawer.Screen
        name="TransferOutReportScreen"
        component={TransferOutReportScreen}
      />
      <Drawer.Screen name="KOTReportScreen" component={KOTReportScreen} />
      <Drawer.Screen
        name="SalesManReportScreen"
        component={SalesManReportScreen}
      />
      <Drawer.Screen
        name="CustomerSalesReportScreen"
        component={CustomerSalesReportScreen}
      />

      {/* STOCK */}
      <Drawer.Screen
        name="StockAdjustmentScreen"
        component={StockAdjustmentScreen}
      />
      <Drawer.Screen
        name="AddStockAdjustmentScreen"
        component={AddStockAdjustmentScreen}
      />
      <Drawer.Screen
        name="StockTransferInScreen"
        component={StockTransferInScreen}
      />
      <Drawer.Screen
        name="AddStockTransferInScreen"
        component={AddStockTransferInScreen}
      />
      <Drawer.Screen
        name="StockTransferOutScreen"
        component={StockTransferOutScreen}
      />
      <Drawer.Screen
        name="AddStockTransferOutScreen"
        component={AddStockTransferOutScreen}
      />
    </Drawer.Navigator>
  );
}

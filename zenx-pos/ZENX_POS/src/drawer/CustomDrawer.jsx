import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { DrawerActions, useNavigation } from '@react-navigation/native';
// import HomeIcon from '../assets/Icons/HomeIcon';
import SalesIcon from '../assets/Icons/salesIcon';
import ExpensesIcon from '../assets/Icons/expensesIcon';
import DayIcon from '../assets/Icons/dayIcon';
import ProductIcon from '../assets/Icons/productIcon';
import StockIcon from '../assets/Icons/stockIcon'
import ReportIcon from '../assets/Icons/reportIcon';
import PaymentIcon from '../assets/Icons/paymentIcon';
import CustomerIcon from '../assets/Icons/customerIcon';
import Promotion from '../assets/Icons/promotion';
import KITMasterIcon from '../assets/Icons/KITMasterIcon'
import BulkMasterIcon from '../assets/Icons/bulkMasterIcon'
import UserIcon from '../assets/Icons/userIcon';
import HardwareIcon from '../assets/Icons/hardwareIcon'
import BillFormatIcon from '../assets/Icons/BillFormatIcon'
import AccessIcon from '../assets/Icons/accessIcon';
import CouponIcon from '../assets/Icons/CouponIcon'
import FillCouponIcon from '../assets/Icons/FillCouponIcon'
import BillBusterIcon from '../assets/Icons/BillBusterIcon'
import FillBillBusterIcon from '../assets/Icons/FillBillBusterIcon'
import HappyHourIcon from '../assets/Icons/HappyHourIcon'
import FillHappyHourIcon from '../assets/Icons/FillHappyHourIcon'
import RoleIcon from '../assets/Icons/RoleIcon'
import FillRoleIcon from '../assets/Icons/FillRoleIcon'
import CategoryIcon from '../assets/Icons/CategoryIcon'
import FillCategoryIcon from '../assets/Icons/FillCategoryIcon'
import SubCategoryIcon from '../assets/Icons/SubCategoryIcon'
import FillSubCategoryIcon from '../assets/Icons/FillSubCategoryIcon'
import TaxIcon from '../assets/Icons/TaxIcon'
import FillTaxIcon from '../assets/Icons/FillTaxIcon'
import UnitIcon from '../assets/Icons/UnitIcon'
import FillUnitIcon from '../assets/Icons/FillUnitIcon'
import PaymentModeIcon from '../assets/Icons/PaymentModeIcon'
import FillPaymentModeIcon from '../assets/Icons/FillPaymentModeIcon'
import ExpenseHeadIcon from '../assets/Icons/ExpenseHeadIcon'
import FillExpenseHeadIcon from '../assets/Icons/FillExpenseHeadIcon'
import FillExpensesIcon from '../assets/Icons/FillExpensesIcon'
import UserAccessIcon from '../assets/Icons/UserAccessIcon'
import FillUserAccessIcon from '../assets/Icons/FillUserAccessIcon'
import FillAccessIcon from '../assets/Icons/FillAccessIcon'
import PaymentCollectionIcon from '../assets/Icons/PaymentCollectionIcon'
import FillPaymentCollectionIcon from '../assets/Icons/FillPaymentCollectionIcon'
import BillSummaryIcon from '../assets/Icons/BillSummaryIcon'
import FillBillSummaryIcon from '../assets/Icons/FillBillSummaryIcon'
import TaxBreakUpIcon from '../assets/Icons/TaxBreakUpIcon'
import FillTaxBreakUpIcon from '../assets/Icons/FillTaxBreakUpIcon'
import CustomerSalesReportIcon from '../assets/Icons/CustomerSalesReportIcon'
import FillCustomerSalesReportIcon from '../assets/Icons/FillCustomerSalesReportIcon'
import BillWiseSalesReportIcon from '../assets/Icons/BillWiseSalesReportIcon'
import FillBillWiseSalesReportIcon from '../assets/Icons/FillBillWiseSalesReportIcon'
import StockStatusReport from '../assets/Icons/StockStatusReport'
import FillStockStatusReport from '../assets/Icons/FillStockStatusReport'
import TransferInReportIcon from '../assets/Icons/TransferInReportIcon'
import FillTransferInReportIcon from '../assets/Icons/FillTransferInReportIcon'
import TransferOutReportIcon from '../assets/Icons/TransferOutReportIcon'
import FillTransferOutReportIcon from '../assets/Icons/FillTransferOutReportIcon'
import BarCodeIcon from '../assets/Icons/barcodeIcon'
import HelpIcon from '../assets/Icons/helpIcon';
import FloorIcon from '../assets/Icons/floorIcon'
import TablesIcon from '../assets/Icons/tablesIcon'
import TableReservationIcon from '../assets/Icons/tableReservationIcon'
import TableLayoutIcon from '../assets/Icons/tableLayoutIcon'
import KOTIcon from '../assets/Icons/KOTIcon'
import KDSIcon from '../assets/Icons/KDSIcon'
import OrdersIcon from '../assets/Icons/ordersIcon'
import FillProductIcon from '../assets/Icons/FillProductIcon'
import FillHardwareIcon from '../assets/Icons/FillHardwareIcon'
import FillBillFormatIcon from '../assets/Icons/FillBillFormatIcon'
import FillDashboardIcon from '../assets/Icons/FillDashboardIcon'
import FillSalesIcon from '../assets/Icons/FillSalesIcon'
import FillKITMasterIcon from '../assets/Icons/FillKITMasterIcon'
import SalesManReportIcon from '../assets/Icons/SalesManReportIcon'
import FillSalesManReportIcon from '../assets/Icons/FillSalesManReportIcon'
import Fonts from '../constants/Fonts';
import ZenxposLogo from '../assets/Icons/ZenxposLogo';
import ImagePath from '../constants/ImagePath';
import { rS, rV } from '../constants/responsive';
import LogoutIcon from '../assets/Icons/LogoutIcon'
import { clearUser } from '../redux/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import HomeIcon from '../assets/Icons/HomeIcon'

const ICON_MAP = {
  "Dashboard": {
    default: FillDashboardIcon,
    active: FillDashboardIcon,
  },
  "Sales/Billing": {
    default: SalesIcon,
    active: FillSalesIcon
  },
  "Expenses":
  {
    default: ExpensesIcon,
    active: FillExpensesIcon
  },
  "Expenses Entry": {
    default: ExpensesIcon,
    active: FillExpensesIcon
  },
  "Day Close": DayIcon,
  "Masters": ProductIcon,
  Products: {
    default: ProductIcon,
    active: FillProductIcon,
  },
  "Reports": ReportIcon,
  "Customer": CustomerIcon,
  "Promotions": Promotion,
  "Users": {
    default: UserAccessIcon,
    active: FillUserAccessIcon
  },
  "Access Levels": {
    default: AccessIcon,
    active: FillAccessIcon,
  },
  "Help": HelpIcon,
  "Salon & Spa": UserIcon,
  "Appointments": DayIcon,
  Settings: {
    default: HardwareIcon,
    active: FillHardwareIcon
  },
  "Bill Formats": {
    default: BillFormatIcon,
    active: FillBillFormatIcon
  },
  "Audit Log": {
    default: ReportIcon,
    active: ReportIcon,
  },
  "Sales Report": {
    default: ReportIcon,
    active: ReportIcon,
  },
  "KIT Master": {
    default: KITMasterIcon,
    active: FillKITMasterIcon
  },
  "Coupons": {
    default: CouponIcon,
    active: FillCouponIcon
  },
  "Bill Buster": {
    default: BillBusterIcon,
    active: FillBillBusterIcon
  },
  "Happy Hours": {
    default: HappyHourIcon,
    active: FillHappyHourIcon
  },
  "Roles": {
    default: RoleIcon,
    active: FillRoleIcon
  },
  "Category": {
    default: CategoryIcon,
    active: FillCategoryIcon
  },
  "SubCategory": {
    default: SubCategoryIcon,
    active: FillSubCategoryIcon
  },
  "Units": {
    default: UnitIcon,
    active: FillUnitIcon
  },
  "Tax/GST": {
    default: TaxIcon,
    active: FillTaxIcon
  },
  "Payment Modes": {
    default: PaymentModeIcon,
    active: FillPaymentModeIcon
  },
  "Expenses Heads": {
    default: ExpenseHeadIcon,
    active: FillExpenseHeadIcon,
  },
  "Payment Collection": {
    default: PaymentCollectionIcon,
    active: FillPaymentCollectionIcon
  },
  "Bill Summary": {
    default: BillSummaryIcon,
    active: FillBillSummaryIcon
  },
  "Tax Breakup": {
    default: TaxBreakUpIcon,
    active: FillTaxBreakUpIcon
  },
  "Customer Sales Report": {
    default: CustomerSalesReportIcon,
    active: FillCustomerSalesReportIcon
  },
  "Bill Wise Sales Report": {
    default: BillWiseSalesReportIcon,
    active: FillBillWiseSalesReportIcon
  },
  "Stock Status Report": {
    default: StockStatusReport,
    active: FillStockStatusReport
  },
  "Transfer In Report": {
    default: TransferInReportIcon,
    active: FillTransferInReportIcon
  },
  "Transfer Out Report": {
    default: TransferOutReportIcon,
    active: FillTransferOutReportIcon
  },
  "Sales Man Report": {
    default: SalesManReportIcon,
    active: FillSalesManReportIcon
  },
  "Stock Transfer Out": {
    default: TransferOutReportIcon,
    active: FillTransferOutReportIcon
  },
  "Stock Transfer In": {
    default: TransferInReportIcon,
    active: FillTransferInReportIcon
  }

};

const ROUTE_MAP = {
  Dashboard: 'Dashboard',
  Category: 'CategoryScreen',
  SubCategory: 'SubCategoryScreen',
  Products: 'ProductScreen',
  Units: 'UnitScreen',
  Brand: 'BrandScreen',
  Colour: 'ColorScreen',
  Size: 'SizeScreen',
  'Sales Man': 'SalesManScreen',
  'Tax/GST': 'TaxScreen',
  'Payment Modes': 'PaymentModeScreen',
  Customer: 'CustomerScreen',
  Users: 'UserScreen',
  Roles: 'RoleMasterScreen',
  'Access Levels': 'RoleAccessScreen',
  'Expenses Heads': 'ExpensesHeadScreen',
  Teams: 'TeamScreen',
  'Purchase Wise Discounts': 'PurchaseWiseSchemesScreen',
  'Product Wise Discounts': 'ItemWiseDiscountScreen',
  'Expenses Entry': 'ExpenseScreen',
  'Bill Formats': 'BillFormats',
  Coupons: 'CouponScreen',
  'Bill Buster': 'BillBusterScreen',
  'Happy Hours': 'HappyHourScreen',
  'Group Wise Discounts': 'GroupWiseDiscountScreen',
  'Sales/Billing': 'BillingScreen',
  Settings: 'SettingScreen',
  "Business Profile":'BusinessSettingsScreen',
  // ADD THIS
  'Audit Log': 'AuditLogScreen',
  'Sales Report': 'SalesReportScreen',
  'Payment Collection': 'PaymentCollectionScreen',
  'Bill Summary': 'BillSummaryReportScreen',
  'Tax Breakup': 'TaxBreakUpReportScreen',
  'Bill Wise Sales Report': 'BillWiseSalesReport',
  'Stock Status Report': 'StockStatusReportScreen',
  'Transfer In Report': 'TransferInReportScreen',
  'Transfer Out Report': 'TransferOutReportScreen',
  'KOT Report': 'KOTReportScreen',
  'Sales Man Report': 'SalesManReportScreen',
  'Customer Sales Report': 'CustomerSalesReportScreen',
  // Stock 
  'Stock Adjustment': 'StockAdjustmentScreen',
  'Stock Transfer Out': 'StockTransferOutScreen',
  'Stock Transfer In': 'StockTransferInScreen',
};

const DrawerItem = ({ label, selected, onPress }) => {
  const iconConfig = ICON_MAP[label];

  const IconComponent =
    selected && iconConfig?.active
      ? iconConfig.active
      : iconConfig?.default || iconConfig || HelpIcon;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.drawerItemWrapper}
    >
      {selected && <View style={styles.activeBar} />}
      <View style={[styles.drawerItem, selected && styles.selectedDrawerItem]}>
        <View style={styles.iconContainer}>
          <IconComponent width={22} height={22} />
        </View>
        <Text style={[styles.drawerLabel, selected && styles.selectedDrawerLabel]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const CustomDrawer = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  // const navigation = useNavigation();
  const [selectedMenu, setSelectedMenu] = useState('Dashboard');
  const user = useSelector((state) => state.auth.user);
  const permissions = user?.permissions || [];
  const dispatch = useDispatch();
  const dynamicMenu = useMemo(() => {
  return permissions
    .map(feature => {
      const subFeatures =
        feature?.subFeatures || [];

      // ==========================================
      // FEATURE LEVEL
      // Dashboard, Sales/Billing, Day Close etc.
      // ==========================================

      const isFeatureLevel =
        subFeatures.length > 0 &&
        subFeatures.every(
          sf => sf?.subFeature == null,
        );

      if (isFeatureLevel) {
        const canViewFeature =
          subFeatures.some(
            sf => Number(sf?.view) === 1,
          );

        if (!canViewFeature) {
          return null;
        }

        return {
          id: feature.featureId,
          title: feature.feature,
          items: [
            {
              label: feature.feature,
              id: feature.featureId,
            },
          ],
        };
      }

      // ==========================================
      // SUB FEATURE LEVEL
      // Masters, Reports, Expenses, Stock etc.
      // ==========================================

      const allowedSubFeatures =
        subFeatures
          .filter(
            sf => Number(sf?.view) === 1,
          )
          .map(sf => ({
            label: sf.subFeature,
            id: sf.subFeatureId,
          }));

      if (allowedSubFeatures.length === 0) {
        return null;
      }

      return {
        id: feature.featureId,
        title: feature.feature,
        items: allowedSubFeatures,
      };
    })
    .filter(Boolean);
}, [permissions]);

  // const handleNavigation = label => {
  //   setSelectedMenu(label);
  //   const screenName = ROUTE_MAP[label];
  //   if (screenName) {
  //     navigation.navigate('MainApp', {
  //       screen: screenName,
  //     });
  //     // navigation.dispatch(DrawerActions.closeDrawer());
  //   }
  // };

  const handleNavigation = (label) => {
    const screenName = ROUTE_MAP[label];

    if (!screenName) {
      console.log('Route not found:', label);
      return;
    }

    setSelectedMenu(label);

    navigation.closeDrawer();

    requestAnimationFrame(() => {
      navigation.navigate(screenName);
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'userToken',
                'userData',
              ]);
              dispatch(clearUser());
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.log('LOGOUT ERROR ===>', error);
            }
          },
        },
      ],
    );
  };
  return (
    <View style={styles.container}>
      {/* FIXED HEADER */}
      {/* <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.iconContainer}>
          <HomeIcon />
        </View>
        <Text style={styles.headerTitle}>Dashboard</Text>
      </View> */}
      {/* DYNAMIC SCROLLABLE MENU */}
      <View style={styles.menuContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.menuContent}>
          {dynamicMenu.map((section) => (
            <View key={section.id}>
              {section.items.length > 1 && (
                <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              )}
              {section.items.map((item) => (
                <DrawerItem
                  key={`${item.id}-${item.label}`}
                  label={item.label}
                  selected={selectedMenu === item.label}
                  onPress={() => handleNavigation(item.label)}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
      {/* FIXED BOTTOM */}
      <View style={styles.bottomContainer}>
        <View>
          <TouchableOpacity onPress={() => navigation.navigate('AboutUsScreen')}>
          <ZenxposLogo />
          <Text style={styles.versionText}>ZENXPOS Version 1.0.0</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleLogout}
          activeOpacity={0.7}
          style={{ alignSelf: 'center' }}>
          <LogoutIcon />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomDrawer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#17365D',
    // marginTop:rS(10)
  },
  menuContainer: {
    flex: 1,
    marginTop: rV(20),
  },

  menuContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    color: '#C0C0C0',
    fontSize: 14,
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 14,
    marginLeft: 20,
    fontFamily: Fonts.FigtreeMedium,
  },
  drawerItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',

  },
  headerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F421',
    backgroundColor: '#17365D',
  },
  headerTitle: {
    color: '#FFFFFF',
    marginLeft: 16,
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#17365D',
  },
  versionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontFamily: Fonts.FigtreeRegular,
  },
  activeBar: {
    width: 4,
    height: 60,
    backgroundColor: '#FFFFFF',
    // borderRadius: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    marginLeft: 10,
    marginRight: 10,
  },
  drawerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 10,
  },
  selectedDrawerItem: {
    backgroundColor: '#3C567C',
    borderRadius: 10,
  },
  iconContainer: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 10,
    fontFamily: Fonts.FigtreeRegular,
  },
  selectedDrawerLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
  },
});
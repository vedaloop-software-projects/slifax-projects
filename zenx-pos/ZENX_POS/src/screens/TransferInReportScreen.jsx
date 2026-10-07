import React, { useRef, useState, useCallback } from 'react';

import {
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';

import ReportHeader from '../components/ReportHeader';
import Pagination from '../components/Pagination';
import Fonts from '../constants/Fonts';
import { rMS, rS, rV } from '../constants/responsive';

import CalenderIcon from '../assets/Icons/CalenderIcon';
import {
  exportToCSV,
  exportToPDF,
} from '../utils/exportUtils';
import { responsiveHeight } from 'react-native-responsive-dimensions';

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
  reportType: 'summary',
  category: 'Rice',
  subCategory: 'Basmati',
  brand: 'Dawat',
  itemCode: 'BR-213',
  variantCode: 'VR-213',
  itemName: 'Basmati Rice-5 Kg',
  fromDate: '23-03-2026',
  toDate: '23-03-2026',
};

const TransferInReportScreen = () => {
  const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType);

  // Filters State
  const [category, setCategory] = useState(DEFAULT_FILTERS.category);
  const [subCategory, setSubCategory] = useState(DEFAULT_FILTERS.subCategory);
  const [brand, setBrand] = useState(DEFAULT_FILTERS.brand);
  const [itemCode, setItemCode] = useState(DEFAULT_FILTERS.itemCode);
  const [variantCode, setVariantCode] = useState(DEFAULT_FILTERS.variantCode);
  const [itemName, setItemName] = useState(DEFAULT_FILTERS.itemName);

  // Date State
  const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
  const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [tempFromDate, setTempFromDate] = useState(new Date(2026, 2, 23));
  const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

  // ✅ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(4);

  const verticalScrollOffset = useRef(new Animated.Value(0)).current;

  // Dropdown Options
  const categoryOptions = [
    { label: 'Rice', value: 'Rice' },
    { label: 'Oil', value: 'Oil' },
    { label: 'Dal', value: 'Dal' },
  ];

  const subCategoryOptions = [
    { label: 'Basmati', value: 'Basmati' },
    { label: 'Red Rice', value: 'Red Rice' },
    { label: 'Maida', value: 'Maida' },
  ];

  const brandOptions = [
    { label: 'Dawat', value: 'Dawat' },
    { label: 'India Gate', value: 'India Gate' },
    { label: 'Fortune', value: 'Fortune' },
  ];

  const variantOptions = [
    { label: 'VR-213', value: 'VR-213' },
    { label: 'VR-214', value: 'VR-214' },
    { label: 'VR-215', value: 'VR-215' },
  ];

  // Table Data matching the screenshot
  const detailedData = [
    { id: 1, date: '23-03-2026', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', qty: '5', freeQty: '1', mrp: '₹1600', cp: '₹250', totalAmount: '₹1500' },
    { id: 2, date: '23-03-2026', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', qty: '5', freeQty: '5', mrp: '₹1600', cp: '₹250', totalAmount: '₹1500' },
    { id: 3, date: '23-03-2026', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', qty: '5', freeQty: '5', mrp: '₹1600', cp: '₹250', totalAmount: '₹1500' },
    { id: 4, date: '23-03-2026', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', qty: '5', freeQty: '5', mrp: '₹1600', cp: '₹250', totalAmount: '₹1500' },
    { id: 5, date: '23-03-2026', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', qty: '5', freeQty: '5', mrp: '₹1600', cp: '₹250', totalAmount: '₹1500' },
  ];

  // Totals (used in both UI and export)
  const TOTAL_QTY = '1456.98';
  const TOTAL_FREE_QTY = '432';
  const TOTAL_AMOUNT = '₹20000.98';

  const TABLE_HEIGHT = rV(260);
  const ROW_HEIGHT = rV(44);
  const totalContentHeight = detailedData.length * ROW_HEIGHT;
  const maxTableScrollOffset = Math.max(1, totalContentHeight - TABLE_HEIGHT);
  const VERTICAL_THUMB_HEIGHT = Math.max(rV(40), (TABLE_HEIGHT / totalContentHeight) * TABLE_HEIGHT);
  const VERTICAL_THUMB_TRAVEL = TABLE_HEIGHT - VERTICAL_THUMB_HEIGHT;

  // Date Helpers
  const formatDate = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const convertStringToDate = (dateString) => {
    if (!dateString) return new Date();
    const [day, month, year] = dateString.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day));
  };

  const handleFromDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowFromDatePicker(false);
      if (selectedDate) {
        const newDate = formatDate(selectedDate);
        setFromDate(newDate);
        if (convertStringToDate(toDate) < selectedDate) {
          setToDate(newDate);
          setTempToDate(selectedDate);
        }
      }
    } else if (selectedDate) {
      setTempFromDate(selectedDate);
    }
  };

  const handleToDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowToDatePicker(false);
      if (selectedDate) setToDate(formatDate(selectedDate));
    } else if (selectedDate) {
      setTempToDate(selectedDate);
    }
  };

  // ---------------- ACTIONS ----------------

  const handleSearch = () => {
    setCurrentPage(1);   // ✅ reset pagination on search

    console.log('TRANSFER-IN REPORT SEARCH', {
      reportType, category, subCategory, brand, itemCode, variantCode, itemName, fromDate, toDate, page: 1,
    });
  };

  // ✅ CLEAR / RESET button
  const handleClear = useCallback(() => {
    setReportType(DEFAULT_FILTERS.reportType);
    setCategory(DEFAULT_FILTERS.category);
    setSubCategory(DEFAULT_FILTERS.subCategory);
    setBrand(DEFAULT_FILTERS.brand);
    setItemCode(DEFAULT_FILTERS.itemCode);
    setVariantCode(DEFAULT_FILTERS.variantCode);
    setItemName(DEFAULT_FILTERS.itemName);
    setFromDate(DEFAULT_FILTERS.fromDate);
    setToDate(DEFAULT_FILTERS.toDate);

    setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
    setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

    setCurrentPage(1);

    console.log('TRANSFER-IN REPORT — FILTERS CLEARED');
  }, []);

  // ✅ PAGE CHANGE
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
    verticalScrollOffset.setValue(0);
    console.log('TRANSFER-IN PAGE CHANGE ====>', page);
    // TODO: fetchTransferInReport(page);
  }, [verticalScrollOffset]);

  // ✅ REPORT TYPE CHANGE — resets pagination
  const handleReportTypeChange = useCallback(type => {
    setReportType(type);
    setCurrentPage(1);
  }, []);

  // =========================================================
  // EXPORT (CSV / PDF) — WITH TOTAL ROW
  // =========================================================
  const exportTransferInReport = (type) => {
    const headers = [
      'S.No', 'Date', 'Category', 'Sub-Category', 'Brand',
      'Qty', 'Free Qty', 'MRP', 'CP', 'Total Amount',
    ];

    // ---- Detail rows ----
    const detailRows = detailedData.map(item => ({
      'S.No': item.id,
      'Date': item.date,
      'Category': item.category,
      'Sub-Category': item.subCategory,
      'Brand': item.brand,
      'Qty': item.qty,
      'Free Qty': item.freeQty,
      'MRP': item.mrp,
      'CP': item.cp,
      'Total Amount': item.totalAmount,
    }));

    // ---- ✅ TOTAL row (so it appears in CSV/PDF) ----
    const totalRow = {
      'S.No': '',
      'Date': '',
      'Category': '',
      'Sub-Category': '',
      'Brand': '',
      'Qty': TOTAL_QTY,
      'Free Qty': TOTAL_FREE_QTY,
      'MRP': '',
      'CP': '',
      'Total Amount': TOTAL_AMOUNT,
    };

    const rows = [...detailRows, totalRow];

    const fileName = `transfer_in_report_${Date.now()}`;

    if (type === 'csv') {
      return exportToCSV(rows, headers, fileName, 'Transfer-In Report', 'Transfer-In Report');
    }
    return exportToPDF(rows, headers, fileName, 'Transfer-In Report', 'Transfer-In Report');
  };

  const renderDropdown = (value, setValue, data, placeholder) => (
    <Dropdown
      style={styles.dropdown}
      data={data}
      labelField="label"
      valueField="value"
      placeholder={placeholder}
      value={value}
      onChange={(item) => setValue(item.value)}
      placeholderStyle={styles.placeholderStyle}
      selectedTextStyle={styles.selectedTextStyle}
      itemTextStyle={styles.itemTextStyle}
      iconColor="#1B1B1B"
      maxHeight={250}
    />
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
      <Text style={[styles.headerText, styles.colDate]}>Date</Text>
      <Text style={[styles.headerText, styles.colCategory]}>Category</Text>
      <Text style={[styles.headerText, styles.colSubCategory]}>Sub-Category</Text>
      <Text style={[styles.headerText, styles.colBrand]}>Brand</Text>
      <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
      <Text style={[styles.headerText, styles.colFreeQty]}>Free Qty</Text>
      <Text style={[styles.headerText, styles.colMrp]}>MRP</Text>
      <Text style={[styles.headerText, styles.colCp]}>CP</Text>
      <Text style={[styles.headerText, styles.colTotalAmount]}>Total Amount</Text>
    </View>
  );

  // FlatList Render Item
  const renderDetailedRow = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
      <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
      <Text style={[styles.rowText, styles.colCategory]}>{item.category}</Text>
      <Text style={[styles.rowText, styles.colSubCategory]}>{item.subCategory}</Text>
      <Text style={[styles.rowText, styles.colBrand]}>{item.brand}</Text>
      <Text style={[styles.rowText, styles.colQty]}>{item.qty}</Text>
      <Text style={[styles.rowText, styles.colFreeQty]}>{item.freeQty}</Text>
      <Text style={[styles.rowText, styles.colMrp]}>{item.mrp}</Text>
      <Text style={[styles.rowText, styles.colCp]}>{item.cp}</Text>
      <Text style={[styles.rowText, styles.colTotalAmount]}>{item.totalAmount}</Text>
    </View>
  );

  const renderTotalRow = () => (
    <View style={styles.totalRow}>
      <View style={styles.colSno} />
      <View style={styles.colDate} />
      <View style={styles.colCategory} />
      <View style={styles.colSubCategory} />
      <View style={styles.colBrand} />
      <Text style={[styles.totalText, styles.colQty]}>{TOTAL_QTY}</Text>
      <Text style={[styles.totalText, styles.colFreeQty]}>{TOTAL_FREE_QTY}</Text>
      <View style={styles.colMrp} />
      <View style={styles.colCp} />
      <Text style={[styles.totalText, styles.colTotalAmount]}>{TOTAL_AMOUNT}</Text>
    </View>
  );

  const tableWidth = rMS(1050);

  return (
    <SafeAreaView style={styles.container}>
      <ReportHeader
        title='TRANSFER-IN REPORT'
        showReportType={true}
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        onExport={() => console.log('Export Report')}
        onExportCSV={() => exportTransferInReport('csv')}
        onExportPDF={() => exportTransferInReport('pdf')}
        onPrint={() => console.log('Print Report')}
      />

      <View style={styles.contentCard}>
        <View style={styles.filtersContainer}>
          {/* ROW 1 */}
          <View style={styles.filterRow}>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Category <Text style={styles.star}>*</Text></Text>
              {renderDropdown(category, setCategory, categoryOptions, 'Select Category')}
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Sub-Category</Text>
              {renderDropdown(subCategory, setSubCategory, subCategoryOptions, 'Select Sub-Category')}
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Brand</Text>
              {renderDropdown(brand, setBrand, brandOptions, 'Select Brand')}
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Item Code</Text>
              <View style={styles.input}>
                <Text style={styles.inputText}>{itemCode}</Text>
              </View>
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Variant Code <Text style={styles.star}>*</Text></Text>
              {renderDropdown(variantCode, setVariantCode, variantOptions, 'Select Variant')}
            </View>
          </View>

          {/* ROW 2 */}
          <View style={styles.filterRow}>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>Item Name</Text>
              <View style={styles.input}>
                <TextInput
                  style={styles.inputText}
                  value={itemName}
                  onChangeText={setItemName}
                  placeholder="Enter Item Name"
                  placeholderTextColor="#999999"
                  numberOfLines={1}
                />
              </View>
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>From Date <Text style={styles.star}>*</Text></Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.input}
                onPress={() => {
                  setTempFromDate(convertStringToDate(fromDate));
                  setShowFromDatePicker(true);
                }}>
                <Text style={styles.inputText}>{fromDate}</Text>
                <CalenderIcon />
              </TouchableOpacity>
            </View>
            <View style={[styles.filterBox, styles.flex1]}>
              <Text style={styles.label}>To Date <Text style={styles.star}>*</Text></Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.input}
                onPress={() => {
                  setTempToDate(convertStringToDate(toDate));
                  setShowToDatePicker(true);
                }}>
                <Text style={styles.inputText}>{toDate}</Text>
                <CalenderIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <TouchableOpacity activeOpacity={0.8} style={styles.searchButton} onPress={handleSearch}>
                <Text style={styles.searchText}>Search</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity activeOpacity={0.8} style={styles.clearIconBtn} onPress={handleClear}>
              <Text style={styles.clearIcon}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ANDROID DATE PICKERS */}
        {Platform.OS === 'android' && showFromDatePicker && (
          <DateTimePicker value={convertStringToDate(fromDate)} mode="date" display="default" onChange={handleFromDateChange} />
        )}
        {Platform.OS === 'android' && showToDatePicker && (
          <DateTimePicker value={convertStringToDate(toDate)} mode="date" display="default" minimumDate={convertStringToDate(fromDate)} onChange={handleToDateChange} />
        )}

        {/* IOS FROM DATE */}
        <Modal visible={Platform.OS === 'ios' && showFromDatePicker} transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  const newDate = formatDate(tempFromDate);
                  setFromDate(newDate);
                  if (convertStringToDate(toDate) < tempFromDate) {
                    setToDate(newDate);
                    setTempToDate(tempFromDate);
                  }
                  setShowFromDatePicker(false);
                }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={tempFromDate} mode="date" display="spinner" onChange={handleFromDateChange} />
            </View>
          </View>
        </Modal>

        {/* IOS TO DATE */}
        <Modal visible={Platform.OS === 'ios' && showToDatePicker} transparent animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setToDate(formatDate(tempToDate));
                  setShowToDatePicker(false);
                }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker value={tempToDate} mode="date" display="spinner" minimumDate={convertStringToDate(fromDate)} onChange={handleToDateChange} />
            </View>
          </View>
        </Modal>

        <View style={styles.tableContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} persistentScrollbar={true} contentContainerStyle={{ minWidth: tableWidth }}>
            <View style={{ width: tableWidth, flex: 1 }}>
              {renderTableHeader()}

              <Animated.FlatList
                data={detailedData}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderDetailedRow}
                style={styles.tableList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: verticalScrollOffset } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
              />

              {renderTotalRow()}
            </View>
          </ScrollView>

          {/* Custom Scrollbar */}
          <View pointerEvents="none" style={styles.tableScrollbarTrack}>
            <Animated.View
              style={[
                styles.tableScrollbarThumb,
                {
                  height: VERTICAL_THUMB_HEIGHT,
                  transform: [{
                    translateY: verticalScrollOffset.interpolate({
                      inputRange: [0, maxTableScrollOffset],
                      outputRange: [0, VERTICAL_THUMB_TRAVEL],
                      extrapolate: 'clamp',
                    }),
                  }],
                },
              ]}
            />
          </View>
        </View>

        {/* ✅ PAGINATION */}
        <View style={styles.paginationSection}>
          <Pagination
            currentPage={currentPage}
            lastPage={lastPage}
            onPageChange={handlePageChange}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default TransferInReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentCard: {
    flex: 1,
    marginHorizontal: rMS(15),
    marginTop: rV(2),
    marginBottom: rV(5),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: rMS(6),
    paddingTop: rV(6),
    borderTopWidth: 1,
    borderTopColor: '#F4F4F4',
  },
  filtersContainer: {
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rMS(10),
    marginBottom: rV(4),
  },
  filterBox: {
    minWidth: 0,
  },
  flex1: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: rV(5),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  star: {
    color: '#E71414',
  },
  input: {
    height: rV(27),
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 6,
    paddingHorizontal: rMS(10),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    paddingVertical: 0,
  },
  dropdown: {
    height: rV(27),
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 6,
    paddingHorizontal: rMS(10),
    backgroundColor: '#FFFFFF',
  },
  placeholderStyle: {
    fontSize: 15,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },
  selectedTextStyle: {
    fontSize: 15,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
  },
  itemTextStyle: {
    fontSize: rMS(10),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: rMS(125),
    height: rV(27),
    backgroundColor: '#264B79',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchText: {
    color: '#FFFFFF',
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 15,
    fontWeight: '500',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
    position: 'relative',
    marginTop: responsiveHeight(1)
  },
  tableList: {
    height: rV(260),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    minHeight: rV(26),
    paddingHorizontal: rMS(2),
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: rV(30),
    paddingHorizontal: rMS(3),
  },
  rowText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'center',
    flexShrink: 0,
  },
  // Column Widths for Transfer-In Report
  colSno: { width: rMS(50) },
  colDate: { width: rMS(100) },
  colCategory: { width: rMS(110) },
  colSubCategory: { width: rMS(120) },
  colBrand: { width: rMS(100) },
  colQty: { width: rMS(80) },
  colFreeQty: { width: rMS(80) },
  colMrp: { width: rMS(100) },
  colCp: { width: rMS(100) },
  colTotalAmount: { width: rMS(140) },

  totalRow: {
    minHeight: rV(40),
    borderTopWidth: 0.5,
    borderStyle: 'dashed',
    borderTopColor: '#989898',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rMS(3),
  },
  totalText: {
    fontSize: 14,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
    textAlign: 'center',
  },
  tableScrollbarTrack: {
    position: 'absolute',
    top: rV(42),
    right: rMS(2),
    width: rMS(3),
    height: rV(260),
    backgroundColor: 'transparent',
    borderRadius: rMS(2),
    overflow: 'hidden',
  },
  tableScrollbarThumb: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: rMS(2),
  },

  // =========================================================
  // ✅ PAGINATION
  // =========================================================
  paginationSection: {
    paddingTop: rV(2),
    paddingBottom: rV(3),
    alignItems: 'center',
  },

  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cancelText: {
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },
  doneText: {
    color: '#264B79',
    fontFamily: Fonts.FigtreeSemiBold,
  },
  clearIconBtn: {
    width: rS(30),
    height: rV(27),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#264B79',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 18,
    color: '#264B79',
    fontFamily: Fonts.FigtreeSemiBold,
    lineHeight: 20,
  },
});
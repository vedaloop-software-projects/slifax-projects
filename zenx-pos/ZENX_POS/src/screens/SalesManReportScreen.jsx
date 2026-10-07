import React, { useRef, useState, useCallback } from 'react';

import {
  Animated,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';

import ReportHeader from '../components/ReportHeader';
import Pagination from '../components/Pagination';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import {
  exportToCSV,
  exportToPDF,
} from '../utils/exportUtils';

import CalenderIcon from '../assets/Icons/CalenderIcon';
import { responsiveWidth } from 'react-native-responsive-dimensions';

// =========================================================
// LAYOUT CONSTANTS
// =========================================================
const DEFAULT_TABLE_HEIGHT = rV(240);
const ROW_HEIGHT = rV(30);

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
  reportType: 'commission',
  salesmanCode: 'W101',
  fromDate: '23-03-2026',
  toDate: '23-03-2026',
};

const SalesManReportScreen = () => {
  // 'commission' | 'sale'
  const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType);

  const [salesmanCode, setSalesmanCode] = useState(DEFAULT_FILTERS.salesmanCode);
  const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
  const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);

  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [tempFromDate, setTempFromDate] = useState(new Date(2026, 2, 23));
  const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

  // ✅ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(4);

  // measured height of the scrollable list
  const [listHeight, setListHeight] = useState(0);
  const tableHeight = listHeight > 0 ? listHeight : DEFAULT_TABLE_HEIGHT;

  // State for horizontal scroll
  const [tableViewportWidth, setTableViewportWidth] = useState(0);

  // Scroll offsets
  const verticalScrollOffset = useRef(new Animated.Value(0)).current;
  const horizontalScrollOffset = useRef(new Animated.Value(0)).current;

  // Dropdown options
  const salesmanOptions = [
    { label: 'W101', value: 'W101' },
    { label: 'W102', value: 'W102' },
    { label: 'W103', value: 'W103' },
  ];

  // ---------------- DATA ----------------
  const commissionData = [
    { id: 1, date: '23-03-2026', salesmanCode: 'SM23', salesmanName: 'Ramesh', commission: '5.00' },
    { id: 2, date: '24-03-2026', salesmanCode: 'SM24', salesmanName: 'Suresh', commission: '6.50' },
    { id: 3, date: '25-03-2026', salesmanCode: 'SM25', salesmanName: 'Mahesh', commission: '4.00' },
    { id: 4, date: '23-03-2026', salesmanCode: 'SM23', salesmanName: 'Ramesh', commission: '5.00' },
    { id: 5, date: '24-03-2026', salesmanCode: 'SM24', salesmanName: 'Suresh', commission: '6.50' },
    { id: 6, date: '25-03-2026', salesmanCode: 'SM25', salesmanName: 'Mahesh', commission: '4.00' },
  ];

  const saleData = [
    { id: 1, date: '23-03-2026', salesmanCode: 'SM23', salesmanName: 'Ramesh', itemName: 'Basmati Rice-5 Kg', qty: '5.00', unitPrice: '5.00', discount: '5.00', amount: '₹1500' },
    { id: 2, date: '24-03-2026', salesmanCode: 'SM24', salesmanName: 'Suresh', itemName: 'Wheat Flour-10 Kg', qty: '2.00', unitPrice: '10.00', discount: '2.00', amount: '₹2000' },
    { id: 3, date: '25-03-2026', salesmanCode: 'SM25', salesmanName: 'Mahesh', itemName: 'Sunflower Oil-1 L', qty: '10.00', unitPrice: '12.00', discount: '0.00', amount: '₹1200' },
    { id: 4, date: '26-03-2026', salesmanCode: 'SM26', salesmanName: 'Rajesh', itemName: 'Toor Dal-2 Kg', qty: '1.00', unitPrice: '20.00', discount: '0.00', amount: '₹400' },
    { id: 5, date: '27-03-2026', salesmanCode: 'SM27', salesmanName: 'Vijay', itemName: 'Sugar-1 Kg', qty: '5.00', unitPrice: '15.00', discount: '1.00', amount: '₹750' },
  ];

  const isSaleReport = reportType === 'sale';
  const displayedData = isSaleReport ? saleData : commissionData;

  // =========================================================
  // DYNAMIC WIDTH CALCULATIONS
  // =========================================================
  const tableWidth = isSaleReport
    ? rS(50 + 80 + 100 + 100 + 120 + 80 + 80 + 80 + 100 + 10) // Sale Total = 800
    : rS(50 + 80 + 100 + 100 + 100 + 10); // Commission Total = 440

  // ✅ Stretch table to at least fill viewport; keep design width if it's bigger
  const renderedTableWidth = Math.max(tableWidth, tableViewportWidth);

  const totalContentHeight = displayedData.length * ROW_HEIGHT;
  const showVerticalScrollbar = totalContentHeight > tableHeight;

  const maxTableScrollOffset = Math.max(1, totalContentHeight - tableHeight);

  const VERTICAL_THUMB_HEIGHT = Math.min(
    tableHeight,
    Math.max(rV(24), (tableHeight / totalContentHeight) * tableHeight)
  );

  const VERTICAL_THUMB_TRAVEL = tableHeight - VERTICAL_THUMB_HEIGHT;

  // Horizontal Scrollbar Calculations
  const horizontalScrollContentWidth = renderedTableWidth;
  const horizontalMaxScrollOffset = Math.max(0, horizontalScrollContentWidth - tableViewportWidth);
  const HORIZONTAL_THUMB_WIDTH = horizontalScrollContentWidth > tableViewportWidth && tableViewportWidth > 0
    ? Math.max(rS(35), (tableViewportWidth / horizontalScrollContentWidth) * tableViewportWidth)
    : tableViewportWidth;
  const HORIZONTAL_THUMB_TRAVEL = Math.max(0, tableViewportWidth - HORIZONTAL_THUMB_WIDTH);

  // ---------------- DATE HELPERS ----------------
  const formatDate = date => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const convertStringToDate = dateString => {
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

  // =========================================================
  // ACTIONS
  // =========================================================

  // ✅ REPORT TYPE CHANGE — resets pagination & scroll
  const handleReportTypeChange = useCallback(type => {
    setReportType(type);
    setCurrentPage(1);
    verticalScrollOffset.setValue(0);
    horizontalScrollOffset.setValue(0);
  }, [verticalScrollOffset, horizontalScrollOffset]);

  // ✅ SEARCH — resets pagination & scroll
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    verticalScrollOffset.setValue(0);

    console.log('SALESMAN REPORT SEARCH', {
      salesmanCode,
      fromDate,
      toDate,
      reportType,
      page: 1,
    });
  }, [salesmanCode, fromDate, toDate, reportType, verticalScrollOffset]);

  // ✅ CLEAR / RESET button
  const handleClear = useCallback(() => {
    setReportType(DEFAULT_FILTERS.reportType);
    setSalesmanCode(DEFAULT_FILTERS.salesmanCode);
    setFromDate(DEFAULT_FILTERS.fromDate);
    setToDate(DEFAULT_FILTERS.toDate);

    setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
    setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

    setCurrentPage(1);
    verticalScrollOffset.setValue(0);
    horizontalScrollOffset.setValue(0);

    console.log('SALESMAN REPORT — FILTERS CLEARED');
  }, [verticalScrollOffset, horizontalScrollOffset]);

  // ✅ PAGE CHANGE — resets vertical scroll to top
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
    verticalScrollOffset.setValue(0);
    console.log('SALESMAN PAGE CHANGE ====>', page);
    // TODO: fetchSalesManReport(page);
  }, [verticalScrollOffset]);

  const renderDropdown = (value, setValue, data, placeholder) => {
    return (
      <Dropdown
        style={styles.dropdown}
        data={data}
        labelField="label"
        valueField="value"
        placeholder={placeholder}
        value={value}
        onChange={item => setValue(item.value)}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        itemTextStyle={styles.itemTextStyle}
        iconColor="#1B1B1B"
        maxHeight={250}
      />
    );
  };

  const exportSalesManReport = type => {
    const headers = isSaleReport
      ? [
        'S.No',
        'Date',
        'Salesman Code',
        'Salesman Name',
        'Item Name',
        'Qty',
        'Unit Price',
        'Discount%',
        'Amount',
      ]
      : ['S.No', 'Date', 'Salesman Code', 'Salesman Name', 'Commission%'];

    const rows = displayedData.map(item => {
      if (isSaleReport) {
        return {
          'S.No': item.id,
          Date: item.date,
          'Salesman Code': item.salesmanCode,
          'Salesman Name': item.salesmanName,
          'Item Name': item.itemName,
          Qty: item.qty,
          'Unit Price': item.unitPrice,
          'Discount%': item.discount,
          Amount: item.amount,
        };
      }

      return {
        'S.No': item.id,
        Date: item.date,
        'Salesman Code': item.salesmanCode,
        'Salesman Name': item.salesmanName,
        'Commission%': item.commission,
      };
    });

    const fileName = `salesman_report_${isSaleReport ? 'sale' : 'commission'}_${Date.now()}`;
    const reportTitle = isSaleReport
      ? 'Salesman Report - Sale'
      : 'Salesman Report - Commission';

    if (type === 'csv') {
      return exportToCSV(rows, headers, fileName, '', reportTitle);
    }

    return exportToPDF(rows, headers, fileName, reportTitle, '');
  };

  // =========================================================
  // TABLE RENDERING
  // =========================================================

  const renderTableHeader = () => {
    if (isSaleReport) {
      return (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colCode]}>Salesman Code</Text>
          <Text style={[styles.headerText, styles.colName]}>Salesman Name</Text>
          <Text style={[styles.headerText, styles.colItem]}>Item Name</Text>
          <Text style={[styles.headerText, styles.colSmall]}>Qty</Text>
          <Text style={[styles.headerText, styles.colSmall]}>Unit Price</Text>
          <Text style={[styles.headerText, styles.colSmall]}>Discount%</Text>
          <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
        <Text style={[styles.headerText, styles.colDate]}>Date</Text>
        <Text style={[styles.headerText, styles.colCode]}>Salesman Code</Text>
        <Text style={[styles.headerText, styles.colName]}>Salesman Name</Text>
        <Text style={[styles.headerText, styles.colComm]}>Commission%</Text>
      </View>
    );
  };

  const renderRow = ({ item }) => {
    if (isSaleReport) {
      return (
        <View style={styles.tableRow}>
          <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
          <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
          <Text style={[styles.rowText, styles.colCode]}>{item.salesmanCode}</Text>
          <Text style={[styles.rowText, styles.colName]}>{item.salesmanName}</Text>
          <Text style={[styles.rowText, styles.colItem]}>{item.itemName}</Text>
          <Text style={[styles.rowText, styles.colSmall]}>{item.qty}</Text>
          <Text style={[styles.rowText, styles.colSmall]}>{item.unitPrice}</Text>
          <Text style={[styles.rowText, styles.colSmall]}>{item.discount}</Text>
          <Text style={[styles.rowText, styles.colAmount]}>{item.amount}</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
        <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
        <Text style={[styles.rowText, styles.colCode]}>{item.salesmanCode}</Text>
        <Text style={[styles.rowText, styles.colName]}>{item.salesmanName}</Text>
        <Text style={[styles.rowText, styles.colComm]}>{item.commission}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReportHeader
        title="SALESMAN REPORT"
        showReportType={true}
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        onExport={() => console.log('Export Report')}
        onExportCSV={() => exportSalesManReport('csv')}
        onExportPDF={() => exportSalesManReport('pdf')}
        onPrint={() => console.log('Print Report')}
        reportTypeOptions={[
          { label: 'Commission Report', value: 'commission' },
          { label: 'Sale Report', value: 'sale' },
        ]}
      />

      <View style={styles.contentCard}>
        <View style={styles.filtersContainer}>
          {/* FILTER ROW */}
          <View style={styles.filterRow}>
            <View style={styles.filterBox}>
              <Text style={styles.label}>
                Salesman Code <Text style={styles.star}>*</Text>
              </Text>
              {renderDropdown(
                salesmanCode,
                setSalesmanCode,
                salesmanOptions,
                'Select Salesman Code'
              )}
            </View>

            <View style={styles.filterBox}>
              <Text style={styles.label}>
                From Date <Text style={styles.star}>*</Text>
              </Text>
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

            <View style={styles.filterBox}>
              <Text style={styles.label}>
                To Date <Text style={styles.star}>*</Text>
              </Text>
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
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.searchButton}
                onPress={handleSearch}>
                <Text style={styles.searchText}>Search</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.clearIconBtn}
              onPress={handleClear}>
              <Text style={styles.clearIcon}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ANDROID DATE PICKERS */}
        {Platform.OS === 'android' && showFromDatePicker && (
          <DateTimePicker
            value={convertStringToDate(fromDate)}
            mode="date"
            display="default"
            onChange={handleFromDateChange}
          />
        )}
        {Platform.OS === 'android' && showToDatePicker && (
          <DateTimePicker
            value={convertStringToDate(toDate)}
            mode="date"
            display="default"
            minimumDate={convertStringToDate(fromDate)}
            onChange={handleToDateChange}
          />
        )}

        {/* IOS DATE PICKERS */}
        <Modal
          visible={Platform.OS === 'ios' && showFromDatePicker}
          transparent
          animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
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
              <DateTimePicker
                value={tempFromDate}
                mode="date"
                display="spinner"
                onChange={handleFromDateChange}
              />
            </View>
          </View>
        </Modal>

        <Modal
          visible={Platform.OS === 'ios' && showToDatePicker}
          transparent
          animationType="slide">
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerSheet}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setToDate(formatDate(tempToDate));
                    setShowToDatePicker(false);
                  }}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempToDate}
                mode="date"
                display="spinner"
                minimumDate={convertStringToDate(fromDate)}
                onChange={handleToDateChange}
              />
            </View>
          </View>
        </Modal>

        {/* ================= TABLE CONTAINER ================= */}
        <View style={styles.tableContainer}>

          {/* HORIZONTAL SCROLL VIEW */}
          <ScrollView
            key={`table-${reportType}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={event => setTableViewportWidth(event.nativeEvent.layout.width)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: horizontalScrollOffset } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            {/* ✅ renderedTableWidth ensures the table always fills the viewport */}
            <View style={{ width: renderedTableWidth }}>
              {renderTableHeader()}

              <Animated.FlatList
                data={displayedData}
                renderItem={renderRow}
                keyExtractor={item => String(item.id)}
                style={styles.tableList}
                onLayout={e => setListHeight(e.nativeEvent.layout.height)}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { y: verticalScrollOffset } } }],
                  { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
              />
            </View>
          </ScrollView>

          {/* CUSTOM VERTICAL SCROLLBAR */}
          {showVerticalScrollbar && (
            <View
              pointerEvents="none"
              style={[styles.tableScrollbarTrack, { height: tableHeight }]}>
              <Animated.View
                style={[
                  styles.tableScrollbarThumb,
                  {
                    height: VERTICAL_THUMB_HEIGHT,
                    transform: [
                      {
                        translateY: verticalScrollOffset.interpolate({
                          inputRange: [0, maxTableScrollOffset],
                          outputRange: [0, VERTICAL_THUMB_TRAVEL],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          )}

          {/* CUSTOM HORIZONTAL SCROLLBAR */}
          {renderedTableWidth > tableViewportWidth && (
            <View pointerEvents="none" style={styles.horizontalScrollbarTrack}>
              <Animated.View
                style={[
                  styles.horizontalScrollbarThumb,
                  {
                    width: HORIZONTAL_THUMB_WIDTH,
                    transform: [
                      {
                        translateX: horizontalScrollOffset.interpolate({
                          inputRange: [0, Math.max(1, horizontalMaxScrollOffset)],
                          outputRange: [0, HORIZONTAL_THUMB_TRAVEL],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          )}

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

export default SalesManReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentCard: {
    flex: 1,
    marginHorizontal: rS(20),
    marginTop: rV(1),
    marginBottom: rV(5),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F4',
    paddingHorizontal: rS(7),
    paddingTop: rV(6),
  },

  // =========================================================
  // FILTER SECTION
  // =========================================================
  filtersContainer: {
    width: '100%',
  },
  filterRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rS(10),
    marginBottom: rV(5),
  },
  filterBox: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    marginBottom: rV(5),
  },
  star: {
    color: '#E71414',
  },
  input: {
    height: rV(27),
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputText: {
    flex: 1,
    fontSize: 14,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    paddingVertical: 0,
  },
  dropdown: {
    height: rV(27),
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#9A9A9A',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  itemTextStyle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  searchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButton: {
    width: rS(125),
    height: rV(27),
    backgroundColor: '#264B79',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
  },

  // =========================================================
  // TABLE CONTAINER
  // =========================================================
  tableContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E4',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  tableList: {
    flex: 1,
  },

  // =========================================================
  // TABLE COMMON
  // =========================================================
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    minHeight: rV(30),
    alignItems: 'center',
    paddingHorizontal: rS(5),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rS(5),
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  rowText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    textAlign: 'left',
    flexShrink: 0,
  },
  headerText: {
    fontSize: 13,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
    textAlign: 'left',
    flexShrink: 0,
  },

  // =========================================================
  // FIXED COLUMN WIDTHS
  // =========================================================
  colSno: { width: rS(60), paddingLeft: responsiveWidth(2) },
  colDate: { width: rS(70) },
  colCode: { width: rS(100) },
  colName: { width: rS(100) },
  colComm: { width: rS(100) },

  colItem: { width: rS(120) },
  colSmall: { width: rS(80) },
  colAmount: { width: rS(100) },

  // =========================================================
  // CUSTOM SCROLLBARS
  // =========================================================
  tableScrollbarTrack: {
    position: 'absolute',
    top: rV(32),
    right: rS(2),
    width: rS(3),
    backgroundColor: 'transparent',
    borderRadius: rS(3),
    overflow: 'hidden',
  },
  tableScrollbarThumb: {
    width: '100%',
    backgroundColor: '#C9D3DC',
    borderRadius: rS(3),
  },
  horizontalScrollbarTrack: {
    position: 'absolute',
    left: rS(2),
    right: rS(2),
    bottom: rV(2),
    height: rS(3),
    backgroundColor: 'transparent',
    borderRadius: rS(3),
    overflow: 'hidden',
  },
  horizontalScrollbarThumb: {
    height: '100%',
    backgroundColor: '#C9D3DC',
    borderRadius: rS(3),
  },

  // =========================================================
  // ✅ PAGINATION
  // =========================================================
  paginationSection: {
    paddingTop: rV(2),
    paddingBottom: rV(3),
    alignItems: 'center',
    flexShrink: 0,
  },

  // =========================================================
  // IOS DATE PICKER
  // =========================================================
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.40)',
  },
  pickerSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingBottom: rV(30),
  },
  pickerHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rS(15),
    paddingVertical: rV(12),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  cancelText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },
  doneText: {
    fontSize: 14,
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
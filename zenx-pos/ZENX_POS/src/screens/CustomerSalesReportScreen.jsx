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
import { rMS, rS, rV } from '../constants/responsive';

import CalenderIcon from '../assets/Icons/CalenderIcon';
import {
  exportToCSV,
  exportToPDF,
} from '../utils/exportUtils';
import { responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';
const DEFAULT_FILTERS = {
  reportType: 'summary',
  customerId: 'C101',
  fromDate: '23-03-2026',
  toDate: '23-03-2026',
};

const CustomerSalesReportScreen = () => {
  const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType); // 'summary' | 'detailed'

  const [customerId, setCustomerId] = useState(DEFAULT_FILTERS.customerId);
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
  const horizontalScrollOffset = useRef(new Animated.Value(0)).current;

  const [tableViewportWidth, setTableViewportWidth] = useState(0);

  // Dropdown options
  const customerOptions = [
    { label: 'C101', value: 'C101' },
    { label: 'C102', value: 'C102' },
    { label: 'C103', value: 'C103' },
  ];

  // ---------------- DATA ----------------
  const summaryData = [
    { id: 1, date: '23-03-2026', customerName: 'Rice', category: 'Red Rice', subCategory: 'Lalitha', brand: 'BR-213', gst: '5', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 2, date: '23-03-2026', customerName: 'Flour', category: 'Maida', subCategory: 'Ashirvaad', brand: 'BR-213', gst: '2', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 3, date: '23-03-2026', customerName: 'Rice', category: 'Basmati', subCategory: 'Dawat', brand: 'BR-213', gst: '3', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 4, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', gst: '18', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 5, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', gst: '18', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 6, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', gst: '18', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 7, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', gst: '18', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
    { id: 8, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', gst: '18', qtyRecieved: '10', qtyRefund: '10', taxAmt: '', netExcl: '' },
  ];

  const detailedData = [
    { id: 1, date: '23-03-2026', customerName: 'Rice', category: 'Red Rice', subCategory: 'Lalitha', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Red Rice-5 Kg', itemName: '5', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 2, date: '23-03-2026', customerName: 'Flour', category: 'Maida', subCategory: 'Ashirvaad', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Maida-1 Kg', itemName: '2', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 3, date: '23-03-2026', customerName: 'Rice', category: 'Basmati', subCategory: 'Dawat', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Basmati-3 Kg', itemName: '3', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 4, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Dal-2 Kg', itemName: '18', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 5, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Dal-2 Kg', itemName: '18', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 6, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Dal-2 Kg', itemName: '18', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 7, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Dal-2 Kg', itemName: '18', gst: '10', qtyRecieved: '10', qtyRef: '' },
    { id: 8, date: '23-03-2026', customerName: 'Lentils', category: 'Toor Dal', subCategory: 'dklafk', brand: 'BR-213', itemCode: 'VR-213', variantCode: 'Dal-2 Kg', itemName: '18', gst: '10', qtyRecieved: '10', qtyRef: '' },
  ];

  const isDetailed = reportType === 'detailed';
  const displayedData = isDetailed ? detailedData : summaryData;

  const TABLE_HEIGHT = rV(260);
  const ROW_HEIGHT = rV(35);

  const totalContentHeight = displayedData.length * ROW_HEIGHT;

  const maxTableScrollOffset = Math.max(
    0,
    totalContentHeight - TABLE_HEIGHT
  );

  const VERTICAL_THUMB_HEIGHT =
    totalContentHeight > TABLE_HEIGHT
      ? Math.max(
        rV(40),
        (TABLE_HEIGHT / totalContentHeight) * TABLE_HEIGHT
      )
      : TABLE_HEIGHT;

  const VERTICAL_THUMB_TRAVEL = Math.max(
    0,
    TABLE_HEIGHT - VERTICAL_THUMB_HEIGHT
  );

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

  // ✅ REPORT TYPE CHANGE — resets pagination + scroll
  const handleReportTypeChange = useCallback(type => {
    setReportType(type);
    setCurrentPage(1);
    verticalScrollOffset.setValue(0);
    horizontalScrollOffset.setValue(0);
  }, [verticalScrollOffset, horizontalScrollOffset]);

  // ✅ SEARCH — resets pagination + scroll
  const handleSearch = useCallback(() => {
    setCurrentPage(1);
    verticalScrollOffset.setValue(0);

    console.log('CUSTOMER SALES REPORT SEARCH', {
      customerId,
      fromDate,
      toDate,
      reportType,
      page: 1,
    });
  }, [customerId, fromDate, toDate, reportType, verticalScrollOffset]);

  // ✅ CLEAR / RESET button
  const handleClear = useCallback(() => {
    setReportType(DEFAULT_FILTERS.reportType);
    setCustomerId(DEFAULT_FILTERS.customerId);
    setFromDate(DEFAULT_FILTERS.fromDate);
    setToDate(DEFAULT_FILTERS.toDate);

    setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
    setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

    setCurrentPage(1);
    verticalScrollOffset.setValue(0);
    horizontalScrollOffset.setValue(0);

    console.log('CUSTOMER SALES REPORT — FILTERS CLEARED');
  }, [verticalScrollOffset, horizontalScrollOffset]);

  // ✅ PAGE CHANGE — resets vertical scroll to top
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
    verticalScrollOffset.setValue(0);
    console.log('CUSTOMER SALES PAGE CHANGE ====>', page);
    // TODO: fetchCustomerSalesReport(page);
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

  const exportCustomerSalesReport = type => {
    const headers = isDetailed
      ? [
        'S.No',
        'Date',
        'Customer Name',
        'Category',
        'Sub-Category',
        'Brand',
        'Item Code',
        'Variant Code',
        'Item Name',
        'GST%',
        'Qty Received',
        'Qty Refund',
      ]
      : [
        'S.No',
        'Date',
        'Customer Name',
        'Category',
        'Sub-Category',
        'Brand',
        'GST%',
        'Qty Received',
        'Qty Refund',
        'Tax Amount',
        'Net Sale Amount (Excl.)',
      ];

    const rows = displayedData.map(item => {
      if (isDetailed) {
        return {
          'S.No': item.id,
          Date: item.date,
          'Customer Name': item.customerName,
          Category: item.category,
          'Sub-Category': item.subCategory,
          Brand: item.brand,
          'Item Code': item.itemCode,
          'Variant Code': item.variantCode,
          'Item Name': item.itemName,
          'GST%': item.gst,
          'Qty Received': item.qtyRecieved,
          'Qty Refund': item.qtyRef,
        };
      }

      return {
        'S.No': item.id,
        Date: item.date,
        'Customer Name': item.customerName,
        Category: item.category,
        'Sub-Category': item.subCategory,
        Brand: item.brand,
        'GST%': item.gst,
        'Qty Received': item.qtyRecieved,
        'Qty Refund': item.qtyRefund,
        'Tax Amount': item.taxAmt,
        'Net Sale Amount (Excl.)': item.netExcl,
      };
    });

    const fileName = `customer_sales_report_${isDetailed ? 'detailed' : 'summary'}_${Date.now()}`;
    const reportTitle = isDetailed
      ? 'Customer Sales Report - Detailed'
      : 'Customer Sales Report - Summary';

    if (type === 'csv') {
      return exportToCSV(rows, headers, fileName, '', reportTitle);
    }

    return exportToPDF(rows, headers, fileName, reportTitle, '');
  };

  // ---------------- TABLE RENDERING ----------------
  const renderSummaryRow = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
      <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
      <Text style={[styles.rowText, styles.colCustName]}>{item.customerName}</Text>
      <Text style={[styles.rowText, styles.colCategory]}>{item.category}</Text>
      <Text style={[styles.rowText, styles.colSubCategory]}>{item.subCategory}</Text>
      <Text style={[styles.rowText, styles.colBrand]}>{item.brand}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.gst}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.qtyRecieved}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.qtyRefund}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.taxAmt}</Text>
      <Text style={[styles.rowText, styles.colNet]}>{item.netExcl}</Text>
    </View>
  );

  const renderDetailedRow = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
      <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
      <Text style={[styles.rowText, styles.colCustName]}>{item.customerName}</Text>
      <Text style={[styles.rowText, styles.colCategory]}>{item.category}</Text>
      <Text style={[styles.rowText, styles.colSubCategory]}>{item.subCategory}</Text>
      <Text style={[styles.rowText, styles.colBrand]}>{item.brand}</Text>
      <Text style={[styles.rowText, styles.colItemCode]}>{item.itemCode}</Text>
      <Text style={[styles.rowText, styles.colVariant]}>{item.variantCode}</Text>
      <Text style={[styles.rowText, styles.colItemName]}>{item.itemName}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.gst}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.qtyRecieved}</Text>
      <Text style={[styles.rowText, styles.colSmall]}>{item.qtyRef}</Text>
    </View>
  );

  const renderTableHeader = () => {
    if (isDetailed) {
      return (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colCustName]}>Customer Name</Text>
          <Text style={[styles.headerText, styles.colCategory]}>Category</Text>
          <Text style={[styles.headerText, styles.colSubCategory]}>Sub-Category</Text>
          <Text style={[styles.headerText, styles.colBrand]}>Brand</Text>
          <Text style={[styles.headerText, styles.colItemCode]}>Item Code</Text>
          <Text style={[styles.headerText, styles.colVariant]}>Variant Code</Text>
          <Text style={[styles.headerText, styles.colItemName]}>Item Name</Text>
          <Text style={[styles.headerText, styles.colSmall]}>GST%</Text>
          <Text style={[styles.headerText, styles.colSmall]}>Qty Recieved</Text>
          <Text style={[styles.headerText, styles.colSmall]}>Qty Ref</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
        <Text style={[styles.headerText, styles.colDate]}>Date</Text>
        <Text style={[styles.headerText, styles.colCustName]}>Customer Name</Text>
        <Text style={[styles.headerText, styles.colCategory]}>Category</Text>
        <Text style={[styles.headerText, styles.colSubCategory]}>Sub-Category</Text>
        <Text style={[styles.headerText, styles.colBrand]}>Brand</Text>
        <Text style={[styles.headerText, styles.colSmall]}>GST%</Text>
        <Text style={[styles.headerText, styles.colSmall]}>Qty Recieved</Text>
        <Text style={[styles.headerText, styles.colSmall]}>Qty Refund</Text>
        <Text style={[styles.headerText, styles.colSmall]}>Tax Amt.</Text>
        <Text style={[styles.headerText, styles.colNet]}>Net Sale Amount(Excl.)</Text>
      </View>
    );
  };

  // Table widths based on columns
  const tableWidth = isDetailed ? rMS(1050) : rMS(920);
  const horizontalScrollContentWidth = tableWidth;
  const horizontalMaxScrollOffset = Math.max(
    0,
    horizontalScrollContentWidth - tableViewportWidth
  );

  const HORIZONTAL_TRACK_HEIGHT = rMS(2);

  const HORIZONTAL_THUMB_WIDTH =
    horizontalScrollContentWidth > tableViewportWidth && tableViewportWidth > 0
      ? Math.max(
        rMS(35),
        (tableViewportWidth / horizontalScrollContentWidth) *
        tableViewportWidth
      )
      : tableViewportWidth;

  const HORIZONTAL_THUMB_TRAVEL = Math.max(
    0,
    tableViewportWidth - HORIZONTAL_THUMB_WIDTH
  );

  return (
    <SafeAreaView style={styles.container}>
      <ReportHeader
        title="CUSTOMER SALES REPORT"
        showReportType={true}
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        onExport={() => console.log('Export Report')}
        onExportCSV={() => exportCustomerSalesReport('csv')}
        onExportPDF={() => exportCustomerSalesReport('pdf')}
        onPrint={() => console.log('Print Report')}
      />

      <View style={styles.contentCard}>
        <View style={styles.filtersContainer}>
          {/* FILTER ROW */}
          <View style={styles.filterRow}>
            <View style={[styles.filterBox, styles.customerIdBox]}>
              <Text style={styles.label}>
                Customer ID <Text style={styles.star}>*</Text>
              </Text>
              {renderDropdown(
                customerId,
                setCustomerId,
                customerOptions,
                'Select Customer ID'
              )}
            </View>

            <View style={[styles.filterBox, styles.dateBox]}>
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

            <View style={[styles.filterBox, styles.dateBox]}>
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

        {/* TABLE CONTAINER */}
        <View style={styles.tableContainer}>
          <ScrollView
            key={`table-${reportType}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: tableWidth }}
            scrollEventThrottle={16}
            onLayout={event => {
              setTableViewportWidth(event.nativeEvent.layout.width);
            }}
            onScroll={Animated.event(
              [
                {
                  nativeEvent: {
                    contentOffset: {
                      x: horizontalScrollOffset,
                    },
                  },
                },
              ],
              {
                useNativeDriver: false,
              }
            )}
          >
            {/* CUSTOM HORIZONTAL SCROLLBAR */}
            <View
              pointerEvents="none"
              style={styles.horizontalScrollbarTrack}
            >
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
            <View style={{ width: tableWidth, flex: 1 }}>
              {renderTableHeader()}

              <FlatList
                key={isDetailed ? 'detailed' : 'summary'}
                data={displayedData}
                renderItem={({ item }) =>
                  isDetailed
                    ? renderDetailedRow({ item })
                    : renderSummaryRow({ item })
                }
                keyExtractor={item => String(item.id)}
                style={styles.tableList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                  [
                    {
                      nativeEvent: {
                        contentOffset: {
                          y: verticalScrollOffset,
                        },
                      },
                    },
                  ],
                  {
                    useNativeDriver: false,
                  }
                )}
              />
            </View>
          </ScrollView>

          {/* CUSTOM VERTICAL SCROLLBAR */}
          <View pointerEvents="none" style={styles.tableScrollbarTrack}>
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

export default CustomerSalesReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentCard: {
    flex: 1,
    marginHorizontal: rMS(20),
    marginTop: rV(1),
    marginBottom: rV(4),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: rMS(10),
    paddingTop: rV(5),
    borderTopWidth: 1,
    borderTopColor: '#F4F4F4',
  },
  filtersContainer: {
    width: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: rMS(7),
    marginBottom: rV(2),
  },
  filterBox: {
    minWidth: 0,
  },
  customerIdBox: {
    flex: 1,
  },
  dateBox: {
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
    fontSize: 16,
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
    fontSize: 16,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  selectedTextStyle: {
    fontSize: 16,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
  },
  itemTextStyle: {
    fontSize: rMS(10),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
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
    fontSize: 14,
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
    marginTop: responsiveHeight(2),
  },
  tableList: {
    height: rV(260),
    flexGrow: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    minHeight: rV(26),
    paddingHorizontal: rMS(5),
    alignItems: 'center',
  },
  headerText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'left',
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: rV(30),
    paddingHorizontal: rMS(10),
  },
  rowText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'left',
    flexShrink: 0,
    fontWeight: '400',
  },

  // Column Widths
  colSno: { width: rMS(40), paddingLeft: responsiveWidth(1) },
  colDate: { width: rMS(85) },
  colCustName: { width: rMS(110) },
  colCategory: { width: rMS(100) },
  colSubCategory: { width: rMS(105) },
  colBrand: { width: rMS(80) },
  colItemCode: { width: rMS(85) },
  colVariant: { width: rMS(90) },
  colItemName: { width: rMS(110) },
  colSmall: { width: rMS(70) },
  colNet: { width: rMS(150) },

  tableScrollbarTrack: {
    position: 'absolute',
    top: rV(32),
    right: rMS(2),
    width: rMS(2),
    height: rV(260),
    backgroundColor: 'transparent',
    borderRadius: rMS(2),
    overflow: 'hidden',
  },
  tableScrollbarThumb: {
    width: '100%',
    backgroundColor: '#C9D3DC',
    borderRadius: rMS(2),
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
  horizontalScrollbarTrack: {
    position: 'absolute',
    left: rMS(2),
    right: rMS(2),
    bottom: rV(2),
    height: rMS(2),
    backgroundColor: 'transparent',
    borderRadius: rMS(1),
    overflow: 'hidden',
  },
  horizontalScrollbarThumb: {
    height: rMS(2),
    backgroundColor: '#C9D3DC',
    borderRadius: rMS(1),
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
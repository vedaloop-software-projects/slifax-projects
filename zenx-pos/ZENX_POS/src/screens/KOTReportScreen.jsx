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
const ROW_HEIGHT = rV(28);

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
  reportType: 'detailed',
  userId: 'W101',
  fromDate: '23-03-2026',
  toDate: '23-03-2026',
};

const KOTReportScreen = () => {
  // 'summary' | 'detailed'
  const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType);

  const [userId, setUserId] = useState(DEFAULT_FILTERS.userId);
  const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
  const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);

  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [tempFromDate, setTempFromDate] = useState(new Date(2026, 2, 23));
  const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

  // ✅ PAGINATION STATE
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(4);

  const [listHeight, setListHeight] = useState(0);
  const tableHeight = listHeight > 0 ? listHeight : DEFAULT_TABLE_HEIGHT;

  const [tableViewportWidth, setTableViewportWidth] = useState(0);

  const verticalScrollOffset = useRef(new Animated.Value(0)).current;
  const horizontalScrollOffset = useRef(new Animated.Value(0)).current;

  // Dropdown options
  const userOptions = [
    { label: 'W101', value: 'W101' },
    { label: 'W102', value: 'W102' },
    { label: 'W103', value: 'W103' },
  ];

  // ---------------- DATA ----------------
  const summaryData = [
    { id: 1, date: '23-03-2026', userId: 'W101', kotCount: '2', kotCancelled: '1' },
  ];

  const detailedData = [
    {
      id: 1,
      date: '23-03-2026',
      userId: 'W101',
      kotNo: 'KOT#101',
      items: [
        { name: 'Chicken Biryani-Full', qty: '1' },
        { name: 'Tangdi Kebab', qty: '2' },
        { name: 'Mutton Biryani-Single', qty: '1' },
        { name: 'Paneer 65', qty: '2' },
      ]
    },
    {
      id: 2,
      date: '23-03-2026',
      userId: 'W101',
      kotNo: 'KOT#131',
      items: [
        { name: 'Chicken Biryani-Full', qty: '1' },
        { name: 'Tangdi Kebab', qty: '2' },
        { name: 'Mutton Biryani-Single', qty: '1' },
        { name: 'Paneer 65', qty: '2' },
      ]
    },
    {
      id: 3,
      date: '23-03-2026',
      userId: 'W101',
      kotNo: 'KOT#209',
      items: [
        { name: 'Chicken Biryani-Full', qty: '1' },
        { name: 'Tangdi Kebab', qty: '2' },
        { name: 'Mutton Biryani-Single', qty: '1' },
        { name: 'Paneer 65', qty: '2' },
      ]
    },
  ];

  const isDetailedReport = reportType === 'detailed';
  const displayedData = isDetailedReport ? detailedData : summaryData;

  // =========================================================
  // DYNAMIC WIDTH CALCULATIONS
  // =========================================================
  const tableWidth = isDetailedReport
    ? rS(70 + 80 + 90 + 80 + 120 + 80 + 10) // Detailed Total = 530
    : rS(70 + 80 + 90 + 120 + 100 + 10); // Summary Total = 470

  const averageRowHeight = isDetailedReport ? rV(120) : ROW_HEIGHT;
  const totalContentHeight = displayedData.length * averageRowHeight;
  const showVerticalScrollbar = totalContentHeight > tableHeight;

  const maxTableScrollOffset = Math.max(1, totalContentHeight - tableHeight);

  const VERTICAL_THUMB_HEIGHT = Math.min(
    tableHeight,
    Math.max(rV(24), (tableHeight / totalContentHeight) * tableHeight)
  );

  const VERTICAL_THUMB_TRAVEL = tableHeight - VERTICAL_THUMB_HEIGHT;

  // Horizontal Scrollbar Calculations
  const horizontalScrollContentWidth = tableWidth;
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

    console.log('KOT REPORT SEARCH', {
      userId,
      fromDate,
      toDate,
      reportType,
      page: 1,
    });
  }, [userId, fromDate, toDate, reportType, verticalScrollOffset]);

  // ✅ CLEAR / RESET button — now actually resets state
  const handleClear = useCallback(() => {
    setReportType(DEFAULT_FILTERS.reportType);
    setUserId(DEFAULT_FILTERS.userId);
    setFromDate(DEFAULT_FILTERS.fromDate);
    setToDate(DEFAULT_FILTERS.toDate);

    setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
    setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

    setCurrentPage(1);
    verticalScrollOffset.setValue(0);
    horizontalScrollOffset.setValue(0);

    console.log('KOT REPORT — FILTERS CLEARED');
  }, [verticalScrollOffset, horizontalScrollOffset]);

  // ✅ PAGE CHANGE — resets scroll to top
  const handlePageChange = useCallback(page => {
    setCurrentPage(page);
    verticalScrollOffset.setValue(0);
    console.log('KOT REPORT PAGE CHANGE ====>', page);
    // TODO: fetchKotReport(page);
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

  const exportKotReport = type => {
    const headers = isDetailedReport
      ? ['S.No', 'Date', 'User ID', 'KOT.No', 'Item Name', 'Quantity']
      : ['S.No', 'Date', 'User ID', 'KOT Count', 'KOT Cancelled'];

    const rows = displayedData.map(item => {
      if (isDetailedReport) {
        const items = item.items || [];

        return {
          'S.No': item.id,
          Date: item.date,
          'User ID': item.userId,
          'KOT.No': item.kotNo,
          'Item Name': items.map(subItem => subItem.name).join(' / '),
          Quantity: items.map(subItem => subItem.qty).join(' / '),
        };
      }

      return {
        'S.No': item.id,
        Date: item.date,
        'User ID': item.userId,
        'KOT Count': item.kotCount,
        'KOT Cancelled': item.kotCancelled,
      };
    });

    const fileName = `kot_report_${isDetailedReport ? 'detailed' : 'summary'}_${Date.now()}`;
    const reportTitle = isDetailedReport
      ? 'KOT Report - Detailed'
      : 'KOT Report - Summary';

    if (type === 'csv') {
      return exportToCSV(rows, headers, fileName, '', reportTitle);
    }

    return exportToPDF(rows, headers, fileName, reportTitle, '');
  };

  // =========================================================
  // TABLE RENDERING
  // =========================================================

  const renderTableHeader = () => {
    if (isDetailedReport) {
      return (
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
          <Text style={[styles.headerText, styles.colDate]}>Date</Text>
          <Text style={[styles.headerText, styles.colUserId]}>User ID</Text>
          <Text style={[styles.headerText, styles.colKotNo]}>KOT.No</Text>
          <Text style={[styles.headerText, styles.colItem]}>Item Name</Text>
          <Text style={[styles.headerText, styles.colQty]}>Quantity</Text>
        </View>
      );
    }

    return (
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
        <Text style={[styles.headerText, styles.colDate]}>Date</Text>
        <Text style={[styles.headerText, styles.colUserId]}>User ID</Text>
        <Text style={[styles.headerText, styles.colCount]}>KOT Count</Text>
        <Text style={[styles.headerText, styles.colCancelled]}>KOT Cancelled</Text>
      </View>
    );
  };

  const renderRow = ({ item }) => {
    if (isDetailedReport) {
      return (
        <View style={styles.tableRowDetailed}>
          <View style={[styles.colSno, styles.centerContent]}>
            <Text style={styles.rowText}>{item.id}</Text>
          </View>
          <View style={[styles.colDate, styles.centerContent]}>
            <Text style={styles.rowText}>{item.date}</Text>
          </View>
          <View style={[styles.colUserId, styles.centerContent]}>
            <Text style={styles.rowText}>{item.userId}</Text>
          </View>
          <View style={[styles.colKotNo, styles.centerContent]}>
            <Text style={styles.rowText}>{item.kotNo}</Text>
          </View>

          <View style={styles.colItem}>
            {item.items.map((subItem, index) => (
              <Text key={index} style={[styles.rowText, styles.itemText]}>{subItem.name}</Text>
            ))}
          </View>
          <View style={styles.colQty}>
            {item.items.map((subItem, index) => (
              <Text key={index} style={[styles.rowText, styles.itemText]}>{subItem.qty}</Text>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
        <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
        <Text style={[styles.rowText, styles.colUserId]}>{item.userId}</Text>
        <Text style={[styles.rowText, styles.colCount]}>{item.kotCount}</Text>
        <Text style={[styles.rowText, styles.colCancelled]}>{item.kotCancelled}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ReportHeader
        title="KOT REPORT"
        showReportType={true}
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        onExport={() => console.log('Export Report')}
        onExportCSV={() => exportKotReport('csv')}
        onExportPDF={() => exportKotReport('pdf')}
        onPrint={() => console.log('Print Report')}
        reportTypeOptions={[
          { label: 'Summary Report', value: 'summary' },
          { label: 'Detailed Report', value: 'detailed' },
        ]}
      />

      <View style={styles.contentCard}>
        <View style={styles.filtersContainer}>
          {/* FILTER ROW */}
          <View style={styles.filterRow}>
            <View style={styles.filterBox}>
              <Text style={styles.label}>
                User ID <Text style={styles.star}>*</Text>
              </Text>
              {renderDropdown(
                userId,
                setUserId,
                userOptions,
                'Select User ID'
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

          <ScrollView
            horizontal
            style={{ flex: 1 }}
            showsHorizontalScrollIndicator={false}
            onLayout={event => setTableViewportWidth(event.nativeEvent.layout.width)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: horizontalScrollOffset } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
            <View style={{ width: tableWidth, minWidth: '100%', flex: 1 }}>
              {renderTableHeader()}

              <Animated.FlatList
                data={displayedData}
                renderItem={renderRow}
                keyExtractor={item => String(item.id)}
                style={styles.tableList}
                onLayout={e => setListHeight(e.nativeEvent.layout.height)}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
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
          {tableWidth > tableViewportWidth && (
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

export default KOTReportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  contentCard: {
    flex: 1,
    marginHorizontal: rS(16),
    marginTop: rV(1),
    marginBottom: rV(5),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderTopWidth: 1,
    borderTopColor: '#F4F4F4',
    paddingHorizontal: rS(6),
    paddingTop: rV(12),
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
    marginBottom: rV(6),
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
    minHeight: rV(28),
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
  tableRowDetailed: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: ROW_HEIGHT,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rS(5),
    paddingVertical: rV(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F9F9F9',
  },
  centerContent: {
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    textAlign: 'left',
  },
  itemText: {
    marginBottom: rV(2),
  },
  headerText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
    textAlign: 'left',
  },
  colSno: { width: rS(70),paddingLeft:responsiveWidth(1) },
  colDate: { width: rS(80) },
  colUserId: { width: rS(90) },

  // Summary columns
  colCount: { width: rS(120) },
  colCancelled: { width: rS(100) },

  // Detailed columns
  colKotNo: { width: rS(80) },
  colItem: { width: rS(120) },
  colQty: { width: rS(80) },

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
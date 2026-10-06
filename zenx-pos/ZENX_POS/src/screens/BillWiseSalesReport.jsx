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

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
    itemCode: 'BR-213',
    variantCode: 'VR-213',
    itemName: 'Basmati Rice-5Kg',
    billNo: 'B231',
    fromDate: '23-04-2026',
    toDate: '23-03-2026',
};

const BillWiseSalesReport = () => {
    // Filters State
    const [itemCode, setItemCode] = useState(DEFAULT_FILTERS.itemCode);
    const [variantCode, setVariantCode] = useState(DEFAULT_FILTERS.variantCode);
    const [itemName, setItemName] = useState(DEFAULT_FILTERS.itemName);
    const [billNo, setBillNo] = useState(DEFAULT_FILTERS.billNo);

    // Date State
    const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
    const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    const [tempFromDate, setTempFromDate] = useState(new Date(2026, 3, 23));
    const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

    // ✅ PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(4);

    const verticalScrollOffset = useRef(new Animated.Value(0)).current;

    // Dropdown Options
    const variantOptions = [
        { label: 'VR-213', value: 'VR-213' },
        { label: 'VR-214', value: 'VR-214' },
        { label: 'VR-215', value: 'VR-215' },
    ];

    // Table Data matching the screenshot exactly (5 identical rows)
    const detailedData = Array.from({ length: 5 }, (_, index) => ({
        id: index + 1,
        billNo: 'B231',
        date: '23-03-2026',
        itemCode: 'BR-213',
        variantCode: 'VR-213',
        itemName: 'Basmati Rice-5Kg',
        unitPrice: '₹200',
        qty: '5',
        qtyRefund: '1',
        discount: '3%',
        gst: '5%',
        gstAmnt: '₹200',
        paymentMode: 'Cash',
        totalAmount: '₹1500',
    }));

    // Totals (used in both UI and export)
    const TOTAL_QTY = '432';
    const TOTAL_QTY_REFUND = '3427';
    const TOTAL_DISCOUNT = '1456.98';
    const TOTAL_AMOUNT = '₹20000.98';

    // Dynamic Table Height Tracking
    const [tableHeight, setTableHeight] = useState(rV(260));
    const ROW_HEIGHT = rV(35);
    const HEADER_HEIGHT = rV(29);
    const TOTAL_ROW_HEIGHT = rV(40);

    const totalContentHeight = detailedData.length * ROW_HEIGHT;
    const maxTableScrollOffset = Math.max(1, totalContentHeight - tableHeight);
    const VERTICAL_THUMB_HEIGHT = Math.max(rV(40), (tableHeight / totalContentHeight) * tableHeight);
    const VERTICAL_THUMB_TRAVEL = tableHeight - VERTICAL_THUMB_HEIGHT;

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

        console.log('BILLWISE SALES REPORT SEARCH', {
            itemCode, variantCode, itemName, billNo, fromDate, toDate, page: 1,
        });
    };

    // ✅ CLEAR / RESET button
    const handleClear = useCallback(() => {
        setItemCode(DEFAULT_FILTERS.itemCode);
        setVariantCode(DEFAULT_FILTERS.variantCode);
        setItemName(DEFAULT_FILTERS.itemName);
        setBillNo(DEFAULT_FILTERS.billNo);
        setFromDate(DEFAULT_FILTERS.fromDate);
        setToDate(DEFAULT_FILTERS.toDate);

        setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
        setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

        setCurrentPage(1);

        console.log('BILLWISE SALES REPORT — FILTERS CLEARED');
    }, []);

    // ✅ PAGE CHANGE
    const handlePageChange = useCallback(page => {
        setCurrentPage(page);
        verticalScrollOffset.setValue(0);
        console.log('BILLWISE SALES PAGE CHANGE ====>', page);
        // TODO: fetchBillWiseReport(page);
    }, [verticalScrollOffset]);

    // =========================================================
    // EXPORT (CSV / PDF) — WITH TOTAL ROW
    // =========================================================
    const exportBillWiseReport = (type) => {
        const headers = [
            'S.No', 'Bill.No', 'Date', 'Item Code', 'Variant Code',
            'Item Name', 'Qty', 'Qty Refund', 'Discount', 'GST',
            'Payment Mode', 'Total Amount',
        ];

        // ---- Detail rows ----
        const detailRows = detailedData.map(item => ({
            'S.No': item.id,
            'Bill.No': item.billNo,
            'Date': item.date,
            'Item Code': item.itemCode,
            'Variant Code': item.variantCode,
            'Item Name': item.itemName,
            'Qty': item.qty,
            'Qty Refund': item.qtyRefund,
            'Discount': item.discount,
            'GST': item.gst,
            'Payment Mode': item.paymentMode,
            'Total Amount': item.totalAmount,
        }));

        // ---- ✅ TOTAL row (so it appears in CSV/PDF) ----
        const totalRow = {
            'S.No': '',
            'Bill.No': '',
            'Date': '',
            'Item Code': '',
            'Variant Code': '',
            'Item Name': '',
            'Qty': TOTAL_QTY,
            'Qty Refund': TOTAL_QTY_REFUND,
            'Discount': TOTAL_DISCOUNT,
            'GST': '',
            'Payment Mode': '',
            'Total Amount': TOTAL_AMOUNT,
        };

        const rows = [...detailRows, totalRow];

        const fileName = `billwise_sales_report_${Date.now()}`;

        if (type === 'csv') {
            return exportToCSV(rows, headers, fileName, 'Billwise Sales Report', 'Billwise Sales Report');
        }
        return exportToPDF(rows, headers, fileName, 'Billwise Sales Report', 'Billwise Sales Report');
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
            <Text style={[styles.headerText, styles.colBillNo]}>Bill.No</Text>
            <Text style={[styles.headerText, styles.colDate]}>Date</Text>
            <Text style={[styles.headerText, styles.colItemCode]}>Item Code</Text>
            <Text style={[styles.headerText, styles.colVariantCode]}>Variant Code</Text>
            <Text style={[styles.headerText, styles.colItemName]}>Item Name</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colQtyRefund]}>Qty Refund</Text>
            <Text style={[styles.headerText, styles.colDiscount]}>Discount</Text>
            <Text style={[styles.headerText, styles.colGst]}>GST</Text>
            <Text style={[styles.headerText, styles.colPaymentMode]}>Payment Mode</Text>
            <Text style={[styles.headerText, styles.colTotalAmount]}>Total Amount</Text>
        </View>
    );

    const renderDetailedRow = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
            <Text style={[styles.rowText, styles.colBillNo]}>{item.billNo}</Text>
            <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
            <Text style={[styles.rowText, styles.colItemCode]}>{item.itemCode}</Text>
            <Text style={[styles.rowText, styles.colVariantCode]}>{item.variantCode}</Text>

            {/* Item Name Column with Sub-Text */}
            <View style={styles.colItemName}>
                <Text style={styles.rowText}>{item.itemName}</Text>
                <Text style={styles.subText}>Unit Price: {item.unitPrice}</Text>
            </View>

            <Text style={[styles.rowText, styles.colQty]}>{item.qty}</Text>
            <Text style={[styles.rowText, styles.colQtyRefund]}>{item.qtyRefund}</Text>
            <Text style={[styles.rowText, styles.colDiscount]}>{item.discount}</Text>

            {/* GST Column with Sub-Text */}
            <View style={styles.colGst}>
                <Text style={styles.rowText}>{item.gst}</Text>
                <Text style={styles.subText}>Amnt: {item.gstAmnt}</Text>
            </View>

            <Text style={[styles.rowText, styles.colPaymentMode]}>{item.paymentMode}</Text>
            <Text style={[styles.rowText, styles.colTotalAmount]}>{item.totalAmount}</Text>
        </View>
    );

    const renderTotalRow = () => (
        <View style={styles.totalRow}>
            <View style={styles.colSno} />
            <View style={styles.colBillNo} />
            <View style={styles.colDate} />
            <View style={styles.colItemCode} />
            <View style={styles.colVariantCode} />
            <View style={styles.colItemName} />

            {/* Align values with screenshot total row */}
            <Text style={[styles.totalText, styles.colQty]}>{TOTAL_QTY}</Text>
            <Text style={[styles.totalText, styles.colQtyRefund]}>{TOTAL_QTY_REFUND}</Text>
            <Text style={[styles.totalText, styles.colDiscount]}>{TOTAL_DISCOUNT}</Text>
            <View style={styles.colGst} />
            <View style={styles.colPaymentMode} />
            <Text style={[styles.totalText, styles.colTotalAmount]}>{TOTAL_AMOUNT}</Text>
        </View>
    );

    const tableWidth = rMS(1300);

    return (
        <SafeAreaView style={styles.container}>
            <ReportHeader
                showReportType={false}
                reportType="detailed"
                onReportTypeChange={() => { }}
                onExport={() => console.log('Export Report')}
                onExportCSV={() => exportBillWiseReport('csv')}
                onExportPDF={() => exportBillWiseReport('pdf')}
                onPrint={() => console.log('Print Report')}
                title="BILLWISE SALES REPORT"
            />

            <View style={styles.contentCard}>
                <View style={styles.filtersContainer}>
                    {/* ROW 1 */}
                    <View style={styles.filterRow}>
                        <View style={[styles.filterBox, styles.flex1]}>
                            <Text style={styles.label}>Item Code <Text style={styles.star}>*</Text></Text>
                            <View style={styles.input}>
                                <TextInput
                                    style={styles.inputText}
                                    value={itemCode}
                                    onChangeText={setItemCode}
                                    placeholder="Enter Item Code"
                                    placeholderTextColor="#999999"
                                />
                            </View>
                        </View>
                        <View style={[styles.filterBox, styles.flex1]}>
                            <Text style={styles.label}>Variant Code <Text style={styles.star}>*</Text></Text>
                            {renderDropdown(variantCode, setVariantCode, variantOptions, 'Select Variant')}
                        </View>
                        <View style={[styles.filterBox, styles.flex1]}>
                            <Text style={styles.label}>Item Name</Text>
                            <View style={styles.input}>
                                <TextInput
                                    style={styles.inputText}
                                    value={itemName}
                                    onChangeText={setItemName}
                                    placeholder="Enter Item Name"
                                    placeholderTextColor="#999999"
                                />
                            </View>
                        </View>
                        <View style={[styles.filterBox, styles.flex1]}>
                            <Text style={styles.label}>Bill.No</Text>
                            <View style={styles.input}>
                                <TextInput
                                    style={styles.inputText}
                                    value={billNo}
                                    onChangeText={setBillNo}
                                    placeholder="Enter Bill No"
                                    placeholderTextColor="#999999"
                                />
                            </View>
                        </View>
                    </View>

                    {/* ROW 2 */}
                    <View style={[styles.filterRow, styles.filterRowLast]}>
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
                        <View style={[styles.filterBox, styles.searchBox]}>
                            <TouchableOpacity activeOpacity={0.8} style={styles.searchButton} onPress={handleSearch}>
                                <Text style={styles.searchText}>Search</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.filterBox, styles.searchBox]}>
                            <TouchableOpacity activeOpacity={0.8} style={styles.clearIconBtn} onPress={handleClear}>
                                <Text style={styles.clearIcon}>↻</Text>
                            </TouchableOpacity>
                        </View>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} persistentScrollbar={true} contentContainerStyle={{ minWidth: "100%" }}>
                        <View style={{ width: "100%", flex: 1 }}>
                            {renderTableHeader()}

                            <View style={{ flex: 1, flexDirection: 'row' }}>
                                <Animated.FlatList
                                    data={detailedData}
                                    keyExtractor={(item) => String(item.id)}
                                    renderItem={renderDetailedRow}
                                    style={styles.tableList}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                    removeClippedSubviews={false}
                                    onLayout={(e) => setTableHeight(e.nativeEvent.layout.height)}
                                    onScroll={Animated.event(
                                        [{ nativeEvent: { contentOffset: { y: verticalScrollOffset } } }],
                                        { useNativeDriver: true }
                                    )}
                                    scrollEventThrottle={16}
                                />

                                {/* Custom Vertical Scrollbar */}
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

                            {renderTotalRow()}
                        </View>
                    </ScrollView>
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

export default BillWiseSalesReport;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    contentCard: {
        flex: 1,
        marginHorizontal: rMS(16),
        marginBottom: rV(3),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: rMS(9),
        paddingTop: rV(10),
        borderTopWidth: 1,
        borderTopColor: '#F4F4F4',
    },
    filtersContainer: {
        width: '100%',
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rMS(6),
        marginBottom: rV(4),   // 🔧 reduced from rV(10) → fixes top gap
    },
    filterRowLast: {
        marginBottom: rV(3),   // 🔧 tighter gap before table
    },
    filterBox: {
        minWidth: 0,
    },
    flex1: {
        flex: 1,
    },
    searchBox: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        marginBottom: rV(4),
        color: '#000000',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
    },
    star: {
        color: '#E71414',
    },
    input: {
        height: rV(26),
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
        height: rV(26),
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
    searchButton: {
        width: rMS(160),
        height: rV(26),
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
    clearIconBtn: {
        width: rS(30),
        height: rV(26),
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
    tableContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        overflow: 'hidden',
        position: 'relative',


        marginTop: rV(4),           // 🔧 removed marginTop to fix top gap
    },
    tableList: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EEF9FF',
        minHeight: rV(23),
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
        minHeight: rV(35),
        paddingHorizontal: rMS(3),
    },
    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        textAlign: 'center',
        fontWeight: "400",
        flexShrink: 0,
    },
    subText: {
        fontSize: 12,
        color: '#888888',
        fontFamily: Fonts.FigtreeRegular,
        textAlign: 'center',
        marginTop: rV(2),
    },
    // Column Widths for Billwise Sales Report (12 Columns)
    colSno: { width: rMS(50) },
    colBillNo: { width: rMS(70) },
    colDate: { width: rMS(100) },
    colItemCode: { width: rMS(90) },
    colVariantCode: { width: rMS(90) },
    colItemName: { width: rMS(160) },
    colQty: { width: rMS(70) },
    colQtyRefund: { width: rMS(100) },
    colDiscount: { width: rMS(90) },
    colGst: { width: rMS(100) },
    colPaymentMode: { width: rMS(120) },
    colTotalAmount: { width: rMS(120) },

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
        width: rMS(4),
        backgroundColor: 'transparent',
        borderRadius: rMS(2),
        overflow: 'hidden',
        marginRight: rMS(2),
        marginVertical: rV(4),
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
});
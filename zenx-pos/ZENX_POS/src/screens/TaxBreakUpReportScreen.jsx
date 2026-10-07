import React, { useState, useCallback } from 'react';
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

import ReportHeader from '../components/ReportHeader';
import Pagination from '../components/Pagination';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import CalenderIcon from '../assets/Icons/CalenderIcon';
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';
import {
    exportToCSV,
    exportToPDF,
} from '../utils/exportUtils';

const ROW_HEIGHT = rV(40);
const HEADER_HEIGHT = rV(25);
const MAX_TABLE_BODY_HEIGHT = rV(200);

// Column widths (%) — Summary (8 cols)
const SUMMARY_COLS = {
    sno: '7%',
    date: '14%',
    gst5Sales: '13%',
    salesTax5: '12%',
    gst12Sales: '13%',
    salesTax12: '12%',
    basicValue: '14%',
    totalAmount: '15%',
};

// Column widths (%) — Detailed (10 cols)
const DETAILED_COLS = {
    sno: '6%',
    date: '10%',
    billNo: '9%',
    billAmount: '10%',
    gst5Sales: '11%',
    salesTax5: '10%',
    gst12Sales: '11%',
    salesTax12: '10%',
    basicValue: '11%',
    totalAmount: '12%',
};

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
    fromDate: '23-04-2026',
    toDate: '23-03-2026',
    reportType: 'summary',
    gstRegister: true,
};

// =========================================================
// DASHED LINE
// =========================================================
const DashedLine = () => <View style={styles.dashedLine} />;

// =========================================================
// SCREEN
// =========================================================
const TaxBreakUpReportScreen = () => {
    // ---------------- STATE ----------------
    const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
    const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
    const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType); // 'summary' | 'detailed'
    const [gstRegister, setGstRegister] = useState(DEFAULT_FILTERS.gstRegister);

    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    const [tempFromDate, setTempFromDate] = useState(new Date(2026, 3, 23));
    const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

    // ✅ PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(4);

    // ---------------- DATA ----------------
    const summaryData = [
        { id: 1, date: '23-03-2026', gst5Sales: 'Ramesh', salesTax5: 'Stock', gst12Sales: 'Ramesh', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 2, date: '23-03-2026', gst5Sales: 'Pavani', salesTax5: 'Products', gst12Sales: 'Pavani', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 3, date: '23-03-2026', gst5Sales: 'Alex', salesTax5: 'Products', gst12Sales: 'Alex', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 4, date: '23-03-2026', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 5, date: '23-03-2026', gst5Sales: 'Alex', salesTax5: 'Products', gst12Sales: 'Alex', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 6, date: '23-03-2026', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 7, date: '23-03-2026', gst5Sales: 'Alex', salesTax5: 'Products', gst12Sales: 'Alex', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 8, date: '23-03-2026', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 9, date: '23-03-2026', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 10, date: '23-03-2026', gst5Sales: 'Alex', salesTax5: 'Products', gst12Sales: 'Alex', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 11, date: '23-03-2026', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
    ];

    const detailedData = [
        { id: 1, date: '23-03-2026', billNo: '2:00 PM', billAmount: 'Creation', gst5Sales: 'Ramesh', salesTax5: 'Stock', gst12Sales: 'Ramesh', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 2, date: '23-03-2026', billNo: '2:07 PM', billAmount: 'Creation', gst5Sales: 'Pavani', salesTax5: 'Products', gst12Sales: 'Pavani', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 3, date: '23-03-2026', billNo: '2:14 PM', billAmount: 'Creation', gst5Sales: 'Alex', salesTax5: 'Products', gst12Sales: 'Alex', salesTax12: 'Products', basicValue: 'Products', totalAmount: 'Products' },
        { id: 4, date: '23-03-2026', billNo: '2:30 PM', billAmount: 'Creation', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 5, date: '23-03-2026', billNo: '2:30 PM', billAmount: 'Creation', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 6, date: '23-03-2026', billNo: '2:30 PM', billAmount: 'Creation', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 7, date: '23-03-2026', billNo: '2:30 PM', billAmount: 'Creation', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
        { id: 8, date: '23-03-2026', billNo: '2:30 PM', billAmount: 'Creation', gst5Sales: 'Jayasree', salesTax5: 'Stock', gst12Sales: 'Jayasree', salesTax12: 'Stock', basicValue: 'Stock', totalAmount: 'Stock' },
    ];

    const TOTAL_COUNT = '432';
    const TOTAL_AMOUNT = '₹20000.98';

    const isDetailed = reportType === 'detailed';
    const displayedData = isDetailed ? detailedData : summaryData;
    const cols = isDetailed ? DETAILED_COLS : SUMMARY_COLS;

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
            if (selectedDate) setFromDate(formatDate(selectedDate));
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

        console.log('TAX BREAKUP REPORT SEARCH', {
            fromDate,
            toDate,
            reportType,
            gstRegister,
            page: 1,
        });
    };

    // ✅ CLEAR / RESET button
    const handleClear = useCallback(() => {
        setFromDate(DEFAULT_FILTERS.fromDate);
        setToDate(DEFAULT_FILTERS.toDate);
        setReportType(DEFAULT_FILTERS.reportType);
        setGstRegister(DEFAULT_FILTERS.gstRegister);

        setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
        setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

        setCurrentPage(1);

        console.log('TAX BREAKUP REPORT — FILTERS CLEARED');
    }, []);

    // ✅ PAGE CHANGE
    const handlePageChange = useCallback(page => {
        setCurrentPage(page);
        console.log('TAX BREAKUP PAGE CHANGE ====>', page);
        // TODO: fetchTaxBreakupReport(page);
    }, []);

    // ✅ REPORT TYPE CHANGE (Summary ↔ Detailed)
    const handleReportTypeChange = useCallback(type => {
        setReportType(type);
        setCurrentPage(1);
    }, []);

    // ✅ GST REGISTER TOGGLE
    const handleGstRegisterToggle = useCallback(() => {
        setGstRegister(prev => !prev);
        setCurrentPage(1);
    }, []);

    // =========================================================
    // EXPORT (CSV / PDF) — WITH TOTAL ROW
    // =========================================================
    const exportTaxBreakupReport = type => {
        const headers = isDetailed
            ? [
                'S.No',
                'Date',
                'Bill.No',
                'Bill Amount',
                'GST 5% Sales',
                'Sales Tax 5%',
                'GST 12% Sales',
                'Sales Tax 12%',
                'Basic Value',
                'Total Amount',
            ]
            : [
                'S.No',
                'Date',
                'GST 5% Sales',
                'Sales Tax 5%',
                'GST 12% Sales',
                'Sales Tax 12%',
                'Basic Value',
                'Total Amount',
            ];

        // ---- Detail rows ----
        const detailRows = displayedData.map(item => {
            const row = {
                'S.No': item.id,
                Date: item.date,
                'GST 5% Sales': item.gst5Sales,
                'Sales Tax 5%': item.salesTax5,
                'GST 12% Sales': item.gst12Sales,
                'Sales Tax 12%': item.salesTax12,
                'Basic Value': item.basicValue,
                'Total Amount': item.totalAmount,
            };

            if (isDetailed) {
                row['Bill.No'] = item.billNo;
                row['Bill Amount'] = item.billAmount;
            }

            return row;
        });

        // ---- ✅ TOTAL row (so it appears in CSV/PDF) ----
        const totalRow = isDetailed
            ? {
                'S.No': '',
                Date: TOTAL_COUNT,          // count under "Date" (matches UI)
                'Bill.No': '',
                'Bill Amount': '',
                'GST 5% Sales': '',
                'Sales Tax 5%': '',
                'GST 12% Sales': '',
                'Sales Tax 12%': '',
                'Basic Value': '',
                'Total Amount': TOTAL_AMOUNT,
            }
            : {
                'S.No': '',
                Date: '',
                'GST 5% Sales': '',
                'Sales Tax 5%': '',
                'GST 12% Sales': '',
                'Sales Tax 12%': '',
                'Basic Value': '',
                'Total Amount': TOTAL_AMOUNT,
            };

        const rows = [...detailRows, totalRow];

        const fileName = `tax_breakup_report_${isDetailed ? 'detailed' : 'summary'}_${Date.now()}`;
        const reportTitle = isDetailed
            ? 'Tax Breakup Report - Detailed'
            : 'Tax Breakup Report - Summary';

        if (type === 'csv') {
            return exportToCSV(rows, headers, fileName, '', reportTitle);
        }

        return exportToPDF(rows, headers, fileName, reportTitle, '');
    };

    // ---------------- HEADER CELLS ----------------
    const renderHeaderCells = () => (
        <>
            <Text style={[styles.headerText, { width: cols.sno }]}>S.No</Text>
            <Text style={[styles.headerText, { width: cols.date }]}>Date</Text>

            {isDetailed && (
                <>
                    <Text style={[styles.headerText, { width: cols.billNo }]}>
                        Bill.No
                    </Text>
                    <Text style={[styles.headerText, { width: cols.billAmount }]}>
                        Bill Amount
                    </Text>
                </>
            )}

            <Text style={[styles.headerText, { width: cols.gst5Sales }]}>
                GST 5% Sales
            </Text>
            <Text style={[styles.headerText, { width: cols.salesTax5 }]}>
                Sales Tax 5%
            </Text>
            <Text style={[styles.headerText, { width: cols.gst12Sales }]}>
                GST 12% Sales
            </Text>
            <Text style={[styles.headerText, { width: cols.salesTax12 }]}>
                Sales Tax 12%
            </Text>
            <Text style={[styles.headerText, { width: cols.basicValue }]}>
                Basic Value
            </Text>
            <Text style={[styles.headerText, { width: cols.totalAmount }]}>
                Total Amount
            </Text>
        </>
    );

    // ---------------- BODY ROW ----------------
    const renderRow = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.rowText, { width: cols.sno }]}>{item.id}</Text>
            <Text style={[styles.rowText, { width: cols.date }]}>
                {item.date}
            </Text>

            {isDetailed && (
                <>
                    <Text style={[styles.rowText, { width: cols.billNo }]}>
                        {item.billNo}
                    </Text>
                    <Text style={[styles.rowText, { width: cols.billAmount }]}>
                        {item.billAmount}
                    </Text>
                </>
            )}

            <Text style={[styles.rowText, { width: cols.gst5Sales }]}>
                {item.gst5Sales}
            </Text>
            <Text style={[styles.rowText, { width: cols.salesTax5 }]}>
                {item.salesTax5}
            </Text>
            <Text style={[styles.rowText, { width: cols.gst12Sales }]}>
                {item.gst12Sales}
            </Text>
            <Text style={[styles.rowText, { width: cols.salesTax12 }]}>
                {item.salesTax12}
            </Text>
            <Text style={[styles.rowText, { width: cols.basicValue }]}>
                {item.basicValue}
            </Text>
            <Text style={[styles.rowText, { width: cols.totalAmount }]}>
                {item.totalAmount}
            </Text>
        </View>
    );

    // ---------------- RENDER ----------------
    return (
        <SafeAreaView style={styles.container}>
            {/* ================= SHARED REPORT HEADER ================= */}
            <ReportHeader
                title="TAX BREAKUP REPORT"
                showReportType={true}
                reportType={reportType}
                onReportTypeChange={handleReportTypeChange}
                onExport={() => console.log('Export')}
                onExportCSV={() => exportTaxBreakupReport('csv')}
                onExportPDF={() => exportTaxBreakupReport('pdf')}
                onPrint={() => console.log('Print Report')}
            />

            {/* ================= CONTENT CARD ================= */}
            <View style={styles.contentCard}>
                {/* ---------- FILTER ROW ---------- */}
                <View style={styles.filterRow}>
                    {/* From Date */}
                    <View style={styles.dateBox}>
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

                    {/* To Date */}
                    <View style={styles.dateBox}>
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

                    {/* Search */}
                    <View style={styles.searchBox}>
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
                    <View style={styles.dateBox}></View>
                </View>

                <View>
                    <View style={styles.gstRegisterBox}>
                        <TouchableOpacity
                            style={styles.checkboxRow}
                            activeOpacity={0.8}
                            onPressIn={handleGstRegisterToggle}
                            hitSlop={8}>
                            <View style={styles.checkboxIcon}>
                                {gstRegister ? <CheckIcon /> : <UnCheckIcon />}
                            </View>
                            <Text style={styles.checkboxText}>
                                GST Register
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ---------- DATE PICKERS ---------- */}
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

                <Modal
                    visible={Platform.OS === 'ios' && showFromDatePicker}
                    transparent
                    animationType="slide">
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerSheet}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity
                                    onPress={() => setShowFromDatePicker(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        setFromDate(formatDate(tempFromDate));
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
                                <TouchableOpacity
                                    onPress={() => setShowToDatePicker(false)}>
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

                {/* ---------- TABLE ---------- */}
                <View
                    style={[
                        styles.tableContainer,
                        styles.tableContainerFlexible,
                    ]}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                        {renderHeaderCells()}
                    </View>

                    {/* Body scrolls while header and total remain fixed. */}
                    <FlatList
                        key={`tax-${reportType}`}
                        data={displayedData}
                        renderItem={renderRow}
                        keyExtractor={item => String(item.id)}
                        style={[
                            styles.tableList,
                            {
                                height: Math.min(
                                    displayedData.length * ROW_HEIGHT,
                                    MAX_TABLE_BODY_HEIGHT,
                                ),
                            },
                        ]}
                        showsVerticalScrollIndicator
                        persistentScrollbar
                        nestedScrollEnabled
                    />

                    {/* Total row */}
                    <View style={styles.totalWrapper}>
                        <DashedLine />
                        <View style={styles.totalRow}>
                            {isDetailed ? (
                                <>
                                    <Text style={styles.totalText}>
                                        {TOTAL_COUNT}
                                    </Text>
                                    <Text style={styles.totalText}>
                                        {TOTAL_AMOUNT}
                                    </Text>
                                </>
                            ) : (
                                <Text
                                    style={[
                                        styles.totalText,
                                        { marginLeft: 'auto' },
                                    ]}>
                                    {TOTAL_AMOUNT}
                                </Text>
                            )}
                        </View>
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

export default TaxBreakUpReportScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    contentCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F4F4F4',
        paddingHorizontal: rS(14),
        paddingTop: rV(14),
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 10,
    },

    dateBox: {
        flex: 1,
        minWidth: 0,
    },

    searchBox: {
        width: rS(120),
    },

    gstRegisterBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 'auto',
        paddingBottom: rV(6),
        paddingTop: rV(5),
    },

    label: {
        fontSize: 13,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        marginBottom: rV(5),
    },

    star: {
        color: '#E71414',
    },

    input: {
        height: rV(30),
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 6,
        paddingHorizontal: rS(10),
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    inputText: {
        flex: 1,
        fontSize: 13,
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeRegular,
        paddingVertical: 0,
    },

    searchButton: {
        height: rV(30),
        backgroundColor: '#264B79',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 13,
        fontWeight: '500',
    },

    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    checkboxIcon: {
        marginRight: rS(5),
    },

    checkboxText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
    },

    // =========================================================
    // TABLE
    // =========================================================
    tableContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E4',
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative',
    },

    tableContainerFlexible: {
        alignSelf: 'flex-start',
    },

    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF9FF',
        height: HEADER_HEIGHT,
        paddingHorizontal: rS(10),
    },

    headerText: {
        fontSize: 14,
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
        textAlign: 'left',
    },

    tableList: {
        flexGrow: 0,
        maxHeight: MAX_TABLE_BODY_HEIGHT,
    },

    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        height: ROW_HEIGHT,
        paddingHorizontal: rS(10),
        backgroundColor: '#FFFFFF',
    },

    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
        textAlign: 'left',
    },

    // =========================================================
    // TOTAL
    // =========================================================
    totalWrapper: {
        backgroundColor: '#FFFFFF',
        paddingBottom: rV(10),
    },

    dashedLine: {
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#B0B0B0',
        marginHorizontal: rS(10),
        marginTop: rV(6),
    },

    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: rS(24),
        paddingTop: rV(8),
    },

    totalText: {
        fontSize: 13,
        color: '#000000',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
    },

    // =========================================================
    // ✅ PAGINATION
    // =========================================================
    paginationSection: {
        paddingTop: rV(2),
        paddingBottom: rV(3),
        alignItems: 'center',
    },

    // =========================================================
    // SCROLLBAR
    // =========================================================
    tableScrollbarTrack: {
        position: 'absolute',
        top: HEADER_HEIGHT,
        right: rS(6),
        width: rS(3),
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: rS(3),
        overflow: 'hidden',
    },
    tableScrollbarThumb: {
        width: '100%',
        backgroundColor: 'rgba(0,0,0,0.50)',
        borderRadius: rS(3),
    },

    // =========================================================
    // IOS PICKER
    // =========================================================
    pickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.40)',
    },
    pickerSheet: {
        backgroundColor: '#FFFFFF',
        paddingBottom: rV(30),
    },
    pickerHeader: {
        flexDirection: 'row',
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
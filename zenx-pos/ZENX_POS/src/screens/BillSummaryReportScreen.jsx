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
import { Dropdown } from 'react-native-element-dropdown';
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
import { responsiveWidth } from 'react-native-responsive-dimensions';

// =========================================================
// COLUMN WIDTHS (percent of table width)
// =========================================================
const COLS_WITH_SM = {
    sno: '15%',
    billNo: '19%',
    billAmount: '18%',
    paymentMode: '20%',
    amount: '17%',
    smCode: '11%',
};

const COLS_NO_SM = {
    sno: '15%',
    billNo: '21%',
    billAmount: '20%',
    paymentMode: '23%',
    amount: '21%',
};

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
    fromDate: '23-04-2026',
    toDate: '23-04-2026',
    paymentMode: 'Cash',
    userId: 'Ramesh',
    showSMCode: true,
};

const BillSummaryReportScreen = () => {
    // =========================================================
    // STATE
    // =========================================================
    const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
    const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
    const [paymentMode, setPaymentMode] = useState(DEFAULT_FILTERS.paymentMode);
    const [userId, setUserId] = useState(DEFAULT_FILTERS.userId);
    const [showSMCode, setShowSMCode] = useState(DEFAULT_FILTERS.showSMCode);

    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    const [tempFromDate, setTempFromDate] = useState(new Date(2026, 3, 23));
    const [tempToDate, setTempToDate] = useState(new Date(2026, 3, 23));

    // ✅ PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(4);

    // =========================================================
    // OPTIONS
    // =========================================================
    const paymentModeOptions = [
        { label: 'Cash', value: 'Cash' },
        { label: 'UPI', value: 'UPI' },
        { label: 'Card', value: 'Card' },
        { label: 'Net Banking', value: 'Net Banking' },
        { label: 'Cheque', value: 'Cheque' },
    ];

    const userOptions = [
        { label: 'Ramesh', value: 'Ramesh' },
        { label: 'Suresh', value: 'Suresh' },
        { label: 'Mahesh', value: 'Mahesh' },
    ];
    const tableData = [
        { id: 1, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Cash', amount: '₹200' }, { mode: 'UPI', amount: '₹800' }], smCode: 'SM23' },
        { id: 2, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 3, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'UPI', amount: '₹1000' }], smCode: 'SM23' },
        { id: 4, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 5, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 6, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 7, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 8, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
        { id: 9, billNo: '23-03-2026', billAmount: '₹1000', payments: [{ mode: 'Card', amount: '₹1000' }], smCode: 'SM23' },
    ];

    const TOTAL_COUNT = '432';
    const TOTAL_AMOUNT = '₹20000.98';

    const cols = showSMCode ? COLS_WITH_SM : COLS_NO_SM;

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

    // =========================================================
    // ACTIONS
    // =========================================================

    const handleSearch = () => {
        setCurrentPage(1);   // ✅ reset pagination on search

        console.log('BILL SUMMARY REPORT SEARCH', {
            fromDate, toDate, paymentMode, userId, showSMCode, page: 1,
        });
    };

    // ✅ CLEAR / RESET button
    const handleClear = useCallback(() => {
        setFromDate(DEFAULT_FILTERS.fromDate);
        setToDate(DEFAULT_FILTERS.toDate);
        setPaymentMode(DEFAULT_FILTERS.paymentMode);
        setUserId(DEFAULT_FILTERS.userId);
        setShowSMCode(DEFAULT_FILTERS.showSMCode);

        setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
        setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

        setCurrentPage(1);

        console.log('BILL SUMMARY REPORT — FILTERS CLEARED');
    }, []);

    // ✅ PAGE CHANGE
    const handlePageChange = useCallback(page => {
        setCurrentPage(page);
        console.log('BILL SUMMARY PAGE CHANGE ====>', page);
        // TODO: fetchBillSummaryReport(page);
    }, []);

    // ✅ SM CODE TOGGLE — resets pagination
    const handleSMCodeToggle = useCallback(() => {
        setShowSMCode(prev => !prev);
        setCurrentPage(1);
    }, []);

    // =========================================================
    // EXPORT (CSV / PDF) — WITH TOTAL ROW
    // =========================================================
    const exportBillSummaryReport = type => {
        const headers = [
            'S.No',
            'Bill No',
            'Bill Amount',
            'Payment Mode',
            'Payment Amount',
            ...(showSMCode ? ['Salesman Code'] : []),
        ];

        // ---- Detail rows ----
        const detailRows = tableData.map(item => {
            const row = {
                'S.No': item.id,
                'Bill No': item.billNo,
                'Bill Amount': item.billAmount,
                'Payment Mode': item.payments
                    .map(payment => payment.mode)
                    .join(' / '),
                'Payment Amount': item.payments
                    .map(payment => payment.amount)
                    .join(' / '),
            };

            if (showSMCode) {
                row['Salesman Code'] = item.smCode;
            }

            return row;
        });

        // ---- ✅ TOTAL row (so it appears in CSV/PDF) ----
        const totalRow = {
            'S.No': '',
            'Bill No': TOTAL_COUNT,        // count goes under "Bill No" (matches UI)
            'Bill Amount': '',
            'Payment Mode': '',
            'Payment Amount': TOTAL_AMOUNT,
        };

        if (showSMCode) {
            totalRow['Salesman Code'] = '';
        }

        const rows = [...detailRows, totalRow];

        const fileName = `bill_summary_report_${Date.now()}`;
        const reportTitle = 'Bill Summary Report';

        if (type === 'csv') {
            return exportToCSV(rows, headers, fileName, '', reportTitle);
        }

        return exportToPDF(rows, headers, fileName, reportTitle, '');
    };

    const renderDropdown = (value, setValue, data, placeholder) => (
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

    // =========================================================
    // RENDER ROW
    // =========================================================
    const renderRow = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.rowText, { width: cols.sno }]}>
                {item.id}
            </Text>
            <Text style={[styles.rowText, { width: cols.billNo }]}>
                {item.billNo}
            </Text>
            <Text style={[styles.rowText, { width: cols.billAmount }]}>
                {item.billAmount}
            </Text>
            <View style={{ width: cols.paymentMode }}>
                {item.payments.map((p, i) => (
                    <Text key={`mode-${i}`} style={styles.rowText}>
                        {p.mode}
                    </Text>
                ))}
            </View>
            <View style={{ width: cols.amount }}>
                {item.payments.map((p, i) => (
                    <Text key={`amt-${i}`} style={styles.rowText}>
                        {p.amount}
                    </Text>
                ))}
            </View>
            {showSMCode && (
                <Text style={[styles.rowText, { width: cols.smCode }]}>
                    {item.smCode}
                </Text>
            )}
        </View>
    );

    // =========================================================
    // RENDER TOTAL ROW (OUTSIDE SCROLL AREA)
    // =========================================================
    const renderTotalRow = () => (
        <>
            <View style={styles.dashedLine} />
            <View style={styles.totalRow}>
                <View style={{ width: cols.sno }} />
                <Text style={[styles.totalText, { width: cols.billNo }]}>
                    {TOTAL_COUNT}
                </Text>
                <View style={{ width: cols.billAmount }} />
                <View style={{ width: cols.paymentMode }} />
                <Text style={[styles.totalText, { width: cols.amount }]}>
                    {TOTAL_AMOUNT}
                </Text>
                {showSMCode && <View style={{ width: cols.smCode }} />}
            </View>
        </>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ReportHeader
                title="BILL SUMMARY REPORT"
                showReportType={false}
                onExport={() => console.log('Export')}
                onExportCSV={() => exportBillSummaryReport('csv')}
                onExportPDF={() => exportBillSummaryReport('pdf')}
                onPrint={() => console.log('Print Report')}
            />

            <View style={styles.contentCard}>
                {/* ================= FILTERS ================= */}
                <View style={styles.filterRow}>
                    {/* From Date */}
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

                    {/* To Date */}
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

                    {/* Payment Mode */}
                    <View style={styles.filterBox}>
                        <Text style={styles.label}>Payment Mode</Text>
                        {renderDropdown(paymentMode, setPaymentMode, paymentModeOptions, 'Select')}
                    </View>

                    {/* User ID */}
                    <View style={styles.filterBox}>
                        <Text style={styles.label}>User ID</Text>
                        {renderDropdown(userId, setUserId, userOptions, 'Select')}
                    </View>

                    {/* ================= SEARCH ================= */}
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

                {/* SM Code checkbox */}
                <View style={styles.smCodeBox}>
                    <TouchableOpacity
                        style={styles.checkboxRow}
                        activeOpacity={0.8}
                        onPress={handleSMCodeToggle}>
                        <View style={styles.checkboxIcon}>
                            {showSMCode ? <CheckIcon /> : <UnCheckIcon />}
                        </View>
                        <Text style={styles.checkboxText}>Show SM Code in Report</Text>
                    </TouchableOpacity>
                </View>

                {/* ================= ANDROID DATE PICKERS ================= */}
                {Platform.OS === 'android' && showFromDatePicker && (
                    <DateTimePicker value={convertStringToDate(fromDate)} mode="date" display="default" onChange={handleFromDateChange} />
                )}
                {Platform.OS === 'android' && showToDatePicker && (
                    <DateTimePicker value={convertStringToDate(toDate)} mode="date" display="default" minimumDate={convertStringToDate(fromDate)} onChange={handleToDateChange} />
                )}

                {/* ================= IOS PICKERS ================= */}
                <Modal visible={Platform.OS === 'ios' && showFromDatePicker} transparent animationType="slide">
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerSheet}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    setFromDate(formatDate(tempFromDate));
                                    setShowFromDatePicker(false);
                                }}>
                                    <Text style={styles.doneText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker value={tempFromDate} mode="date" display="spinner" onChange={handleFromDateChange} />
                        </View>
                    </View>
                </Modal>
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

                {/* ================= TABLE ================= */}
                <View style={styles.tableContainer}>
                    {/* Header (Fixed at Top) */}
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerText, { width: cols.sno }]}>S.No</Text>
                        <Text style={[styles.headerText, { width: cols.billNo }]}>Bill.No</Text>
                        <Text style={[styles.headerText, { width: cols.billAmount }]}>Bill Amount</Text>
                        <Text style={[styles.headerText, { width: cols.paymentMode }]}>Payment Mode</Text>
                        <Text style={[styles.headerText, { width: cols.amount }]}>Amount</Text>
                        {showSMCode && (
                            <Text style={[styles.headerText, { width: cols.smCode }]}>SM Code</Text>
                        )}
                    </View>

                    {/* Body (Scrollable) */}
                    <FlatList
                        data={tableData}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={renderRow}
                        style={styles.tableBody}
                        showsVerticalScrollIndicator={false}
                        nestedScrollEnabled
                    />

                    {/* Total Row (Fixed at Bottom) */}
                    {renderTotalRow()}
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

export default BillSummaryReportScreen;

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
        paddingHorizontal: rS(16),
        paddingTop: rV(8),
    },

    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rS(10),
        marginBottom: rV(14),
    },
    filterBox: {
        flex: 1,
        minWidth: 0,
    },
    smCodeBox: {
        minWidth: 0,
        alignItems: "flex-end",
        justifyContent: "center"
    },
    label: {
        fontSize: 13,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
        marginBottom: rV(5),
    },
    label_sm: {
        fontSize: 13,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        paddingRight: responsiveWidth(8.5),
        fontWeight: '400',
        marginBottom: rV(5),
    },
    star: {
        color: '#E71414',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: rV(1),
        paddingBottom: rV(4),
    },
    checkboxIcon: {
        marginRight: rS(5),
    },
    checkboxText: {
        fontSize: 12,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    input: {
        height: rV(30),
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
        paddingVertical: 0,
    },
    dropdown: {
        height: rV(30),
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
    },
    selectedTextStyle: {
        fontSize: 14,
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeRegular,
    },
    itemTextStyle: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    searchContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchButton: {
        width: rS(100),
        height: rV(27),
        backgroundColor: '#264B79',
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
    },
    tableContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E4',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EEF9FF',
        paddingVertical: rV(8),
        paddingHorizontal: rS(25),
    },
    headerText: {
        fontSize: 13,
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
        textAlign: 'left',
    },
    tableBody: {
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: rV(8),
        paddingHorizontal: rS(26),
    },
    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
        textAlign: 'left',
    },
    // =========================================================
    // TOTAL ROW
    // =========================================================
    dashedLine: {
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#B0B0B0',
        marginHorizontal: rS(26),
        marginTop: rV(6),
    },
    totalRow: {
        flexDirection: 'row',
        paddingHorizontal: rS(26),
        paddingTop: rV(10),
        paddingBottom: rV(14),
        backgroundColor: '#FFFFFF',
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
        alignItems: 'center',
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
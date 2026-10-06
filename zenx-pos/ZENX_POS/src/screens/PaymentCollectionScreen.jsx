import React, { useRef, useState, useCallback } from 'react';

import {
    Animated,
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
import { rS, rMS, rV } from '../constants/responsive';
import CalenderIcon from '../assets/Icons/CalenderIcon';
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';

import {
    exportToCSV,
    exportToPDF,
} from '../utils/exportUtils';
import { responsiveHeight, responsiveWidth } from 'react-native-responsive-dimensions';

// =========================================================
// LAYOUT CONSTANTS
// =========================================================

// Cross Tab OFF  (light-blue header, 4 columns, left aligned)
const DETAIL_COLS = {
    lead: 42,   // gap before "S.No"
    sno: 277,
    date: 328,
    mode: 347,
    total: 182,
};

// Cross Tab ON  (dark header, light-blue "Total Collection" column)
const CROSS_COLS = {
    lead: 42,
    sno: 131,
    mode: 335,
    total: 668,
};
const CROSS_TOTAL_INSET = 53; // gap before text inside the blue column
const CROSS_LEFT_WIDTH = CROSS_COLS.lead + CROSS_COLS.sno + CROSS_COLS.mode;

// Detailed table scroll area
const DEFAULT_TABLE_HEIGHT = rV(240);
const ROW_HEIGHT = rV(35);
const HEADER_HEIGHT = rV(40);

// =========================================================
// DEFAULT FILTER VALUES (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
    fromDate: '23-04-2026',
    toDate: '23-03-2026',
    paymentMode: 'Cash',
    userId: '23-04-2026',
    crossTab: false,
};

const DashedLine = ({ style }) => (
    <View style={[styles.dashedWrap, style]}>
        <View style={styles.dashedInner} />
    </View>
);

const PaymentCollectionScreen = () => {
    const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
    const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);

    const [paymentMode, setPaymentMode] = useState(DEFAULT_FILTERS.paymentMode);
    const [userId, setUserId] = useState(DEFAULT_FILTERS.userId);
    const [crossTab, setCrossTab] = useState(DEFAULT_FILTERS.crossTab);

    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);

    const [tempFromDate, setTempFromDate] = useState(
        new Date(2026, 3, 23),
    );

    const [tempToDate, setTempToDate] = useState(
        new Date(2026, 2, 23),
    );

    // ✅ PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(4);

    // measured height of the scrollable list (fills leftover space)
    const [listHeight, setListHeight] = useState(0);
    const tableHeight = listHeight > 0 ? listHeight : DEFAULT_TABLE_HEIGHT;

    const verticalScrollOffset = useRef(
        new Animated.Value(0),
    ).current;

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
        { label: '23-04-2026', value: '23-04-2026' },
        { label: '22-04-2026', value: '22-04-2026' },
        { label: '21-04-2026', value: '21-04-2026' },
        { label: '20-04-2026', value: '20-04-2026' },
    ];

    // =========================================================
    // DATA
    // =========================================================

    // Detailed rows (Cross Tab OFF)
    const detailedData = [
        { id: 1, date: '23-03-2026', paymentMode: 'Cash', totalCollection: '₹1000' },
        { id: 2, date: '23-03-2026', paymentMode: 'Cash', totalCollection: '₹1000' },
        { id: 3, date: '23-03-2026', paymentMode: 'Cash', totalCollection: '₹1000' },
        { id: 4, date: '23-03-2026', paymentMode: 'UPI', totalCollection: '₹1000' },
        { id: 5, date: '23-03-2026', paymentMode: 'UPI', totalCollection: '₹1000' },
        { id: 6, date: '23-03-2026', paymentMode: 'Card', totalCollection: '₹1000' },
        { id: 7, date: '23-03-2026', paymentMode: 'Card', totalCollection: '₹1000' },
        { id: 8, date: '23-03-2026', paymentMode: 'Net Banking', totalCollection: '₹1000' },
        { id: 9, date: '23-03-2026', paymentMode: 'Cheque', totalCollection: '₹1000' },
        { id: 10, date: '23-03-2026', paymentMode: 'Cash', totalCollection: '₹1000' },
    ];

    // Cross Tab rows (Cross Tab ON)
    const crossTabData = [
        { id: 1, paymentMode: 'Cash', totalCollection: '₹1000' },
        { id: 2, paymentMode: 'UPI', totalCollection: '₹1000' },
        { id: 3, paymentMode: 'Card', totalCollection: '₹1000' },
        { id: 4, paymentMode: 'Cash', totalCollection: '₹1000' },
    ];

    const TOTAL_COLLECTION = '₹20000.98';
    const isCrossTab = crossTab;

    const displayedData = isCrossTab ? crossTabData : detailedData;

    const totalContentHeight = displayedData.length * ROW_HEIGHT;

    const showScrollbar = !isCrossTab && totalContentHeight > tableHeight;

    const maxTableScrollOffset = Math.max(
        1,
        totalContentHeight - tableHeight,
    );

    const VERTICAL_THUMB_HEIGHT = Math.min(
        tableHeight,
        Math.max(rV(24), (tableHeight / totalContentHeight) * tableHeight),
    );

    const VERTICAL_THUMB_TRAVEL = tableHeight - VERTICAL_THUMB_HEIGHT;

    // =========================================================
    // DATE HELPERS
    // =========================================================

    const formatDate = date => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const convertStringToDate = dateString => {
        if (!dateString) {
            return new Date();
        }

        const [day, month, year] = dateString.split('-');

        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
        );
    };

    const handleFromDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowFromDatePicker(false);

            if (selectedDate) {
                const newDate = formatDate(selectedDate);

                setFromDate(newDate);

                const currentToDate = convertStringToDate(toDate);

                if (currentToDate < selectedDate) {
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

            if (selectedDate) {
                setToDate(formatDate(selectedDate));
            }
        } else if (selectedDate) {
            setTempToDate(selectedDate);
        }
    };

    // =========================================================
    // ACTIONS
    // =========================================================

    const handleSearch = () => {
        setCurrentPage(1);
        verticalScrollOffset.setValue(0);

        console.log('PAYMENT-WISE COLLECTION REPORT SEARCH');

        console.log({
            fromDate,
            toDate,
            paymentMode,
            userId,
            crossTab,
            page: 1,
        });
    };

    // ✅ CLEAR / RESET button — restores defaults + resets pagination
    const handleClear = useCallback(() => {
        setFromDate(DEFAULT_FILTERS.fromDate);
        setToDate(DEFAULT_FILTERS.toDate);
        setPaymentMode(DEFAULT_FILTERS.paymentMode);
        setUserId(DEFAULT_FILTERS.userId);
        setCrossTab(DEFAULT_FILTERS.crossTab);

        setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
        setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

        setCurrentPage(1);
        verticalScrollOffset.setValue(0);

        console.log('PAYMENT-WISE COLLECTION REPORT — FILTERS CLEARED');
    }, [verticalScrollOffset]);

    // ✅ PAGE CHANGE
    const handlePageChange = useCallback(
        page => {
            setCurrentPage(page);
            verticalScrollOffset.setValue(0);
            console.log('PAYMENT COLLECTION PAGE CHANGE ====>', page);
            // TODO: fetchPaymentReport(page);
        },
        [verticalScrollOffset],
    );

    // ✅ CROSS TAB TOGGLE — resets pagination & scroll
    const handleCrossTabToggle = useCallback(() => {
        setCrossTab(prev => !prev);
        setCurrentPage(1);
        requestAnimationFrame(() => {
            verticalScrollOffset.setValue(0);
        });
    }, [verticalScrollOffset]);

    const exportPaymentReport = type => {
        const headers = isCrossTab
            ? ['S.No', 'Payment Mode', 'Total Collection']
            : ['S.No', 'Date', 'Payment Mode', 'Total Collection'];

        // ---- 1. Build detail rows ----
        const detailRows = displayedData.map(item =>
            isCrossTab
                ? {
                    'S.No': item.id,
                    'Payment Mode': item.paymentMode,
                    'Total Collection': item.totalCollection,
                }
                : {
                    'S.No': item.id,
                    Date: item.date,
                    'Payment Mode': item.paymentMode,
                    'Total Collection': item.totalCollection,
                },
        );

        // ---- 2. ✅ Build the TOTAL row ----
        const totalRow = isCrossTab
            ? {
                'S.No': '',
                'Payment Mode': 'Total',
                'Total Collection': TOTAL_COLLECTION,
            }
            : {
                'S.No': '',
                Date: '',
                'Payment Mode': 'Total',
                'Total Collection': TOTAL_COLLECTION,
            };

        // ---- 3. ✅ Combine detail + total ----
        const rows = [...detailRows, totalRow];

        const fileName = `payment_collection_report_${Date.now()}`;

        if (type === 'csv') {
            return exportToCSV(
                rows,
                headers,
                fileName,
                'Payment Collection Report',
                isCrossTab ? 'Cross Tab Report' : 'Payment Collection Report',
            );
        }

        return exportToPDF(
            rows,
            headers,
            fileName,
            isCrossTab ? 'Cross Tab Report' : 'Payment Collection Report',
            'Payment Collection Report',
        );
    };

    // =========================================================
    // RENDER HELPERS
    // =========================================================

    const renderDropdown = (value, setValue, data, placeholder) => {
        return (
            <Dropdown
                style={styles.dropdown}
                data={data}
                labelField="label"
                valueField="value"
                placeholder={placeholder}
                value={value}
                onChange={item => {
                    setValue(item.value);
                }}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                iconColor="#1B1B1B"
                maxHeight={250}
            />
        );
    };
    const renderCrossTabHeader = () => (
        <View style={styles.crossTabHeader}>
            <View style={styles.crossLead} />

            <Text style={[styles.crossTabHeaderText, styles.crossSno]}>
                S.No
            </Text>

            <Text style={[styles.crossTabHeaderText, styles.crossPaymentMode]}>
                Payment Mode
            </Text>

            <View style={styles.crossHeaderTotalCell}>
                <View style={styles.crossInset} />
                <Text style={[styles.crossTabHeaderText, styles.crossTotalTextBox]}>
                    Total Collection
                </Text>
            </View>
        </View>
    );

    const renderCrossTabRow = item => (
        <View key={String(item.id)} style={styles.crossTabRow}>
            <View style={styles.crossLead} />

            <View style={[styles.crossCell, styles.crossSno]}>
                <Text style={styles.rowText}>{item.id}</Text>
            </View>

            <View style={[styles.crossCell, styles.crossPaymentMode]}>
                <Text style={styles.rowText}>{item.paymentMode}</Text>
            </View>

            <View style={styles.crossTotalCell}>
                <View style={styles.crossInset} />
                <View style={[styles.crossCell, styles.crossTotalTextBox]}>
                    <Text style={styles.rowText}>{item.totalCollection}</Text>
                </View>
            </View>
        </View>
    );

    const renderCrossTabGapRow = () => (
        <View style={styles.crossTabGapRow}>
            <View style={styles.crossLeftBlank} />
            <View style={styles.crossBlueColumn} />
        </View>
    );

    const renderCrossTabTotalRow = () => (
        <View style={styles.crossTabTotalRow}>
            <View style={styles.crossLeftBlank} />

            <View style={styles.crossBlueColumn}>
                <DashedLine />

                <View style={styles.crossTotalContent}>
                    <View style={styles.crossInset} />
                    <View style={[styles.crossCell, styles.crossTotalTextBox]}>
                        <Text style={styles.totalText}>
                            {TOTAL_COLLECTION}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );

    // =========================================================
    // DETAILED TABLE  (Cross Tab OFF)
    // =========================================================

    const renderDetailedHeader = () => (
        <View style={styles.tableHeader}>
            <View style={styles.colLead} />
            <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
            <Text style={[styles.headerText, styles.colDate]}>Date</Text>
            <Text style={[styles.headerText, styles.colPaymentMode]}>
                Payment Mode
            </Text>
            <Text style={[styles.headerText, styles.colTotal]}>
                Total Collection
            </Text>
        </View>
    );

    const renderDetailedRow = item => (
        <View key={String(item.id)} style={styles.tableRow}>
            <View style={styles.colLead} />
            <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
            <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
            <Text style={[styles.rowText, styles.colPaymentMode]}>
                {item.paymentMode}
            </Text>
            <Text style={[styles.rowText, styles.colTotal]}>
                {item.totalCollection}
            </Text>
        </View>
    );

    const renderDetailedTotalRow = () => (
        <View>
            <DashedLine style={styles.detailedDash} />

            <View style={styles.totalRow}>
                <View style={styles.colLead} />
                <View style={styles.colSno} />
                <View style={styles.colDate} />
                <View style={styles.colPaymentMode} />
                <Text style={[styles.totalText, styles.colTotal]}>
                    {TOTAL_COLLECTION}
                </Text>
            </View>
        </View>
    );

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <SafeAreaView style={styles.container}>

            <ReportHeader
                title="PAYMENT-WISE COLLECTION REPORT"
                showReportType={false}
                onExport={() => console.log('Export Report')}
                onExportCSV={() => exportPaymentReport('csv')}
                onExportPDF={() => exportPaymentReport('pdf')}
                onPrint={() => console.log('Print Report')}
            />

            <View style={styles.contentCard}>
                <View style={styles.filtersContainer}>

                    {/* FILTER ROW */}
                    <View style={styles.filterRow}>

                        <View style={styles.filterBox}>
                            <Text style={styles.label}>
                                From Date <Text style={styles.star}>*</Text>
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.input}
                                onPress={() => {
                                    setTempFromDate(
                                        convertStringToDate(fromDate),
                                    );
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
                                    setTempToDate(
                                        convertStringToDate(toDate),
                                    );
                                    setShowToDatePicker(true);
                                }}>
                                <Text style={styles.inputText}>{toDate}</Text>
                                <CalenderIcon />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.filterBox}>
                            <Text style={styles.label}>Payment Mode</Text>
                            {renderDropdown(
                                paymentMode,
                                setPaymentMode,
                                paymentModeOptions,
                                'Select Payment Mode',
                            )}
                        </View>

                        <View style={styles.filterBox}>
                            <Text style={styles.label}>User ID</Text>
                            {renderDropdown(
                                userId,
                                setUserId,
                                userOptions,
                                'Select User ID',
                            )}
                        </View>
                        <View style={styles.searchContainer}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.searchButton}
                                onPress={handleSearch}>
                                <Text style={styles.searchText}>Search</Text>
                            </TouchableOpacity>
                        </View>
                        <View>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.clearIconBtn}
                                onPress={handleClear}>
                                <Text style={styles.clearIcon}>↻</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>

                {/* ================= ANDROID DATE PICKERS ================= */}

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

                {/* ================= IOS FROM DATE ================= */}

                <Modal
                    visible={Platform.OS === 'ios' && showFromDatePicker}
                    transparent
                    animationType="slide">
                    <View style={styles.pickerOverlay}>
                        <View style={styles.pickerSheet}>
                            <View style={styles.pickerHeader}>
                                <TouchableOpacity
                                    onPress={() =>
                                        setShowFromDatePicker(false)
                                    }>
                                    <Text style={styles.cancelText}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => {
                                        const newDate = formatDate(tempFromDate);
                                        setFromDate(newDate);

                                        if (
                                            convertStringToDate(toDate) <
                                            tempFromDate
                                        ) {
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
                                <TouchableOpacity
                                    onPress={() =>
                                        setShowToDatePicker(false)
                                    }>
                                    <Text style={styles.cancelText}>
                                        Cancel
                                    </Text>
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

                <View
                    style={[
                        styles.tableContainer,
                        !isCrossTab && styles.tableContainerFlexible,
                    ]}>

                    {isCrossTab ? (

                        /* ---------- CROSS TAB TABLE ---------- */
                        <View style={styles.crossTabContent}>
                            {renderCrossTabHeader()}

                            {displayedData.map(item => renderCrossTabRow(item))}

                            {renderCrossTabGapRow()}

                            {renderCrossTabTotalRow()}
                        </View>

                    ) : (

                        /* ---------- DETAILED TABLE ---------- */
                        <>
                            {renderDetailedHeader()}

                            <Animated.ScrollView
                                key="payment-collection-detailed"
                                style={styles.tableList}
                                onLayout={e =>
                                    setListHeight(e.nativeEvent.layout.height)
                                }
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
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
                                    { useNativeDriver: true },
                                )}
                                scrollEventThrottle={16}>
                                {displayedData.map(item => renderDetailedRow(item))}
                            </Animated.ScrollView>

                            {renderDetailedTotalRow()}

                            {/* CUSTOM VERTICAL SCROLLBAR */}
                            {showScrollbar && (
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.tableScrollbarTrack,
                                        { height: tableHeight },
                                    ]}>
                                    <Animated.View
                                        style={[
                                            styles.tableScrollbarThumb,
                                            {
                                                height: VERTICAL_THUMB_HEIGHT,
                                                transform: [
                                                    {
                                                        translateY:
                                                            verticalScrollOffset.interpolate(
                                                                {
                                                                    inputRange: [
                                                                        0,
                                                                        maxTableScrollOffset,
                                                                    ],
                                                                    outputRange: [
                                                                        0,
                                                                        VERTICAL_THUMB_TRAVEL,
                                                                    ],
                                                                    extrapolate: 'clamp',
                                                                },
                                                            ),
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                </View>
                            )}
                        </>
                    )}
                </View>
                <View style={styles.crossTabContainer}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPressIn={handleCrossTabToggle}
                        hitSlop={8}>
                        {crossTab ? <CheckIcon /> : <UnCheckIcon />}
                    </TouchableOpacity>

                    <Text style={styles.crossTabText}>Cross Tab</Text>
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

export default PaymentCollectionScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },

    contentCard: {
        flex: 1,
        marginHorizontal: rS(18),
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

    // =========================================================
    // DATE INPUT
    // =========================================================

    input: {
        height: rV(28),

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
        height: rV(28),

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
        width: rS(105),
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

    tableContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E4E4E4',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        marginTop:responsiveHeight(2)
    },

    tableContainerFlexible: {
        flex: 1,

        minHeight: rV(120),
    },

    tableList: {
        flex: 1,
    },

    // =========================================================
    // COMMON TABLE TEXT
    // =========================================================

    rowText: {
        fontSize: 14,

        color: '#000000',

        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',

        textAlign: 'left',
    },

    headerText: {
        fontSize: 14,

        color: '#264B79',

        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',

        textAlign: 'left',
    },

    totalText: {
        fontSize: 14,
        color: '#000000',

        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',

        textAlign: 'left',
    },

    // =========================================================
    // DETAILED TABLE
    // =========================================================

    tableHeader: {
        width: '100%',

        minHeight: rV(28),

        flexDirection: 'row',
        alignItems: 'center',

        backgroundColor: '#EEF9FF',
    },

    tableRow: {
        width: '100%',

        height: rV(30),

        flexDirection: 'row',
        alignItems: 'center',

        backgroundColor: '#FFFFFF',
    },

    // ---------------------------------------------------------
    // Detailed columns
    // ---------------------------------------------------------

    colLead: {
        width: '4%',
    },

    colSno: {
        width: '24%',
    },

    colDate: {
        width: '23%',
    },

    colPaymentMode: {
        width: '27%',
    },

    colTotal: {
        flex: 1,
    },

    // ---------------------------------------------------------
    // Detailed total
    // ---------------------------------------------------------

    detailedDash: {
        marginLeft: '2.5%',
        marginRight: '4%',

        marginTop: rV(2),
    },

    totalRow: {
        width: '100%',

        minHeight: rV(30),

        paddingBottom: rV(4),

        flexDirection: 'row',
        alignItems: 'center',

        backgroundColor: '#FFFFFF',
    },

    // =========================================================
    // CUSTOM VERTICAL SCROLLBAR
    // =========================================================

    tableScrollbarTrack: {
        position: 'absolute',

        top: rV(40),
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
    // CROSS TAB
    // =========================================================

    crossTabContent: {
        width: '100%',
    },

    crossTabHeader: {
        width: '100%',

        height: rV(25),

        flexDirection: 'row',
        alignItems: 'center',

        backgroundColor: '#264B79',
    },

    crossTabHeaderText: {
        fontSize: 14,

        color: '#FFFFFF',

        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',

        textAlign: 'left',
    },

    // ---------------------------------------------------------
    // Cross tab columns
    // ---------------------------------------------------------

    crossLead: {
        width: '5%',
    },

    crossSno: {
        width: '14%',
    },

    crossPaymentMode: {
        width: '35%',
    },

    crossHeaderTotalCell: {
        flex: 1,

        height: '100%',

        flexDirection: 'row',
        alignItems: 'center',

        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.25)',

        backgroundColor: '#264B79',
    },

    crossTotalCell: {
        flex: 1,

        flexDirection: 'row',

        backgroundColor: '#EEF9FF',
    },

    crossInset: {
        width: rS(53),
    },

    crossTotalTextBox: {
        flex: 1,

        justifyContent: 'center',
    },

    // =========================================================
    // CROSS TAB ROW
    // =========================================================

    crossTabRow: {
        width: '100%',
        minHeight: rV(25),

        flexDirection: 'row',
        alignItems: 'stretch',

        backgroundColor: '#FFFFFF',
    },

    crossCell: {
        justifyContent: 'center',
    },

    // =========================================================
    // CROSS TAB TOTAL AREA
    // =========================================================

    crossLeftBlank: {
        width: '54%',

        backgroundColor: '#FFFFFF',
    },

    crossBlueColumn: {
        flex: 1,

        backgroundColor: '#EEF9FF',
    },

    crossTabGapRow: {
        width: '100%',

        height: rV(12),

        flexDirection: 'row',
        alignItems: 'stretch',

        backgroundColor: '#FFFFFF',
    },

    crossTabTotalRow: {
        width: '100%',

        minHeight: rV(40),

        flexDirection: 'row',
        alignItems: 'stretch',

        backgroundColor: '#FFFFFF',
    },

    crossTotalContent: {
        flex: 1,

        flexDirection: 'row',
        alignItems: 'stretch',
    },

    // =========================================================
    // CROSS TAB CHECKBOX
    // =========================================================

    crossTabContainer: {
        height: rV(34),

        marginTop: rV(1),

        flexDirection: 'row',
        alignItems: 'center',

        flexShrink: 0,
    },

    crossTabText: {
        fontSize: 14,

        color: '#000000',

        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',

        marginLeft: rS(5),
    },

    // =========================================================
    // PAGINATION
    // =========================================================

    paginationSection: {
        paddingTop: rV(2),
        paddingBottom: rV(3),
        alignItems: 'center',
    },

    // =========================================================
    // DASHED LINE
    // =========================================================

    dashedWrap: {
        height: 1,

        overflow: 'hidden',
    },

    dashedInner: {
        height: 2,

        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#989898',

        borderRadius: 1,
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
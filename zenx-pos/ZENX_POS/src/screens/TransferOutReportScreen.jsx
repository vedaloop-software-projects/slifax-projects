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
    reportType: 'detailed',
    category: 'Rice',
    subCategory: 'Basmati',
    brand: 'Dawat',
    itemCode: 'BR-213',
    variantCode: 'VR-213',
    itemName: 'Basmati Rice-5 Kg',
    fromDate: '23-03-2026',
    toDate: '23-03-2026',
};
const ROW_HEIGHT = rV(30);
const HEADER_HEIGHT = rV(29);
const TOTAL_ROW_HEIGHT = rV(40);
const TABLE_BODY_HEIGHT = rV(160);
const TransferOutReportScreen = () => {
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
        { label: 'Toor Dal', value: 'Toor Dal' },
    ];

    const brandOptions = [
        { label: 'Dawat', value: 'Dawat' },
        { label: 'Lalitha', value: 'Lalitha' },
        { label: 'Ashirvaad', value: 'Ashirvaad' },
        { label: 'dklafk', value: 'dklafk' },
    ];

    const variantOptions = [
        { label: 'VR-213', value: 'VR-213' },
        { label: 'VR-214', value: 'VR-214' },
        { label: 'VR-215', value: 'VR-215' },
    ];

    // Table Data matching the screenshot exactly
    const detailedData = [
        { id: 1, date: '23-03-2026', groupType: 'Category', category: 'Rice', subCategory: 'Red Rice', brand: 'Lalitha', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Red Rice-5 Kg', eanNo: '5', hsnCode: '10', qtySold: '10' },
        { id: 2, date: '23-03-2026', groupType: 'Category', category: 'Flour', subCategory: 'Maida', brand: 'Ashirvaad', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Maida-1 Kg', eanNo: '2', hsnCode: '10', qtySold: '10' },
        { id: 3, date: '23-03-2026', groupType: 'Category', category: 'Rice', subCategory: 'Basmati', brand: 'Dawat', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Basmati-3 Kg', eanNo: '3', hsnCode: '10', qtySold: '10' },
        { id: 4, date: '23-03-2026', groupType: 'Category', category: 'Lentils', subCategory: 'Toor Dal', brand: 'dklafk', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Dal-2 Kg', eanNo: '18', hsnCode: '10', qtySold: '10' },
        { id: 5, date: '23-03-2026', groupType: 'Category', category: 'Lentils', subCategory: 'Toor Dal', brand: 'dklafk', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Dal-2 Kg', eanNo: '18', hsnCode: '10', qtySold: '10' },
        { id: 6, date: '23-03-2026', groupType: 'Category', category: 'Lentils', subCategory: 'Toor Dal', brand: 'dklafk', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Dal-2 Kg', eanNo: '18', hsnCode: '10', qtySold: '10' },
        { id: 7, date: '23-03-2026', groupType: 'Category', category: 'Lentils', subCategory: 'Toor Dal', brand: 'dklafk', itemCode: 'BR-213', variantCode: 'VR-213', itemName: 'Dal-2 Kg', eanNo: '18', hsnCode: '10', qtySold: '10' },
    ];

    // Totals (used in both UI and export)
    const TOTAL_EAN = '32';
    const TOTAL_HSN = '₹20000.98';
    const TOTAL_QTY = '₹20000.98';



    // Dynamic Table Height Tracking
    const [tableHeight, setTableHeight] = useState(TABLE_BODY_HEIGHT);

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

        console.log('TRANSFER-OUT REPORT SEARCH', {
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
        verticalScrollOffset.setValue(0);

        console.log('TRANSFER-OUT REPORT — FILTERS CLEARED');
    }, [verticalScrollOffset]);

    // ✅ PAGE CHANGE
    const handlePageChange = useCallback(page => {
        setCurrentPage(page);
        verticalScrollOffset.setValue(0);
        console.log('TRANSFER-OUT PAGE CHANGE ====>', page);
        // TODO: fetchTransferOutReport(page);
    }, [verticalScrollOffset]);

    // ✅ REPORT TYPE CHANGE — resets pagination
    const handleReportTypeChange = useCallback(type => {
        setReportType(type);
        setCurrentPage(1);
    }, []);

    // =========================================================
    // EXPORT (CSV / PDF) — WITH TOTAL ROW
    // =========================================================
    const exportTransferOutReport = (type) => {
        const headers = [
            'S.No', 'Date', 'Group Type', 'Category', 'Sub-Category', 'Brand',
            'Item Code', 'Variant Code', 'Item Name', 'EAN No.', 'HSN Code', 'Qty Sold',
        ];

        // ---- Detail rows ----
        const detailRows = detailedData.map(item => ({
            'S.No': item.id,
            'Date': item.date,
            'Group Type': item.groupType,
            'Category': item.category,
            'Sub-Category': item.subCategory,
            'Brand': item.brand,
            'Item Code': item.itemCode,
            'Variant Code': item.variantCode,
            'Item Name': item.itemName,
            'EAN No.': item.eanNo,
            'HSN Code': item.hsnCode,
            'Qty Sold': item.qtySold,
        }));

        // ---- ✅ TOTAL row (so it appears in CSV/PDF) ----
        const totalRow = {
            'S.No': '',
            'Date': '',
            'Group Type': '',
            'Category': '',
            'Sub-Category': '',
            'Brand': '',
            'Item Code': '',
            'Variant Code': '',
            'Item Name': '',
            'EAN No.': TOTAL_EAN,
            'HSN Code': TOTAL_HSN,
            'Qty Sold': TOTAL_QTY,
        };

        const rows = [...detailRows, totalRow];

        const fileName = `transfer_out_report_${Date.now()}`;

        if (type === 'csv') {
            return exportToCSV(rows, headers, fileName, 'Transfer-Out Report', 'Transfer-Out Report');
        }
        return exportToPDF(rows, headers, fileName, 'Transfer-Out Report', 'Transfer-Out Report');
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
            <Text style={[styles.headerText, styles.colGroupType]}>Group Type</Text>
            <Text style={[styles.headerText, styles.colCategory]}>Category</Text>
            <Text style={[styles.headerText, styles.colSubCategory]}>Sub-Category</Text>
            <Text style={[styles.headerText, styles.colBrand]}>Brand</Text>
            <Text style={[styles.headerText, styles.colItemCode]}>Item Code</Text>
            <Text style={[styles.headerText, styles.colVariantCode]}>Variant Code</Text>
            <Text style={[styles.headerText, styles.colItemName]}>Item Name</Text>
            <Text style={[styles.headerText, styles.colEan]}>EAN No.</Text>
            <Text style={[styles.headerText, styles.colHsn]}>HSN Code</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty Sold</Text>
        </View>
    );

    const renderDetailedRow = ({ item }) => (
        <View style={styles.tableRow}>
            <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
            <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
            <Text style={[styles.rowText, styles.colGroupType]}>{item.groupType}</Text>
            <Text style={[styles.rowText, styles.colCategory]}>{item.category}</Text>
            <Text style={[styles.rowText, styles.colSubCategory]}>{item.subCategory}</Text>
            <Text style={[styles.rowText, styles.colBrand]}>{item.brand}</Text>
            <Text style={[styles.rowText, styles.colItemCode]}>{item.itemCode}</Text>
            <Text style={[styles.rowText, styles.colVariantCode]}>{item.variantCode}</Text>
            <Text style={[styles.rowText, styles.colItemName]}>{item.itemName}</Text>
            <Text style={[styles.rowText, styles.colEan]}>{item.eanNo}</Text>
            <Text style={[styles.rowText, styles.colHsn]}>{item.hsnCode}</Text>
            <Text style={[styles.rowText, styles.colQty]}>{item.qtySold}</Text>
        </View>
    );

    const renderTotalRow = () => (
        <View style={styles.totalRow}>
            <View style={styles.colSno} />
            <View style={styles.colDate} />
            <View style={styles.colGroupType} />
            <View style={styles.colCategory} />
            <View style={styles.colSubCategory} />
            <View style={styles.colBrand} />
            <View style={styles.colItemCode} />
            <View style={styles.colVariantCode} />
            <View style={styles.colItemName} />

            <Text style={[styles.totalText, styles.colEan]}>{TOTAL_EAN}</Text>
            <Text style={[styles.totalText, styles.colHsn]}>{TOTAL_HSN}</Text>
            <Text style={[styles.totalText, styles.colQty]}>{TOTAL_QTY}</Text>
        </View>
    );

    const tableWidth = rMS(1350);

    return (
        <SafeAreaView style={styles.container}>
            <ReportHeader
                showReportType={true}
                reportType={reportType}
                onReportTypeChange={handleReportTypeChange}
                onExport={() => console.log('Export Report')}
                onExportCSV={() => exportTransferOutReport('csv')}
                onExportPDF={() => exportTransferOutReport('pdf')}
                onPrint={() => console.log('Print Report')}
                title="TRANSFER-OUT REPORT"
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

                {/* ================= TABLE ================= */}
                <View style={styles.tableContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        persistentScrollbar={true}
                        contentContainerStyle={{ minWidth: tableWidth }}
                    >
                        <View style={{ width: tableWidth }}>
                            {renderTableHeader()}

                            {/* ✅ Fixed-height body wrapper so scrollbar has real travel */}
                            <View style={styles.tableBodyWrapper}>
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

                {/* ✅ PAGINATION — outside tableContainer, reserved space */}
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

export default TransferOutReportScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },
    contentCard: {
        flex: 1,
        marginHorizontal: rMS(18),
        marginBottom: rV(4),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: rMS(7),
        paddingTop: rV(12),
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
        marginBottom: rV(3),
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
        height: rV(28),
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
        height: rV(28),
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
        width: rMS(135),
        height: rV(28),
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

    // =========================================================
    // TABLE
    // =========================================================
    tableContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        overflow: 'hidden',
        position: 'relative',
        marginTop: responsiveHeight(1)
    },

    // ✅ Fixed-height body wrapper for the FlatList + scrollbar row
    tableBodyWrapper: {
        height: TABLE_BODY_HEIGHT,
        flexDirection: 'row',
    },

    tableList: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EEF9FF',
        minHeight: rV(24),
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
        minHeight: rV(33),
        paddingHorizontal: rMS(3),
    },
    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        textAlign: 'center',
        flexShrink: 0,
    },

    // Column Widths for Transfer-Out Report (12 Columns)
    colSno: { width: rMS(50) },
    colDate: { width: rMS(100) },
    colGroupType: { width: rMS(110) },
    colCategory: { width: rMS(100) },
    colSubCategory: { width: rMS(110) },
    colBrand: { width: rMS(100) },
    colItemCode: { width: rMS(100) },
    colVariantCode: { width: rMS(110) },
    colItemName: { width: rMS(140) },
    colEan: { width: rMS(90) },
    colHsn: { width: rMS(100) },
    colQty: { width: rMS(80) },

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
        paddingTop: rV(4),
        paddingBottom: rV(4),
        alignItems: 'center',
        flexShrink: 0,           // ⬅️ CRITICAL — never collapse
    },

    // =========================================================
    // IOS PICKER
    // =========================================================
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
        height: rV(28),
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
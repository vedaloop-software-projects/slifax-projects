import React, { useRef, useState, useCallback, useMemo } from 'react';

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
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { responsiveWidth } from 'react-native-responsive-dimensions';

// =========================================================
// TABLE DIMENSION CONSTANTS
// =========================================================
const HEADER_HEIGHT = rV(28);
const ROW_HEIGHT = rV(20);
const TABLE_HEIGHT = rV(270);
const TOTAL_ROW_HEIGHT = rV(30);

// =========================================================
// DEFAULT FILTERS (used by clear button)
// =========================================================
const DEFAULT_FILTERS = {
    reportType: 'detailed',
    groupByTax: false,
    category: 'Rice',
    subCategory: 'Rice',
    brand: 'Basmati',
    variantCode: 'VR-213',
    itemName: 'Basmati Rice-5 Kg',
    gst: '5%',
    fromDate: '23-03-2026',
    toDate: '23-03-2026',
};

// =========================================================
// MOCK DATA (module-level → stable reference)
// =========================================================
const DETAILED_DATA = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    date: '23-03-2026',
    category: ['Rice', 'Flour', 'Lentils'][i % 3],
    subCategory: ['Red Rice', 'Maida', 'Toor Dal'][i % 3],
    brand: ['Lalitha', 'Ashirvaad', 'Dawat'][i % 3],
    gst: '5%',
    itemCode: `BR-${213 + i}`,
    variantCode: `VR-${213 + i}`,
    itemName: `Item-${i + 1} Kg`,
    qtySold: String((i % 20) + 1),
    qtyRefund: '10',
    taxAmount: '10',
    netExcl: '₹20000.98',
    netIncl: '₹20000.98',
}));

const TAX_SUMMARY_DATA = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    taxName: 'GST',
    taxPercent: '5',
    netExcl: '₹1000',
    netIncl: '₹1000',
    salePercent: String((i % 18) + 1),
}));

const SalesReportScreen = () => {
    const [reportType, setReportType] = useState(DEFAULT_FILTERS.reportType);
    const [groupByTax, setGroupByTax] = useState(DEFAULT_FILTERS.groupByTax);

    const [category, setCategory] = useState(DEFAULT_FILTERS.category);
    const [subCategory, setSubCategory] = useState(DEFAULT_FILTERS.subCategory);
    const [brand, setBrand] = useState(DEFAULT_FILTERS.brand);
    const [itemCode] = useState('BR-213');
    const [variantCode, setVariantCode] = useState(DEFAULT_FILTERS.variantCode);
    const [itemName, setItemName] = useState(DEFAULT_FILTERS.itemName);
    const [gst, setGst] = useState(DEFAULT_FILTERS.gst);

    const [fromDate, setFromDate] = useState(DEFAULT_FILTERS.fromDate);
    const [toDate, setToDate] = useState(DEFAULT_FILTERS.toDate);
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [tempFromDate, setTempFromDate] = useState(new Date(2026, 2, 23));
    const [tempToDate, setTempToDate] = useState(new Date(2026, 2, 23));

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(4);

    const verticalScrollOffset = useRef(new Animated.Value(0)).current;

    const categoryOptions = [
        { label: 'Rice', value: 'Rice' },
        { label: 'Oil', value: 'Oil' },
        { label: 'Dal', value: 'Dal' },
    ];

    const subCategoryOptions = [
        { label: 'Rice', value: 'Rice' },
        { label: 'Oil', value: 'Oil' },
        { label: 'Dal', value: 'Dal' },
    ];

    const brandOptions = [
        { label: 'Basmati', value: 'Basmati' },
        { label: 'India Gate', value: 'India Gate' },
        { label: 'Fortune', value: 'Fortune' },
    ];

    const variantOptions = [
        { label: 'VR-213', value: 'VR-213' },
        { label: 'VR-214', value: 'VR-214' },
        { label: 'VR-215', value: 'VR-215' },
    ];

    const gstOptions = [
        { label: '0%', value: '0%' },
        { label: '5%', value: '5%' },
        { label: '12%', value: '12%' },
        { label: '18%', value: '18%' },
        { label: '28%', value: '28%' },
    ];

    // =========================================================
    // DATA SELECTION (memoized)
    // =========================================================
    const isTaxSummary = groupByTax;
    const currentData = useMemo(
        () => (isTaxSummary ? TAX_SUMMARY_DATA : DETAILED_DATA),
        [isTaxSummary],
    );

    const totalContentHeight = currentData.length * ROW_HEIGHT;
    const maxTableScrollOffset = Math.max(
        1,
        totalContentHeight - TABLE_HEIGHT,
    );

    const VERTICAL_THUMB_HEIGHT = Math.min(
        TABLE_HEIGHT,
        Math.max(
            rV(40),
            (TABLE_HEIGHT / totalContentHeight) * TABLE_HEIGHT,
        ),
    );
    const VERTICAL_THUMB_TRAVEL = TABLE_HEIGHT - VERTICAL_THUMB_HEIGHT;
    const showVerticalScrollbar = totalContentHeight > TABLE_HEIGHT;

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

    const handleReportTypeChange = useCallback(
        type => {
            setReportType(type);
            verticalScrollOffset.setValue(0);
            setCurrentPage(1);
        },
        [verticalScrollOffset],
    );

    // ✅ SEARCH — reset pagination + scroll
    const handleSearch = useCallback(() => {
        setCurrentPage(1);
        verticalScrollOffset.setValue(0);

        console.log('SALES REPORT SEARCH', {
            reportType,
            groupByTax,
            category,
            subCategory,
            brand,
            itemCode,
            variantCode,
            itemName,
            gst,
            fromDate,
            toDate,
            page: 1,
        });
    }, [
        reportType, groupByTax, category, subCategory, brand,
        itemCode, variantCode, itemName, gst, fromDate, toDate,
        verticalScrollOffset,
    ]);

    // ✅ CLEAR — reset filters + pagination + scroll
    const handleClear = useCallback(() => {
        setReportType(DEFAULT_FILTERS.reportType);
        setGroupByTax(DEFAULT_FILTERS.groupByTax);
        setCategory(DEFAULT_FILTERS.category);
        setSubCategory(DEFAULT_FILTERS.subCategory);
        setBrand(DEFAULT_FILTERS.brand);
        setVariantCode(DEFAULT_FILTERS.variantCode);
        setItemName(DEFAULT_FILTERS.itemName);
        setGst(DEFAULT_FILTERS.gst);
        setFromDate(DEFAULT_FILTERS.fromDate);
        setToDate(DEFAULT_FILTERS.toDate);

        setTempFromDate(convertStringToDate(DEFAULT_FILTERS.fromDate));
        setTempToDate(convertStringToDate(DEFAULT_FILTERS.toDate));

        setCurrentPage(1);
        verticalScrollOffset.setValue(0);

        console.log('SALES REPORT — FILTERS CLEARED');
    }, [verticalScrollOffset]);

    const handlePageChange = useCallback(
        page => {
            setCurrentPage(page);
            verticalScrollOffset.setValue(0);
            console.log('SALES REPORT PAGE CHANGE ====>', page);
            // TODO: fetchSalesReport(page);
        },
        [verticalScrollOffset],
    );

    const toggleGroupByTax = useCallback(() => {
        setGroupByTax(prev => !prev);
        setCurrentPage(1);
        requestAnimationFrame(() => {
            verticalScrollOffset.setValue(0);
        });
    }, [verticalScrollOffset]);

    const handleTableScroll = useCallback(
        event => {
            verticalScrollOffset.setValue(
                event.nativeEvent.contentOffset.y,
            );
        },
        [verticalScrollOffset],
    );

    // =========================================================
    // EXPORT — ✅ TOTAL ROW INCLUDED
    // =========================================================
    const exportSalesReport = type => {
        const headers = isTaxSummary
            ? [
                'S.No',
                'Tax Name',
                'Tax %',
                'Net Sale Amount (Excl.)',
                'Net Sale Amount (Incl.)',
                'Sale %',
            ]
            : [
                'S.No',
                'Date',
                'Category',
                'Sub-Category',
                'Brand',
                'GST%',
                'Item Code',
                'Variant Code',
                'Item Name',
                'Qty Sold',
                'Qty Refund',
                'Tax Amount',
                'Net Sale Amount (Excl.)',
                'Net Sale Amount (Incl.)',
            ];

        // ---- Detail rows ----
        const detailRows = currentData.map(item =>
            isTaxSummary
                ? {
                    'S.No': item.id,
                    'Tax Name': item.taxName,
                    'Tax %': item.taxPercent,
                    'Net Sale Amount (Excl.)': item.netExcl,
                    'Net Sale Amount (Incl.)': item.netIncl,
                    'Sale %': item.salePercent,
                }
                : {
                    'S.No': item.id,
                    Date: item.date,
                    Category: item.category,
                    'Sub-Category': item.subCategory,
                    Brand: item.brand,
                    'GST%': item.gst,
                    'Item Code': item.itemCode,
                    'Variant Code': item.variantCode,
                    'Item Name': item.itemName,
                    'Qty Sold': item.qtySold,
                    'Qty Refund': item.qtyRefund,
                    'Tax Amount': item.taxAmount,
                    'Net Sale Amount (Excl.)': item.netExcl,
                    'Net Sale Amount (Incl.)': item.netIncl,
                },
        );

        // ---- ✅ TOTAL row ----
        const totalRow = isTaxSummary
            ? {
                'S.No': '',
                'Tax Name': '',
                'Tax %': '',
                'Net Sale Amount (Excl.)': '₹20000.98',
                'Net Sale Amount (Incl.)': '₹20000.98',
                'Sale %': '',
            }
            : {
                'S.No': '',
                Date: '',
                Category: '',
                'Sub-Category': '',
                Brand: '',
                'GST%': '',
                'Item Code': '',
                'Variant Code': '',
                'Item Name': '',
                'Qty Sold': '32',
                'Qty Refund': '',
                'Tax Amount': '150',
                'Net Sale Amount (Excl.)': '₹20000.98',
                'Net Sale Amount (Incl.)': '₹20000.98',
            };

        const rows = [...detailRows, totalRow];

        const fileName = `sales_report_${Date.now()}`;
        if (type === 'csv') {
            return exportToCSV(
                rows,
                headers,
                fileName,
                'Sales Report',
                isTaxSummary ? 'Tax Summary Report' : 'Sales Report',
            );
        }
        return exportToPDF(
            rows,
            headers,
            fileName,
            isTaxSummary ? 'Tax Summary Report' : 'Sales Report',
            'Sales Report',
        );
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

    const renderDetailedRow = useCallback(
        ({ item }) => (
            <View style={styles.tableRow}>
                <Text style={[styles.rowText, styles.colSno]}>{item.id}</Text>
                <Text style={[styles.rowText, styles.colDate]}>{item.date}</Text>
                <Text style={[styles.rowText, styles.colCategory]}>{item.category}</Text>
                <Text style={[styles.rowText, styles.colSubCategory]}>{item.subCategory}</Text>
                <Text style={[styles.rowText, styles.colBrand]}>{item.brand}</Text>
                <Text style={[styles.rowText, styles.colGst]}>{item.gst}</Text>
                <Text style={[styles.rowText, styles.colItemCode]}>{item.itemCode}</Text>
                <Text style={[styles.rowText, styles.colVariant]}>{item.variantCode}</Text>
                <Text style={[styles.rowText, styles.colItemName]}>{item.itemName}</Text>
                <Text style={[styles.rowText, styles.colSmall]}>{item.qtySold}</Text>
                <Text style={[styles.rowText, styles.colSmall]}>{item.qtyRefund}</Text>
                <Text style={[styles.rowText, styles.colSmall]}>{item.taxAmount}</Text>
                <Text style={[styles.rowText, styles.colNet]}>{item.netExcl}</Text>
                <Text style={[styles.rowText, styles.colNet]}>{item.netIncl}</Text>
            </View>
        ),
        [],
    );

    const renderTaxSummaryRow = useCallback(
        ({ item }) => (
            <View style={styles.tableRow}>
                <Text style={[styles.rowText, styles.summarySno]}>{item.id}</Text>
                <Text style={[styles.rowText, styles.summaryTaxName]}>{item.taxName}</Text>
                <Text style={[styles.rowText, styles.summaryTaxPercent]}>{item.taxPercent}</Text>
                <Text style={[styles.rowText, styles.summaryNet]}>{item.netExcl}</Text>
                <Text style={[styles.rowText, styles.summaryNet]}>{item.netIncl}</Text>
                <Text style={[styles.rowText, styles.summarySale]}>{item.salePercent}</Text>
            </View>
        ),
        [],
    );

    const renderTableHeader = () => {
        if (isTaxSummary) {
            return (
                <View style={styles.tableHeader}>
                    <Text style={[styles.headerText, styles.summarySno]}>S.No</Text>
                    <Text style={[styles.headerText, styles.summaryTaxName]}>Tax Name</Text>
                    <Text style={[styles.headerText, styles.summaryTaxPercent]}>Tax %</Text>
                    <Text style={[styles.headerText, styles.summaryNet]}>Net Sale Amount(Excl.)</Text>
                    <Text style={[styles.headerText, styles.summaryNet]}>Net Sale Amount(Incl.)</Text>
                    <Text style={[styles.headerText, styles.summarySale]}>Sale %</Text>
                </View>
            );
        }

        return (
            <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.colSno]}>S.No</Text>
                <Text style={[styles.headerText, styles.colDate]}>Date</Text>
                <Text style={[styles.headerText, styles.colCategory]}>Category</Text>
                <Text style={[styles.headerText, styles.colSubCategory]}>Sub-Category</Text>
                <Text style={[styles.headerText, styles.colBrand]}>Brand</Text>
                <Text style={[styles.headerText, styles.colGst]}>GST%</Text>
                <Text style={[styles.headerText, styles.colItemCode]}>Item Code</Text>
                <Text style={[styles.headerText, styles.colVariant]}>Variant Code</Text>
                <Text style={[styles.headerText, styles.colItemName]}>Item Name</Text>
                <Text style={[styles.headerText, styles.colSmall]}>Qty Sold</Text>
                <Text style={[styles.headerText, styles.colSmall]}>Qty Refund</Text>
                <Text style={[styles.headerText, styles.colSmall]}>Tax Amt.</Text>
                <Text style={[styles.headerText, styles.colNet]}>Net Sale Amount(Excl.)</Text>
                <Text style={[styles.headerText, styles.colNet]}>Net Sale Amount(Incl.)</Text>
            </View>
        );
    };

    const renderTotalRow = () => {
        if (isTaxSummary) {
            return (
                <View style={styles.totalRow}>
                    <View style={styles.summarySno} />
                    <View style={styles.summaryTaxName} />
                    <View style={styles.summaryTaxPercent} />
                    <Text style={[styles.totalText, styles.summaryNet]}>₹20000.98</Text>
                    <Text style={[styles.totalText, styles.summaryNet]}>₹20000.98</Text>
                    <View style={styles.summarySale} />
                </View>
            );
        }

        return (
            <View style={styles.totalRow}>
                <View style={styles.colSno} />
                <View style={styles.colDate} />
                <View style={styles.colCategory} />
                <View style={styles.colSubCategory} />
                <View style={styles.colBrand} />
                <View style={styles.colGst} />
                <View style={styles.colItemCode} />
                <View style={styles.colVariant} />
                <View style={styles.colItemName} />
                <Text style={[styles.totalText, styles.colSmall]}>32</Text>
                <View style={styles.colSmall} />
                <Text style={[styles.totalText, styles.colSmall]}>150</Text>
                <Text style={[styles.totalText, styles.colNet]}>₹20000.98</Text>
                <Text style={[styles.totalText, styles.colNet]}>₹20000.98</Text>
            </View>
        );
    };

    const tableWidth = isTaxSummary ? rMS(900) : rMS(1480);

    return (
        <SafeAreaView style={styles.container}>
            <ReportHeader
                showReportType={!groupByTax}
                reportType={reportType}
                onReportTypeChange={handleReportTypeChange}
                onExport={() => console.log('Export Report')}
                onExportCSV={() => exportSalesReport('csv')}
                onExportPDF={() => exportSalesReport('pdf')}
                onPrint={() => console.log('Print Report')}
            />

            <View style={styles.contentCard}>
                {/* FILTERS */}
                <View style={styles.filtersContainer}>
                    <View style={styles.filterRow}>
                        <View style={[styles.filterBox, styles.categoryBox]}>
                            <Text style={styles.label}>Category <Text style={styles.star}>*</Text></Text>
                            {renderDropdown(category, setCategory, categoryOptions, 'Select Category')}
                        </View>
                        <View style={[styles.filterBox, styles.subCategoryBox]}>
                            <Text style={styles.label}>Sub-Category <Text style={styles.star}>*</Text></Text>
                            {renderDropdown(subCategory, setSubCategory, subCategoryOptions, 'Select Sub-Category')}
                        </View>
                        <View style={[styles.filterBox, styles.brandBox]}>
                            <Text style={styles.label}>Brand <Text style={styles.star}>*</Text></Text>
                            {renderDropdown(brand, setBrand, brandOptions, 'Select Brand')}
                        </View>
                        <View style={[styles.filterBox, styles.itemCodeBox]}>
                            <Text style={styles.label}>Item Code <Text style={styles.star}>*</Text></Text>
                            <View style={styles.input}><Text style={styles.inputText}>{itemCode}</Text></View>
                        </View>
                        <View style={[styles.filterBox, styles.variantBox]}>
                            <Text style={styles.label}>Variant Code <Text style={styles.star}>*</Text></Text>
                            {renderDropdown(variantCode, setVariantCode, variantOptions, 'Select Variant')}
                        </View>
                    </View>

                    <View style={styles.filterRow}>
                        {!groupByTax && (
                            <View style={[styles.filterBox, styles.gstBox]}>
                                <Text style={styles.label}>GST% <Text style={styles.star}>*</Text></Text>
                                {renderDropdown(gst, setGst, gstOptions, 'Select GST')}
                            </View>
                        )}
                        <View style={[styles.filterBox, styles.dateBox]}>
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
                        <View style={[styles.filterBox, styles.dateBox]}>
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
                        <View style={[styles.filterBox, styles.itemNameBox]}>
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

                {/* DATE PICKERS */}
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

                <Modal visible={Platform.OS === 'ios' && showFromDatePicker} transparent animationType="slide">
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

                <Modal visible={Platform.OS === 'ios' && showToDatePicker} transparent animationType="slide">
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

                <View style={styles.tableContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator
                        persistentScrollbar
                        contentContainerStyle={{ minWidth: tableWidth }}
                        nestedScrollEnabled
                        directionalLockEnabled
                        keyboardShouldPersistTaps="handled">
                        <View style={{ width: tableWidth }}>
                            {renderTableHeader()}

                            <FlatList
                                key={isTaxSummary ? 'tax' : 'detail'}
                                data={currentData}
                                keyExtractor={item => String(item.id)}
                                renderItem={
                                    isTaxSummary
                                        ? renderTaxSummaryRow
                                        : renderDetailedRow
                                }
                                style={styles.tableList}
                                contentContainerStyle={{ paddingBottom: 0 }}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                                initialNumToRender={12}
                                maxToRenderPerBatch={12}
                                windowSize={7}
                                onScroll={handleTableScroll}
                                scrollEventThrottle={16}
                            />

                            {renderTotalRow()}
                        </View>
                    </ScrollView>

                    {showVerticalScrollbar && (
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
                    )}

                    <View style={styles.groupTaxContainer}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={toggleGroupByTax}>
                            {groupByTax ? <CheckIcon /> : <UnCheckIcon />}
                        </TouchableOpacity>
                        <Text style={styles.groupTaxText}>Group by Tax</Text>
                    </View>
                </View>

                {/* PAGINATION */}
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

export default SalesReportScreen;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9F9F9' },
    contentCard: {
        flex: 1,
        marginHorizontal: rMS(18),
        marginTop: rV(2),
        marginBottom: rV(5),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: rMS(5),
        paddingTop: rV(12),
        borderTopWidth: 1,
        borderTopColor: '#F4F4F4',
    },

    filtersContainer: { width: '100%' },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rMS(10),
        marginBottom: rV(6),
    },
    filterBox: { minWidth: 0 },

    categoryBox: { flex: 1.35 },
    subCategoryBox: { flex: 0.7 },
    brandBox: { flex: 0.7 },
    itemCodeBox: { flex: 1.3 },
    variantBox: { flex: 1.3 },
    itemNameBox: { flex: 1.35 },
    gstBox: { flex: 1.35 },
    dateBox: { flex: 1.25 },

    label: {
        fontSize: 14,
        marginBottom: rV(3),
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
    },
    star: { color: '#E71414' },

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
        marginTop: rV(2),
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
    },
    tableList: {
        height: TABLE_HEIGHT,
    },

    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EEF9FF',
        height: HEADER_HEIGHT,
        paddingHorizontal: rMS(3),
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
        height: ROW_HEIGHT,
        paddingHorizontal: rMS(3),
    },
    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        textAlign: 'left',
        flexShrink: 0,
    },

    colSno: { width: rMS(42), paddingLeft: responsiveWidth(1) },
    colDate: { width: rMS(95) },
    colCategory: { width: rMS(110) },
    colSubCategory: { width: rMS(115) },
    colBrand: { width: rMS(100) },
    colGst: { width: rMS(70) },
    colItemCode: { width: rMS(95) },
    colVariant: { width: rMS(105) },
    colItemName: { width: rMS(140) },
    colSmall: { width: rMS(80) },
    colNet: { width: rMS(170) },

    summarySno: { width: rMS(40), paddingLeft: responsiveWidth(1) },
    summaryTaxName: { width: rMS(200) },
    summaryTaxPercent: { width: rMS(60) },
    summaryNet: { width: rMS(160) },
    summarySale: { width: rMS(110) },

    totalRow: {
        height: TOTAL_ROW_HEIGHT,
        borderTopWidth: 0.8,
        borderStyle: 'dashed',
        borderTopColor: '#989898',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rMS(3),
    },
    totalText: {
        fontSize: 12,
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
        textAlign: 'center',
    },

    tableScrollbarTrack: {
        position: 'absolute',
        top: HEADER_HEIGHT,
        right: rMS(2),
        width: rMS(3),
        height: TABLE_HEIGHT,
        backgroundColor: 'transparent',
        borderRadius: rMS(2),
        overflow: 'hidden',
    },
    tableScrollbarThumb: {
        width: '100%',
        backgroundColor: 'rgba(38, 75, 121, 0.55)',
        borderRadius: rMS(2),
    },

    groupTaxContainer: {
        height: rV(25),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rMS(10),
        borderTopWidth: 0.5,
        borderTopColor: '#EEEEEE',
        backgroundColor: '#FFFFFF',
    },
    groupTaxText: {
        fontSize: 13,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        marginLeft: rMS(8),
        fontWeight: '400',
    },

    paginationSection: {
        paddingTop: rV(2),
        paddingBottom: rV(3),
        alignItems: 'center',
        flexShrink: 0,
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
});
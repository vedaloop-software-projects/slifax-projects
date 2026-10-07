import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Platform,
    FlatList,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { useSelector } from 'react-redux';
import CustomHeader from '../components/CustomHeader';
import Pagination from '../components/Pagination';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import CalenderIcon from '../assets/Icons/CalenderIcon';
import NewDownloadIcon from '../assets/Icons/NewDownloadIcon'
import colors from '../constants/colors';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';

import {
    exportToCSV,
    exportToPDF,
} from '../utils/exportUtils';


// ==================================================
// TIME OPTIONS
// ==================================================

const build12HourOptions = () => {
    const options = [];

    for (let hour = 0; hour < 24; hour++) {
        const period = hour < 12 ? 'AM' : 'PM';

        let h12 = hour % 12;

        if (h12 === 0) {
            h12 = 12;
        }

        const paddedHour = String(h12).padStart(2, '0');

        const label = `${paddedHour}:00 ${period}`;

        options.push({
            label,
            value: label,
        });
    }

    return options;
};

const TIME_OPTIONS_12H = build12HourOptions();

const DEFAULT_FROM_TIME = '12:00 AM';
const DEFAULT_TO_TIME = '11:00 PM';

const ALL_USERS_VALUE = '__ALL__';


// ==================================================
// SCREEN
// ==================================================

const AuditLogScreen = () => {
    const today = new Date();

    const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(
        today.getMonth() + 1
    ).padStart(2, '0')}-${today.getFullYear()}`;

    const { postMethod } = HelperModule();
    const authUser = useSelector(state => state.auth.user);

    // ==================================================
    // FILTER STATES
    // ==================================================

    const [fromDate, setFromDate] = useState(todayStr);
    const [toDate, setToDate] = useState(todayStr);

    const [fromTime, setFromTime] = useState(DEFAULT_FROM_TIME);
    const [toTime, setToTime] = useState(DEFAULT_TO_TIME);

    const [userId, setUserId] = useState(ALL_USERS_VALUE);

    // ==================================================
    // DATE PICKER STATES
    // ==================================================

    const [showFromDatePicker, setShowFromDatePicker] =
        useState(false);

    const [showToDatePicker, setShowToDatePicker] =
        useState(false);

    const [tempFromDate, setTempFromDate] =
        useState(new Date());

    const [tempToDate, setTempToDate] =
        useState(new Date());

    // ==================================================
    // AUDIT DATA
    // ==================================================

    const [auditData, setAuditData] = useState([]);

    const [auditPage, setAuditPage] = useState(1);

    const [auditLastPage, setAuditLastPage] =
        useState(1);

    const [loadingAudit, setLoadingAudit] =
        useState(false);

    // ==================================================
    // USERS
    // ==================================================

    const [userList, setUserList] = useState([]);

    const [userPage, setUserPage] = useState(1);

    const [userLastPage, setUserLastPage] =
        useState(1);

    const [loadingUsers, setLoadingUsers] =
        useState(false);

    // ==================================================
    // EXPORT STATES
    // ==================================================

    const [exporting, setExporting] =
        useState(false);

    const [exportProgress, setExportProgress] =
        useState('');

    const [showExportOptions, setShowExportOptions] =
        useState(false);

    // ==================================================
    // REFS
    // ==================================================

    const loadingAuditRef =
        useRef(false);

    const loadingUsersRef =
        useRef(false);

    const auditLastPageRef =
        useRef(1);

    const userLastPageRef =
        useRef(1);

    // ==================================================
    // SYNC REFS
    // ==================================================

    useEffect(() => {
        loadingAuditRef.current = loadingAudit;
    }, [loadingAudit]);

    useEffect(() => {
        loadingUsersRef.current = loadingUsers;
    }, [loadingUsers]);

    useEffect(() => {
        auditLastPageRef.current = auditLastPage;
    }, [auditLastPage]);

    useEffect(() => {
        userLastPageRef.current = userLastPage;
    }, [userLastPage]);

    // ==================================================
    // USER DROPDOWN OPTIONS
    // ==================================================

    const userOptions = useMemo(() => {
        const allOption = {
            label: 'Select All',
            value: ALL_USERS_VALUE,
        };

        const mapped = userList.map(user => ({
            label: `${user.name}`,
            value: String(user.id),
        }));

        return [allOption, ...mapped];
    }, [userList]);

    // ==================================================
    // DATE HELPERS
    // ==================================================

    const formatDate = date => {
        const day = String(date.getDate()).padStart(2, '0');

        const month = String(
            date.getMonth() + 1
        ).padStart(2, '0');

        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const convertStringToDate = dateString => {
        if (!dateString) {
            return new Date();
        }

        const [day, month, year] =
            dateString.split('-');

        return new Date(
            year,
            month - 1,
            day
        );
    };

    // ==================================================
    // TIME HELPER
    // ==================================================

    const timeToMinutes = timeString => {
        if (!timeString) {
            return null;
        }

        const [time, period] =
            timeString.split(' ');

        const [hourString, minuteString] =
            time.split(':');

        let hour = Number(hourString);

        const minute = Number(minuteString);

        if (period === 'AM') {
            if (hour === 12) {
                hour = 0;
            }
        } else if (period === 'PM') {
            if (hour !== 12) {
                hour += 12;
            }
        }

        return hour * 60 + minute;
    };

    // ==================================================
    // FORMAT REPORT ROW
    // ==================================================

    const formatReportRow = (item, sno) => ({
        sno,

        date: item.createdAt || '-',

        type: item.type || '-',

        user: item.userName
            ? `${item.userName}`
            : item.userId
                ? String(item.userId)
                : '-',

        module: item.module || '-',

        particulars:
            item.description || '-',

        id: item.id,

        userId: item.userId,
    });

    // ==================================================
    // GET USERS
    // ==================================================

    const getUsers = async (
        pageNumber = 1,
        force = false
    ) => {
        if (
            !force &&
            loadingUsersRef.current
        ) {
            return;
        }

        if (
            pageNumber >
            userLastPageRef.current
        ) {
            return;
        }

        try {
            setLoadingUsers(true);

            const payload = {
                searchStr: '',
                status: '',
                page: pageNumber,
            };

            console.log(
                'GET USERS PAYLOAD =====>',
                payload
            );

            const response =
                await postMethod(
                    ApiServices.zenxposGetUsers,
                    payload
                );

            console.log(
                'GET USERS RESPONSE =====>',
                response
            );

            if (response?.success) {
                const users =
                    response?.data?.users || [];

                const pagination =
                    response?.data?.pagination || {};

                setUserList(prev =>
                    pageNumber === 1
                        ? users
                        : [...prev, ...users]
                );

                setUserPage(pageNumber);

                setUserLastPage(
                    pagination.lastPage ||
                    pageNumber
                );
            }
        } catch (error) {
            console.log(
                'GET USERS ERROR =====>',
                error?.message || error
            );
        } finally {
            setLoadingUsers(false);
        }
    };

    // ==================================================
    // GET AUDIT REPORTS (SERVER-SIDE PAGINATED)
    // ==================================================

    const getAuditReports = async (
        pageNumber = 1,
        overrides = {},
        force = false
    ) => {
        if (
            !force &&
            loadingAuditRef.current
        ) {
            return;
        }

        if (
            pageNumber > 1 &&
            pageNumber >
            auditLastPageRef.current
        ) {
            return;
        }

        try {
            setLoadingAudit(true);

            const resolvedUserId =
                overrides.userId !== undefined
                    ? overrides.userId
                    : userId &&
                        userId !== ALL_USERS_VALUE
                        ? String(userId)
                        : '';

            const payload = {
                userId: resolvedUserId,

                fromDate:
                    overrides.fromDate !== undefined
                        ? overrides.fromDate
                        : fromDate,

                toDate:
                    overrides.toDate !== undefined
                        ? overrides.toDate
                        : toDate,

                fromTime:
                    overrides.fromTime !== undefined
                        ? overrides.fromTime
                        : fromTime,

                toTime:
                    overrides.toTime !== undefined
                        ? overrides.toTime
                        : toTime,

                page: pageNumber,
            };

            console.log(
                'AUDIT REPORT PAYLOAD =====>',
                payload
            );

            const response =
                await postMethod(
                    ApiServices.zenxposgetAuditReports,
                    payload
                );

            console.log(
                'AUDIT REPORT RESPONSE =====>',
                response
            );

            if (response?.success) {
                const reports =
                    response?.data?.auditReports ||
                    [];

                const pagination =
                    response?.data?.pagination ||
                    {};

                const perPage =
                    pagination.perPage || 10;

                const currentPageFromApi =
                    pagination.currentPage ||
                    pageNumber;

                const formattedReports =
                    reports.map(
                        (item, index) => {
                            const sno =
                                (currentPageFromApi - 1) *
                                perPage +
                                index +
                                1;

                            return formatReportRow(
                                item,
                                sno
                            );
                        }
                    );

                // ✅ REPLACE data (server-side pagination)
                setAuditData(formattedReports);

                setAuditPage(
                    currentPageFromApi
                );

                setAuditLastPage(
                    pagination.lastPage ||
                    currentPageFromApi
                );
            } else {
                setAuditData([]);

                setAuditPage(1);

                setAuditLastPage(1);
            }
        } catch (error) {
            console.log(
                'AUDIT REPORT ERROR =====>',
                error?.message || error
            );

            setAuditData([]);
        } finally {
            setLoadingAudit(false);
        }
    };

    // ==================================================
    // DATE CHANGE
    // ==================================================

    const handleFromDateChange = (
        event,
        selectedDate
    ) => {
        if (Platform.OS === 'android') {
            setShowFromDatePicker(false);

            if (selectedDate) {
                const newFromDate =
                    formatDate(selectedDate);

                setFromDate(newFromDate);

                const currentToDate =
                    convertStringToDate(toDate);

                if (
                    currentToDate < selectedDate
                ) {
                    setToDate(newFromDate);

                    setTempToDate(
                        selectedDate
                    );
                }
            }
        } else if (selectedDate) {
            setTempFromDate(selectedDate);
        }
    };

    const handleToDateChange = (
        event,
        selectedDate
    ) => {
        if (Platform.OS === 'android') {
            setShowToDatePicker(false);

            if (selectedDate) {
                setToDate(
                    formatDate(selectedDate)
                );
            }
        } else if (selectedDate) {
            setTempToDate(selectedDate);
        }
    };

    // ==================================================
    // VALIDATION
    // ==================================================

    const validateFilters = () => {
        if (!fromDate) {
            return 'Please select From Date';
        }

        if (!toDate) {
            return 'Please select To Date';
        }

        const fromDateObj =
            convertStringToDate(fromDate);

        const toDateObj =
            convertStringToDate(toDate);

        if (
            isNaN(fromDateObj.getTime()) ||
            isNaN(toDateObj.getTime())
        ) {
            return 'Invalid date selected';
        }

        if (toDateObj < fromDateObj) {
            return 'To Date cannot be earlier than From Date';
        }

        if (!fromTime) {
            return 'Please select From Time';
        }

        if (!toTime) {
            return 'Please select To Time';
        }

        if (fromDate === toDate) {
            const fromMinutes =
                timeToMinutes(fromTime);

            const toMinutes =
                timeToMinutes(toTime);

            if (
                fromMinutes === null ||
                toMinutes === null
            ) {
                return 'Please select valid From Time and To Time';
            }

            if (toMinutes <= fromMinutes) {
                return 'To Time must be greater than From Time';
            }
        }

        return null;
    };

    // ==================================================
    // SEARCH
    // ==================================================

    const handleSearch = () => {
        if (exporting) {
            return;
        }

        const validationError =
            validateFilters();

        if (validationError) {
            Alert.alert(
                'Validation',
                validationError
            );
            return;
        }

        setAuditPage(1);
        setAuditLastPage(1);

        auditLastPageRef.current = 1;

        getAuditReports(
            1,
            {
                userId:
                    userId &&
                        userId !== ALL_USERS_VALUE
                        ? String(userId)
                        : '',

                fromDate,

                toDate,

                fromTime,

                toTime,
            },
            true
        );
    };

    // ==================================================
    // CLEAR
    // ==================================================

    const handleClear = () => {
        if (exporting) {
            return;
        }

        const now = new Date();

        const todayClear =
            formatDate(now);

        setFromDate(todayClear);

        setToDate(todayClear);

        setTempFromDate(now);

        setTempToDate(now);

        setFromTime(DEFAULT_FROM_TIME);

        setToTime(DEFAULT_TO_TIME);

        setUserId(ALL_USERS_VALUE);

        setAuditPage(1);

        setAuditLastPage(1);

        auditLastPageRef.current = 1;

        getAuditReports(
            1,
            {
                userId: '',

                fromDate: todayClear,

                toDate: todayClear,

                fromTime:
                    DEFAULT_FROM_TIME,

                toTime:
                    DEFAULT_TO_TIME,
            },
            true
        );
    };

    // ==================================================
    // PAGINATION — PAGE CHANGE (SERVER-SIDE)
    // ==================================================

    const handlePageChange = (page) => {
        if (exporting) return;
        if (loadingAuditRef.current) return;
        if (page === auditPage) return;

        getAuditReports(page, {}, true);
    };

    // ==================================================
    // EXPORT
    // ==================================================

    const buildFilterPayload = () => ({
        userId:
            userId &&
                userId !== ALL_USERS_VALUE
                ? String(userId)
                : '',

        fromDate,

        toDate,

        fromTime,

        toTime,
    });

    // ==================================================
    // FETCH ALL EXPORT PAGES
    // ==================================================

    const fetchAllPages = async (
        filters = buildFilterPayload()
    ) => {
        const firstRes =
            await postMethod(
                ApiServices.zenxposgetAuditReports,
                {
                    ...filters,
                    page: 1,
                }
            );

        if (!firstRes?.success) {
            return {
                rows: [],
                total: 0,
            };
        }

        const firstReports =
            firstRes?.data?.auditReports ||
            [];

        const pagination =
            firstRes?.data?.pagination ||
            {};

        const lastPage =
            pagination.lastPage || 1;

        const perPage =
            pagination.perPage ||
            firstReports.length ||
            10;

        const all =
            firstReports.map(
                (item, index) =>
                    formatReportRow(
                        item,
                        index + 1
                    )
            );

        for (
            let p = 2;
            p <= lastPage;
            p++
        ) {
            try {
                setExportProgress(
                    `Fetching page ${p} of ${lastPage}...`
                );

                const res =
                    await postMethod(
                        ApiServices.zenxposgetAuditReports,
                        {
                            ...filters,
                            page: p,
                        }
                    );

                if (res?.success) {
                    const reports =
                        res?.data?.auditReports ||
                        [];

                    const startSno =
                        (p - 1) *
                        perPage +
                        1;

                    reports.forEach(
                        (item, idx) => {
                            all.push(
                                formatReportRow(
                                    item,
                                    startSno +
                                    idx
                                )
                            );
                        }
                    );
                } else {
                    console.log(
                        `Page ${p} returned success=false`
                    );
                }
            } catch (err) {
                console.log(
                    `EXPORT page ${p} error:`,
                    err?.message || err
                );
            }
        }

        return {
            rows: all,
            total: lastPage,
        };
    };

    // ==================================================
    // EXPORT HEADERS
    // ==================================================

    const EXPORT_HEADERS = [
        'S.No',
        'Audit Date',
        'Audit Type',
        'User ID',
        'Particulars',
    ];

    // ==================================================
    // EXPORT DATA
    // ==================================================

    const buildExportData = list =>
        list.map(item => ({
            'S.No': item.sno,

            'Audit Date': item.date,

            'Audit Type': item.type,

            'User ID': item.user,

            Particulars:
                item.particulars,
        }));

    // ==================================================
    // RUN EXPORT
    // ==================================================

    const runExport = async type => {
        if (exporting) {
            return;
        }

        const exportFilters =
            buildFilterPayload();

        const validationError =
            validateFilters();

        if (validationError) {
            Alert.alert(
                'Validation',
                validationError
            );

            return;
        }

        try {
            setExporting(true);

            setExportProgress(
                'Preparing export...'
            );

            const {
                rows: allRows,
            } = await fetchAllPages(
                exportFilters
            );

            if (!allRows.length) {
                Alert.alert(
                    'No Data',
                    'No records found for this search. Try different filters.'
                );

                return;
            }

            const rows =
                buildExportData(allRows);

            const fileName =
                `audit_log_${Date.now()}`;

            setExportProgress(
                type === 'csv'
                    ? 'Generating CSV...'
                    : 'Generating PDF...'
            );

            if (type === 'csv') {
                await exportToCSV(
                    rows,
                    EXPORT_HEADERS,
                    fileName,
                    authUser?.businessName,
                    'Audit Log Report'
                );
            } else {
                await exportToPDF(
                    rows,
                    EXPORT_HEADERS,
                    fileName,
                    'Audit Log Report',
                    authUser?.businessName
                );
            }
        } catch (err) {
            console.log(
                'EXPORT ERROR =====>',
                err?.message || err
            );

            Alert.alert(
                'Export Failed',
                err?.message ||
                'Something went wrong'
            );
        } finally {
            setExportProgress('');

            setExporting(false);
        }
    };

    const handleExportCSV = () => {
        runExport('csv');
    };

    const handleExportPDF = () => {
        runExport('pdf');
    };

    // ==================================================
    // OPEN EXPORT MENU
    // ==================================================

    const openExportOptions = () => {
        if (exporting) {
            return;
        }

        setShowExportOptions(true);
    };

    // ==================================================
    // TABLE ROW
    // ==================================================

    const renderItem = ({ item }) => (
        <View style={styles.tableRow}>
            <Text
                style={[
                    styles.rowText,
                    styles.colSno,
                ]}
            >
                {item.sno}
            </Text>

            <Text
                style={[
                    styles.rowText,
                    styles.colDate,
                ]}
            >
                {item.date}
            </Text>

            <Text
                style={[
                    styles.rowText,
                    styles.colType,
                ]}
            >
                {item.type}
            </Text>

            <Text
                style={[
                    styles.rowText,
                    styles.colUser,
                ]}
            >
                {item.user}
            </Text>

            <Text
                style={[
                    styles.rowText,
                    styles.colParticulars,
                ]}
            >
                {item.particulars}
            </Text>
        </View>
    );

    // ==================================================
    // INITIAL LOAD
    // ==================================================

    useEffect(() => {
        getUsers(1);

        getAuditReports(1);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader title="AUDIT LOG REPORT" />

            <View style={styles.contentCard}>

                {/* ==================================================
                    FILTER ROW
                ================================================== */}

                <View style={styles.filtersRow}>

                    {/* FROM DATE */}
                    <View style={styles.filterBox}>
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            From Date{' '}
                            <Text style={styles.star}>
                                *
                            </Text>
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.input}
                            onPress={() => {
                                if (exporting) {
                                    return;
                                }

                                setTempFromDate(
                                    convertStringToDate(
                                        fromDate
                                    )
                                );

                                setShowFromDatePicker(
                                    true
                                );
                            }}
                        >
                            <Text
                                style={styles.inputText}
                                numberOfLines={1}
                            >
                                {fromDate ||
                                    'From Date'}
                            </Text>

                            <CalenderIcon />
                        </TouchableOpacity>
                    </View>

                    {/* TO DATE */}
                    <View style={styles.filterBox}>
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            To Date{' '}
                            <Text style={styles.star}>
                                *
                            </Text>
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.input}
                            onPress={() => {
                                if (exporting) {
                                    return;
                                }

                                setTempToDate(
                                    convertStringToDate(
                                        toDate
                                    )
                                );

                                setShowToDatePicker(
                                    true
                                );
                            }}
                        >
                            <Text
                                style={styles.inputText}
                                numberOfLines={1}
                            >
                                {toDate ||
                                    'To Date'}
                            </Text>

                            <CalenderIcon />
                        </TouchableOpacity>
                    </View>

                    {/* FROM TIME */}
                    <View style={styles.filterBox}>
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            From Time{' '}
                            <Text style={styles.star}>
                                *
                            </Text>
                        </Text>

                        <Dropdown
                            style={styles.dropdown}
                            data={TIME_OPTIONS_12H}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Time"
                            value={fromTime}
                            onChange={item => {
                                if (exporting) {
                                    return;
                                }

                                setFromTime(
                                    item.value
                                );
                            }}
                            placeholderStyle={
                                styles.placeholderStyle
                            }
                            selectedTextStyle={
                                styles.selectedTextStyle
                            }
                            itemTextStyle={
                                styles.itemTextStyle
                            }
                            iconColor="#1B1B1B"
                            maxHeight={250}
                        />
                    </View>

                    {/* TO TIME */}
                    <View style={styles.filterBox}>
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            To Time{' '}
                            <Text style={styles.star}>
                                *
                            </Text>
                        </Text>

                        <Dropdown
                            style={styles.dropdown}
                            data={TIME_OPTIONS_12H}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Time"
                            value={toTime}
                            onChange={item => {
                                if (exporting) {
                                    return;
                                }

                                setToTime(
                                    item.value
                                );
                            }}
                            placeholderStyle={
                                styles.placeholderStyle
                            }
                            selectedTextStyle={
                                styles.selectedTextStyle
                            }
                            itemTextStyle={
                                styles.itemTextStyle
                            }
                            iconColor="#1B1B1B"
                            maxHeight={250}
                        />
                    </View>

                    {/* USER ID */}
                    <View style={styles.filterBox}>
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            User ID
                        </Text>

                        <Dropdown
                            style={styles.dropdown}
                            data={userOptions}
                            labelField="label"
                            valueField="value"
                            placeholder={
                                loadingUsers
                                    ? 'Loading users...'
                                    : 'Search user by name or ID'
                            }
                            value={
                                userId ===
                                    ALL_USERS_VALUE
                                    ? null
                                    : userId
                            }
                            onChange={item => {
                                if (exporting) {
                                    return;
                                }

                                setUserId(
                                    item.value
                                );
                            }}
                            placeholderStyle={
                                styles.placeholderStyle
                            }
                            selectedTextStyle={
                                styles.selectedTextStyle
                            }
                            itemTextStyle={
                                styles.itemTextStyle
                            }
                            iconColor="#1B1B1B"
                            maxHeight={250}
                            disable={
                                loadingUsers ||
                                exporting
                            }
                            search
                            searchPlaceholder="Search by name or ID..."
                            searchField="label"
                            inputSearchStyle={
                                styles.inputSearchStyle
                            }
                            renderRightIcon={() =>
                                null
                            }
                            renderItem={item => {
                                const isSelected =
                                    item.value ===
                                    userId;

                                return (
                                    <View
                                        style={
                                            styles.dropdownItemRow
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.checkbox,
                                                isSelected &&
                                                styles.checkboxSelected,
                                            ]}
                                        >
                                            {isSelected && (
                                                <Text
                                                    style={
                                                        styles.checkboxTick
                                                    }
                                                >
                                                    ✓
                                                </Text>
                                            )}
                                        </View>

                                        <Text
                                            style={[
                                                styles.dropdownItemText,
                                                item.value ===
                                                ALL_USERS_VALUE &&
                                                styles.selectAllText,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item.label}
                                        </Text>
                                    </View>
                                );
                            }}
                        />
                    </View>

                    {/* ==================================================
                        SEARCH / CLEAR / EXPORT
                    ================================================== */}

                    <View style={styles.actionButtons}>

                        {/* SEARCH */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[
                                styles.searchBtn,
                                exporting &&
                                styles.disabledButton,
                            ]}
                            onPress={handleSearch}
                            disabled={exporting}
                        >
                            <Text
                                style={styles.searchText}
                            >
                                Search
                            </Text>
                        </TouchableOpacity>

                        {/* CLEAR ICON */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            accessibilityLabel="Clear filters"
                            style={[
                                styles.clearIconBtn,
                                exporting &&
                                styles.disabledButton,
                            ]}
                            onPress={handleClear}
                            disabled={exporting}
                        >
                            <Text
                                style={styles.clearIcon}
                            >
                                ↻
                            </Text>
                        </TouchableOpacity>

                        {/* EXPORT ICON */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            accessibilityLabel="Export audit log"
                            style={[
                                styles.exportIconBtn,
                                exporting &&
                                styles.disabledButton,
                            ]}
                            onPress={
                                openExportOptions
                            }
                            disabled={exporting}
                        >
                            <NewDownloadIcon color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ==================================================
                    EXPORT STATUS
                ================================================== */}

                {exporting && (
                    <View style={styles.exportRow}>
                        <View
                            style={
                                styles.exportProgressWrap
                            }
                        >
                            <ActivityIndicator
                                size="small"
                                color="#264B79"
                            />

                            <Text
                                style={
                                    styles.exportProgressText
                                }
                            >
                                {exportProgress ||
                                    'Exporting...'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* ==================================================
                    EXPORT MENU
                ================================================== */}

                <Modal
                    visible={showExportOptions}
                    transparent
                    animationType="fade"
                    onRequestClose={() =>
                        setShowExportOptions(
                            false
                        )
                    }
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={
                            styles.exportMenuOverlay
                        }
                        onPress={() =>
                            setShowExportOptions(
                                false
                            )
                        }
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={styles.exportMenu}
                            onPress={() => { }}
                        >
                            <Text
                                style={
                                    styles.exportMenuTitle
                                }
                            >
                                Export as
                            </Text>

                            {/* PDF */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={
                                    styles.exportMenuItem
                                }
                                onPress={() => {
                                    setShowExportOptions(
                                        false
                                    );

                                    handleExportPDF();
                                }}
                            >
                                <Text
                                    style={
                                        styles.exportMenuItemText
                                    }
                                >
                                    PDF
                                </Text>
                            </TouchableOpacity>

                            {/* CSV */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={
                                    styles.exportMenuItem
                                }
                                onPress={() => {
                                    setShowExportOptions(
                                        false
                                    );

                                    handleExportCSV();
                                }}
                            >
                                <Text
                                    style={
                                        styles.exportMenuItemText
                                    }
                                >
                                    CSV
                                </Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>

                {/* ==================================================
                    ANDROID DATE PICKERS
                ================================================== */}

                {Platform.OS === 'android' &&
                    showFromDatePicker && (
                        <DateTimePicker
                            value={convertStringToDate(
                                fromDate
                            )}
                            mode="date"
                            display="default"
                            onChange={
                                handleFromDateChange
                            }
                        />
                    )}

                {Platform.OS === 'android' &&
                    showToDatePicker && (
                        <DateTimePicker
                            value={convertStringToDate(
                                toDate
                            )}
                            mode="date"
                            display="default"
                            minimumDate={
                                fromDate
                                    ? convertStringToDate(
                                        fromDate
                                    )
                                    : undefined
                            }
                            onChange={
                                handleToDateChange
                            }
                        />
                    )}
                <Modal
                    visible={
                        Platform.OS === 'ios' &&
                        showFromDatePicker
                    }
                    transparent
                    animationType="slide"
                >
                    <View
                        style={
                            styles.pickerOverlay
                        }
                    >
                        <View
                            style={
                                styles.pickerSheet
                            }
                        >
                            <View
                                style={
                                    styles.pickerHeader
                                }
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        setShowFromDatePicker(
                                            false
                                        )
                                    }
                                >
                                    <Text
                                        style={{
                                            color: colors.black,
                                            fontFamily:
                                                Fonts.FigtreeMedium,
                                        }}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        const newFromDate =
                                            formatDate(
                                                tempFromDate
                                            );

                                        setFromDate(
                                            newFromDate
                                        );

                                        const currentToDate =
                                            convertStringToDate(
                                                toDate
                                            );

                                        if (
                                            currentToDate <
                                            tempFromDate
                                        ) {
                                            setToDate(
                                                newFromDate
                                            );

                                            setTempToDate(
                                                tempFromDate
                                            );
                                        }

                                        setShowFromDatePicker(
                                            false
                                        );
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#264B79',
                                            fontFamily:
                                                Fonts.FigtreeSemiBold,
                                        }}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={
                                    tempFromDate
                                }
                                mode="date"
                                display="spinner"
                                onChange={
                                    handleFromDateChange
                                }
                            />
                        </View>
                    </View>
                </Modal>
                <Modal
                    visible={
                        Platform.OS === 'ios' &&
                        showToDatePicker
                    }
                    transparent
                    animationType="slide"
                >
                    <View
                        style={
                            styles.pickerOverlay
                        }
                    >
                        <View
                            style={
                                styles.pickerSheet
                            }
                        >
                            <View
                                style={
                                    styles.pickerHeader
                                }
                            >
                                <TouchableOpacity
                                    onPress={() =>
                                        setShowToDatePicker(
                                            false
                                        )
                                    }
                                >
                                    <Text
                                        style={{
                                            color: colors.black,
                                            fontFamily:
                                                Fonts.FigtreeMedium,
                                        }}
                                    >
                                        Cancel
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setToDate(
                                            formatDate(
                                                tempToDate
                                            )
                                        );

                                        setShowToDatePicker(
                                            false
                                        );
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#264B79',
                                            fontFamily:
                                                Fonts.FigtreeSemiBold,
                                        }}
                                    >
                                        Done
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={
                                    tempToDate
                                }
                                mode="date"
                                display="spinner"
                                minimumDate={
                                    fromDate
                                        ? convertStringToDate(
                                            fromDate
                                        )
                                        : undefined
                                }
                                onChange={
                                    handleToDateChange
                                }
                            />
                        </View>
                    </View>
                </Modal>

                {/* ==================================================
                    TABLE
                ================================================== */}

                <View
                    style={
                        styles.tableContainer
                    }
                >
                    {/* TABLE HEADER */}
                    <View
                        style={
                            styles.tableHeader
                        }
                    >
                        <Text
                            style={[
                                styles.headerText,
                                styles.colSno,
                            ]}
                        >
                            S.No
                        </Text>

                        <Text
                            style={[
                                styles.headerText,
                                styles.colDate,
                            ]}
                        >
                            Audit Date
                        </Text>

                        <Text
                            style={[
                                styles.headerText,
                                styles.colType,
                            ]}
                        >
                            Audit Type
                        </Text>

                        <Text
                            style={[
                                styles.headerText,
                                styles.colUser,
                            ]}
                        >
                            User ID
                        </Text>

                        <Text
                            style={[
                                styles.headerText,
                                styles.colParticulars,
                            ]}
                        >
                            Particulars
                        </Text>
                    </View>

                    {/* TABLE DATA */}
                    <FlatList
                        data={auditData}
                        keyExtractor={(
                            item,
                            index
                        ) =>
                            String(
                                item.id ||
                                `${item.sno}-${index}`
                            )
                        }
                        renderItem={
                            renderItem
                        }
                        showsVerticalScrollIndicator={
                            false
                        }
                        contentContainerStyle={
                            auditData.length === 0 ? styles.emptyContainer
                                : undefined
                        }
                        ListEmptyComponent={() => (
                            <Text
                                style={
                                    styles.emptyText
                                }
                            >
                                {loadingAudit
                                    ? 'Loading Audit Logs...'
                                    : 'No Audit Log Found'}
                            </Text>
                        )}
                    // ❌ onEndReached removed — using Pagination instead
                    />
                </View>

                {/* ==================================================
                    ✅ PAGINATION
                ================================================== */}

                <View style={styles.paginationSection}>
                    <Pagination
                        currentPage={auditPage}
                        lastPage={auditLastPage}
                        onPageChange={handlePageChange}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

export default AuditLogScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9F9F9',
    },

    contentCard: {
        flex: 1,
        marginHorizontal: rS(12),
        marginTop: rV(10),
        marginBottom: rV(10),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingHorizontal: rS(14),
        paddingTop: rV(14),
        paddingBottom: rV(14),
        borderTopColor: '#F4F4F4',
        borderTopWidth: 1,
    },
    filtersRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: rS(6),
    },

    filterBox: {
        flex: 1,
        minWidth: 0,
    },

    label: {
        fontSize: responsiveFontSize(0.9),
        marginBottom: rV(5),
        color: '#000000',
        fontWeight: '400',
        fontFamily: Fonts.FigtreeRegular,
    },

    star: {
        color: '#E71414',
    },

    input: {
        height: rV(27),
        borderColor: '#EAEAEA',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: rS(6),
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    inputText: {
        fontSize: 12,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        flexShrink: 1,
    },

    dropdown: {
        height: rV(27),
        borderColor: '#EAEAEA',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: rS(6),
        backgroundColor: '#FFFFFF',
    },

    placeholderStyle: {
        fontSize: 12,
        color: '#919191',
        fontFamily: Fonts.FigtreeRegular,
    },

    selectedTextStyle: {
        fontSize: 12,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },

    itemTextStyle: {
        fontSize: 14,
        color: '#000',
        fontFamily: Fonts.FigtreeRegular,
    },

    inputSearchStyle: {
        height: 40,
        fontSize: 13,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000',
        borderRadius: 6,
    },
    dropdownItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: rV(8),
        paddingHorizontal: rS(10),
    },

    dropdownItemText: {
        flex: 1,
        fontSize: 14,
        color: '#000',
        fontFamily: Fonts.FigtreeRegular,
    },

    selectAllText: {
        fontFamily: Fonts.FigtreeSemiBold,
        color: '#264B79',
    },

    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#B5B5B5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: rS(10),
        backgroundColor: '#FFFFFF',
    },

    checkboxSelected: {
        backgroundColor: '#264B79',
        borderColor: '#264B79',
    },

    checkboxTick: {
        color: '#FFFFFF',
        fontSize: 12,
        lineHeight: 14,
        fontFamily: Fonts.FigtreeSemiBold,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rS(5),
    },

    searchBtn: {
        backgroundColor: '#264B79',
        height: rV(27),
        paddingHorizontal: rS(12),
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    searchText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '600',
        fontSize: 12,
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

    exportIconBtn: {
        width: rS(30),
        height: rV(27),
        borderRadius: 6,
        backgroundColor: '#264B79',
        justifyContent: 'center',
        alignItems: 'center',
    },

    disabledButton: {
        opacity: 0.6,
    },
    exportRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: rV(8),
    },

    exportProgressWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 'auto',
        gap: rS(6),
    },
    exportProgressText: {
        fontSize: 11,
        color: '#264B79',
        fontFamily: Fonts.FigtreeRegular,
    },
    exportMenuOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: rV(107),
        paddingRight: rS(26),
        backgroundColor: 'rgba(0, 0, 0, 0.25)',
    },

    exportMenu: {
        width: rS(30),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: rS(4),
        elevation: 6,
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 3,
        },
    },

    exportMenuTitle: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeSemiBold,
        fontSize: responsiveFontSize(0.65),
        paddingHorizontal: rS(1),
    },

    exportMenuItem: {
        borderTopWidth: 1,
        borderTopColor: '#EEF1F5',
        paddingHorizontal: rS(6),
        paddingVertical: rV(7),
    },

    exportMenuItemText: {
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: responsiveFontSize(0.6),
    },

    // ==================================================
    // DATE PICKER
    // ==================================================

    pickerOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },

    pickerSheet: {
        backgroundColor: '#fff',
        paddingBottom: 30,
    },

    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },

    // ==================================================
    // TABLE
    // ==================================================

    tableContainer: {
        marginTop: rV(14),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        overflow: 'hidden',
        flex: 1,
    },

    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EEF9FF',
        paddingVertical: rV(8),
        paddingHorizontal: rS(10),
        alignItems: 'center',
    },

    headerText: {
        fontSize: 14,
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        textAlign: 'center',
    },

    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: rV(10),
        paddingHorizontal: rS(10),
    },

    rowText: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: '500',
        textAlign: 'center',
    },

    colSno: {
        width: '10%',
    },

    colDate: {
        width: '18%',
    },

    colType: {
        width: '18%',
    },

    colUser: {
        width: '15%',
    },

    colParticulars: {
        flex: 1,
    },

    // ==================================================
    // PAGINATION
    // ==================================================

    paginationSection: {
        paddingTop: rV(2),
        paddingBottom: rV(3),
        alignItems: 'center',
    },

    // ==================================================
    // EMPTY
    // ==================================================

    emptyContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },

    emptyText: {
        textAlign: 'center',
        marginTop: rV(30),
        color: '#919191',
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
    },
});
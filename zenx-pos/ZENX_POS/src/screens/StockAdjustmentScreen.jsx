import React, { useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Platform,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import RNPrint from 'react-native-print';
import CustomHeader from '../components/CustomHeader';
import Pagination from '../components/Pagination';
import Fonts from '../constants/Fonts';
import PlusIcon from '../assets/Icons/PlusIcon';
import ExportIcon from '../assets/Icons/ExportIcon';
import NewDownloadIcon from '../assets/Icons/NewDownloadIcon';
import SearchIcon from '../assets/Icons/SearchIcon';
import EditIcon from '../assets/Icons/EditIcon';
import EyeIcon from '../assets/Icons/EyeIcon';
import CalenderIcon from '../assets/Icons/CalenderIcon';
import { rS, rV } from '../constants/responsive';
import { Dropdown } from 'react-native-element-dropdown';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../constants/colors';
import TransferNote from '../components/TransferNote';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import { fmtNum, fmtInt } from '../utils/formatNumber';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';

const PAGE_SIZE = 10;
const EXPORT_HEADERS = ['S.No', 'Reason', 'Date', 'User', 'Status'];

export default function StockAdjustmentScreen() {
  const navigation = useNavigation();
  const { getMethod, postMethod } = HelperModule();
  const user = useSelector((state) => state.auth.user);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [activeDateField, setActiveDateField] = useState(null);
  const [tempDate, setTempDate] = useState(new Date());

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // ---------- Transfer Note Modal ----------
  const [noteModal, setNoteModal] = useState({
    visible: false,
    data: null,
    loading: false,
  });

  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Both', value: '' },
  ];

  // ---------- API ----------
  const fetchAdjustmentList = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const payload = {
        reason: searchText?.trim() || '',
        stockAdjustmentDate: fromDate || '',
      };
      const res = await postMethod(ApiServices.zenxposGetStockAdjustmentList, payload);
      if (res?.success && Array.isArray(res.data)) {
        const normalized = res.data.map(item => ({
          id: item.id,
          stockAdjustmentDate: item.stockAdjustmentDate,
          reason: item.reason,
          userId: item.userId,
          userName: item.userName,
          status: item.status,
        }));
        setData(normalized);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Fetch Stock Adjustment Error:', error);
      Alert.alert('Error', 'Failed to load Stock Adjustments list.');
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ---------- Fetch Profile ----------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMethod(ApiServices.zenxposGetProfile);
        if (res?.success) setProfile(res.data);
      } catch (err) {
        console.log('Profile fetch error:', err?.response?.data || err?.message);
      }
    };
    fetchProfile();
  }, []);

  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
      fetchAdjustmentList();
    }, []),
  );

  // ---------- Date helpers ----------
  const formatDate = d => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const convertStringToDate = dateString => {
    if (!dateString) return new Date();
    const [day, month, year] = dateString.split('-');
    return new Date(year, month - 1, day);
  };

  const toTimestamp = dateString => {
    if (!dateString) return null;
    const [day, month, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  };

  // ---------- Filtering ----------
  const filteredData = useMemo(() => {
    const fromTs = toTimestamp(fromDate);
    const toTs = toTimestamp(toDate);
    const q = searchText.trim().toLowerCase();

    return data.filter(item => {
      const matchSearch = q ? item.reason?.toLowerCase().includes(q) : true;
      const matchStatus = status ? Number(item.status) === Number(status) : true;
      const itemTs = toTimestamp(item.stockAdjustmentDate);
      const matchFromDate = fromTs ? itemTs >= fromTs : true;
      const matchToDate = toTs ? itemTs <= toTs : true;
      return matchSearch && matchStatus && matchFromDate && matchToDate;
    });
  }, [data, searchText, status, fromDate, toDate]);

  // ---------- Pagination ----------
  const lastPage = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredData.slice(start, start + PAGE_SIZE);
  }, [filteredData, currentPage]);

  useEffect(() => {
    if (currentPage > lastPage) setCurrentPage(1);
  }, [lastPage, currentPage]);

  // ---------- Date picker ----------
  const openDatePicker = field => {
    const current = field === 'from' ? fromDate : toDate;
    setTempDate(convertStringToDate(current));
    setActiveDateField(field);
  };
  const closeDatePicker = () => setActiveDateField(null);

  const applyDate = selectedDate => {
    if (!selectedDate || !activeDateField) return;
    const formatted = formatDate(selectedDate);
    if (activeDateField === 'from') setFromDate(formatted);
    else setToDate(formatted);
    setCurrentPage(1);
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      closeDatePicker();
      if (event.type === 'set' && selectedDate) applyDate(selectedDate);
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };
  const handleIosDone = () => { applyDate(tempDate); closeDatePicker(); };
  const clearFromDate = () => { setFromDate(''); setCurrentPage(1); };
  const clearToDate = () => { setToDate(''); setCurrentPage(1); };
  const handleSearch = () => { setCurrentPage(1); fetchAdjustmentList(); };

  // ---------- OPEN TRANSFER NOTE MODAL ----------
  const openNoteModal = async item => {
    try {
      setNoteModal({ visible: true, data: null, loading: true });

      const res = await postMethod(ApiServices.zenxposGetStockAdjustmentById, {
        stockAdjustmentId: Number(item.id),
      });

      if (res?.success && res.data) {
        const d = res.data;
        const mapped = {
          adjustmentNumber: String(d.stockAdjustmentId ?? ''),
          date: d.stockAdjustmentDate,
          reason: d.reason,
          remarks: d.remarks,
          status: d.status,
          products: (d.products || []).map(p => {
            const cost = Number(p.costPrice) || 0;
            const q = Number(p.qty) || 0;
            return {
              itemCode: p.productCode ?? '',
              variantCode: p.packSize ?? '',
              eanCode: p.eanCode ?? '',
              itemName: p.productFullName ?? '',
              costPrice: p.costPrice ?? '0.000',
              mrp: p.mrp ?? '0.000',
              qty: String(q),
              totalAmount: (cost * q).toFixed(2),
            };
          }),
        };
        setNoteModal({ visible: true, data: mapped, loading: false });
      } else {
        setNoteModal({ visible: false, data: null, loading: false });
        Alert.alert('Error', res?.message || 'Failed to load details.');
      }
    } catch (err) {
      console.error('fetchAdjustmentById error:', err);
      setNoteModal({ visible: false, data: null, loading: false });
      Alert.alert('Error', 'Failed to load Stock Adjustment details.');
    }
  };

  const closeNoteModal = () => {
    setNoteModal({ visible: false, data: null, loading: false });
  };

  // ---------- EXPORT META ROWS ----------
  const buildNoteMetaRows = () => {
    const data = noteModal.data;
    if (!data) return [];
    const documentDate = data?.date || '';
    const documentId = data?.adjustmentNumber || '';
    const statusValue = data?.status;
    const statusText = statusValue === 1 ? 'Completed' : statusValue === 0 ? 'Pending' : 'Pending';
    const locationCode = profile?.pincode || profile?.locationCode || '';
    const locationName = profile?.city || profile?.locationName || '';
    const locationAddress = [profile?.address, profile?.city, profile?.pincode ? `${profile.pincode}` : null]
      .filter(Boolean).join(', ');
    const userId = user?.id || user?.userId || profile?.userId || '';

    return [
      { label: 'Note.No', value: documentId },
      { label: 'Location Code', value: locationCode },
      { label: 'Location Name', value: locationName },
      { label: 'Address', value: locationAddress },
      { label: 'Date', value: documentDate },
      { label: 'Reason', value: data?.reason || '' },
      { label: 'User ID', value: userId },
      { label: 'Status', value: statusText },
      { label: 'Remarks', value: data?.remarks || '' },
    ];
  };

  // ---------- GET NOTE EXPORT DATA ----------
  const getNoteExportData = () => {
    const noteItems = noteModal.data?.products || [];
    const headers = ['S.No', 'Product Code', 'Product Name', 'Variant Code', 'EAN Code', 'MRP', 'Cost Price', 'Qty', 'Amount'];

    const exportRows = noteItems.map((item, index) => ({
      'S.No': index + 1,
      'Product Code': item.itemCode || '',
      'Product Name': item.itemName || '',
      'Variant Code': item.variantCode || '',
      'EAN Code': item.eanCode || '',
      MRP: fmtNum(item.mrp),
      'Cost Price': fmtNum(item.costPrice),
      Qty: fmtInt(item.qty),
      Amount: fmtNum(item.totalAmount),
    }));

    const totalQty = noteItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalAmt = noteItems.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0).toFixed(2);

    exportRows.push({
      'S.No': '',
      'Product Code': '',
      'Product Name': `ITEMS: ${noteItems.length}`,
      'Variant Code': '',
      'EAN Code': '',
      MRP: '',
      'Cost Price': '',
      Qty: fmtInt(totalQty),
      Amount: `₹${fmtNum(totalAmt)}`,
    });
    return { headers, exportRows };
  };

  // ---------- EXPORT NOTE PDF ----------
  const handleNoteExportPDF = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getNoteExportData();
    const fileName = `Note_ADJ_${Date.now()}`;

    await exportToPDF(
      exportRows, headers, fileName,
      'STOCK ADJUSTMENT NOTE',
      profile?.businessName || user?.businessName || '',
      buildNoteMetaRows(),
    );
  };

  // ---------- EXPORT NOTE CSV ----------
  const handleNoteExportCSV = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getNoteExportData();
    const fileName = `Note_ADJ_${Date.now()}`;

    await exportToCSV(
      exportRows, headers, fileName,
      profile?.businessName || user?.businessName || '',
      'STOCK ADJUSTMENT NOTE',
      buildNoteMetaRows(),
    );
  };

  // ---------- PRINT NOTE ----------
  const handleNotePrint = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to print.');
      return;
    }

    const data = noteModal.data;
    const companyName = profile?.businessName || user?.businessName;
    const fullAddress = [profile?.address || user?.address, profile?.city || user?.city].filter(Boolean).join(', ');
    const userMobile = profile?.mobile || user?.mobile;
    const gstNo = profile?.gstNumber;
    const remarksText = data?.remarks || '';

    const metaRows = buildNoteMetaRows();
    const metaPairs = [];
    for (let i = 0; i < metaRows.length; i += 2) {
      metaPairs.push([metaRows[i], metaRows[i + 1] || null]);
    }

    const metaTableHtml = metaRows.length
      ? `<table class="meta-table"><tbody>
          ${metaPairs.map(([left, right]) => `
            <tr>
              <td class="meta-label">${left.label}</td>
              <td class="meta-colon">:</td>
              <td class="meta-value">${left.value}</td>
              <td class="meta-label">${right ? right.label : ''}</td>
              <td class="meta-colon">${right ? ':' : ''}</td>
              <td class="meta-value">${right ? right.value : ''}</td>
            </tr>
          `).join('')}
        </tbody></table>` : '';

    const totalItems = noteItems.length;
    const totalQty = noteItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalAmt = noteItems.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0).toFixed(2);

    const tableHeaders = `<th>S.No</th><th>Product Code</th><th>Product Name</th><th>Variant Code</th><th>EAN Code</th><th class="text-right">MRP</th><th class="text-right">Cost Price</th><th class="text-center">Qty</th><th class="text-right">Amount</th>`;

    const tableRows = noteItems.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.itemCode || ''}</td>
        <td>${item.itemName || ''}</td>
        <td>${item.variantCode || ''}</td>
        <td>${item.eanCode || ''}</td>
        <td class="text-right">${fmtNum(item.mrp)}</td>
        <td class="text-right">${fmtNum(item.costPrice)}</td>
        <td class="text-center">${fmtInt(item.qty)}</td>
        <td class="text-right">${fmtNum(item.totalAmount)}</td>
      </tr>
    `).join('');

    const totalRow = `<td colspan="5" class="text-right">ITEMS: ${totalItems}</td><td class="text-right"></td><td class="text-right"></td><td class="text-center">${fmtInt(totalQty)}</td><td class="text-right">₹${fmtNum(totalAmt)}</td>`;

    const htmlContent = `
    <html><head><style>
      body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
      .header { text-align: center; margin-bottom: 10px; }
      .header h1 { margin: 0; font-size: 22px; }
      .header p { margin: 2px 0; font-size: 12px; }
      .header .gst { font-weight: bold; font-size: 13px; margin-top: 5px; }
      .thick-divider { border-bottom: 2px solid #000; margin: 10px 0; }
      .thin-divider { border-bottom: 1px solid #000; margin: 8px 0; }
      .note-title { text-align: center; font-weight: bold; font-size: 14px; margin: 5px 0; }
      .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0 20px 0; border: 1px solid #ddd; background: #F7F9FC; }
      .meta-table td { padding: 5px 8px; font-size: 11px; vertical-align: top; border: none; word-break: break-word; }
      .meta-table .meta-label { width: 14%; font-weight: bold; color: #555; }
      .meta-table .meta-colon { width: 2%; color: #555; }
      .meta-table .meta-value { width: 34%; color: #000; }
      .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .table th, .table td { border: 1px solid #ddd; padding: 6px; font-size: 11px; text-align: left; }
      .table th { background-color: #F5F5F5; font-weight: bold; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .totals-row { background-color: #F9F9F9; font-weight: bold; }
      .footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; }
      .footer-right { text-align: right; margin-top: 30px; }
    </style></head><body>
      <div class="header">
        ${companyName ? `<h1>${companyName.toUpperCase()}</h1>` : ''}
        ${fullAddress || userMobile ? `<p>${fullAddress || ''}${fullAddress && userMobile ? ' &nbsp;|&nbsp; ' : ''}${userMobile ? `Contact: ${userMobile}` : ''}</p>` : ''}
        ${gstNo ? `<p class="gst">GST.NO: ${gstNo}</p>` : ''}
      </div>
      <div class="thick-divider"></div>
      <div class="note-title">STOCK ADJUSTMENT NOTE</div>
      <div class="thin-divider"></div>
      ${metaTableHtml}
      <table class="table">
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}<tr class="totals-row">${totalRow}</tr></tbody>
      </table>
      <div class="footer">
        <div>${remarksText ? `<p><b>REMARKS</b></p><p>${remarksText}</p>` : ''}</div>
        <div class="footer-right">
          ${companyName ? `<p>For: ${companyName}</p>` : ''}
          <br/><br/>
          <p>Authorized Signatory</p>
        </div>
      </div>
    </body></html>`;

    try {
      await RNPrint.print({ html: htmlContent });
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert('Error', 'Could not generate Print view');
    }
  };

  // ---------- Row renderer ----------
  const renderItem = ({ item, index }) => {
    const isActive = Number(item.status) === 1;
    const sno = (currentPage - 1) * PAGE_SIZE + index + 1;

    return (
      <View style={styles.tableRow}>
        <Text style={[styles.rowText, { width: '8%' }]}>{sno}</Text>
        <Text style={[styles.rowText, { width: '26%' }]}>{item.reason}</Text>
        <Text style={[styles.rowText, { width: '16%' }]}>{item.stockAdjustmentDate}</Text>
        <Text style={[styles.rowText, { width: '22%' }]}>{item.userName}</Text>
        <Text style={[styles.rowText, { width: '10%', color: isActive ? '#1B8A3D' : '#C21414', fontFamily: Fonts.FigtreeSemiBold }]}>
          {isActive ? 'Y' : 'N'}
        </Text>
        <View style={{ width: '18%', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.rowActionButton}
            hitSlop={8}
            onPress={() => {
              if (isActive) {
                openNoteModal(item);
              } else {
                navigation.navigate('AddStockAdjustmentScreen', { id: item.id, mode: 'edit' });
              }
            }}
          >
            {isActive ? <EyeIcon /> : <EditIcon />}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---------- LIST EXPORT ----------
  const buildExportRows = () =>
    filteredData.map((r, idx) => ({
      'S.No': idx + 1,
      Reason: r.reason,
      Date: r.stockAdjustmentDate,
      User: r.userName,
      Status: Number(r.status) === 1 ? 'Y' : 'N',
    }));

  const handleExportCSV = async () => {
    if (isExporting) return;
    if (!filteredData.length) { Alert.alert('No Data', 'There is nothing to export.'); return; }
    try {
      setIsExporting(true);
      await exportToCSV(buildExportRows(), EXPORT_HEADERS, 'stock_adjustments', 'Your Company Name', 'Stock Adjustments Report');
    } catch (e) {
      Alert.alert('CSV Export Error', e?.message ?? 'Unknown error');
    } finally { setIsExporting(false); }
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    if (!filteredData.length) { Alert.alert('No Data', 'There is nothing to export.'); return; }
    try {
      setIsExporting(true);
      await exportToPDF(buildExportRows(), EXPORT_HEADERS, 'stock_adjustments', 'Stock Adjustments Report', 'Your Company Name');
    } catch (e) {
      Alert.alert('PDF Export Error', e?.message ?? 'Unknown error');
    } finally { setIsExporting(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        <View style={styles.categoryRowContainer}>
          <View>
            <Text style={styles.categoryText}>Stock Adjustments</Text>
            <Text style={styles.categorySubText}>Create or Manage Stock Adjustments</Text>
          </View>
          <TouchableOpacity style={styles.newCategoryTouchable} onPress={() => navigation.navigate('AddStockAdjustmentScreen')}>
            <PlusIcon />
            <Text style={styles.addNewCategoryText}>Add New</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Reason"
              placeholderTextColor={'#919191'}
              value={searchText}
              onChangeText={text => { setSearchText(text); setCurrentPage(1); }}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => openDatePicker('from')}
            >
              <Text numberOfLines={1} style={{ flex: 1, color: fromDate ? '#000' : '#9A9A9A', fontFamily: Fonts.FigtreeRegular, fontSize: 12 }}>
                {fromDate || 'From Date'}
              </Text>
              {fromDate ? (
                <TouchableOpacity onPress={clearFromDate} hitSlop={8}><Text style={styles.clearIcon}>×</Text></TouchableOpacity>
              ) : <CalenderIcon />}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => openDatePicker('to')}
            >
              <Text numberOfLines={1} style={{ flex: 1, color: toDate ? '#000' : '#9A9A9A', fontFamily: Fonts.FigtreeRegular, fontSize: 12 }}>
                {toDate || 'To Date'}
              </Text>
              {toDate ? (
                <TouchableOpacity onPress={clearToDate} hitSlop={8}><Text style={styles.clearIcon}>×</Text></TouchableOpacity>
              ) : <CalenderIcon />}
            </TouchableOpacity>

            <Dropdown
              style={styles.dropdown}
              data={statusData}
              labelField="label"
              valueField="value"
              placeholder="Status"
              value={status}
              onChange={item => { setStatus(item.value); setCurrentPage(1); }}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              iconColor="#1B1B1B"
            />

            {Platform.OS === 'android' && activeDateField && (
              <DateTimePicker value={tempDate} mode="date" display="default" onChange={handleDateChange} />
            )}

            <Modal visible={Platform.OS === 'ios' && !!activeDateField} transparent animationType="slide" onRequestClose={closeDatePicker}>
              <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <View style={{ backgroundColor: '#fff', paddingBottom: 30 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                    <TouchableOpacity onPress={closeDatePicker}><Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleIosDone}><Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>Done</Text></TouchableOpacity>
                  </View>
                  <DateTimePicker value={tempDate} mode="date" display="spinner" onChange={handleDateChange} />
                </View>
              </View>
            </Modal>

            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}><SearchIcon /></TouchableOpacity>
          </View>

          <View style={styles.exportWrap}>
            <TouchableOpacity
              style={styles.exportContainer}
              onPress={() => setShowExportMenu(v => !v)}
              activeOpacity={0.7}
              disabled={isExporting}
            >
              <ExportIcon />
              <Text style={styles.exportText}>{isExporting ? 'Exporting...' : 'Export'}</Text>
            </TouchableOpacity>

            {showExportMenu && !isExporting && (
              <View style={styles.exportMenu}>
                <TouchableOpacity style={styles.exportMenuItem} onPress={() => { setShowExportMenu(false); handleExportCSV(); }}>
                  <NewDownloadIcon color="#264B79" /><Text style={styles.exportMenuText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportMenuItem} onPress={() => { setShowExportMenu(false); handleExportPDF(); }}>
                  <NewDownloadIcon color="#264B79" /><Text style={styles.exportMenuText}>PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: '8%' }]}>S.No</Text>
            <Text style={[styles.headerText, { width: '26%' }]}>Reason</Text>
            <Text style={[styles.headerText, { width: '16%' }]}>Date</Text>
            <Text style={[styles.headerText, { width: '22%' }]}>User</Text>
            <Text style={[styles.headerText, { width: '10%' }]}>Status</Text>
            <Text style={[styles.headerText, { width: '18%' }]}>Actions</Text>
          </View>

          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#264B79" />
              <Text style={styles.loaderText}>Loading Stock Adjustments...</Text>
            </View>
          ) : (
            <FlatList
              data={paginatedData}
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAdjustmentList(false); }}
              ListEmptyComponent={() => <Text style={styles.emptyText}>No Stock Adjustment Found</Text>}
            />
          )}
        </View>

        <View style={styles.paginationContainer}>
          <Pagination currentPage={currentPage} lastPage={lastPage} onPageChange={setCurrentPage} />
        </View>
      </View>

      {/* 📄 STOCK ADJUSTMENT NOTE PREVIEW — IN-PLACE OVERLAY */}
      <Modal
        visible={noteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeNoteModal}
      >
        <View style={styles.noteOverlay}>
          <View style={styles.noteCard}>
            {/* Header */}
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Stock Adjustment Note</Text>
              <TouchableOpacity onPress={closeNoteModal} hitSlop={10}>
                <Text style={styles.noteModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Body */}
            {noteModal.loading ? (
              <View style={styles.noteModalLoaderWrap}>
                <ActivityIndicator size="large" color="#264B79" />
                <Text style={styles.noteModalLoaderText}>Loading Note...</Text>
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.noteModalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {noteModal.data ? (
                  <TransferNote data={noteModal.data} noteType="ADJUSTMENT" profile={profile} />
                ) : null}
              </ScrollView>
            )}

            {/* Bottom action bar */}
            <View style={styles.noteModalBottomBar}>
              <TouchableOpacity
                style={[styles.noteModalActionBtn, noteModal.loading && { opacity: 0.5 }]}
                onPress={handleNotePrint}
                disabled={noteModal.loading}
              >
                <Text style={styles.noteModalActionText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalActionBtn, noteModal.loading && { opacity: 0.5 }]}
                onPress={handleNoteExportPDF}
                disabled={noteModal.loading}
              >
                <Text style={styles.noteModalActionText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalActionBtn, noteModal.loading && { opacity: 0.5 }]}
                onPress={handleNoteExportCSV}
                disabled={noteModal.loading}
              >
                <Text style={styles.noteModalActionText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalActionBtn, styles.noteModalActionBtnSecondary]}
                onPress={closeNoteModal}
              >
                <Text style={[styles.noteModalActionText, styles.noteModalActionTextSecondary]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: rS(12),
    paddingBottom: rV(10),
    borderTopColor: '#F4F4F4',
    borderTopWidth: 1,
  },
  categoryRowContainer: { flexDirection: 'row', marginTop: rV(10), justifyContent: 'space-between', alignItems: 'center' },
  categoryText: { color: '#000000', fontFamily: Fonts.FigtreeSemiBold, fontSize: 22 },
  categorySubText: { color: '#919191', fontSize: 12, fontFamily: Fonts.FigtreeRegular, marginTop: rV(2) },
  newCategoryTouchable: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(20),
  },
  addNewCategoryText: { marginLeft: rS(4), fontSize: 14, fontFamily: Fonts.FigtreeMedium, color: '#264B79' },
  filterMainContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: rV(10), zIndex: 5 },
  leftFilterContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  searchInput: {
    height: rV(27),
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEA',
    borderWidth: 1,
    width: rS(120),
    borderRadius: 6,
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
    paddingHorizontal: rS(8),
  },
  input: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(6),
    backgroundColor: '#FFFFFF',
    width: rS(78),
    marginLeft: rS(6),
  },
  clearIcon: { fontSize: 16, color: '#919191', fontFamily: Fonts.FigtreeMedium, marginLeft: rS(2) },
  dropdown: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(6),
    backgroundColor: '#FFFFFF',
    width: rS(72),
    marginLeft: rS(6),
  },
  placeholderStyle: { fontSize: 12, color: '#919191', fontFamily: Fonts.FigtreeRegular },
  selectedTextStyle: { fontSize: 12, color: '#000000', fontFamily: Fonts.FigtreeRegular },
  itemTextStyle: { fontSize: 13, color: '#000', fontFamily: Fonts.FigtreeRegular },
  searchButton: {
    width: rS(28),
    height: rV(27),
    backgroundColor: '#264B79',
    borderRadius: 6,
    marginLeft: rS(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportWrap: { position: 'relative' },
  exportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: rS(6),
    paddingHorizontal: rS(8),
    height: rV(27),
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  exportText: { fontSize: 15, fontFamily: Fonts.FigtreeMedium, color: '#264B79', marginLeft: rS(3) },
  exportMenu: {
    position: 'absolute',
    top: rV(32),
    right: 0,
    width: rS(50),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 6,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  exportMenuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: rV(7), paddingHorizontal: rS(8) },
  exportMenuText: { color: '#264B79', fontSize: 13, fontFamily: Fonts.FigtreeMedium, marginLeft: rS(6) },
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
  headerText: { fontSize: 13, color: '#264B79', fontFamily: Fonts.FigtreeMedium, textAlign: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: rV(6), paddingHorizontal: rS(6) },
  rowActionButton: { minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  rowText: { fontSize: 13, color: '#000000', fontFamily: Fonts.FigtreeRegular, textAlign: 'center' },
  emptyText: { textAlign: 'center', marginTop: rV(30), color: '#919191', fontSize: 14, fontFamily: Fonts.FigtreeRegular },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: rV(40) },
  loaderText: { marginTop: rV(10), color: '#264B79', fontSize: 13, fontFamily: Fonts.FigtreeRegular },
  paginationContainer: { paddingVertical: rV(2), backgroundColor: '#F9F9F9' },


  noteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(12),
    paddingVertical: rV(30),
  },
  noteCard: {
    width: '100%',
    maxWidth: "70%",
    maxHeight: '92%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  noteModalHeader: {
    height: rV(28),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rS(14),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 3,
  },
  noteModalTitle: { fontSize: 15, color: '#264B79', fontFamily: Fonts.FigtreeSemiBold },
  noteModalClose: { fontSize: 20, color: '#264B79', fontFamily: Fonts.FigtreeMedium, paddingHorizontal: rS(4) },
  noteModalScrollContent: { padding: rS(8), paddingBottom: rV(40), alignItems: 'center' },
  noteModalLoaderWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    // backgroundColor: "yellow",
    paddingVertical: rV(40),
    paddingHorizontal: rV(40),


  },
  noteModalLoaderText: { marginTop: rV(10), color: '#264B79', fontFamily: Fonts.FigtreeRegular, fontSize: 13 },
  noteModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: rV(48),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: rS(10),
    elevation: 5,
  },
  noteModalActionBtn: {
    height: rV(26),
    paddingHorizontal: rS(12),
    borderRadius: rS(3),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rS(6),
    backgroundColor: '#264B79',
  },
  noteModalActionText: { color: '#FFFFFF', fontSize: 12, fontFamily: Fonts.FigtreeSemiBold },
  noteModalActionBtnSecondary: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#264B79' },
  noteModalActionTextSecondary: { color: '#264B79' },
});
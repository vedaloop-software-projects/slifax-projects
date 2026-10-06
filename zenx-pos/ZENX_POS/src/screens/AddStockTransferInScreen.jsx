import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  Keyboard,
  ToastAndroid,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import RNPrint from 'react-native-print';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalenderIcon from '../assets/Icons/CalenderIcon';
import DeleteIcon from '../assets/Icons/DeleteIcon';
import PlusIcon from '../assets/Icons/PlusIcon';
import BarCodeScannerIcon from '../assets/Icons/BarCodeScannerIcon';
import NewSearchIcon from '../assets/Icons/NewSearchIcon';
import colors from '../constants/colors';
import TransferNote from '../components/TransferNote';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import { fmtNum, fmtInt } from '../utils/formatNumber';
import { buildPrintHtml } from '../utils/printNoteHtml';
import LoadingOverlay from '../components/LoadingOverlay';
import SuccessModal from '../components/SuccessModal';
import ProductSearchModal from '../components/ProductSearchModal';
import EANVariantPickerModal from '../components/EANVariantPickerModal';

import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';

const MAX_FREE_QTY_DIGITS = 2;

const AddStockTransferInScreen = ({ route, navigation }) => {
  const { getMethod, postMethod } = HelperModule();
  const user = useSelector((state) => state.auth.user);

  const transferInId = route?.params?.id ?? null;
  const isEditMode = !!transferInId;
  const isViewMode = route?.params?.mode === 'view';
  const [keyboardExtraHeight, setKeyboardExtraHeight] = useState(0);

  // ---------- Header fields ----------
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [recievedFrom, setRecievedFrom] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // ---------- Profile ----------
  const [profile, setProfile] = useState(null);

  // ---------- Bottom "Add Item" fields ----------
  const [itemCode, setItemCode] = useState('');
  const [variantCode, setVariantCode] = useState('');
  const [eanCode, setEanCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [cp, setCp] = useState('');
  const [mrp, setMrp] = useState('');
  const [qty, setQty] = useState('');
  const [free_qty, free_SetQty] = useState('');

  const [productId, setProductId] = useState(null);
  const [variantId, setVariantId] = useState(null);

  // ---------- Product Search Modal ----------
  const [showProductSearchModal, setShowProductSearchModal] = useState(false);

  // ---------- EAN Variant Picker Modal ----------
  const [eanPicker, setEanPicker] = useState({
    visible: false,
    items: [],
    ean: '',
  });

  // ---------- Remarks ----------
  const [remarks, setRemarks] = useState('');

  // ---------- Table rows ----------
  const [rows, setRows] = useState([]);

  // ---------- Loading ----------
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const handleBarCodeScan = () => { };

  // ---------- Success Modal ----------
  const [successModal, setSuccessModal] = useState({
    visible: false,
    isDraft: false,
    savedId: null,
    message: '',
    transferNumber: '',
  });

  // ---------- Transfer Note Preview Modal ----------
  const [noteModal, setNoteModal] = useState({
    visible: false,
    data: null,
    fromList: false,
  });

  const scrollRef = useRef(null);
  const qtyInputRef = useRef(null);
  const externalScannerInputRef = useRef(null);

  const handleInputFocus = () => {
    setKeyboardExtraHeight(200);
  };

  useEffect(() => {
    const keyboardHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardExtraHeight(0);
      },
    );
    return () => {
      keyboardHideListener.remove();
    };
  }, []);

  const handleExternalScannerInput = text => {
    const cleanedCode = text.replace(/[\r\n\s]/g, '');
    setItemCode(cleanedCode);
  };

  const handleExternalScannerSubmit = () => {
    const code = itemCode.trim();
    if (!code) return;
    handleEANSearch(code);
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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'set' && selectedDate) {
        setDate(formatDate(selectedDate));
      }
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  // ---------- Reset ----------
  const resetForm = useCallback(() => {
    setReason('');
    setDate(formatDate(new Date()));
    setLocation('');
    setRecievedFrom('');
    setRemarks('');
    setItemCode('');
    setVariantCode('');
    setEanCode('');
    setItemName('');
    setCp('');
    setMrp('');
    setQty('');
    free_SetQty('');
    setProductId(null);
    setVariantId(null);
    setShowProductSearchModal(false);
    setRows([]);
    setDeletingId(null);
    setEanPicker({ visible: false, items: [], ean: '' });
  }, []);

  // ---------- API: last transfer-in number ----------
  const fetchLastTransferInNumber = async () => {
    try {
      setLoading(true);
      const res = await getMethod(ApiServices.zenxposGetTransferInNumber);
      if (res?.success && res.data) {
        setReason(String(res.data.nextTransferInNumber ?? ''));
      }
    } catch (err) {
      console.error('getTransferInNumber error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---------- API: transfer-in by id ----------
  const fetchTransferInById = async id => {
    try {
      setLoading(true);
      const res = await postMethod(ApiServices.zenxposGetTransferInById, {
        transferInId: Number(id),
      });

      if (res?.success && res.data) {
        const d = res.data;
        setReason(String(d.transferInNumber ?? ''));
        setDate(d.transferInDate ?? '');
        setRecievedFrom(d.receivedFrom ?? '');
        setLocation(d.location ?? '');

        const mapped = (d.products || []).map(p => {
          const cost = Number(p.costPrice) || 0;
          const q = Number(p.qty) || 0;
          return {
            id: p.id,
            dbId: p.id,
            lineNum: p.lineNum,
            productId: p.productId,
            variantId: p.variantId,
            itemCode: p.productCode ?? '',
            variantCode: p.packSize ?? '',
            eanCode: p.eanCode ?? '',
            itemName: p.productFullName ?? '',
            costPrice: p.costPrice ?? '0.000',
            mrp: p.mrp ?? '0.000',
            qty: String(q),
            free_qty: String(Number(p.freeQty ?? 0)),
            totalAmount: (cost * q).toFixed(2),
          };
        });
        setRows(mapped);
      } else {
        Alert.alert('Error', res?.message || 'Failed to load details.');
      }
    } catch (err) {
      console.error('getTransferInById error:', err);
      Alert.alert('Error', 'Failed to load Transfer-In details.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Focus effect ----------
  useFocusEffect(
    useCallback(() => {
      if (isEditMode) {
        fetchTransferInById(transferInId);
      } else {
        resetForm();
        fetchLastTransferInNumber();
      }
    }, [isEditMode, transferInId, resetForm]),
  );

  // ---------- Apply selected variant to Add Item fields ----------
  const applySelectedVariant = useCallback((product) => {
    setItemCode(product.productCode ?? '');
    setVariantCode(product.packSize ?? '');
    setEanCode(product.eanCode ?? '');
    setItemName(product.productFullName ?? '');
    setCp(String(product.costPrice ?? ''));
    setMrp(String(product.mrp ?? ''));
    setProductId(product.productId ?? null);
    setVariantId(product.variantId ?? null);

    setTimeout(() => {
      qtyInputRef.current?.focus();
    }, 300);
  }, []);

  // ---------- EAN Search (multi-variant aware) ----------
  const handleEANSearch = async (ean) => {
    const code = ean?.trim();
    if (!code) return;

    try {
      setLoading(true);

      const res = await postMethod(ApiServices.zenxposSearchEANCode, {
        searchStr: code,
      });

      console.log('EAN SEARCH RESPONSE:', JSON.stringify(res));

      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        if (res.data.length === 1) {
          applySelectedVariant(res.data[0]);
        } else {
          setEanPicker({
            visible: true,
            items: res.data,
            ean: code,
          });
        }
      } else {
        Alert.alert(
          'Product Not Found',
          `No product found for barcode ${code}`,
        );
        setItemCode('');
      }
    } catch (error) {
      console.log(
        'EAN SEARCH ERROR:',
        error?.response?.data || error?.message,
      );
      Alert.alert('Error', 'Unable to search barcode.');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Select product ----------
  const handleSelectProduct = p => {
    setItemCode(p.productCode ?? '');
    setVariantCode(p.packSize ?? '');
    setEanCode(p.eanCode ?? '');
    setItemName(p.productFullName ?? '');
    setCp(String(p.costPrice ?? ''));
    setMrp(String(p.mrp ?? ''));
    setProductId(p.productId ?? null);
    setVariantId(p.variantId ?? null);
    setShowProductSearchModal(false);
    setTimeout(() => {
      qtyInputRef.current?.focus();
    }, 300);
  };

  const handleFreeQtyChange = text => {
    const cleaned = text.replace(/[^0-9]/g, '');

    if (cleaned === '') {
      free_SetQty('');
      return;
    }

    if (cleaned.length > MAX_FREE_QTY_DIGITS) {
      ToastAndroid.show('Free Qty can only be 0-99', ToastAndroid.SHORT);
      return;
    }

    free_SetQty(cleaned);
  };

  // ---------- Inline edit: Qty in a row ----------
  const handleRowQtyChange = (id, value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setRows(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const cost = Number(r.costPrice) || 0;
        const q = Number(cleaned) || 0;
        return {
          ...r,
          qty: cleaned,
          totalAmount: (cost * q).toFixed(2),
        };
      }),
    );
  };

  // ---------- Inline edit: Free Qty in a row ----------
  const handleRowFreeQtyChange = (id, value) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    if (cleaned.length > MAX_FREE_QTY_DIGITS) {
      ToastAndroid.show('Free Qty can only be 0-99', ToastAndroid.SHORT);
      return;
    }
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, free_qty: cleaned } : r)),
    );
  };

  // ---------- Add item ----------
  const handleAddItem = () => {
    if (!itemCode.trim() || !itemName.trim()) {
      Alert.alert('Validation', 'Please select a product first.');
      return;
    }
    if (!productId || !variantId) {
      Alert.alert('Validation', 'Please select a product from the search modal.');
      return;
    }
    if (!qty || !qty.trim()) {
      Alert.alert('Validation', 'Qty is required.');
      return;
    }
    if (free_qty && free_qty.length > MAX_FREE_QTY_DIGITS) {
      Alert.alert(
        'Validation',
        `Free Qty can only have ${MAX_FREE_QTY_DIGITS} digits (0-99).`,
      );
      return;
    }

    const cost = Number(cp) || 0;
    const q = Number(qty) || 0;

    const newRow = {
      id: Date.now(),
      dbId: 0,
      lineNum: rows.length + 1,
      productId,
      variantId,
      itemCode: itemCode.trim(),
      variantCode: variantCode.trim(),
      eanCode: eanCode.trim(),
      itemName: itemName.trim(),
      costPrice: cp.trim() || '0.00',
      mrp: mrp.trim() || '0.00',
      qty: qty.trim() || '0',
      free_qty: free_qty.trim() || '0',
      totalAmount: (cost * q).toFixed(2),
    };

    setRows(prev => [...prev, newRow]);

    setItemCode('');
    setVariantCode('');
    setEanCode('');
    setItemName('');
    setCp('');
    setMrp('');
    setProductId(null);
    setVariantId(null);
    setQty('');
    free_SetQty('');
    setTimeout(() => {
      externalScannerInputRef.current?.focus();
    }, 300);
  };

  // ---------- Delete row ----------
  const handleDeleteRow = id => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    const isSavedRow = isEditMode && row.dbId && row.dbId > 0;

    if (isSavedRow) {
      Alert.alert(
        'Delete Item',
        `Are you sure you want to delete "${row.itemName}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setDeletingId(id);
                const payload = {
                  transferInId: Number(transferInId),
                  transferTranId: Number(row.dbId),
                };
                const res = await postMethod(
                  ApiServices.zenxposDeleteTransferInProduct,
                  payload,
                );
                if (res?.success) {
                  setRows(prev => prev.filter(r => r.id !== id));
                } else {
                  Alert.alert(
                    'Delete Failed',
                    res?.message || 'Could not delete this item.',
                  );
                }
              } catch (err) {
                console.error('deleteTransferInProduct error:', err);
                Alert.alert(
                  'Delete Error',
                  err?.response?.data?.message || err?.message || 'Unknown error',
                );
              } finally {
                setDeletingId(null);
              }
            },
          },
        ],
      );
    } else {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  // ---------- Totals ----------
  const totalItems = rows.length;
  const totalQty = rows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const totalAmount = rows.reduce(
    (sum, r) => sum + (Number(r.totalAmount) || 0),
    0,
  );

  // ---------- Save handler ----------
  const submitTransferIn = async statusValue => {
    if (isEditMode && !recievedFrom?.trim()) {
      Alert.alert(
        'Data Not Loaded',
        'Transfer-In details could not be loaded. Please go back and try again.',
      );
      return;
    }
    if (!date) {
      Alert.alert('Validation', 'Date is required.');
      return;
    }
    if (!recievedFrom.trim()) {
      Alert.alert('Validation', 'Received From is required.');
      return;
    }
    if (rows.length === 0) {
      Alert.alert('Validation', 'Please add at least one item.');
      return;
    }

    const invalid = rows.find(r => !r.productId || !r.variantId);
    if (invalid) {
      Alert.alert(
        'Validation',
        'Some items are missing product/variant info. Please re-select from suggestions.',
      );
      return;
    }
    const qtyInvalid = rows.find(r => {
      const q = Number(r.qty);
      return !Number.isFinite(q) || q <= 0;
    });
    if (qtyInvalid) {
      Alert.alert(
        'Validation',
        'Some items have invalid Qty (must be greater than 0).',
      );
      return;
    }
    const freeQtyInvalid = rows.find(
      r => String(r.free_qty ?? '').length > MAX_FREE_QTY_DIGITS,
    );
    if (freeQtyInvalid) {
      Alert.alert(
        'Validation',
        `Free Qty can only have ${MAX_FREE_QTY_DIGITS} digits (0-99) for any item.`,
      );
      return;
    }

    try {
      setSaving(true);

      const products = rows.map((r, idx) => {
        const base = {
          lineNum: idx + 1,
          productId: Number(r.productId),
          variantId: Number(r.variantId),
          qty: Number(r.qty) || 0,
          freeQty: Number(r.free_qty) || 0,
        };
        if (isEditMode) {
          return { id: r.dbId ?? 0, ...base };
        }
        return base;
      });

      const payload = {
        transferInDate: date,
        receivedFrom: recievedFrom.trim(),
        status: statusValue,
        products,
      };

      let endpoint = ApiServices.zenxposAddTransferIn;
      if (isEditMode) {
        payload.transferInId = Number(transferInId);
        endpoint = ApiServices.zenxposEditTransferIn;
      }

      const res = await postMethod(endpoint, payload);

      if (res?.success) {
        const savedId =
          res?.data?.transferInId ??
          res?.data?.id ??
          res?.transferInId ??
          transferInId;

        const savedNumber =
          res?.data?.transferInNumber ??
          res?.transferInNumber ??
          reason;

        setSuccessModal({
          visible: true,
          isDraft: statusValue !== 1,
          savedId: savedId || null,
          message:
            res?.message ||
            (statusValue === 1
              ? 'Transfer-In saved successfully.'
              : 'Saved as draft.'),
          transferNumber: String(savedNumber || ''),
        });
      } else {
        Alert.alert(
          statusValue === 1 ? 'Save Failed' : 'Draft Failed',
          res?.message || 'Something went wrong.',
        );
      }
    } catch (err) {
      console.error('submitTransferIn error:', err);
      Alert.alert(
        statusValue === 1 ? 'Save Error' : 'Draft Error',
        err?.response?.data?.message || err?.message || 'Unknown error',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => submitTransferIn(1);
  const handleSaveDraft = () => submitTransferIn(0);

  // ---------- Success modal actions ----------
  const closeSuccessModal = () => {
    setSuccessModal({
      visible: false,
      isDraft: false,
      savedId: null,
      message: '',
      transferNumber: '',
    });
  };

  // ---------- View Transfer Note ----------
  const handleViewTransferNote = () => {
    const { isDraft } = successModal;
    closeSuccessModal();

    const previewData = {
      products: rows.map(r => ({
        ...r,
        free: r.free_qty,
        totalAmount:
          r.totalAmount ??
          ((Number(r.costPrice) || 0) * (Number(r.qty) || 0)).toFixed(2),
      })),
      date: date,
      receivedFrom: recievedFrom,
      sendTo: recievedFrom,
      remarks: remarks,
      transferInNumber: reason,
      transferOutNumber: reason,
      status: isDraft ? 0 : 1,
    };

    setNoteModal({
      visible: true,
      data: previewData,
      fromList: false,
    });
  };

  const closeNoteModal = () => {
    const wasFromList = noteModal.fromList;
    setNoteModal({ visible: false, data: null, fromList: false });
    if (!wasFromList) {
      navigation.navigate('StockTransferInScreen');
    }
  };

  // ---------- Hardware back handler ----------
  useEffect(() => {
    const onBackPress = () => {
      if (eanPicker.visible) {
        setEanPicker({ visible: false, items: [], ean: '' });
        return true;
      }
      if (noteModal.visible) {
        closeNoteModal();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [noteModal.visible, noteModal.fromList, eanPicker.visible]);

  // ---------- EXPORT META ROWS ----------
  const buildExportMetaRows = () => {
    const data = noteModal.data;
    if (!data) return [];

    const documentDate = data?.date || '';
    const transferToValue = data?.receivedFrom || '';
    const documentId =
      data?.transferInNumber || data?.transferOutNumber || '';

    const statusValue = data?.status;
    const statusText =
      statusValue === 1 ? 'Completed' : statusValue === 0 ? 'Pending' : 'Pending';

    const locationCode = profile?.pincode || profile?.locationCode || '';
    const locationName = profile?.city || profile?.locationName || '';
    const locationAddress = [
      profile?.address,
      profile?.city,
      profile?.pincode ? `${profile.pincode}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const userId = user?.id || user?.userId || profile?.userId || '';

    return [
      { label: 'Note.No', value: documentId },
      { label: 'In Location Code', value: locationCode },
      { label: 'In Location Name', value: locationName },
      { label: 'Address', value: locationAddress },
      { label: 'Date', value: documentDate },
      { label: 'Received from', value: transferToValue },
      { label: 'User ID', value: userId },
      { label: 'Status', value: statusText },
      { label: 'Remarks', value: data?.remarks || '' },
    ];
  };

  // ---------- GET EXPORT DATA ----------
  const getExportData = () => {
    const noteItems = noteModal.data?.products || [];
    const headers = [
      'S.No',
      'Product Code',
      'Product Name',
      'Variant Code',
      'EAN Code',
      'MRP',
      'Cost Price',
      'Qty',
      'Free',
      'Amount',
    ];

    const exportRows = noteItems.map((item, index) => ({
      'S.No': index + 1,
      'Product Code': item.itemCode || '',
      'Product Name': item.itemName || '',
      'Variant Code': item.variantCode || '',
      'EAN Code': item.eanCode || '',
      MRP: fmtNum(item.mrp),
      'Cost Price': fmtNum(item.costPrice),
      Qty: fmtInt(item.qty),
      Free: fmtInt(item.free),
      Amount: fmtNum(item.totalAmount),
    }));

    const totalQty = noteItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalFree = noteItems.reduce((s, i) => s + (Number(i.free) || 0), 0);
    const totalAmt = noteItems
      .reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
      .toFixed(2);

    exportRows.push({
      'S.No': '',
      'Product Code': '',
      'Product Name': `ITEMS: ${noteItems.length}`,
      'Variant Code': '',
      'EAN Code': '',
      MRP: '',
      'Cost Price': '',
      Qty: fmtInt(totalQty),
      Free: fmtInt(totalFree),
      Amount: `₹${fmtNum(totalAmt)}`,
    });

    return { headers, exportRows };
  };

  // ---------- EXPORT PDF ----------
  const handleNoteExportPDF = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getExportData();
    const fileName = `Note_IN_${Date.now()}`;

    await exportToPDF(
      exportRows,
      headers,
      fileName,
      'Transfer-IN NOTE',
      profile?.businessName || user?.businessName || '',
      buildExportMetaRows(),
    );
  };

  // ---------- EXPORT CSV ----------
  const handleNoteExportCSV = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getExportData();
    const fileName = `Note_IN_${Date.now()}`;

    await exportToCSV(
      exportRows,
      headers,
      fileName,
      profile?.businessName || user?.businessName || '',
      'Transfer-IN NOTE',
      buildExportMetaRows(),
    );
  };

  // ---------- PRINT ----------
  const handleNotePrint = async () => {
    const noteItems = noteModal.data?.products || [];
    if (noteItems.length === 0) {
      Alert.alert('No Data', 'There are no items to print.');
      return;
    }
    const htmlContent = buildPrintHtml({
      items: noteItems,
      noteType: 'IN',
      metaRows: buildExportMetaRows(),
      profile,
      user,
    });
    try {
      await RNPrint.print({ html: htmlContent });
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert('Error', 'Could not generate Print view');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title={'Transfer-IN'} />

      <KeyboardAwareScrollView
        ref={scrollRef}
        style={styles.subContainer}
        contentContainerStyle={styles.subContainerContent}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={keyboardExtraHeight}
        extraHeight={keyboardExtraHeight}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        enableResetScrollToCoords={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.headerrow_new}>
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Transfer-IN Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.locationInput, styles.readOnlyInput]}
                value={reason}
                editable={false}
                placeholder="--"
                placeholderTextColor="#919191"
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Date <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.dateInput, styles.rowBetween]}
                onPress={() => {
                  setTempDate(convertStringToDate(date));
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateText}>{date || 'DD-MM-YYYY'}</Text>
                <CalenderIcon />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Received from <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.locationInput_new}
                value={recievedFrom}
                onChangeText={setRecievedFrom}
                placeholder="Enter Received from"
                placeholderTextColor="#919191"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => navigation.navigate('StockTransferInScreen')}
            >
              <Text style={styles.manageButtonText}>
                {isEditMode ? 'Back to List' : 'Manage Transfer-IN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: '4%' }]}>#</Text>
            <Text style={[styles.headerText, { width: '7%' }]}>P Code</Text>
            <Text style={[styles.headerText, { width: '14%' }]}>Product Name</Text>
            <Text style={[styles.headerText, { width: '8%' }]}>Variant</Text>
            <Text style={[styles.headerText, { width: '10%' }]}>EAN Code</Text>
            <Text style={[styles.headerText, { width: '9%' }]}>Cost Price</Text>
            <Text style={[styles.headerText, { width: '9%' }]}>MRP</Text>
            <Text style={[styles.headerText, { width: '11%' }]}>Qty</Text>
            <Text style={[styles.headerText, { width: '11%' }]}>Free Qty</Text>
            <Text style={[styles.headerText, { width: '10%' }]}>Amount</Text>
            <Text style={[styles.headerText, { width: '7%' }]}>Action</Text>
          </View>

          <ScrollView
            style={styles.tableBody}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {rows.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.rowText, { width: '4%' }]}>{index + 1}</Text>
                <Text style={[styles.rowText, { width: '7%' }]}>{item.itemCode}</Text>
                <Text style={[styles.rowText, { width: '14%' }]} numberOfLines={1}>{item.itemName}</Text>
                <Text style={[styles.rowText, { width: '8%' }]}>{item.variantCode}</Text>
                <Text style={[styles.rowText, { width: '10%' }]}>{item.eanCode}</Text>
                <Text style={[styles.rowText, { width: '9%' }]}>₹{item.costPrice}</Text>
                <Text style={[styles.rowText, { width: '9%' }]}>₹{item.mrp}</Text>

                <View style={{ width: '11%', paddingHorizontal: rS(2) }}>
                  {isViewMode ? (
                    <Text style={styles.rowText}>{item.qty}</Text>
                  ) : (
                    <TextInput
                      style={styles.rowInput}
                      value={String(item.qty ?? '')}
                      onChangeText={text => handleRowQtyChange(item.id, text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#919191"
                      selectTextOnFocus
                      textAlign="center"
                    />
                  )}
                </View>

                <View style={{ width: '11%', paddingHorizontal: rS(2) }}>
                  {isViewMode ? (
                    <Text style={styles.rowText}>{item.free_qty}</Text>
                  ) : (
                    <TextInput
                      style={styles.rowInput}
                      value={String(item.free_qty ?? '')}
                      onChangeText={text => handleRowFreeQtyChange(item.id, text)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#919191"
                      maxLength={MAX_FREE_QTY_DIGITS}
                      selectTextOnFocus
                      textAlign="center"
                    />
                  )}
                </View>

                <Text style={[styles.rowText, { width: '10%' }]}>₹{item.totalAmount}</Text>
                <View style={{ width: '7%', justifyContent: 'center', alignItems: 'center' }}>
                  {!isViewMode &&
                    (deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#C21414" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDeleteRow(item.id)}
                        disabled={deletingId !== null}
                      >
                        <DeleteIcon />
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            ))}

            {rows.length === 0 && (
              <Text style={styles.emptyText}>No Items Added</Text>
            )}
          </ScrollView>
        </View>

        {/* Add Item Panel */}
        {!isViewMode && (
          <View style={styles.addItemPanel}>
            <View style={[styles.addFieldWrap, { width: '22%' }]}>
              <Text style={styles.addFieldLabel}>Product Code/Barcode</Text>
              <View style={styles.barcodeInputWrap}>
                <TextInput
                  ref={externalScannerInputRef}
                  value={itemCode}
                  onChangeText={handleExternalScannerInput}
                  placeholder="Enter Product Code / Name..."
                  placeholderTextColor="#919191"
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontFamily: Fonts.FigtreeRegular,
                    color: '#1B1B1B',
                  }}
                  onFocus={handleInputFocus}
                  returnKeyType="search"
                  blurOnSubmit={false}
                  onSubmitEditing={handleExternalScannerSubmit}
                  autoCorrect={false}
                  autoCapitalize="none"
                />

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowProductSearchModal(true)}
                    style={{
                      width: rS(20),
                      height: rV(24),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <NewSearchIcon />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleBarCodeScan}
                    activeOpacity={0.8}
                    style={{
                      width: rS(20),
                      height: rV(24),
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <BarCodeScannerIcon />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.addFieldWrap, { width: '14%' }]}>
              <Text style={styles.addFieldLabel}>PackSize Name</Text>
              <TextInput
                style={[styles.addInput, styles.readOnlyInput]}
                value={variantCode}
                editable={false}
                placeholder="--"
                placeholderTextColor="#919191"
              />
            </View>

            <View style={[styles.addFieldWrap, { width: '20%' }]}>
              <Text style={styles.addFieldLabel}>Product Name</Text>
              <TextInput
                style={[styles.addInput, styles.readOnlyInput]}
                value={itemName}
                editable={false}
                placeholder="--"
                placeholderTextColor="#919191"
              />
            </View>
            <View style={[styles.addFieldWrap, { width: '14%' }]}>
              <Text style={styles.addFieldLabel}>EAN Code</Text>
              <TextInput
                style={[styles.addInput, styles.readOnlyInput]}
                value={eanCode}
                editable={false}
                placeholder="--"
                placeholderTextColor="#919191"
              />
            </View>

            <View style={[styles.addFieldWrap, { width: '8%' }]}>
              <Text style={styles.addFieldLabel}>Cost Price</Text>
              <TextInput
                style={[styles.addInput, styles.readOnlyInput]}
                value={cp}
                editable={false}
                placeholder="0"
                placeholderTextColor="#919191"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.addFieldWrap, { width: '6%' }]}>
              <Text style={styles.addFieldLabel}>
                Qty <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                ref={qtyInputRef}
                style={styles.addInput}
                value={qty}
                onChangeText={text => setQty(text.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                onFocus={handleInputFocus}
              />
            </View>

            <View style={[styles.addFieldWrap, { width: '6%' }]}>
              <Text style={styles.addFieldLabel}>Free Qty</Text>
              <TextInput
                style={styles.addInput}
                value={free_qty}
                onChangeText={handleFreeQtyChange}
                placeholder="0"
                placeholderTextColor="#999999"
                keyboardType="numeric"
                onFocus={handleInputFocus}
                maxLength={2}
              />
            </View>

            <TouchableOpacity style={styles.plusButton} onPress={handleAddItem}>
              <PlusIcon width={26} height={26} />
              <Text style={styles.addNewCategoryText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer Bar */}
        <View style={[styles.footerBar, isViewMode && styles.footerBarViewMode]}>
          <TextInput
            style={styles.remarksInput}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Remarks"
            placeholderTextColor="#C7D3E3"
            onFocus={handleInputFocus}
            editable={!isViewMode}
          />

          <View style={styles.totalsWrap}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>TOTAL ITEMS</Text>
              <Text style={styles.totalValue}>{totalItems}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>TOTAL QTY</Text>
              <Text style={styles.totalValue}>{totalQty}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
              <Text style={styles.totalValue}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {!isViewMode && (
            <View style={styles.save_Draf_save}>
              <TouchableOpacity
                style={[styles.draftButton, saving && { opacity: 0.6 }]}
                onPress={handleSaveDraft}
                disabled={saving}
              >
                <Text style={styles.draftButtonText}>
                  {saving ? 'Saving...' : 'Save as Draft'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#264B79" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>

      <LoadingOverlay visible={loading} />

      {/* Product Search Modal */}
      <ProductSearchModal
        visible={showProductSearchModal}
        onClose={() => setShowProductSearchModal(false)}
        onSelect={handleSelectProduct}
        searchFn={async str => {
          const res = await postMethod(ApiServices.zenxposSearchProducts, {
            searchStr: str,
          });
          return res?.success && Array.isArray(res.data) ? res.data : [];
        }}
        selectedProduct={{ productId, variantId }}
      />

      {/* ✅ EAN VARIANT PICKER MODAL */}
      <EANVariantPickerModal
        isVisible={eanPicker.visible}
        items={eanPicker.items}
        ean={eanPicker.ean}
        onClose={() => setEanPicker({ visible: false, items: [], ean: '' })}
        onSelect={(selected) => {
          setEanPicker({ visible: false, items: [], ean: '' });
          applySelectedVariant(selected);
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        isDraft={successModal.isDraft}
        message={successModal.message}
        numberLabel="TRANSFER-IN NUMBER"
        numberValue={successModal.transferNumber}
        onClose={() => {
          closeSuccessModal();
          navigation.navigate('StockTransferInScreen');
        }}
        onViewNote={handleViewTransferNote}
      />

      {/* Transfer Note Preview Modal */}
      <Modal
        visible={noteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeNoteModal}
      >
        <View style={styles.noteOverlay}>
          <View style={styles.noteCard}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Transfer-IN Note</Text>
              <TouchableOpacity onPress={closeNoteModal} hitSlop={10}>
                <Text style={styles.noteModalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.noteModalScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {noteModal.data ? (
                <TransferNote data={noteModal.data} noteType="IN" profile={profile} />
              ) : null}
            </ScrollView>

            <View style={styles.noteModalBottomBar}>
              <TouchableOpacity style={styles.noteModalActionBtn} onPress={handleNotePrint}>
                <Text style={styles.noteModalActionText}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noteModalActionBtn} onPress={handleNoteExportPDF}>
                <Text style={styles.noteModalActionText}>Export PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.noteModalActionBtn} onPress={handleNoteExportCSV}>
                <Text style={styles.noteModalActionText}>Export CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.noteModalActionBtn, styles.noteModalActionBtnSecondary]}
                onPress={closeNoteModal}
              >
                <Text style={[styles.noteModalActionText, styles.noteModalActionTextSecondary]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Android Date Picker */}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={convertStringToDate(date)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* iOS Date Picker Modal */}
      <Modal
        visible={Platform.OS === 'ios' && showDatePicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDate(formatDate(tempDate));
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AddStockTransferInScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    borderTopColor: '#F4F4F4',
    borderTopWidth: 1,
  },
  subContainerContent: {
    paddingHorizontal: rS(12),
    paddingBottom: rV(20),
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: rV(4),
    justifyContent: 'space-between',
  },
  headerrow_new: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: rV(4),
    justifyContent: 'space-between',
  },
  fieldWrap: { marginRight: rS(2) },
  fieldLabel: {
    fontSize: 14,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeMedium,
    marginBottom: rV(3),
  },
  required: { color: '#D62828' },
  dateInput: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
    width: rS(100),
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
  },
  manageButton: {
    backgroundColor: '#264B79',
    borderRadius: 6,
    height: rV(25),
    paddingHorizontal: rS(15),
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
  },
  tableContainer: {
    marginTop: rV(5),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    minHeight: rV(180),
    maxHeight: rV(320),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    paddingHorizontal: rS(6),
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'center',
    fontWeight: '500',
  },
  tableBody: { flexGrow: 0 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rV(6),
    paddingHorizontal: rS(6),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  rowText: {
    fontSize: 12,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'center',
    fontWeight: '500',
  },
  rowInput: {
    height: rV(20),
    minWidth: rS(42),
    borderColor: '#264B79',
    borderWidth: 0.5,
    borderRadius: 6,
    paddingHorizontal: rS(4),
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
    paddingVertical: 0,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    color: '#919191',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
  },
  addItemPanel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingVertical: rV(10),
    paddingHorizontal: rS(8),
    marginTop: rV(5),
  },
  addFieldWrap: { marginRight: rS(3) },
  addFieldLabel: {
    fontSize: 13,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '400',
    marginBottom: rV(4),
  },
  addInput: {
    height: rV(27),
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    fontSize: 13,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
  },
  readOnlyInput: {
    backgroundColor: '#F0F0F0',
    color: '#666666',
    borderColor: '#E0E0E0',
  },
  locationInput: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
    width: rS(100),
    fontSize: 13,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
  },
  locationInput_new: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
    width: rS(150),
    fontSize: 13,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeRegular,
  },
  barcodeInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#E5E5E5',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rS(2),
    height: rV(27),
  },
  footerBarViewMode: {
    marginTop: rV(70),
    minHeight: rV(42),
    alignItems: 'center',
  },
  plusButton: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(5),
  },
  addNewCategoryText: {
    marginLeft: rS(2),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#264B79',
    borderRadius: 8,
    marginTop: rV(5),
    paddingHorizontal: rS(6),
    paddingVertical: rV(5),
    justifyContent: 'space-between',
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 6,
    height: rV(30),
    paddingHorizontal: rS(10),
    width: rS(180),
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
  },
  totalsWrap: { flexDirection: 'row', alignItems: 'center' },
  save_Draf_save: { flexDirection: 'row', alignItems: 'center' },
  totalItem: { alignItems: 'center', marginHorizontal: rS(14) },
  totalLabel: {
    color: '#CDCDCD',
    fontSize: 10,
    fontFamily: Fonts.FigtreeRegular,
    letterSpacing: 0.5,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
    marginTop: rV(2),
  },
  draftButton: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 6,
    height: rV(28),
    paddingHorizontal: rS(17),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rS(8),
  },
  draftButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: rV(28),
    paddingHorizontal: rS(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#264B79',
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: { backgroundColor: '#FFFFFF', paddingBottom: 30 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalCancel: { color: colors.black, fontFamily: Fonts.FigtreeMedium },
  modalDone: { color: '#264B79', fontFamily: Fonts.FigtreeSemiBold },
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
  noteModalClose: {
    fontSize: 20,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    paddingHorizontal: rS(4),
  },
  noteModalScrollContent: {
    padding: rS(8),
    paddingBottom: rV(40),
    alignItems: 'center',
  },
  noteModalBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: rV(35),
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
  noteModalActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  noteModalActionBtnSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#264B79',
  },
  noteModalActionTextSecondary: { color: '#264B79' },
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
    maxWidth: '70%',
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
});
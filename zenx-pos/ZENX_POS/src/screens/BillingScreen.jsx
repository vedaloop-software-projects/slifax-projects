import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import {
  DrawerActions,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import MenuIcon from '../assets/Icons/menuIcon';
import ImagePath from '../constants/ImagePath';
import GreyBarCodeIcon from '../assets/Icons/GreyBarCodeIcon';
import GreySearchIcon from '../assets/Icons/GreySearchIcon';
import AddCustomerIcon from '../assets/Icons/AddCustomerIcon';
import WhiteCrossIcon from '../assets/Icons/WhiteCrossIcon';
import PlusIcon from '../assets/Icons/PlusIcon';
import PrinterIcon from '../assets/Icons/PrinterIcon';
import RedCrossIcon from '../assets/Icons/RedCrossIcon';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import HelpKeyIcon from '../assets/Icons/HelpKeyIcon';
import HelpUpIcon from '../assets/Icons/HelpUpIcon';
import HelpDownIcon from '../assets/Icons/HelpDownIcon';
import AddNewCustomerModal from '../components/AddNewCustomerModal';
import AddManualDiscountModal from '../components/AddManualDiscountModal';
import UpdateProductDiscountVisible from '../components/UpdateProductDiscountModal';
import AdditionalChargesModal from '../components/AdditionalChargesModal';
import AddSuspendModal from '../components/AddSuspendModal';
import AddReCallModal from '../components/AddReCallModal';
import AddRePrintModal from '../components/AddRePrintModal';
import AddNewBillSalesManModal from '../components/AddNewBillSalesManModal';
import AddPaymentModal from '../components/AddPaymentModal';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

import { useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';
import EditIcon from '../assets/Icons/EditIcon';
import BlueEditIcon from '../assets/Icons/BlueEditIcon';
import EyeIcon from '../assets/Icons/EyeIcon';
import InfoIcon from '../assets/Icons/InfoIcon';
import CancelBlackIcon from '../assets/Icons/CancelBlackIcon';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useSelector } from 'react-redux';
import UpArrow from '../assets/Icons/UpArrow';
import DownArrow from '../assets/Icons/DownArrow';
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';
import RefreshIcon from '../assets/Icons/RefreshIcon';
import CrossIcon from '../assets/Icons/CrossIcon';
import Toast from 'react-native-toast-message';
import Receipt from '../components/ReceptScreens/Receipt';
import KOTOrder from '../components/ReceptScreens/KOTOrder';
import A5Invoice from '../components/A5Invoice';
import {
  retailBill,
  textileBill,
  textileGstBill,
  retailGstBill,
  duplicateBill,
  retailBillNoTax,
  billQrRetail,
  billQrGst,
  billQrNoTax,
  billQrPlain,
} from '../../src/data/receiptData';
import BillingVariantViewModal from '../components/BillingVariantViewModal';
import ThermalPrinterService from '../services/ThermalPrinterService';

export default function BillingScreen() {
  const navigation = useNavigation();
  const user = useSelector(state => state.auth.user);
  const { allowDiscount, allowPriceOverride, allowRefund } = useSelector(
    state => state.roleAccess,
  );
  const [barCode, setBarCode] = useState('');
  const [searchText, setSearchText] = useState('');
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [shortcutKeys, setShortcutKeys] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [billData, setBillData] = useState([]); // Dynamic bill data
  const [billingSettings, setBillingSettings] = useState(null);
  const [pendingItem, setPendingItem] = useState(null); // Item waiting for salesman selection
  const [addCustomerVisible, setAddCustomerVisible] = useState(false);
  const [manualDiscountVisible, setManualDiscountVisible] = useState(false);
  const [updateProductDiscountVisible, setUpdateProductDiscountVisible] =
    useState(false);
  const [additionalChargesVisible, setAdditionalChargesVisible] =
    useState(false);
  const [suspendVisible, setSuspendVisible] = useState(false);
  const [recallVisible, setRecallVisible] = useState(false);
  const [reprintVisible, setReprintVisible] = useState(false);
  const [salesmanVisible, setSalesmanVisible] = useState(false);
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [tempQty, setTempQty] = useState('');
  const qtyInputRef = useRef(null);
  const [tempPrice, setTempPrice] = useState('');
  const [editingPriceRowId, setEditingPriceRowId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  // const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [askSalesmanCode, setAskSalesmanCode] = useState(0);
  const [askQtyWhileAddingItems, setAskQtyWhileAddingItems] = useState(0);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [manualDiscountData, setManualDiscountData] = useState({
    per: '',
    val: '',
  });
  const [billSummary, setBillSummary] = useState({
    totalItems: 0,
    totalQty: 0,
    subTotal: 0,
    totalDiscount: 0,
    totalGst: 0,
    roundOff: 0,
  });
  const [allPaymentModes, setAllPaymentModes] = useState([]);
  const [selectedPayments, setSelectedPayments] = useState([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [freeItemVisible, setFreeItemVisible] = useState(false);
  const [selectedFreeItem, setSelectedFreeItem] = useState(null);
  const [productDetailsVisible, setProductDetailsVisible] = useState(false);
  const [productDetailsLoading, setProductDetailsLoading] = useState(false);
  const [productDetails, setProductDetails] = useState(null);
  const [isCheckoutStarted, setIsCheckoutStarted] = useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState(null);
  const [billBusterVisible, setBillBusterVisible] = useState(false);
  const [billBusterData, setBillBusterData] = useState([]);
  const [expandedBillBusterId, setExpandedBillBusterId] = useState(null);
  const [billBusterLoading, setBillBusterLoading] = useState(false);
  const [selectedBillBusters, setSelectedBillBusters] = useState([]);
  const [selectedBillBusterScheme, setSelectedBillBusterScheme] =
    useState(null);
  const [selectedBillBusterChildren, setSelectedBillBusterChildren] = useState(
    [],
  );
  const [billBusterApplied, setBillBusterApplied] = useState(false);
  const [freeProductDetailsVisible, setFreeProductDetailsVisible] =
    useState(false);
  const [freeProductDetailsLoading, setFreeProductDetailsLoading] =
    useState(false);
  const [freeProductDetails, setFreeProductDetails] = useState([]);
  const [discardModalVisible, setDiscardModalVisible] = useState(false);
  const [variantModalVisible, setVariantModalVisible] = useState(false);
  const [variantProductData, setVariantProductData] = useState(null);
  const [saveBillError, setSaveBillError] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptIndex, setReceiptIndex] = useState(0);
  const [printBillData, setPrintBillData] = useState(null);
  const [printerVisible, setPrinterVisible] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerLoading, setPrinterLoading] = useState(false);

  const receiptSamples = [
    {
      key: 'retailBill',
      label: 'Retail',
      data: retailBill,
    },
    {
      key: 'retailGstBill',
      label: 'Retail + GST',
      data: retailGstBill,
    },
    {
      key: 'textileGstBill',
      label: 'Textile + GST',
      data: textileGstBill,
    },
    {
      key: 'duplicateBill',
      label: 'Duplicate',
      data: duplicateBill,
    },
    {
      key: 'textileBill',
      label: 'Textile',
      data: textileBill,
    },
    {
      key: 'a5Clothes',
      label: 'A5 Clothes',
      type: 'clothes',
    },
    {
      key: 'a5Grocery',
      label: 'A5 Grocery',
      type: 'grocery',
    },
    // NEW 4 chips — using billQr data
    { key: 'bill', label: '3" Bill', data: billQrRetail },
    { key: 'RbillQr', label: '3" RBill-QR', data: billQrGst },
    { key: 'Rbillwotax', label: '3" RBill-w/o tax', data: billQrNoTax },
    { key: 'Rbill', label: 'RBill', data: billQrPlain },
    {
      key: 'KOTOrder',
      label: 'KOT Order',
    },
  ];

  const activeReceipt = receiptSamples[receiptIndex]?.data;

  const activeSample = receiptSamples[receiptIndex];

  const barcodeRef = useRef('');
  const lastBarcodeRef = useRef('');
  const barcodeCountRef = useRef(0);
  const allowDecimalsByVariantRef = useRef({});
  const { hasPermission, requestPermission } = useCameraPermission();

  const device = useCameraDevice('back');

  const [isCameraScanning, setIsCameraScanning] = useState(true);

  useEffect(() => {
    if (isScannerVisible && !hasPermission) {
      requestPermission();
    }
  }, [isScannerVisible, hasPermission, requestPermission]);

  const getBillingSettings = useCallback(async () => {
    try {
      const response = await getMethod(ApiServices.zenxposGetBillingSettings);

      if (response?.success) {
        setAskSalesmanCode(Number(response?.data?.askSalesmanCode ?? 0));
        setAskQtyWhileAddingItems(
          Number(response?.data?.askQtyWhileAddingItems ?? 0),
        );
      }
    } catch (error) {
      setAskSalesmanCode(0);
    }
  }, [getMethod]);

  const fetchPaymentModes = useCallback(async () => {
    try {
      const body = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(
        ApiServices.zenxposGetPaymentModes,
        body,
      );
      if (response?.success) {
        setAllPaymentModes(response.data.paymentModes || []);
      }
    } catch (error) {
      console.log('Payment Modes Error', error);
    }
  }, []);

  const priceInputRef = useRef(null);
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to scan barcodes.',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  };

  const { getMethod, postMethod } = HelperModule();

  const handleDiscountSuccess = inputs => {
    setManualDiscountData(inputs);
    fetchTempBillItems();
  };

  const getShortcutKeys = useCallback(async () => {
    try {
      const response = await getMethod(ApiServices.zenxposGetShortcutKeys);
      if (response?.success) {
        setShortcutKeys(response.data || []);
      }
    } catch (error) {
      console.log('Shortcut Keys Error', error);
    }
  }, []);

  const getBillColumns = useCallback(async () => {
    try {
      setLoading(true);

      const response = await getMethod(ApiServices.zenxposGetBillCols);

      if (response?.success) {
        const apiCols = (response.data || []).filter(
          col => col.appStatus === 1,
        );
        const combinedCols = [
          { billColId: 'manual-sno', colName: 'S.No' },
          ...apiCols,
        ];
        setColumns(combinedCols);
      }
    } catch (error) {
      console.log('Bill Columns Error', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTempBillItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getMethod(ApiServices.zenxposGetTempBillItems);

      if (response?.success && response.data) {
        const data = response.data;

        setBillSummary({
          totalItems: data.totalItems || 0,
          totalQty: data.totalQty || 0,
          subTotal: data.subTotal || 0,
          totalDiscount: data.totalDiscount || 0,
          totalGst: data.totalGst || 0,
          roundOff: data.roundOff || 0,
        });

        const rootPer =
          data.manualDiscountPercentage || data.discountPercentage;
        const rootVal = data.manualDiscountValue || data.discountAmount;

        const firstItemPer = data.items?.[0]?.discountPercentage;
        const firstItemVal = data.items?.[0]?.discountAmount;

        const finalPer = rootPer || firstItemPer;
        const finalVal = rootVal || firstItemVal;

        setManualDiscountData({
          per:
            finalPer && Number(finalPer) > 0
              ? parseFloat(finalPer).toString()
              : '',
          val:
            finalVal && Number(finalVal) > 0
              ? parseFloat(finalVal).toString()
              : '',
        });

        const itemsList = Array.isArray(data.items) ? data.items : [];
        const mappedItems = itemsList.map((row, index) => {
          const savedAllowDecimals =
            allowDecimalsByVariantRef.current[row.variantId];

          const finalAllowDecimals =
            savedAllowDecimals !== undefined
              ? Number(savedAllowDecimals)
              : Number(row.allowDecimals ?? 0);
          return {
            id: index + 1,
            variantId: row.variantId,
            productId: row.productId,
            voidFlag: row.voidFlag,
            allowDecimals: finalAllowDecimals,
            'Product Name': row.productFullName,
            'Product Code': row.productCode,
            'EAN Code': row.eanCode,
            'Pack Size': row.packSize,
            Qty: row.qty?.toString(),
            MRP: row.mrp?.toString(),
            'Sale Price': row.priceOverride?.toString(),
            'Disc %': row.discountPercentage?.toString(),
            'Discount Amount': row.discountAmount?.toString(),
            'Tax %': row.gstPercentage?.toString(),
            'Tax Amount': row.gstAmount?.toString(),
            'Total Amount': (
              parseFloat(row.qty) * parseFloat(row.priceOverride) -
              parseFloat(row.discountAmount)
            ).toFixed(2),
            'HSN Code': row.hsnCode,
            'SM Code': row.salesmanCode,
            freeQty: row.freeQty,
            freeProductName: row.freeProductName,
            freeVariantName: row.freeVariantName,
            freeVariantMrp: row.freeVariantMrp,
            freeVariantSalePrice: row.freeVariantSalePrice,
          };
        });

        setBillData(mappedItems);
      }
    } catch (error) {
      console.log('Fetch Temp Bill Error:', error);
    } finally {
      setLoading(false);
    }
  }, [getMethod]);

  const fetchProductDetails = async (productId, variantId) => {
    try {
      setProductDetailsLoading(true);

      const body = {
        productId,
        variantId,
      };

      const response = await postMethod(
        ApiServices.zenxposGetProductDetails,
        body,
      );

      if (response?.success && response?.data) {
        setProductDetails(response.data);
        setProductDetailsVisible(true);
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Failed to fetch product details',
        );
      }
    } catch (error) {
      console.log('Product Details API Error:', error);
      Alert.alert('Error', 'Unable to fetch product details');
    } finally {
      setProductDetailsLoading(false);
    }
  };

  const handleInitialBillLoad = async () => {
    try {
      await fetchTempBillItems();
      await handleClearManualDiscount(false);
    } catch (error) {
      console.log('Initial Bill Load Error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      getBillColumns();
      getShortcutKeys();
      handleInitialBillLoad();
      fetchPaymentModes();
      getBillingSettings();
    }, []),
    // }, [getBillColumns, getShortcutKeys, fetchTempBillItems])
  );

  useEffect(() => {
    const currentTotal = parseFloat(
      (
        billSummary.subTotal -
        billSummary.totalDiscount +
        billSummary.roundOff +
        additionalCharge
      ).toFixed(2),
    );

    if (currentTotal === 0) {
      setSelectedPayments([]);
      return;
    }

    if (selectedPayments.length === 0 && allPaymentModes.length > 0) {
      const cashMode = allPaymentModes.find(m => m.allowChange === 1);
      if (cashMode) {
        setSelectedPayments([{ mode: cashMode, amount: currentTotal }]);
      }
    } else if (selectedPayments.length === 1) {
      setSelectedPayments(prev => [
        {
          ...prev[0],
          amount: currentTotal,
        },
      ]);
    }
  }, [billSummary, additionalCharge, allPaymentModes]);

  const calculateTotals = () => {
    const totalBill =
      billSummary.subTotal -
      billSummary.totalDiscount +
      billSummary.roundOff +
      additionalCharge;

    const totalPaid = selectedPayments.reduce((sum, p) => sum + p.amount, 0);

    const dueAmount = Math.max(0, totalBill - totalPaid);

    let changeCash = 0;
    if (totalPaid > totalBill) {
      const hasCashMode = selectedPayments.some(p => p.mode.allowChange === 1);
      if (hasCashMode) {
        changeCash = totalPaid - totalBill;
      }
    }

    return { totalBill, totalPaid, dueAmount, changeCash };
  };

  const { totalBill, totalPaid, dueAmount, changeCash } = calculateTotals();

  const handleSavePayment = paymentsArray => {
    setSelectedPayments(paymentsArray);
    setPaymentModalVisible(false);
  };

  const handleClearItems = async () => {
    Alert.alert(
      'Clear Bill',
      'Are you sure you want to remove all items from the current bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Clear',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await getMethod(
                ApiServices.zenxposClearTempBill,
              );

              if (response?.success) {
                setBillData([]);

                setBillSummary({
                  totalItems: 0,
                  totalQty: 0,
                  subTotal: 0,
                  totalDiscount: 0,
                  totalGst: 0,
                  roundOff: 0,
                });

                setIsCheckoutStarted(false);

                setManualDiscountData({ per: '', val: '' });
                setSelectedDiscountType(null);
                setSelectedRowId(null);
                setBillBusterApplied(false);
                setFreeProductDetails([]);
                setFreeProductDetailsVisible(false);
                setSelectedBillBusters([]);
                setExpandedBillBusterId(null);
              } else {
                Alert.alert(
                  'Error',
                  response?.message || 'Failed to clear items',
                );
              }
            } catch (error) {
              console.log('Clear Items Error:', error);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };
  const handleVoidItem = async () => {
    if (!selectedRowId) {
      Alert.alert(
        'Selection Required',
        'Please select an item from the list to delete.',
      );
      return;
    }

    const itemToVoid = billData.find(item => item.id === selectedRowId);

    if (!itemToVoid) return;

    const isCurrentlyVoided = itemToVoid.voidFlag === 1;
    const targetVoidFlag = isCurrentlyVoided ? 0 : 1;
    const actionTitle = isCurrentlyVoided ? 'Restore Item' : 'Delete Item';
    const actionMessage = isCurrentlyVoided
      ? `Do you want to restore "${itemToVoid['Product Name']}" back to the bill?`
      : `Are you sure you want to remove "${itemToVoid['Product Name']}"?`;

    Alert.alert(actionTitle, actionMessage, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isCurrentlyVoided ? 'Yes, Restore' : 'Yes, Delete',
        style: isCurrentlyVoided ? 'default' : 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const body = {
              productId: itemToVoid.productId,
              variantId: itemToVoid.variantId,
              voidFlag: targetVoidFlag,
            };

            const response = await postMethod(
              ApiServices.zenxposUpdateVoid,
              body,
            );

            if (response?.success) {
              setSelectedRowId(null);
              await fetchTempBillItems();
            } else {
              Alert.alert(
                'Error',
                response?.message || 'Failed to update item status',
              );
            }
          } catch (error) {
            console.log('Void/Unvoid API Error:', error);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleRecallAction = async selectedBill => {
    try {
      setLoading(true);

      const body = {
        suspendedNumber: selectedBill.suspendedNumber,
      };

      const response = await postMethod(
        ApiServices.zenxposResumeSuspendedBill,
        body,
      );

      if (response?.success) {
        await fetchTempBillItems();
        setSelectedRowId(null);
      } else {
        Alert.alert('Error', response?.message || 'Failed to resume bill');
      }
    } catch (error) {
      console.log('Resume API Error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while recalling the bill.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = async (id, newQty) => {
    const activeRow = billData.find(r => r.id === id);
    if (!activeRow || activeRow.voidFlag === 1) {
      return;
    }

    const qtyText = String(newQty).trim();

    if (!qtyText) {
      Alert.alert('Invalid Quantity', 'Please enter quantity.');
      return;
    }

    const qty = Number(qtyText);

    if (!Number.isFinite(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }

    if (Number(activeRow.allowDecimals) !== 1 && !Number.isInteger(qty)) {
      Alert.alert(
        'Invalid Quantity',
        'Decimal quantity is not allowed for this product.',
      );
      return;
    }

    try {
      setLoading(true);
      const body = {
        productId: activeRow.productId,
        variantId: activeRow.variantId,
        qty: qty,
      };

      const response = await postMethod(
        ApiServices.zenxposUpdateTempProductQty,
        body,
      );

      if (response?.success) {
        await fetchTempBillItems();
        setSelectedRowId(null);
        setEditingRowId(null);
      } else {
        Alert.alert('Error', response?.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.log('Qty Update Error:', error);
    } finally {
      setLoading(false);
      // setEditingRowId(null);
    }
  };
  const handlePriceChange = async (id, newPrice) => {
    const activeRow = billData.find(r => r.id === id);
    if (!activeRow || activeRow.voidFlag === 1) return;

    try {
      setLoading(true);
      const body = {
        productId: activeRow.productId,
        variantId: activeRow.variantId,
        salePrice: parseFloat(newPrice) || 0,
      };

      const response = await postMethod(
        ApiServices.zenxposUpdateTempProductSalePrice,
        body,
      );

      if (response?.success) {
        await fetchTempBillItems();
        setSelectedRowId(null);
      } else {
        Alert.alert('Error', response?.message || 'Failed to update price');
      }
    } catch (error) {
      console.log('Price Update Error:', error);
    } finally {
      setLoading(false);
      setEditingPriceRowId(null);
    }
  };

  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: [
      'ean-13',
      'ean-8',
      'code-128',
      'code-39',
      'code-93',
      'upc-a',
      'upc-e',
    ],
    onBarcodeScanned: barcodes => {
      if (!isCameraScanning || !barcodes?.length) {
        return;
      }

      const value = barcodes[0]?.rawValue?.trim();

      if (!value) {
        return;
      }
      if (lastBarcodeRef.current === value) {
        barcodeCountRef.current += 1;
      } else {
        lastBarcodeRef.current = value;
        barcodeCountRef.current = 1;
      }
      if (barcodeCountRef.current < 3) {
        return;
      }
      setIsCameraScanning(false);
      lastBarcodeRef.current = '';
      barcodeCountRef.current = 0;
      setIsScannerVisible(false);
      setBarCode(value);
      barcodeRef.current = value;
      handleBarcodeSearch(value);
    },

    onError: error => {
      console.error('Barcode scanner error:', error);
    },
  });
  const handleBarcodeSearch = async code => {
    if (!code || code.trim() === '') return;
    try {
      setLoading(true);
      const body = { searchStr: code.trim() };
      const response = await postMethod(ApiServices.zenxposSearchEANCode, body);

      if (
        response?.success &&
        Array.isArray(response?.data) &&
        response.data.length > 0
      ) {
        const products = response.data;
        const productId = products[0]?.productId;
        const variants = products.filter(item => item.productId === productId);
        if (variants.length === 1) {
          await onSelectItem(variants[0]);
        } else {
          const firstProduct = variants[0];

          setVariantProductData({
            productDetails: {
              productId: firstProduct.productId,
              productFullName: firstProduct.productFullName,
              productShortName: firstProduct.productShortName,
              productCode: firstProduct.productCode,
              eanCode: firstProduct.eanCode,
            },
            variants: variants,
          });

          setVariantModalVisible(true);
        }
        setBarCode('');
        barcodeRef.current = '';
      } else {
        Alert.alert('Not Found', 'No product matches this barcode.');
        setBarCode('');
        barcodeRef.current = '';
      }
    } catch (error) {
      console.log('Barcode Search Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSelect = async variant => {
    try {
      setVariantModalVisible(false);
      setVariantProductData(null);

      await onSelectItem(variant);
    } catch (error) {
      console.log('Variant Selection Error:', error);
    }
  };

  const handleBarcodeChange = text => {
    const code = text.replace(/\D/g, '');
    barcodeRef.current = code;
    setBarCode(code);
  };

  const handleBarcodeSubmit = () => {
    const code = barcodeRef.current.trim();
    if (!code) return;
    handleBarcodeSearch(code);
    barcodeRef.current = '';
    setBarCode('');
  };

  const handleBarcodeKeyPress = ({ nativeEvent }) => {
    if (nativeEvent.key === 'Enter') {
      const code = barcodeRef.current.trim();
      if (code.length > 0) {
        handleBarcodeSearch(code);
        barcodeRef.current = '';
        setBarCode('');
      }
    }
  };
  const handleSearch = async text => {
    setSearchText(text);
    if (text.length > 3) {
      setSearchLoading(true);
      try {
        const body = { searchStr: text };
        const response = await postMethod(
          ApiServices.zenxposSearchProducts,
          body,
        );
        if (response?.success) {
          const results = response.data || [];
          results.forEach(item => {
            if (item?.variantId != null) {
              allowDecimalsByVariantRef.current[item.variantId] = Number(
                item.allowDecimals ?? 0,
              );
            }
          });
          setSearchResults(results);
        }
      } catch (error) {
        console.log('Search Error:', error);
      } finally {
        setSearchLoading(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const addProductToBill = async (item, salesmanId = '') => {
    try {
      setLoading(true);

      const currentCustomerType = selectedCustomer
        ? selectedCustomer.customerType
        : '';
      const selectedAllowDecimals = Number(item?.allowDecimals ?? 0);

      allowDecimalsByVariantRef.current[item.variantId] = selectedAllowDecimals;
      const addBody = {
        productId: item.productId,
        variantId: item.variantId,
        qty: 1,
        mrp: item.mrp,
        salePrice: item.salePrice,
        wholeSalePrice: item.wholeSalePrice,
        costPrice: item.costPrice,
        gstPercentage: item.taxPercent,
        billMode: 1,
        customerType: currentCustomerType,
        smId: salesmanId || '',
      };
      const addResponse = await postMethod(
        ApiServices.zenxposAddProductToTemp,
        addBody,
      );

      if (addResponse?.success) {
        const getBody = {
          productId: item.productId,
          variantId: item.variantId,
        };

        const billResponse = await postMethod(
          ApiServices.zenxposGetTempBillItem,
          getBody,
        );

        if (billResponse?.success && billResponse.data) {
          const data = billResponse.data;

          setBillSummary({
            totalItems: data.totalItems || 0,
            totalQty: data.totalQty || 0,
            subTotal: data.subTotal || 0,
            totalDiscount: data.totalDiscount || 0,
            totalGst: data.totalGst || 0,
            roundOff: data.roundOff || 0,
          });

          const rootPer =
            data.manualDiscountPercentage || data.discountPercentage;

          const rootVal = data.manualDiscountValue || data.discountAmount;

          const firstItemPer = data.items?.[0]?.discountPercentage;

          const firstItemVal = data.items?.[0]?.discountAmount;

          const finalPer = rootPer || firstItemPer;
          const finalVal = rootVal || firstItemVal;

          setManualDiscountData({
            per:
              finalPer && Number(finalPer) > 0
                ? parseFloat(finalPer).toString()
                : '',
            val:
              finalVal && Number(finalVal) > 0
                ? parseFloat(finalVal).toString()
                : '',
          });

          const itemsList = Array.isArray(data.items)
            ? data.items
            : Object.values(data.items || {});

          const apiItem =
            itemsList.find(i => i.variantId === item.variantId) || itemsList[0];

          const mappedItem = {
            variantId: apiItem.variantId,
            productId: apiItem.productId,
            voidFlag: apiItem.voidFlag,
            allowDecimals: selectedAllowDecimals,
            'Product Name': apiItem.productFullName,
            'Product Code': apiItem.productCode,
            'EAN Code': apiItem.eanCode,
            'Pack Size': apiItem.packSize,
            Qty: apiItem.qty?.toString(),
            MRP: apiItem.mrp?.toString(),
            'Sale Price': apiItem.priceOverride?.toString(),
            'Disc %': apiItem.discountPercentage?.toString(),
            'Discount Amount': apiItem.discountAmount?.toString(),
            'Tax %': apiItem.gstPercentage?.toString(),
            'Tax Amount': apiItem.gstAmount?.toString(),

            'Total Amount': (
              parseFloat(apiItem.qty) * parseFloat(apiItem.priceOverride) -
              parseFloat(apiItem.discountAmount)
            ).toFixed(2),

            'HSN Code': apiItem.hsnCode,
            'SM Code': apiItem.salesmanCode,

            freeQty: apiItem.freeQty,
            freeProductName: apiItem.freeProductName,
            freeVariantName: apiItem.freeVariantName,
            freeVariantMrp: apiItem.freeVariantMrp,
            freeVariantSalePrice: apiItem.freeVariantSalePrice,
          };

          setBillData(prevBillData => {
            const existingIndex = prevBillData.findIndex(
              row => row.variantId === mappedItem.variantId,
            );
            let rowId;

            if (existingIndex > -1) {
              const updatedBill = [...prevBillData];

              rowId = updatedBill[existingIndex].id;

              updatedBill[existingIndex] = {
                ...mappedItem,
                id: rowId,
              };

              return updatedBill;
            }

            const nextSNo = prevBillData.length + 1;

            rowId = nextSNo;

            return [
              ...prevBillData,
              {
                ...mappedItem,
                id: nextSNo,
              },
            ];
          });

          if (Number(askQtyWhileAddingItems) === 1) {
            const existingRow = billData.find(
              row => row.variantId === mappedItem.variantId,
            );
            const rowId = existingRow?.id || billData.length + 1;
            setTempQty(mappedItem['Qty']?.toString() || '1');
            setEditingRowId(rowId);
            setTimeout(() => {
              qtyInputRef.current?.focus();
            }, 150);
          } else {
            setSelectedRowId(null);
          }
        }
      } else {
        Alert.alert('Error', addResponse?.message || 'Failed to add product');
      }
    } catch (error) {
      console.error('Add Product Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSelectItem = async item => {
    try {
      setSearchText('');
      setSearchResults([]);
      if (Number(askSalesmanCode) === 1) {
        setPendingProduct(item);
        setSalesmanVisible(true);
        return;
      }
      await addProductToBill(item, '');
    } catch (error) {
      console.error('Selection Flow Error:', error);
    }
  };

  useEffect(() => {
    if (columns.length > 0) {
      console.log(
        'REQUIRED COLUMN NAMES:',
        columns.map(c => c.colName),
      );
    }
  }, [columns]);

  const getColWidth = name => {
    switch (name) {
      case 'S.No':
        return rS(45);
      case 'Product Name':
        return rS(60);
      case 'UOM':
        return rS(60);
      case 'EAN Code':
        return rS(65);
      case 'Qty':
        return rS(55);
      case 'MRP':
        return rS(60);
      case 'Sale Price':
        return rS(60);
      default:
        return rS(60);
    }
  };

  const handleCustomerSelect = async customer => {
    setSelectedCustomer(customer);

    if (customer && customer.id) {
      try {
        setLoading(true);

        const body = {
          customerId: customer.id,
          discountPercentage: customer.discount,
          discountValue: '',
        };

        const response = await postMethod(
          ApiServices.zenxposUpdateManualDiscount,
          body,
        );

        if (response?.success) {
          await fetchTempBillItems();
        } else {
          Alert.alert(
            'Discount Error',
            response?.message || 'Failed to apply customer discount',
          );
        }
      } catch (error) {
        console.log('Customer Discount API Error:', error);
      } finally {
        setLoading(false);
      }
    } else {
      await fetchTempBillItems();
    }
  };

  const selectedProduct = billData.find(row => row.id === selectedRowId);

  const getApplicableBillBuster = async () => {
    try {
      setBillBusterLoading(true);
      const totalAmount = Number(totalBill.toFixed(2));
      const body = {
        totalAmount,
      };
      const response = await postMethod(
        ApiServices.zenxposGetApplicableBillBuster,
        body,
      );
      if (response?.success) {
        const schemes = Array.isArray(response?.data) ? response.data : [];

        if (schemes.length === 0) {
          setBillBusterData([]);
          setBillBusterVisible(false);
          setExpandedBillBusterId(null);
          return;
        }

        setBillBusterData(schemes);
        setExpandedBillBusterId(null);
        setBillBusterVisible(true);
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Failed to fetch Bill Buster schemes.',
        );
      }
    } catch (error) {
      console.log('Bill Buster API Error:', error);

      Alert.alert('Error', 'Unable to fetch Bill Buster schemes.');
    } finally {
      setBillBusterLoading(false);
    }
  };

  const handleApplyBillBuster = async () => {
    try {
      if (selectedBillBusters.length === 0) {
        Alert.alert(
          'Select Bill Buster',
          'Please select at least one Bill Buster.',
        );
        return;
      }
      setBillBusterLoading(true);
      const selectedChildren = [];
      billBusterData.forEach(scheme => {
        const children = Array.isArray(scheme.childBillBusters)
          ? scheme.childBillBusters
          : [];

        children.forEach((child, index) => {
          const childKey = `${scheme.id}-${child.id || index}`;

          if (selectedBillBusters.includes(childKey)) {
            selectedChildren.push({
              productId: child.productId,
              variantId: child.variantId,
              qty: 1,
              discountPercentage: Number(child.discountPercentage) || 0,
            });
          }
        });
      });

      const selectedSchemes = billBusterData.filter(
        scheme =>
          (!scheme.childBillBusters || scheme.childBillBusters.length === 0) &&
          selectedBillBusters.includes(`scheme-${scheme.id}`),
      );

      for (const item of selectedChildren) {
        const response = await postMethod(
          ApiServices.zenxposApplyBillBuster,
          item,
        );

        if (!response?.success) {
          Alert.alert(
            'Bill Buster Error',
            response?.message || 'Failed to apply Bill Buster.',
          );
          return;
        }
      }
      for (const scheme of selectedSchemes) {
        const discountPercentage = Number(scheme.discountPercentage) || 0;

        const body = {
          customerId: '',
          discountPercentage,
          discountValue: '',
        };

        const response = await postMethod(
          ApiServices.zenxposUpdateManualDiscount,
          body,
        );

        if (!response?.success) {
          Alert.alert(
            'Discount Error',
            response?.message || 'Failed to apply Bill Buster discount.',
          );
          return;
        }
      }
      await fetchTempBillItems();

      setBillBusterVisible(false);
      setExpandedBillBusterId(null);
      setSelectedBillBusters([]);

      setBillBusterApplied(true);
    } catch (error) {
      console.log('Apply Bill Buster Error:', error);

      Alert.alert('Error', 'Unable to apply Bill Buster.');
    } finally {
      setBillBusterLoading(false);
    }
  };

  const hasSelectedDifferentScheme = schemeId => {
    return selectedBillBusters.some(key => {
      if (key.startsWith('scheme-')) {
        const selectedSchemeId = key.replace('scheme-', '');

        return selectedSchemeId !== String(schemeId);
      }
      const selectedSchemeId = key.split('-')[0];

      return selectedSchemeId !== String(schemeId);
    });
  };

  const handleClearManualDiscount = async (showToast = true) => {
    try {
      setLoading(true);

      const response = await getMethod(ApiServices.zenxposClearManualDiscount);

      if (response?.success) {
        setManualDiscountData({
          per: '',
          val: '',
        });

        setSelectedDiscountType(null);
        setIsCheckoutStarted(false);
        setBillBusterApplied(false);
        if (showToast) {
          await fetchTempBillItems();
          //    Toast.show({
          //   type:'success',
          //   text1:'Success',
          //   text2:response?.message
          // })
        }
        return true;
      }

      // Toast.show({
      //   type: 'error',
      //   text1: 'Cannot Clear Discount',
      //   text2:
      //     response?.errors ||
      //     response?.message ||
      //     'No manual discounted products found in bill.',
      // });

      return false;
    } catch (error) {
      console.log('Clear Manual Discount Error:', error);

      //     Toast.show({
      //   type: 'error',
      //   text1: 'Error',
      //   text2:
      //     error?.response?.data?.errors ||
      //     error?.response?.data?.message ||
      //     'Unable to clear manual discount.',
      // });
      return false;
    } finally {
      setLoading(false);
      setIsCheckoutStarted(false);
    }
  };

  const getFreeProductDetails = async () => {
    try {
      setFreeProductDetailsLoading(true);
      const response = await getMethod(
        ApiServices.zenxposGetFreeProductDetails,
      );

      if (response?.success) {
        setFreeProductDetails(
          Array.isArray(response?.data) ? response.data : [],
        );

        setFreeProductDetailsVisible(true);
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Failed to fetch free product details.',
        );
      }
    } catch (error) {
      console.log('Get Free Product Details Error:', error);

      Alert.alert('Error', 'Unable to fetch free product details.');
    } finally {
      setFreeProductDetailsLoading(false);
    }
  };

  const mapPrintDataToReceipt = data => {
    const {
      businessDetails,
      customerDetails,
      billDetails,
      items = [],
      taxBreakup = [],
      payments = [],
      billSettings,
    } = data;

    const tax = taxBreakup?.[0];

    return {
      type: 'retail',

      gstMode: taxBreakup?.length > 0 ? 'summary' : 'none',

      copyType: 'ORIGINAL',

      billPrefix: billSettings?.billPrefix?.trim?.() || '',
      billCaption: billSettings?.billCaption?.trim?.() || '',
      showLogo: Number(billSettings?.companyLogoOnBills ?? 0) === 1,

      store: {
        logo: businessDetails?.logo || '',
        name: businessDetails?.name || '',
        contact: businessDetails?.mobile || '',
        gstNo: businessDetails?.gstNo || '',
        address1: businessDetails?.address || '',
        address2: '',
      },

      billNo: billDetails?.billNumber || '',

      // date: billDateTime
      //   ? billDateTime.toLocaleDateString('en-GB')
      //   : '',
      date: billDetails?.billDate || '',

      // time: billDateTime
      //   ? billDateTime.toLocaleTimeString('en-US', {
      //       hour: 'numeric',
      //       minute: '2-digit',
      //     })
      //   : '',
      time: '',

      customer: {
        name: customerDetails?.customerName || '',
        phone: customerDetails?.mobile || '',
        taxNo: customerDetails?.gst || '',
      },

      items: items.map((item, index) => ({
        id: item.id || index + 1,

        name: item.productFullName || item.productShortName || '',

        hsn: item.hsnCode || '',

        mrp: Number(item.mrp || 0),

        rate: Number(item.priceOverride ?? item.salePrice ?? 0),

        discount: Number(item.discountAmount || 0),

        qty: Number(item.qty || 0),

        amount:
          Number(item.qty || 0) *
          Number(item.priceOverride ?? item.salePrice ?? 0) -
          Number(item.discountAmount || 0),
      })),

      totals: {
        totalItems: items.length,

        totalQty: items.reduce((sum, item) => sum + Number(item.qty || 0), 0),

        subtotal: Number(billDetails?.subTotal || 0),

        discount: Number(billDetails?.discountAmount || 0),

        roundOff: Number(billDetails?.roundOff || 0),

        additionalCharge: Number(billDetails?.otherCharges || 0),

        grandTotal: Number(billDetails?.netAmount || 0),
      },

      payment: {
        cash: payments
          .filter(p => p.paymentMode?.toLowerCase() === 'cash')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),

        upi: payments
          .filter(p => p.paymentMode?.toLowerCase() === 'upi')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),

        card: payments
          .filter(p => p.paymentMode?.toLowerCase() === 'card')
          .reduce((sum, p) => sum + Number(p.amount || 0), 0),
      },

      gst: tax
        ? {
          // hsn:
          //   items?.[0]?.hsnCode,

          taxPercent: Number(tax.taxPercentage),

          taxable: Number(tax.taxableAmount),

          sgst: Number(tax.gstAmount) / 2,

          cgst: Number(tax.gstAmount) / 2,

          taxValue: Number(tax.gstAmount),

          totalGst: Number(tax.gstAmount),
        }
        : null,

      amountSaved: Number(billDetails?.amountSaved),

      showQr: Number(billSettings?.qrCodeInBill) === 1,

      barcode: String(billDetails?.billNumber || ''),

      footerText:
        Array.isArray(billSettings?.descriptions)
          ? billSettings.descriptions.filter(item => item?.trim())
          : [],
    };
  };

  const handleSaveBill = async () => {
    try {
      setSaveBillError('');
      if (!billData.length) {
        Alert.alert('No Items', 'Please add at least one product.');
        return;
      }

      if (!isCheckoutStarted) {
        Alert.alert(
          'Checkout Required',
          'Please proceed to checkout before saving the bill.',
        );
        return;
      }

      if (selectedPayments.length === 0) {
        Alert.alert(
          'Payment Required',
          'Please select at least one payment mode.',
        );
        return;
      }

      if (dueAmount > 0) {
        Alert.alert(
          'Payment Incomplete',
          `Please collect the remaining amount of ₹${dueAmount.toFixed(2)}`,
        );
        return;
      }

      setLoading(true);

      const paymentModes = selectedPayments.map(payment => ({
        paymentModeId: Number(payment.mode?.paymentModeId ?? payment.mode?.id),
        // paymentModeId: Number(payment.mode?.paymentModeId),
        amount: Number(payment.amount || 0),
        cashChange:
          payment.mode?.allowChange === 1 ? Number(changeCash || 0) : 0,
      }));

      const body = {
        customerId: selectedCustomer?.id || '',

        smId: selectedSalesman?.id || '',

        subTotal: Number(Number(billSummary.subTotal).toFixed(2)),

        discount: Number(Number(billSummary.totalDiscount).toFixed(2)),

        gst: Number(Number(billSummary.totalGst).toFixed(2)),

        roundOffValue: Number(Number(billSummary.roundOff).toFixed(2)),

        additionalCharges: Number(Number(additionalCharge).toFixed(2)),

        total: Number(Number(totalBill).toFixed(2)),

        billMode: 1,

        paymentModes,
      };

      const response = await postMethod(ApiServices.zenxposSaveBill, body);

      if (response?.success) {
        const savedBillNo = response?.data?.billNo;
        const savedBillDate = response?.data?.billDate;
        console.log('SAVE BILL RESPONSE:', response);
        console.log('SAVED BILL NO:', savedBillNo);
        console.log('SAVED BILL DATE:', savedBillDate);
        const printBillData = await getPrintBill(savedBillNo, savedBillDate);

        if (!printBillData) {
          return;
        }

        const receiptData = mapPrintDataToReceipt(printBillData);

        console.log('FINAL BILL DATA FOR PRINT:', printBillData);

        Toast.show({
          type: 'success',
          text1: 'Bill Saved',
          text2: `Bill No. ${response?.data?.billNo || ''
            } generated successfully.`,
          position: 'top',
          visibilityTime: 3000,
        });
        setPrintBillData(receiptData);
        setShowReceipt(true);
        await getMethod(ApiServices.zenxposClearTempBill);

        setBillData([]);
        setSelectedPayments([]);
        setSelectedCustomer(null);
        setSelectedSalesman(null);
        setAdditionalCharge(0);

        setManualDiscountData({
          per: '',
          val: '',
        });

        setSelectedRowId(null);
        setIsCheckoutStarted(false);
        setBillBusterApplied(false);
        setFreeProductDetails([]);
        setSelectedBillBusters([]);
        setExpandedBillBusterId(null);

        await fetchTempBillItems();
      } else {
        const apiError =
          response?.errors || response?.message || 'Unable to generate bill.';

        setSaveBillError(apiError);
      }
    } catch (error) {
      console.log('Save Bill Error:', error);

      const apiError =
        error?.response?.data?.errors ||
        error?.response?.data?.message ||
        error?.message ||
        'Unable to save bill.';

      setSaveBillError(apiError);
    } finally {
      setLoading(false);
    }
  };
  const getPrintBill = async (billNo, billDate) => {
    try {
      if (!billNo || !billDate) {
        console.log('Missing billNo or billDate:', {
          billNo,
          billDate,
        });
        return null;
      }

      // API expects DD-MM-YYYY
      const formattedDate = new Date(billDate)
        .toLocaleDateString('en-GB')
        .replace(/\//g, '-');

      const body = {
        billNumber: Number(billNo),
        billDate: formattedDate,
      };

      console.log('GET PRINT REQUEST:', body);

      const response = await postMethod(ApiServices.zenxposGetPrint, body);

      console.log('GET PRINT RESPONSE:', response);

      if (response?.success && response?.data) {
        return response.data;
      }

      Alert.alert(
        'Print Error',
        response?.message || 'Failed to fetch bill details.',
      );

      return null;
    } catch (error) {
      console.log('Get Print Bill Error:', error);

      Alert.alert(
        'Print Error',
        error?.response?.data?.message ||
        error?.message ||
        'Unable to fetch bill details.',
      );

      return null;
    }
  };

  const loadPrinters = async () => {
    try {
      setPrinterLoading(true);

      const devices =
        await ThermalPrinterService.getDevices();

      console.log(
        'THERMAL PRINTERS:',
        devices,
      );

      setPrinters(devices);

      if (!devices.length) {
        Alert.alert(
          'Printer',
          'No thermal printer found.',
        );
      }
    } catch (error) {
      console.log(
        'Load printers error:',
        error,
      );

      Alert.alert(
        'Printer Error',
        'Unable to find thermal printer.',
      );
    } finally {
      setPrinterLoading(false);
    }
  };

  // const loadPrinters = async () => {
  //   try {
  //     setPrinterLoading(true);

  //     const devices =
  //       await printerService.getDevices();

  //     console.log(
  //       'THERMAL PRINTERS:',
  //       devices,
  //     );

  //     setPrinters(devices || []);

  //     if (!devices?.length) {
  //       Alert.alert(
  //         'Printer Not Found',
  //         'Please turn on your Bluetooth thermal printer and pair it with the device.',
  //       );
  //     }

  //     return devices || [];
  //   } catch (error) {
  //     console.log(
  //       'LOAD PRINTER ERROR:',
  //       error,
  //     );

  //     Alert.alert(
  //       'Printer Error',
  //       error?.message ||
  //         'Unable to find thermal printers.',
  //     );

  //     return [];
  //   } finally {
  //     setPrinterLoading(false);
  //   }
  // };

  const connectPrinter = async printer => {
    if (printerLoading) {
      return;
    }

    try {
      setPrinterLoading(true);

      console.log(
        'SELECTED PRINTER:',
        printer,
      );

      // Connect
      await ThermalPrinterService.connect(
        printer,
      );

      setSelectedPrinter(printer);

      console.log(
        'PRINTER CONNECTED:',
        printer,
      );

      // Close printer selection
      setPrinterVisible(false);

      // Print immediately
      if (printBillData) {
        console.log(
          'STARTING PRINT AFTER CONNECTION...',
        );

        await ThermalPrinterService.printReceipt(
          printBillData,
        );

        console.log(
          'PRINT SUCCESS - SELECTED FROM LIST',
        );

        Toast.show({
          type: 'success',
          text1: 'Printed',
          text2: 'Bill printed successfully.',
        });

        // Close receipt modal
        setShowReceipt(false);
      }

    } catch (error) {
      console.log(
        'CONNECT / PRINT ERROR:',
        error,
      );

      Alert.alert(
        'Print Failed',
        error?.message ||
        'Unable to connect or print.',
      );

    } finally {
      setPrinterLoading(false);
    }
  };

  // const connectPrinter = async printer => {
  //   try {
  //     setPrinterLoading(true);

  //     await ThermalPrinterService.connect(printer);

  //     setSelectedPrinter(printer);

  //     Toast.show({
  //       type: 'success',
  //       text1: 'Printer Connected',
  //       text2:
  //         printer?.device_name ||
  //         printer?.deviceName ||
  //         'Thermal printer connected',
  //     });

  //     setPrinterVisible(false);
  //   } catch (error) {
  //     console.log('CONNECT PRINTER ERROR:', error);

  //     Alert.alert(
  //       'Connection Failed',
  //       error?.message || 'Unable to connect printer.',
  //     );
  //   } finally {
  //     setPrinterLoading(false);
  //   }
  // };
  const handlePrintReceipt = async () => {
    if (printerLoading) {
      return;
    }
    try {
      if (!printBillData) {
        Alert.alert(
          'Print Error',
          'Receipt data is not available.',
        );
        return;
      }

      setPrinterLoading(true);

      // Already selected printer
      if (selectedPrinter) {
        await ThermalPrinterService.printReceipt(
          printBillData,
        );

        Toast.show({
          type: 'success',
          text1: 'Printed',
          text2: 'Bill printed successfully.',
        });
        setShowReceipt(false);

        return;
      }

      const devices =
        await ThermalPrinterService.getDevices();

      console.log(
        'AVAILABLE PRINTERS:',
        devices,
      );

      if (!devices || devices.length === 0) {
        Alert.alert(
          'Printer Not Found',
          'Please pair your 3-inch thermal printer through Bluetooth first.',
        );
        return;
      }

      // Only one printer
      if (devices.length === 1) {
        const printer = devices[0];

        console.log(
          'AUTO CONNECTING PRINTER:',
          printer,
        );

        await ThermalPrinterService.connect(
          printer,
        );

        setSelectedPrinter(printer);
        console.log(
          'PRINTER CONNECTED. STARTING PRINT...',
        );

        await ThermalPrinterService.printReceipt(
          printBillData,
        );

        Toast.show({
          type: 'success',
          text1: 'Printed',
          text2: 'Bill printed successfully.',
        });

        setShowReceipt(false);

        return;
      }

      // Multiple printers
      setPrinters(devices);
      setPrinterVisible(true);

    } catch (error) {
      console.log(
        'PRINT RECEIPT ERROR:',
        error,
      );

      Alert.alert(
        'Print Failed',
        error?.message ||
        'Unable to print the bill.',
      );
    } finally {
      setPrinterLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.leftRow}>
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <MenuIcon />
          </TouchableOpacity>
          <Image
            source={user?.logo ? { uri: user.logo } : ImagePath.vijethaLogo}
            style={styles.profileImage1}
            resizeMode="cover"
          />
          <View style={styles.divider} />
          <View>
            <Text style={styles.businessName}>{user?.businessName}</Text>
            <Text style={styles.cityName}>
              {' '}
              {user?.address}, {user?.city}
            </Text>
          </View>
        </View>
        <View style={styles.middleRow}>
          <Text style={styles.salesText}>SALES/BILLING</Text>
        </View>
        <View style={styles.rightRow}>
          <Text style={styles.cashierText}>
            Cashier: <Text style={styles.nameText}>{user?.name}</Text>
          </Text>
        </View>
      </View>
      <View style={styles.subContainer}>
        <View style={styles.leftContainer}>
          <View style={{ flexDirection: 'row', marginTop: rV(7) }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: rS(8),
                backgroundColor: '#FFFFFF',
                borderColor: '#EAEAEA',
                borderWidth: 1,
                width: rS(100),
                height: rV(28),
                borderRadius: 8,
              }}
            >
              {/* <TextInput 
              value={barCode} 
              onChangeText={setBarCode} 
              placeholderTextColor='#919191' 
              placeholder='1234567890987' 
              style={{
                flex: 1, fontSize: 14, fontSize: 14,
                fontFamily: Fonts.FigtreeRegular,
                color: '#000000',
                opacity:isCheckoutStarted ? 0.5 : 1,
              }}
                onSubmitEditing={() => handleBarcodeSearch(barCode)}
                autoFocus={true}
                editable={!isCheckoutStarted}
              /> */}
              <TextInput
                value={barCode}
                onChangeText={handleBarcodeChange}
                onSubmitEditing={handleBarcodeSubmit}
                placeholderTextColor="#919191"
                placeholder="1234567890123"
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontFamily: Fonts.FigtreeRegular,
                  color: '#000000',
                  opacity: isCheckoutStarted ? 0.5 : 1,
                }}
                autoFocus={true}
                editable={!isCheckoutStarted}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                onPress={async () => {
                  if (!hasPermission) {
                    const granted = await requestPermission();

                    if (!granted) {
                      Alert.alert(
                        'Permission Denied',
                        'Please allow camera access.',
                      );
                      return;
                    }
                  }

                  setIsCameraScanning(true);
                  setIsScannerVisible(true);
                }}
              >
                <GreyBarCodeIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrapper}>
              <View style={styles.searchInput}>
                <GreySearchIcon />
                <TextInput
                  style={[
                    styles.searchTextInput,
                    {
                      opacity: isCheckoutStarted ? 0.5 : 1,
                    },
                  ]}
                  placeholder="Search by Item name/ Item Code"
                  placeholderTextColor={'#919191'}
                  value={searchText}
                  onChangeText={handleSearch}
                  editable={!isCheckoutStarted}
                />
                {searchLoading && (
                  <ActivityIndicator size="small" color="#264B79" />
                )}
              </View>

              {searchResults.length > 0 && (
                <View style={styles.searchResultsDropdown}>
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {searchResults.map((item, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.searchResultItem}
                        onPress={() => onSelectItem(item)}
                      >
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={styles.resItemName}>
                              {item.productFullName} - {item.packSize}
                            </Text>
                            <Text style={styles.resItemPrice}>
                              ₹{item.salePrice}
                            </Text>
                          </View>
                          <Text style={styles.resItemSub}>
                            <Text style={styles.resLabel}>MRP: </Text>
                            <Text style={styles.resValue}>₹{item.mrp}</Text>
                            <Text style={styles.resLabel}> | Unit Price: </Text>
                            <Text style={styles.resValue}>
                              ₹{item.salePrice}
                            </Text>
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {!selectedCustomer ? (
              <TouchableOpacity
                style={styles.addCustomerBtn}
                onPress={() => setAddCustomerVisible(true)}
              >
                <AddCustomerIcon />
                <Text style={styles.addCustomerText}>Add Customer</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customerBadge}>
                <Text style={styles.customerNameText}>
                  {selectedCustomer.customerName}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    setSelectedCustomer(null);
                    try {
                      const body = {
                        customerId: '',
                        discountPercentage: 0,
                        discountValue: '',
                      };
                      await postMethod(
                        ApiServices.zenxposUpdateManualDiscount,
                        body,
                      );
                      fetchTempBillItems();
                    } catch (e) { }
                  }}
                >
                  <WhiteCrossIcon />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={styles.tableHeaderRow}>
                  {columns.map(item => (
                    <View
                      key={item.billColId}
                      style={[
                        styles.headerCell,
                        { width: getColWidth(item.colName) },
                        (item.colName === 'Qty' ||
                          item.colName === 'Sale Price' ||
                          item.colName === 'S.No') && {
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                    >
                      <Text style={styles.headerText}>{item.colName}</Text>
                    </View>
                  ))}
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {billData.map(row => {
                    const isSelected = row.id === selectedRowId;
                    const isVoid = row.voidFlag === 1;
                    const allowDecimals = Number(row.allowDecimals) === 1;

                    return (
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => {
                          // if (editingRowId !== row.id && editingPriceRowId !== row.id) {
                          //   setSelectedRowId(row.id);
                          // }
                          if (
                            editingRowId !== row.id &&
                            editingPriceRowId !== row.id
                          ) {
                            setSelectedRowId(prevSelectedId =>
                              prevSelectedId === row.id ? null : row.id,
                            );
                          }
                        }}
                        style={[
                          styles.dataRow,
                          isSelected && styles.selectedRowBg,
                          isSelected && styles.selectedRowBorder,
                          isVoid && styles.voidRowBg,
                        ]}
                        key={row.id}
                      >
                        {columns.map(col => {
                          const isSno = col.colName === 'S.No';
                          const isQtyCol = col.colName === 'Qty';
                          const isPriceCol = col.colName === 'Sale Price';
                          const isProductName = col.colName === 'Product Name';

                          return (
                            <View
                              key={col.billColId}
                              style={[
                                styles.dataCell,
                                { width: getColWidth(col.colName) },
                                (isQtyCol || isPriceCol || isSno) && {
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  paddingHorizontal: 0,
                                },
                              ]}
                            >
                              {isSno ? (
                                <Text style={styles.dataText}>{row.id}</Text>
                              ) : isQtyCol && editingRowId === row.id ? (
                                <View style={styles.qtyEditContainer}>
                                  <TextInput
                                    ref={qtyInputRef}
                                    style={styles.qtyInput}
                                    value={tempQty}
                                    keyboardType={
                                      allowDecimals
                                        ? 'decimal-pad'
                                        : 'number-pad'
                                    }
                                    onChangeText={text => {
                                      if (allowDecimals) {
                                        if (/^\d*\.?\d*$/.test(text)) {
                                          setTempQty(text);
                                        }
                                      } else {
                                        if (/^\d*$/.test(text)) {
                                          setTempQty(text);
                                        }
                                      }
                                    }}
                                    autoFocus
                                    blurOnSubmit={false}
                                    selectTextOnFocus
                                    onSubmitEditing={() => {
                                      handleQtyChange(row.id, tempQty);
                                    }}
                                  />
                                </View>
                              ) : isPriceCol && editingPriceRowId === row.id ? (
                                <View style={styles.qtyEditContainer}>
                                  <TextInput
                                    ref={priceInputRef}
                                    style={styles.qtyInput}
                                    value={tempPrice}
                                    keyboardType="numeric"
                                    onChangeText={setTempPrice}
                                    autoFocus
                                    onBlur={() =>
                                      handlePriceChange(row.id, tempPrice)
                                    }
                                    onSubmitEditing={() =>
                                      handlePriceChange(row.id, tempPrice)
                                    }
                                    selectTextOnFocus={true}
                                  />
                                </View>
                              ) : (
                                <View>
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                    }}
                                  >
                                    {isProductName && (
                                      <TouchableOpacity
                                        onPress={() => {
                                          fetchProductDetails(
                                            row.productId,
                                            row.variantId,
                                          );
                                        }}
                                        style={{
                                          marginRight: rS(2),
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <EyeIcon />
                                      </TouchableOpacity>
                                    )}
                                    <Text
                                      style={[
                                        styles.dataText,
                                        (isQtyCol || isPriceCol || isSno) && {
                                          textAlign: 'center',
                                          width: '100%',
                                        },
                                      ]}
                                    >
                                      {row[col.colName] ?? '-'}
                                    </Text>
                                  </View>
                                  {isProductName &&
                                    parseFloat(row['Disc %']) > 0 && (
                                      <Text style={styles.discountLabelText}>
                                        {parseFloat(row['Disc %'])}% discount @{' '}
                                        {row['Discount Amount']}
                                      </Text>
                                    )}
                                  {isProductName &&
                                    parseFloat(row.freeQty) > 0 && (
                                      // <Text style={styles.freeItemText}>
                                      //   {Number(row.freeQty)} Free Item
                                      // </Text>
                                      <View style={styles.freeItemRow}>
                                        <Text style={styles.freeItemText}>
                                          {Number(row.freeQty)} Free Item
                                        </Text>

                                        <TouchableOpacity
                                          onPress={() => {
                                            setSelectedFreeItem(row);
                                            setFreeItemVisible(true);
                                          }}
                                        >
                                          <InfoIcon />
                                        </TouchableOpacity>
                                      </View>
                                    )}

                                  {isProductName && isVoid && (
                                    <Text style={styles.voidStatusText}>
                                      VOID
                                    </Text>
                                  )}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
            <View
              style={{
                flexDirection: 'row',
                marginVertical: rV(8),
                marginHorizontal: rS(20),
              }}
            >
              <Text
                style={{
                  color: '#000000',
                  fontSize: 14,
                  fontFamily: Fonts.FigtreeRegular,
                  marginRight: rS(30),
                }}
              >
                Total Items: {billSummary.totalItems}{' '}
              </Text>
              <Text
                style={{
                  color: '#000000',
                  fontSize: 14,
                  fontFamily: Fonts.FigtreeRegular,
                }}
              >
                Total Qty: {billSummary.totalQty}{' '}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.helpKeysContainer,
              showHelp && styles.expandedContainer,
            ]}
          >
            <TouchableOpacity
              style={styles.floatingUpButton}
              activeOpacity={0.8}
              onPress={() => setShowHelp(!showHelp)}
            >
              {showHelp ? <HelpDownIcon /> : <HelpUpIcon />}
            </TouchableOpacity>
            <View style={styles.helpKeysInner}>
              <View style={styles.helpLeft}>
                <HelpKeyIcon />
                <Text style={styles.helpTitle}>Help Keys</Text>
              </View>
              <Text style={styles.helpHint}>
                Click{' '}
                <Text
                  style={{ fontFamily: Fonts.FigtreeBold, color: '#FFFFFF' }}
                >
                  ‘ F2 ’
                </Text>{' '}
                to get Help Keys
              </Text>
            </View>
            {showHelp && (
              <View style={styles.shortcutGrid}>
                {shortcutKeys.map(item => {
                  const isRecallKey = item.keyName === 'ReCall';
                  const isRecallDisabled = isRecallKey && billData.length > 0;
                  const isDiscountDisabled =
                    item.keyName === 'Discount' && !allowDiscount;

                  const isPriceOverrideDisabled =
                    item.keyName === 'Price Override' && !allowPriceOverride;

                  const isRefundDisabled =
                    item.keyName === 'Refund' && !allowRefund;
                  const isDisabled =
                    isRecallDisabled ||
                    isDiscountDisabled ||
                    isPriceOverrideDisabled ||
                    isRefundDisabled;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.shortcutItem,
                        isDisabled && { opacity: 0.2 },
                      ]}
                      disabled={isDisabled}
                      onPress={() => {
                        if (item.keyName === 'Clear Items') {
                          handleClearItems();
                        }
                        if (item.keyName === 'Suspend/Hold') {
                          setSuspendVisible(true);
                        }
                        if (item.keyName === 'ReCall') {
                          setRecallVisible(true);
                        }
                        if (item.keyName === 'Reprint') {
                          setReprintVisible(true);
                        }
                        if (item.keyName === 'Void/Delete') {
                          handleVoidItem();
                        }
                        if (item.keyName === 'Discount') {
                          if (!selectedRowId) {
                            Alert.alert(
                              'Selection Required',
                              'Please select a product first.',
                            );
                            return;
                          }

                          const activeRow = billData.find(
                            row => row.id === selectedRowId,
                          );

                          if (!activeRow) {
                            Alert.alert('Error', 'Selected product not found.');
                            return;
                          }

                          if (activeRow.voidFlag === 1) {
                            Alert.alert(
                              'Invalid Action',
                              'Cannot apply discount to a voided item.',
                            );
                            return;
                          }

                          // Get discount type from CURRENT selected product
                          const productPer = parseFloat(activeRow['Disc %']);
                          const productValue = parseFloat(
                            activeRow['Discount Amount'],
                          );

                          let currentDiscountType = null;

                          if (!isNaN(productPer) && productPer > 0) {
                            currentDiscountType = 'percentage';
                          } else if (!isNaN(productValue) && productValue > 0) {
                            currentDiscountType = 'value';
                          }

                          // Important: reset old product's discount type
                          setSelectedDiscountType(currentDiscountType);

                          setUpdateProductDiscountVisible(true);
                        }
                        // if (item.keyName === "Discount") {
                        //   if (!selectedRowId) {
                        //     Alert.alert(
                        //       "Selection Required",
                        //       "Please select a product first."
                        //     );
                        //     return;
                        //   }

                        //   const activeRow = billData.find(
                        //     row => row.id === selectedRowId
                        //   );

                        //   if (!activeRow) {
                        //     Alert.alert(
                        //       "Error",
                        //       "Selected product not found."
                        //     );
                        //     return;
                        //   }

                        //   if (activeRow.voidFlag === 1) {
                        //     Alert.alert(
                        //       "Invalid Action",
                        //       "Cannot apply discount to a voided item."
                        //     );
                        //     return;
                        //   }

                        //   setUpdateProductDiscountVisible(true);
                        // }
                        if (item.keyName === 'Qty Override') {
                          if (selectedRowId) {
                            const activeRow = billData.find(
                              r => r.id === selectedRowId,
                            );
                            if (activeRow.voidFlag === 1) {
                              Alert.alert(
                                'Invalid Action',
                                'Cannot change quantity of a voided item.',
                              );
                              return;
                            }
                            setTempQty(activeRow?.Qty?.toString() || '');
                            setEditingRowId(selectedRowId);
                            setTimeout(() => qtyInputRef.current?.focus(), 100);
                          } else {
                            Alert.alert(
                              'Selection Required',
                              'Please select a product first.',
                            );
                          }
                        }
                        if (item.keyName === 'Price Override') {
                          if (selectedRowId) {
                            const activeRow = billData.find(
                              r => r.id === selectedRowId,
                            );
                            if (activeRow.voidFlag === 1) {
                              Alert.alert(
                                'Invalid Action',
                                'Cannot change price of a voided item.',
                              );
                              return;
                            }
                            setTempPrice(
                              activeRow?.['Sale Price']?.toString() || '',
                            );
                            setEditingPriceRowId(selectedRowId);
                            setTimeout(
                              () => priceInputRef.current?.focus(),
                              100,
                            );
                          } else {
                            Alert.alert(
                              'Selection Required',
                              'Please select a product first.',
                            );
                          }
                        }
                      }}
                    >
                      <Text style={styles.shortcutKeyName}>{item.keyName}</Text>
                      <View style={styles.shortKeyBadge}>
                        <Text style={styles.shortKeyText}>{item.shortKey}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            <TouchableOpacity
              style={[
                styles.checkOutBtn,
                !billBusterApplied && { marginBottom: rV(5) },
              ]}
              onPress={async () => {
                if (billData.length === 0) {
                  Alert.alert('No Items', 'Please add at least one product.');
                  return;
                }
                if (!isCheckoutStarted) {
                  setIsCheckoutStarted(true);
                  await getApplicableBillBuster();
                } else {
                  setDiscardModalVisible(true);
                  // await getApplicableBillBuster();
                }

                // await getApplicableBillBuster();

                // setIsCheckoutStarted(true);
              }}
            >
              {/* <PrinterIcon /> */}
              <Text style={styles.checkOutText}>
                {isCheckoutStarted ? 'Refresh' : 'Proceed to Check out'}
              </Text>
              {isCheckoutStarted && <RefreshIcon />}
            </TouchableOpacity>
            {billBusterApplied && (
              <View style={styles.billBusterSuccessRow}>
                <Text style={styles.billBusterSuccessText}>
                  Bill Buster Applied Successfully
                </Text>

                <TouchableOpacity
                  onPress={getFreeProductDetails}
                  style={styles.billBusterInfoButton}
                  disabled={freeProductDetailsLoading}
                >
                  <InfoIcon />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.buttonRow}>
              {Number(askSalesmanCode) === 1 ? (
                // askSalesmanCode === 1
                // Button visible but disabled
                // No salesman name display
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      marginRight: rS(8),
                      opacity: 0.4,
                    },
                  ]}
                  disabled={true}
                >
                  <Text style={styles.actionButtonText}>Add SalesMan</Text>
                </TouchableOpacity>
              ) : !selectedSalesman ? (
                // askSalesmanCode === 0 && no salesman selected
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {
                      marginRight: rS(8),
                      opacity: !isCheckoutStarted ? 0.4 : 1,
                    },
                  ]}
                  disabled={!isCheckoutStarted}
                  onPress={() => {
                    setPendingProduct(null);
                    setSalesmanVisible(true);
                  }}
                >
                  <Text style={styles.actionButtonText}>Add SalesMan</Text>
                </TouchableOpacity>
              ) : (
                // askSalesmanCode === 0 && salesman selected
                <View
                  style={[
                    styles.salesmanBadge,
                    {
                      marginRight: rS(8),
                      flex: 1,
                    },
                  ]}
                >
                  <Text style={styles.customerNameText} numberOfLines={1}>
                    {selectedSalesman.name}
                  </Text>

                  <TouchableOpacity onPress={() => setSelectedSalesman(null)}>
                    <WhiteCrossIcon />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    opacity: !isCheckoutStarted ? 0.4 : 1,
                  },
                ]}
                disabled={!isCheckoutStarted}
                onPress={() => setAdditionalChargesVisible(true)}
              >
                <Text style={styles.actionButtonText}>Additional Charge</Text>
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: rV(8) }}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sub Total</Text>
                <Text style={styles.summaryValue}>₹{billSummary.subTotal}</Text>
              </View>
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  {billSummary.totalDiscount > 0 && !selectedCustomer && (
                    <TouchableOpacity
                      disabled={!isCheckoutStarted || billData.length === 0}
                      style={[
                        { marginLeft: rS(2) },
                        (!isCheckoutStarted || billData.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      onPress={() => setManualDiscountVisible(true)}
                    >
                      <EditIcon />
                    </TouchableOpacity>
                  )}
                </View>
                {billSummary.totalDiscount > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.summaryValue}>
                      ₹{billSummary.totalDiscount}
                    </Text>
                  </View>
                ) : (
                  !selectedCustomer && (
                    <TouchableOpacity
                      style={[
                        { flexDirection: 'row', alignItems: 'center' },
                        (!isCheckoutStarted || billData.length === 0) && {
                          opacity: 0.5,
                        },
                      ]}
                      disabled={!isCheckoutStarted || billData.length === 0}
                      onPress={() => {
                        setManualDiscountData({ per: '', val: '' });
                        setManualDiscountVisible(true);
                      }}
                    >
                      <PlusIcon />
                      <Text style={styles.newText}>New</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST Amount</Text>
                <Text style={styles.summaryValue}>
                  ₹{billSummary.totalGst.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Round-off Value</Text>
                <Text style={styles.summaryValue}>₹{billSummary.roundOff}</Text>
              </View>

              {additionalCharge > 0 && (
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.summaryLabel}>Additional Charge</Text>
                    <TouchableOpacity
                      style={{ marginLeft: rS(5) }}
                      onPress={() => setAdditionalCharge(0)}
                    >
                      <RedCrossIcon />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.summaryValue}>₹{additionalCharge}</Text>
                </View>
              )}
            </View>

            {/* Total Amount */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}> ₹{totalBill.toFixed(2)}</Text>
            </View>

            {/* Payment Summary */}
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Text style={styles.paymentTitle}>Payment Summary</Text>

                <TouchableOpacity
                  disabled={!isCheckoutStarted}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                    },
                    !isCheckoutStarted && { opacity: 0.4 },
                  ]}
                  onPress={() => {
                    setEditingPaymentIndex(null);
                    setPaymentModalVisible(true);
                  }}
                >
                  <BlueEditIcon />
                  <Text
                    style={[
                      styles.newText,
                      !isCheckoutStarted && { color: '#999' },
                    ]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.tableHeader}>
                <Text style={[styles.tableText, { flex: 0.2 }]}>S.No</Text>
                <Text style={[styles.tableText, { flex: 0.5 }]}>
                  Payment Mode
                </Text>
                <Text
                  style={[styles.tableText, { flex: 0.3, textAlign: 'right' }]}
                >
                  Amount
                </Text>
              </View>

              <View
                style={[
                  styles.paymentRowsContainer,
                  selectedPayments.length > 2 && styles.paymentRowsScrollable,
                ]}
              >
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={selectedPayments.length > 2}
                  scrollEnabled={selectedPayments.length > 2}
                >
                  {selectedPayments.map((item, index) => (
                    <View
                      key={`payment-${index}`}
                      style={styles.paymentRow}
                    >
                      <Text style={styles.serialText}>
                        {index + 1}
                      </Text>

                      <View style={styles.paymentModeContainer}>
                        <Text style={styles.paymentModeText}>
                          {item.mode.paymentMode}
                        </Text>
                      </View>

                      <Text style={styles.amountText}>
                        ₹{Number(item.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              {/* {selectedPayments.map((item, index) => (
                <View key={`payment-${index}`} style={styles.paymentRow}>
                  <Text style={styles.serialText}>{index + 1}</Text>
                  <View style={styles.paymentModeContainer}>
                    <Text style={styles.paymentModeText}>
                      {item.mode.paymentMode}
                    </Text>
                  </View>
                  <Text style={styles.amountText}>
                    ₹{item.amount.toFixed(2)}
                  </Text>
                </View>
              ))} */}

              <View style={styles.dashedLine} />
              <View style={{ marginHorizontal: rS(8) }}>
                <View style={styles.summaryRow}>
                  <Text
                    style={{
                      color: '#7A7A7A',
                      fontSize: 14,
                      fontFamily: Fonts.FigtreeRegular,
                    }}
                  >
                    Change Cash:
                  </Text>
                  <Text
                    style={{
                      color: '#7A7A7A',
                      fontSize: 14,
                      fontFamily: Fonts.FigtreeBold,
                    }}
                  >
                    ₹{changeCash.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text
                    style={{
                      color: '#C8682D',
                      fontSize: 14,
                      fontFamily: Fonts.FigtreeRegular,
                    }}
                  >
                    Due Amount:
                  </Text>
                  <Text
                    style={{
                      color: '#C8682D',
                      fontFamily: Fonts.FigtreeSemiBold,
                    }}
                  >
                    ₹{dueAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
            {saveBillError ? (
              <Text style={styles.saveBillErrorText}>{saveBillError}</Text>
            ) : null}

            {/* Print Button */}
            <TouchableOpacity
              style={[
                styles.printButton,
                (!isCheckoutStarted ||
                  billData.length === 0 ||
                  selectedPayments.length === 0) && {
                  opacity: 0.5,
                },
              ]}
              disabled={
                !isCheckoutStarted ||
                billData.length === 0 ||
                selectedPayments.length === 0 ||
                loading
              }
              onPress={handleSaveBill}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <PrinterIcon />
              )}

              <Text style={styles.printText}>
                {loading ? ' Saving...' : ' Save & Print Bill'}
              </Text>
            </TouchableOpacity>
            {/* <TouchableOpacity style={styles.printButton} onPress={() => setShowReceipt(true)}>
              <PrinterIcon />
              <Text style={styles.printText}>Save & Print Bill</Text>
            </TouchableOpacity> */}
          </ScrollView>
        </View>
      </View>

      {/* {showReceipt && (
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptSwitcher}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {receiptSamples.map((sample, idx) => (
                <TouchableOpacity
                  key={sample.key}
                  onPress={() => setReceiptIndex(idx)}
                  style={[
                    styles.receiptChip,
                    receiptIndex === idx && styles.receiptChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.receiptChipText,
                      receiptIndex === idx && styles.receiptChipTextActive,
                    ]}
                  >
                    {sample.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.receiptCloseBtn}
              onPress={() => setShowReceipt(false)}
            >
              <Text style={styles.receiptCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                flex: 1,
                width: '100%',
                alignItems: 'center',
                backgroundColor: '#ddd',
              }}
            >
              {activeSample?.key === 'KOTOrder' ? (
                <KOTOrder />
              ) : activeSample?.type ? (
                <A5Invoice type={activeSample.type} />
              ) : (
                <Receipt bill={printBillData} />
              )}
            </View>
          </View>
        </View>
      )} */}
      <Modal
        visible={showReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReceipt(false)}
      >
        <View style={styles.receiptModalOverlay}>

          <View style={styles.receiptModalContainer}>

            {/* MODAL HEADER */}
            {/* <View style={styles.receiptModalHeader}>
        <View>
          <Text style={styles.receiptModalTitle}>
            Bill Details
          </Text>

          <Text style={styles.receiptModalSubTitle}>
            Bill No: {printBillData?.billNo || 'Generated Bill'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.receiptCloseButton}
          onPress={() => setShowReceipt(false)}
        >
          <CrossIcon />
        </TouchableOpacity>
      </View> */}

            {/* RECEIPT */}
            <View style={styles.receiptModalBody}>

              {printBillData ? (
                <Receipt
                  bill={printBillData}
                // printerWidth={576}
                />
              ) : (
                <View style={styles.receiptLoading}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.receiptLoadingText}>
                    Loading bill...
                  </Text>
                </View>
              )}

            </View>

            {/* BOTTOM BUTTONS */}
            <View style={styles.receiptModalFooter}>

              <TouchableOpacity
                style={styles.receiptCloseAction}
                onPress={() => setShowReceipt(false)}
              >
                <Text style={styles.receiptCloseActionText}>
                  Close
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.receiptPrintButton}
                onPress={handlePrintReceipt}
                disabled={!printBillData || printerLoading}
              >
                <PrinterIcon />

                <Text style={styles.receiptPrintButtonText}>
                  {printerLoading
                    ? 'Printing...'
                    : 'Print Bill'}
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>
      </Modal>
      <Modal
        visible={printerVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPrinterVisible(false)
        }
      >
        <View style={styles.printerModalOverlay}>
          <View style={styles.printerModalContainer}>

            <Text style={styles.printerModalTitle}>
              Select Thermal Printer
            </Text>

            {printers.map((printer, index) => (
              <TouchableOpacity
                key={
                  printer?.inner_mac_address ||
                  printer?.device_id ||
                  index
                }
                style={styles.printerItem}
                onPress={() =>
                  connectPrinter(printer)
                }
              >
                <View>
                  <Text style={styles.printerName}>
                    {printer?.device_name ||
                      printer?.deviceName ||
                      'Thermal Printer'}
                  </Text>

                  <Text style={styles.printerAddress}>
                    {printer?.inner_mac_address ||
                      printer?.address ||
                      ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.printerCancelButton}
              onPress={() =>
                setPrinterVisible(false)
              }
            >
              <Text>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
      <AddNewCustomerModal
        isVisible={addCustomerVisible}
        onClose={() => setAddCustomerVisible(false)}
        onSelectCustomer={handleCustomerSelect}
      />
      <AddManualDiscountModal
        isVisible={manualDiscountVisible}
        onClose={() => {
          setManualDiscountVisible(false);
        }}
        onDiscountSuccess={handleDiscountSuccess}
        initialData={manualDiscountData}
        subTotal={billSummary.subTotal}
      />
      <UpdateProductDiscountVisible
        isVisible={updateProductDiscountVisible}
        onClose={() => {
          setUpdateProductDiscountVisible(false);
          setSelectedDiscountType(null);
        }}
        productId={selectedProduct?.productId}
        variantId={selectedProduct?.variantId}
        discountPercentage={selectedProduct?.['Disc %']}
        discountValue={selectedProduct?.['Discount Amount']}
        discountType={selectedDiscountType}
        onSuccess={async discountType => {
          setSelectedDiscountType(discountType);
          setSelectedRowId(null);
          await fetchTempBillItems();
        }}
      />
      <AdditionalChargesModal
        isVisible={additionalChargesVisible}
        onClose={() => {
          setAdditionalChargesVisible(false);
        }}
        initialValue={additionalCharge}
        onSave={val => setAdditionalCharge(val)}
      />
      <AddSuspendModal
        isVisible={suspendVisible}
        onClose={() => setSuspendVisible(false)}
        onSuspendSuccess={() => {
          setBillData([]);
          fetchTempBillItems();
        }}
      />
      <AddReCallModal
        isVisible={recallVisible}
        onClose={() => setRecallVisible(false)}
        onRecallItem={handleRecallAction}
      />
      <AddRePrintModal
        isVisible={reprintVisible}
        onClose={() => setReprintVisible(false)}
      />
      {/* <AddNewBillSalesManModal
        isVisible={salesmanVisible}
        onClose={() => setSalesmanVisible(false)}
        onSelect={(smData) => setSelectedSalesman(smData)}
      /> */}
      <AddNewBillSalesManModal
        isVisible={salesmanVisible}
        onClose={() => {
          setSalesmanVisible(false);
          setPendingProduct(null);
        }}
        onSelect={async smData => {
          setSelectedSalesman(smData);
          setSalesmanVisible(false);

          if (pendingProduct) {
            await addProductToBill(pendingProduct, smData?.id);

            setPendingProduct(null);
          }
        }}
      />
      <AddPaymentModal
        isVisible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        paymentModes={allPaymentModes}
        totalBill={totalBill}
        initialPayments={selectedPayments}
        onSave={handleSavePayment}
      />
      <BillingVariantViewModal
        isVisible={variantModalVisible}
        onClose={() => {
          setVariantModalVisible(false);
          setVariantProductData(null);
        }}
        productData={variantProductData}
        onSelectVariant={handleVariantSelect}
      />
      <Modal
        visible={discardModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDiscardModalVisible(false)}
      >
        <View style={styles.discardOverlay}>
          <View style={styles.discardModal}>
            <View style={styles.modalHeader}>
              <Text allowFontScaling={false} style={styles.modalTitle}>
                Discard Changes
              </Text>
              <TouchableOpacity onPress={() => setDiscardModalVisible(false)}>
                <CrossIcon />
              </TouchableOpacity>
            </View>
            <View style={styles.divider} />
            <Text style={styles.discardMessage}>
              Are you sure you want to discard the changes?
            </Text>

            <View style={styles.discardButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDiscardModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.yesButton}
                onPress={async () => {
                  setDiscardModalVisible(false);
                  await handleClearManualDiscount(true);
                }}
              >
                <Text style={styles.yesButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Free Item */}
      <Modal
        visible={freeItemVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setFreeItemVisible(false);
          setSelectedFreeItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                Free Item Details
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setFreeItemVisible(false);
                  setSelectedFreeItem(null);
                }}
                style={styles.closeButton}
              >
                <CancelBlackIcon />
              </TouchableOpacity>
            </View>

            {/* Variants Table */}
            <View style={styles.tableWrapper}>
              <View style={styles.freeTableHeader}>
                <Text style={[styles.freeProductText, { width: '20%' }]}>
                  Product Name
                </Text>
                <Text style={[styles.freeProductText, { width: '20%' }]}>
                  Pack Size
                </Text>
                <Text style={[styles.freeProductText, { width: '20%' }]}>
                  MRP
                </Text>
                <Text style={[styles.freeProductText, { width: '20%' }]}>
                  Sale Price
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.rowText, { width: '20%' }]}>
                  {selectedFreeItem?.freeProductName || '-'}
                </Text>
                <Text style={[styles.rowText, { width: '20%' }]}>
                  ₹{selectedFreeItem?.freeVariantName || '-'}
                </Text>
                <Text style={[styles.rowText, { width: '20%' }]}>
                  ₹{Number(selectedFreeItem?.freeVariantMrp || 0).toFixed(2)}
                </Text>
                <Text style={[styles.rowText, { width: '20%' }]}>
                  {' '}
                  ₹
                  {Number(selectedFreeItem?.freeVariantSalePrice || 0).toFixed(
                    2,
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* Bill Buster Modal */}
      <Modal
        visible={billBusterVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setBillBusterVisible(false);
          setExpandedBillBusterId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.billBusterModalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Bill Buster</Text>

              <TouchableOpacity
                onPress={() => {
                  setBillBusterVisible(false);
                  setExpandedBillBusterId(null);
                }}
                style={styles.closeButton}
              >
                <CancelBlackIcon />
              </TouchableOpacity>
            </View>

            {billBusterLoading ? (
              <View style={styles.billBusterLoader}>
                <ActivityIndicator size="large" color="#264B79" />

                <Text style={styles.loadingText}>
                  Loading Bill Buster schemes...
                </Text>
              </View>
            ) : billBusterData.length === 0 ? (
              <View style={styles.noBillBusterContainer}>
                <Text style={styles.noDataText}>
                  No applicable Bill Buster schemes found.
                </Text>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  padding: rS(8),
                }}
              >
                {billBusterData.map(scheme => {
                  const isExpanded = expandedBillBusterId === scheme.id;

                  const childBillBusters = Array.isArray(
                    scheme.childBillBusters,
                  )
                    ? scheme.childBillBusters
                    : [];

                  const hasChildren = childBillBusters.length > 0;
                  const isSchemeDisabled = hasSelectedDifferentScheme(
                    scheme.id,
                  );

                  return (
                    <View key={scheme.id} style={styles.billBusterCard}>
                      {/* Scheme Row */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.billBusterSchemeRow}
                        onPress={() => {
                          setExpandedBillBusterId(prev =>
                            prev === scheme.id ? null : scheme.id,
                          );
                        }}
                      >
                        <Text
                          style={styles.billBusterSchemeName}
                          numberOfLines={1}
                        >
                          {scheme.schemeName}
                        </Text>

                        <View style={styles.billBusterArrow}>
                          {isExpanded ? <DownArrow /> : <UpArrow />}
                        </View>
                      </TouchableOpacity>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <View style={styles.billBusterDetails}>
                          {hasChildren ? (
                            <View>
                              {/* Child Bill Buster Table Header - only once */}
                              <View style={styles.billBusterChildHeaderRow}>
                                <View style={styles.billBusterCheckbox} />
                                <View style={styles.billBusterChildContent}>
                                  <View
                                    style={styles.billBusterChildHeaderColumns}
                                  >
                                    <Text
                                      style={[
                                        styles.billBusterChildHeaderText,
                                        { flex: 1.5 },
                                      ]}
                                    >
                                      Product Name
                                    </Text>

                                    <Text
                                      style={[
                                        styles.billBusterChildHeaderText,
                                        { flex: 1 },
                                      ]}
                                    >
                                      Pack Size
                                    </Text>

                                    <Text
                                      style={[
                                        styles.billBusterChildHeaderText,
                                        { flex: 0.8 },
                                      ]}
                                    >
                                      Discount
                                    </Text>

                                    <Text
                                      style={[
                                        styles.billBusterChildHeaderText,
                                        { flex: 0.7 },
                                      ]}
                                    >
                                      Free Qty
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              {/* Child Bill Buster Rows */}
                              {childBillBusters.map((child, index) => {
                                const discount =
                                  Number(child.discountPercentage) || 0;
                                const freeQty = Number(child.freeQty) || 0;

                                const childKey = `${scheme.id}-${child.id || index
                                  }`;

                                const isSelected =
                                  selectedBillBusters.includes(childKey);

                                const isChildDisabled =
                                  hasSelectedDifferentScheme(scheme.id);

                                return (
                                  <View
                                    key={childKey}
                                    style={styles.billBusterChildCard}
                                  >
                                    <View style={styles.billBusterChildRow}>
                                      {/* Checkbox */}
                                      <TouchableOpacity
                                        style={[
                                          styles.billBusterCheckbox,
                                          isChildDisabled && {
                                            opacity: 0.4,
                                          },
                                        ]}
                                        disabled={isChildDisabled}
                                        activeOpacity={0.7}
                                        onPress={() => {
                                          setSelectedBillBusters(prev => {
                                            if (prev.includes(childKey)) {
                                              return prev.filter(
                                                key => key !== childKey,
                                              );
                                            }

                                            return [...prev, childKey];
                                          });
                                        }}
                                      >
                                        {isSelected ? (
                                          <CheckIcon />
                                        ) : (
                                          <UnCheckIcon />
                                        )}
                                      </TouchableOpacity>

                                      {/* Product Details */}
                                      <View
                                        style={styles.billBusterChildContent}
                                      >
                                        <View
                                          style={styles.billBusterChildValueRow}
                                        >
                                          {/* Product Name */}
                                          <Text
                                            style={[
                                              styles.billBusterChildValueText,
                                              { flex: 1.5 },
                                            ]}
                                            numberOfLines={1}
                                          >
                                            {child.productName || '-'}
                                          </Text>

                                          {/* Pack Size */}
                                          <Text
                                            style={[
                                              styles.billBusterChildValueText,
                                              { flex: 1 },
                                            ]}
                                            numberOfLines={1}
                                          >
                                            {child.packSize || '-'}
                                          </Text>

                                          {/* Discount */}
                                          <Text
                                            style={[
                                              styles.billBusterChildDiscountText,
                                              { flex: 0.8 },
                                            ]}
                                          >
                                            {discount > 0
                                              ? `${discount}%`
                                              : '-'}
                                          </Text>

                                          {/* Free Qty */}
                                          <Text
                                            style={[
                                              styles.billBusterChildFreeQtyText,
                                              { flex: 0.7 },
                                            ]}
                                          >
                                            {freeQty > 0 ? freeQty : '-'}
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          ) : (
                            // <View>
                            //   {childBillBusters.map((child, index) => {
                            //     const discount =
                            //       Number(child.discountPercentage) || 0;

                            //     const freeQty =
                            //       Number(child.freeQty) || 0;

                            //     const childKey =
                            //       `${scheme.id}-${child.id || index}`;

                            //     const isSelected =
                            //       selectedBillBusters.includes(childKey);

                            //     const isChildDisabled =
                            //       hasSelectedDifferentScheme(scheme.id);

                            //     return (
                            //       <View
                            //         key={childKey}
                            //         style={styles.billBusterChildCard}
                            //       >
                            //         <View style={styles.billBusterChildRow}>
                            //           <TouchableOpacity
                            //             style={[
                            //               styles.billBusterCheckbox,
                            //               isChildDisabled && {
                            //                 opacity: 0.4,
                            //               },
                            //             ]}
                            //             disabled={isChildDisabled}
                            //             activeOpacity={0.7}
                            //             onPress={() => {
                            //               setSelectedBillBusters(prev => {
                            //                 if (prev.includes(childKey)) {
                            //                   return prev.filter(
                            //                     key => key !== childKey
                            //                   );
                            //                 }

                            //                 return [...prev, childKey];
                            //               });
                            //             }}
                            //           >
                            //             {isSelected ? (
                            //               <CheckIcon />
                            //             ) : (
                            //               <UnCheckIcon />
                            //             )}
                            //           </TouchableOpacity>

                            //           {/* Product Details */}
                            //           <View style={styles.billBusterChildContent}>
                            //             {/* Child Header Row */}
                            //             <View style={styles.billBusterChildHeaderRow}>
                            //               <Text
                            //                 style={[
                            //                   styles.billBusterChildHeaderText,
                            //                   { flex: 1.5 },
                            //                 ]}
                            //               >
                            //                 Product Name
                            //               </Text>

                            //               <Text
                            //                 style={[
                            //                   styles.billBusterChildHeaderText,
                            //                   { flex: 1 },
                            //                 ]}
                            //               >
                            //                 Pack Size
                            //               </Text>

                            //               {discount > 0 && (
                            //                 <Text
                            //                   style={[
                            //                     styles.billBusterChildHeaderText,
                            //                     { flex: 0.8 },
                            //                   ]}
                            //                 >
                            //                   Discount
                            //                 </Text>
                            //               )}

                            //               {freeQty > 0 && (
                            //                 <Text
                            //                   style={[
                            //                     styles.billBusterChildHeaderText,
                            //                     { flex: 0.7 },
                            //                   ]}
                            //                 >
                            //                   Free Qty
                            //                 </Text>
                            //               )}
                            //             </View>

                            //             {/* Child Details Row */}
                            //             <View style={styles.billBusterChildValueRow}>
                            //               <Text
                            //                 style={[
                            //                   styles.billBusterChildValueText,
                            //                   { flex: 1.5 },
                            //                 ]}
                            //                 numberOfLines={1}
                            //               >
                            //                 {child.productName || '-'}
                            //               </Text>

                            //               <Text
                            //                 style={[
                            //                   styles.billBusterChildValueText,
                            //                   { flex: 1 },
                            //                 ]}
                            //                 numberOfLines={1}
                            //               >
                            //                 {child.packSize || '-'}
                            //               </Text>

                            //               {discount > 0 && (
                            //                 <Text
                            //                   style={[
                            //                     styles.billBusterChildDiscountText,
                            //                     { flex: 0.8 },
                            //                   ]}
                            //                 >
                            //                   {discount}%
                            //                 </Text>
                            //               )}

                            //               {freeQty > 0 && (
                            //                 <Text
                            //                   style={[
                            //                     styles.billBusterChildFreeQtyText,
                            //                     { flex: 0.7 },
                            //                   ]}
                            //                 >
                            //                   {freeQty}
                            //                 </Text>
                            //               )}
                            //             </View>
                            //           </View>
                            //         </View>
                            //       </View>
                            //     );
                            //   })}
                            // </View>

                            /* No Child Bill Busters */
                            <View style={styles.billBusterSchemeDetails}>
                              <TouchableOpacity
                                disabled={isSchemeDisabled}
                                style={[
                                  styles.billBusterSchemeDetailCheckbox,
                                  isSchemeDisabled && {
                                    opacity: 0.4,
                                  },
                                ]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  const key = `scheme-${scheme.id}`;
                                  setSelectedBillBusters(prev => {
                                    if (prev.includes(key)) {
                                      return prev.filter(item => item !== key);
                                    }

                                    return [...prev, key];
                                  });
                                }}
                              >
                                {selectedBillBusters.includes(
                                  `scheme-${scheme.id}`,
                                ) ? (
                                  <CheckIcon />
                                ) : (
                                  <UnCheckIcon />
                                )}
                              </TouchableOpacity>
                              {/* Scheme Details */}
                              <View
                                style={styles.billBusterSchemeDetailContent}
                              >
                                {/* Bill Amount */}
                                <View style={styles.billBusterDetailRow}>
                                  <Text style={styles.billBusterLabel}>
                                    Bill Amount
                                  </Text>

                                  <Text style={styles.billBusterValue}>
                                    ₹{Number(scheme.billAmount || 0).toFixed(2)}
                                  </Text>
                                </View>

                                {/* Discount Percentage */}
                                <View style={styles.billBusterDetailRow}>
                                  <Text style={styles.billBusterLabel}>
                                    Discount
                                  </Text>

                                  <Text style={styles.billBusterDiscount}>
                                    {Number(scheme.discountPercentage || 0)}%
                                  </Text>
                                </View>

                                {/* From Date */}
                                <View style={styles.billBusterDetailRow}>
                                  <Text style={styles.billBusterLabel}>
                                    From Date
                                  </Text>

                                  <Text style={styles.billBusterValue}>
                                    {scheme.fromDate || '-'}
                                  </Text>
                                </View>

                                {/* To Date */}
                                <View style={styles.billBusterDetailRow}>
                                  <Text style={styles.billBusterLabel}>
                                    To Date
                                  </Text>

                                  <Text style={styles.billBusterValue}>
                                    {scheme.toDate || '-'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {/* Apply / Cancel Buttons */}
            <View style={styles.billBusterButtonContainer}>
              <TouchableOpacity
                style={styles.billBusterCancelButton}
                onPress={() => {
                  setBillBusterVisible(false);
                  setExpandedBillBusterId(null);
                }}
              >
                <Text style={styles.billBusterCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.billBusterApplyButton}
                disabled={billBusterLoading}
                onPress={handleApplyBillBuster}
              >
                {billBusterLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.billBusterApplyText}>Apply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={productDetailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setProductDetailsVisible(false);
          setProductDetails(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.productDetailsModalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Product Details</Text>

              <TouchableOpacity
                onPress={() => {
                  setProductDetailsVisible(false);
                  setProductDetails(null);
                }}
                style={styles.closeButton}
              >
                <CancelBlackIcon />
              </TouchableOpacity>
            </View>

            {productDetailsLoading ? (
              <View style={styles.productDetailsLoader}>
                <ActivityIndicator size="large" color="#264B79" />
                <Text style={styles.loadingText}>
                  Loading product details...
                </Text>
              </View>
            ) : productDetails ? (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.productDetailsScroll}
              >
                {/* Product Information */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Product Information</Text>

                  <View style={styles.detailsGrid}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Product Code :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.productCode || '-'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Product Name :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.productFullName || '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Pack Size :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.variantDetails?.packSize || '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>QOH :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.qoh ?? '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>HSN :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.hsnCode || '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>EAN Code :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.eanCode || '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Category :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.categoryName || '-'}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Brand :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.brandName || '-'}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>MRP :</Text>
                      <Text style={styles.detailValue}>
                        ₹
                        {Number(
                          productDetails.variantDetails?.mrp || 0,
                        ).toFixed(2)}
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Sale Price :</Text>
                      <Text style={styles.detailValue}>
                        ₹
                        {Number(
                          productDetails.variantDetails?.salePrice || 0,
                        ).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Tax% :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.taxName}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Status :</Text>
                      <Text style={styles.detailValue}>
                        {productDetails.productDetails?.status === 1
                          ? 'Active'
                          : 'In-Active'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Product Controls */}
                <View style={styles.detailsSection}>
                  <Text style={styles.sectionTitle}>Product Controls</Text>

                  <View style={styles.controlGrid}>
                    {[
                      ['Allow Weighing Scale', 'allowWeighingScale'],
                      ['Allow Decimals', 'allowDecimals'],
                      ['Allow Discount', 'allowDiscount'],
                      ['Allow Price Override', 'allowPriceOverride'],
                      ['KOT Required', 'kotRequired'],
                      ['Kit', 'kit'],
                    ].map(([label, key]) => (
                      <View key={key} style={styles.controlItem}>
                        <Text style={styles.detailLabel}>{label}</Text>

                        <Text
                          style={[
                            styles.controlStatus,
                            Number(productDetails.productControl?.[key]) === 1
                              ? styles.statusOn
                              : styles.statusOff,
                          ]}
                        >
                          {Number(productDetails.productControl?.[key]) === 1
                            ? 'On'
                            : 'Off'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Item Wise Details */}
                {Array.isArray(productDetails.itemWiseItems) &&
                  productDetails.itemWiseItems.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Item Wise Details</Text>

                      {productDetails.itemWiseItems.map((item, index) => (
                        <View
                          key={item.id || index}
                          style={styles.purchaseCard}
                        >
                          <View style={styles.purchaseDateRow}>
                            <Text style={styles.purchaseDateLabel}>
                              From Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.fromDate || '-'}
                            </Text>

                            <Text style={styles.purchaseDateLabel}>
                              To Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.toDate || '-'}
                            </Text>
                          </View>

                          <View style={styles.purchaseTableHeader}>
                            <Text style={styles.purchaseHeaderText}>
                              Purchase Qty
                            </Text>

                            <Text style={styles.purchaseHeaderText}>
                              Free Qty
                            </Text>

                            <Text style={styles.purchaseHeaderText}>
                              Free Product
                            </Text>
                          </View>

                          <View style={styles.purchaseTableRow}>
                            <Text style={styles.purchaseRowText}>
                              {item.purchaseQty}
                            </Text>

                            <Text style={styles.purchaseRowText}>
                              {item.freeQty}
                            </Text>

                            <Text style={styles.purchaseRowText}>
                              {item.freeProduct?.productFullName || '-'}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Purchase Qty Details */}
                {Array.isArray(productDetails.purchaseWiseItems) &&
                  productDetails.purchaseWiseItems.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        Purchase Qty Details
                      </Text>

                      {productDetails.purchaseWiseItems.map(
                        (purchaseItem, index) => (
                          <View
                            key={purchaseItem.id || index}
                            style={styles.purchaseCard}
                          >
                            <View style={styles.purchaseDateRow}>
                              <Text style={styles.purchaseDateLabel}>
                                From Date
                              </Text>

                              <Text style={styles.purchaseDateValue}>
                                {purchaseItem.fromDate || '-'}
                              </Text>

                              <Text style={styles.purchaseDateLabel}>
                                To Date
                              </Text>

                              <Text style={styles.purchaseDateValue}>
                                {purchaseItem.toDate || '-'}
                              </Text>
                            </View>

                            <View style={styles.purchaseTableHeader}>
                              <Text style={styles.purchaseHeaderText}>
                                Purchase Qty
                              </Text>

                              <Text style={styles.purchaseHeaderText}>
                                Sale Price
                              </Text>
                            </View>

                            {purchaseItem.purchaseDetails?.map(
                              (detail, detailIndex) => (
                                <View
                                  key={detailIndex}
                                  style={styles.purchaseTableRow}
                                >
                                  <Text style={styles.purchaseRowText}>
                                    {detail.purchaseQty}
                                  </Text>

                                  <Text style={styles.purchaseRowText}>
                                    ₹{Number(detail.salePrice || 0).toFixed(2)}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        ),
                      )}
                    </View>
                  )}

                {/* Group Wise Items */}
                {/* Group Wise Items */}
                {Array.isArray(productDetails.groupWiseItems) &&
                  productDetails.groupWiseItems.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Group Wise Items</Text>

                      {productDetails.groupWiseItems.map((item, index) => (
                        <View
                          key={item.id || index}
                          style={styles.purchaseCard}
                        >
                          <View style={styles.purchaseDateRow}>
                            <Text style={styles.purchaseDateLabel}>
                              From Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.fromDate || '-'}
                            </Text>

                            <Text style={styles.purchaseDateLabel}>
                              To Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.toDate || '-'}
                            </Text>
                          </View>

                          <View style={styles.purchaseTableHeader}>
                            <Text style={styles.purchaseHeaderText}>
                              Group Name
                            </Text>

                            <Text style={styles.purchaseHeaderText}>
                              Discount
                            </Text>
                          </View>

                          <View style={styles.purchaseTableRow}>
                            <Text style={styles.purchaseRowText}>
                              {item.groupName || '-'}
                            </Text>

                            <Text style={styles.purchaseRowText}>
                              {Number(item.discount || 0).toFixed(2)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Happy Hours */}
                {/* Happy Hours */}
                {Array.isArray(productDetails.happyHours) &&
                  productDetails.happyHours.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>Happy Hours</Text>

                      {productDetails.happyHours.map((item, index) => (
                        <View
                          key={`${item.id}-${index}`}
                          style={styles.purchaseCard}
                        >
                          <View style={styles.purchaseDateRow}>
                            <Text style={styles.purchaseDateLabel}>
                              From Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.fromDate || '-'}
                            </Text>

                            <Text style={styles.purchaseDateLabel}>
                              To Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.toDate || '-'}
                            </Text>
                          </View>

                          <View style={styles.purchaseTableHeader}>
                            <Text style={styles.happyHoursHeaderText}>
                              Happy Hour
                            </Text>

                            <Text style={styles.happyHoursHeaderText}>
                              Time
                            </Text>

                            <Text style={styles.happyHoursHeaderText}>
                              Discount
                            </Text>
                          </View>

                          <View style={styles.purchaseTableRow}>
                            <Text style={styles.happpyHoursRowText}>
                              {item.happyHourName || '-'}
                            </Text>

                            <Text style={styles.happpyHoursRowText}>
                              {item.fromTime || '-'} - {item.toTime || '-'}
                            </Text>

                            <Text style={styles.happpyHoursRowText}>
                              {Number(item.discountPercentage || 0).toFixed(2)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                {/* Group Wise Happy Hours */}
                {/* Group Wise Happy Hours */}
                {Array.isArray(productDetails.groupWiseHappyHours) &&
                  productDetails.groupWiseHappyHours.length > 0 && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>
                        Group Wise Happy Hours
                      </Text>

                      {productDetails.groupWiseHappyHours.map((item, index) => (
                        <View
                          key={`${item.id}-${index}`}
                          style={styles.purchaseCard}
                        >
                          <View style={styles.purchaseDateRow}>
                            <Text style={styles.purchaseDateLabel}>
                              From Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.fromDate || '-'}
                            </Text>

                            <Text style={styles.purchaseDateLabel}>
                              To Date
                            </Text>

                            <Text style={styles.purchaseDateValue}>
                              {item.toDate || '-'}
                            </Text>
                          </View>

                          <View style={styles.purchaseTableHeader}>
                            <Text style={styles.groupWiseHappyHoursHeaderText}>
                              Group-wise Happy Hour
                            </Text>

                            <Text style={styles.groupWiseHappyHoursHeaderText}>
                              Time
                            </Text>

                            <Text style={styles.groupWiseHappyHoursHeaderText}>
                              Discount
                            </Text>
                          </View>

                          <View style={styles.purchaseTableRow}>
                            <Text style={styles.groupWiseHappyHoursRowText}>
                              {item.happyHourName || '-'}
                            </Text>

                            <Text style={styles.groupWiseHappyHoursRowText}>
                              {item.fromTime || '-'} - {item.toTime || '-'}
                            </Text>

                            <Text style={styles.groupWiseHappyHoursRowText}>
                              {Number(item.discountPercentage || 0).toFixed(2)}%
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
      <Modal
        visible={freeProductDetailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setFreeProductDetailsVisible(false);
          setFreeProductDetails([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                Free Product Details
              </Text>
              <Text style={styles.billBusterTitle} numberOfLines={1}>
                BILL BUSTER
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setFreeProductDetailsVisible(false);
                  setFreeProductDetails([]);
                }}
                style={styles.closeButton}
              >
                <CancelBlackIcon />
              </TouchableOpacity>
            </View>

            {/* Loading */}
            {freeProductDetailsLoading ? (
              <View
                style={{
                  paddingVertical: rV(30),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ActivityIndicator size="large" color="#264B79" />

                <Text
                  style={{
                    marginTop: rV(10),
                    fontFamily: Fonts.FigtreeRegular,
                    fontSize: rS(13),
                    color: '#666666',
                  }}
                >
                  Loading free product details...
                </Text>
              </View>
            ) : freeProductDetails.length === 0 ? (
              /* No Data */
              <View
                style={{
                  paddingVertical: rV(30),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontFamily: Fonts.FigtreeRegular,
                    fontSize: rS(14),
                    color: '#666666',
                  }}
                >
                  No free product details found.
                </Text>
              </View>
            ) : (
              /* Product Details Table */
              <View style={styles.tableWrapper}>
                {/* Table Header */}
                <View style={styles.freeTableHeader}>
                  <Text style={[styles.freeProductText, { width: '15%' }]}>
                    Product Name
                  </Text>

                  <Text style={[styles.freeProductText, { width: '15%' }]}>
                    EAN Code
                  </Text>

                  <Text style={[styles.freeProductText, { width: '14%' }]}>
                    Product Code
                  </Text>

                  <Text style={[styles.freeProductText, { width: '12%' }]}>
                    Pack Size
                  </Text>

                  <Text style={[styles.freeProductText, { width: '10%' }]}>
                    Free Qty
                  </Text>

                  <Text style={[styles.freeProductText, { width: '12%' }]}>
                    MRP
                  </Text>

                  <Text style={[styles.freeProductText, { width: '12%' }]}>
                    Sale Price
                  </Text>
                </View>

                {/* Table Rows */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {freeProductDetails.map((item, index) => (
                    <View
                      key={`${item.freeProductId}-${item.freeVariantId}-${index}`}
                      style={styles.tableRow}
                    >
                      {/* Product Name */}
                      <Text
                        style={[styles.rowText, { width: '15%' }]}
                        numberOfLines={2}
                      >
                        {item.freeProductName || '-'}
                      </Text>

                      {/* EAN Code */}
                      <Text
                        style={[styles.rowText, { width: '15%' }]}
                        numberOfLines={2}
                      >
                        {item.freeProductEanCode || '-'}
                      </Text>

                      {/* Product Code */}
                      <Text
                        style={[styles.rowText, { width: '14%' }]}
                        numberOfLines={2}
                      >
                        {item.freeProductCode || '-'}
                      </Text>

                      {/* Pack Size */}
                      <Text style={[styles.rowText, { width: '12%' }]}>
                        {item.freePackSize || '-'}
                      </Text>

                      {/* Free Quantity */}
                      <Text style={[styles.rowText, { width: '10%' }]}>
                        {item.freeQty ?? 0}
                      </Text>

                      {/* MRP */}
                      <Text style={[styles.rowText, { width: '12%' }]}>
                        ₹{Number(item.mrp || 0).toFixed(2)}
                      </Text>

                      {/* Sale Price */}
                      <Text style={[styles.rowText, { width: '12%' }]}>
                        ₹{Number(item.salePrice || 0).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={isScannerVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => {
          setIsCameraScanning(false);
          setIsScannerVisible(false);
        }}
      >
        <SafeAreaView style={styles.scannerContainer}>
          {/* HEADER */}
          <View style={styles.scannerHeader}>
            <View style={styles.headerRightSpace} />
            <Text style={styles.scannerTitle}>Scan Barcode</Text>
            <TouchableOpacity
              // style={styles.closeScannerButton}
              onPress={() => {
                setIsCameraScanning(false);
                setIsScannerVisible(false);
              }}
            >
              <Text style={styles.closeScannerText}>Close</Text>
            </TouchableOpacity>

            {/* Right side space */}
            {/*  */}
          </View>

          {/* CAMERA AREA */}
          <View style={styles.cameraContainer}>
            {hasPermission && device ? (
              <>
                <Camera
                  style={styles.camera}
                  device={device}
                  isActive={isScannerVisible && isCameraScanning}
                  outputs={[barcodeOutput]}
                />

                {/* OVERLAY */}
                <View pointerEvents="none" style={styles.scannerOverlay}>
                  <View style={styles.scanBox}>
                    <View style={styles.cornerTopLeft} />
                    <View style={styles.cornerTopRight} />
                    <View style={styles.cornerBottomLeft} />
                    <View style={styles.cornerBottomRight} />
                  </View>

                  <Text style={styles.scanInstruction}>
                    Scan product barcode
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.scannerCenter}>
                <Text style={styles.cameraMessage}>
                  {!hasPermission
                    ? 'Camera permission is required'
                    : 'No camera device found'}
                </Text>

                {!hasPermission && (
                  <TouchableOpacity
                    style={styles.allowCameraButton}
                    onPress={requestPermission}
                  >
                    <Text style={styles.allowCameraText}>Allow Camera</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rS(12),
    paddingVertical: rV(8),
    backgroundColor: '#FFFFFFF',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    marginRight: rS(5),
  },
  profileImage1: {
    width: rS(25),
    height: rV(25),
    // borderRadius: 20,
    // marginRight: rS(5),
  },
  profileImage: {
    marginRight: rS(5),
  },
  businessName: {
    fontSize: 15,
    fontFamily: Fonts.FigtreeMedium,
    color: '#1B1B1B',
  },
  cityName: {
    fontSize: 10,
    fontFamily: Fonts.FigtreeMedium,
    color: '#717171',
  },
  divider: {
    width: 1,
    height: rV(14),
    backgroundColor: '#D1D1D1',
    marginHorizontal: rS(5),
  },
  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: rS(12),
    paddingBottom: rV(10),
    borderTopColor: '#F4F4F4',
    borderTopWidth: 1,
    flexDirection: 'row',
  },
  searchWrapper: {
    position: 'relative',
    // zIndex: 999,
  },

  searchInput: {
    flexDirection: 'row',
    height: rV(28),
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEA',
    borderWidth: 1,
    width: rS(150),
    borderRadius: 8,
    paddingHorizontal: rS(10),
    marginLeft: rS(6),
    alignItems: 'center',
  },
  searchTextInput: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: rV(30),
    left: rS(6),
    width: rS(150),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    height: rV(150),
    zIndex: 9999,
  },
  searchResultItem: {
    // padding: rS(10),
    paddingVertical: rV(8),
    paddingHorizontal: rS(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F4F4F4',
  },
  resItemName: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#1B1B1B',
  },
  resItemPrice: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#1B1B1B',
  },
  resItemSub: { marginTop: 4 },
  resLabel: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#9A9A9A',
  },
  resValue: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#1B1B1B',
  },
  salesText: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
  cashierText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#9A9A9A',
  },
  leftContainer: { flex: 0.73 },
  helpKeysContainer: {
    marginTop: rV(25),
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    backgroundColor: '#264B79', // Matches the header color
    borderRadius: 8,
    overflow: 'visible',
  },
  expandedContainer: {
    // paddingBottom: rV(5),
  },
  floatingUpButton: {
    position: 'absolute',
    top: -rV(15),
    zIndex: 20,
  },
  helpKeysInner: {
    width: '100%',
    backgroundColor: '#264B79',
    borderRadius: 8,
    height: rV(35),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rS(15),
  },
  shortcutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: rS(10),
    justifyContent: 'space-between',
  },
  shortcutItem: {
    width: '24%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: rS(8),
    paddingVertical: rV(6),
    marginBottom: rV(10),
  },
  shortcutKeyName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    flex: 1,
  },
  shortKeyBadge: {
    backgroundColor: '#FFFFFF38',
    borderRadius: 4,
    paddingHorizontal: rS(6),
    paddingVertical: rV(3),
    marginLeft: rS(5),
  },
  shortKeyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
  helpKeysInner: {
    width: '100%',
    backgroundColor: '#264B79',
    borderRadius: 6,
    height: rV(27),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rS(10),
  },
  helpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  helpTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
    marginLeft: rS(3),
  },
  helpHint: {
    color: '#C3C7CB',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },
  rightContainer: {
    flex: 0.27,
    marginLeft: rS(10),
    marginTop: rV(7),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingTop: rV(7),
    paddingHorizontal: rS(7),
    justifyContent: 'space-between',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  actionButton: {
    width: '47%',
    height: rV(25),
    backgroundColor: '#264B79',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rV(8),
  },

  summaryLabel: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },

  summaryValue: {
    fontSize: 14,
    color: '#1B1B1B',
    fontFamily: Fonts.FigtreeMedium,
  },

  deleteIcon: {
    color: 'red',
    marginLeft: 6,
  },

  totalCard: {
    backgroundColor: '#F4F4F4',
    borderRadius: 8,
    paddingVertical: rV(6),
    paddingLeft: rS(9),
    paddingRight: rS(9),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rV(8),
  },

  totalLabel: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },

  totalAmount: {
    fontSize: 24,
    color: '#264B79',
    fontFamily: Fonts.FigtreeSemiBold,
  },

  paymentCard: {
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 10,
    overflow: 'hidden',
  },

  paymentHeader: {
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(6),
    paddingHorizontal: rS(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  paymentTitle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },

  newText: {
    color: '#264B79',
    marginLeft: 4,
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
  },

  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: rS(8),
    paddingVertical: rV(6),
  },

  tableText: {
    color: '#838383',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
  },
  paymentRowsContainer: {
    width: '100%',
  },

  paymentRowsScrollable: {
    maxHeight: rV(40),
  },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rS(8),
    paddingVertical: rV(6),
  },

  serialText: {
    flex: 0.2,
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },

  paymentModeContainer: {
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },

  paymentModeText: {
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
    marginRight: rS(6),
  },

  amountText: {
    flex: 0.3,
    textAlign: 'right',
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeMedium,
  },

  dashedLine: {
    borderStyle: 'dashed',
    borderBottomWidth: 1,
    borderColor: '#D7D7D7',
    marginBottom: rV(6),
  },

  printButton: {
    backgroundColor: '#264B79',
    borderRadius: 8,
    flexDirection: 'row',
    height: rV(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rV(8),
  },

  printText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  saveBillErrorText: {
    color: '#D32F2F',
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  checkOutBtn: {
    backgroundColor: '#264B79',
    borderRadius: 8,
    flexDirection: 'row',
    height: rV(25),
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkOutText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: rV(8),
  },

  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E5E5',
  },

  headerCell: {
    justifyContent: 'center',
    paddingVertical: rV(5),
    paddingHorizontal: rS(8),
  },

  headerText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },

  dataRow: {
    flexDirection: 'row',
  },
  voidRowBg: {
    backgroundColor: '#F7F7F7',
  },

  freeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'flex-end',
    // width: '100%',
    marginTop: rV(2),
  },
  freeItemText: {
    color: '#388D18',
    fontSize: 11,
    fontFamily: Fonts.FigtreeMedium,
    marginTop: rV(2),
    marginRight: rS(2),
  },
  discountLabelText: {
    color: '#388D18',
    fontSize: 11,
    fontFamily: Fonts.FigtreeMedium,
    marginTop: rV(1),
    fontStyle: 'italic',
  },
  voidStatusText: {
    color: 'red',
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
    marginTop: -2, // Pull it closer to the product name
  },

  dataCell: {
    justifyContent: 'center',
    paddingVertical: rV(2),
    paddingHorizontal: rS(8),
    minHeight: rV(25),
  },

  dataText: {
    fontSize: 13,
    color: '#222',
    fontFamily: Fonts.FigtreeRegular,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEA',
    borderWidth: 1,
    width: rS(100),
    height: rV(28),
    borderRadius: 8,
  },
  barcodeTextInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // padding: 20,
    paddingHorizontal: rS(16),
    paddingVertical: rV(16),
    backgroundColor: '#264B79',
    alignItems: 'center',
  },
  selectedRowBg: {
    backgroundColor: '#FFFDEF', // Background from prompt
  },
  selectedRowBorder: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#FFEE6E',
  },
  qtyEditContainer: {
    backgroundColor: '#FCF4B6',
    borderRadius: 4,
    width: rS(30), // Increased slightly for better visibility
    height: rV(26), // Matches the height of the row text
    // width:rS(30),
    alignSelf: 'center',
    justifyContent: 'center',
  },
  qtyInput: {
    width: rS(30),
    height: rV(26),
    padding: 0,
    margin: 0,
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#1B1B1B',
    textAlign: 'center',
    includeFontPadding: false,
  },
  addCustomerBtn: {
    height: rV(28),
    flexDirection: 'row',
    marginLeft: rS(6),
    borderColor: '#264B79',
    borderWidth: 0.5,
    paddingHorizontal: rS(12),
    alignItems: 'center',
    borderRadius: 8,
  },
  addCustomerText: {
    marginLeft: rS(6),
    color: '#264B79',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
  customerBadge: {
    height: rV(28),
    flexDirection: 'row',
    marginLeft: rS(6),
    backgroundColor: '#264B79',
    paddingHorizontal: rS(12),
    alignItems: 'center',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  salesmanBadge: {
    height: rV(25),
    flexDirection: 'row',
    backgroundColor: '#264B79',
    paddingHorizontal: rS(12),
    alignItems: 'center',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerNameText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    marginRight: rS(5),
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: wp(70),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingBottom: rV(18),
    // width: '95%',
    // backgroundColor: '#FFFFFF',
    // borderRadius: 10,
    // maxHeight: '70%',
    // overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rS(15),
    paddingVertical: rV(6),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
    color: '#080808',
  },
  billBusterTitle: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
  closeButton: {
    padding: rS(5),
  },
  tableWrapper: {
    padding: rS(10),
  },
  freeTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    borderRadius: 6,
    justifyContent: 'space-evenly',
    // marginBottom: rV(5),
  },
  freeProductText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rV(8),
    justifyContent: 'space-evenly',
    // paddingHorizontal: rS(10),
  },
  rowText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
    textAlign: 'center',
  },
  productDetailsModalContent: {
    width: wp(65),
    maxHeight: hp(85),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  productDetailsScroll: {
    // padding: rS(15),
    paddingHorizontal: rS(15),
    paddingTop: rV(10),
    // paddingBottom: rV(20),
  },

  productDetailsLoader: {
    paddingVertical: rV(50),
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: rV(10),
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#666666',
  },

  detailsSection: {
    marginBottom: rV(10),
  },

  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
    marginBottom: rV(10),
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: rS(8),
  },

  detailItem: {
    width: '25%',
    marginBottom: rV(8),
  },

  detailLabel: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#6B7280',
    marginBottom: rV(3),
  },

  detailValue: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#222222',
  },

  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  controlItem: {
    width: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: rS(6),
    marginBottom: rV(8),
  },

  controlStatus: {
    marginTop: rV(2),
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
  },

  statusOn: {
    color: '#16803C',
  },

  statusOff: {
    color: '#D32F2F',
  },

  purchaseCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    // marginBottom: rV(10),
    overflow: 'hidden',
  },

  purchaseDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: rS(10),
    paddingVertical: rV(8),
    backgroundColor: '#F8FAFC',
  },

  purchaseDateLabel: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
    color: '#6B7280',
    marginRight: rS(5),
  },

  purchaseDateValue: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#222222',
    marginRight: rS(15),
  },

  purchaseTableHeader: {
    flexDirection: 'row',
    paddingVertical: rV(8),
    backgroundColor: '#EEF9FF',
    justifyContent: 'space-evenly',
  },

  purchaseHeaderText: {
    width: '50%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  happyHoursHeaderText: {
    width: '30%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  groupWiseHappyHoursHeaderText: {
    width: '25%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },

  purchaseTableRow: {
    flexDirection: 'row',
    paddingVertical: rV(8),
    justifyContent: 'space-evenly',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  purchaseRowText: {
    width: '50%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
  },
  happpyHoursRowText: {
    width: '30%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
  },
  groupWiseHappyHoursRowText: {
    width: '25%',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
  },

  noDataText: {
    textAlign: 'center',
    paddingVertical: rV(15),
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#777777',
  },
  billBusterModalContent: {
    width: wp(55),
    maxHeight: hp(75),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  billBusterLoader: {
    paddingVertical: rV(50),
    alignItems: 'center',
    justifyContent: 'center',
  },

  noBillBusterContainer: {
    paddingVertical: rV(30),
    paddingHorizontal: rS(15),
    alignItems: 'center',
  },

  billBusterCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: rV(6),
    overflow: 'hidden',
  },

  billBusterSchemeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rS(10),
    paddingVertical: rV(8),
    backgroundColor: '#EEF9FF',
  },

  billBusterSchemeName: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },

  billBusterArrow: {
    marginLeft: rS(10),
    justifyContent: 'center',
    alignItems: 'center',
  },

  billBusterDetails: {
    padding: rS(8),
    backgroundColor: '#FFFFFF',
  },
  billBusterChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  billBusterCheckbox: {
    width: rS(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rS(8),
  },

  billBusterChildContent: {
    flex: 1,
  },
  billBusterChildHeaderColumns: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  billBusterChildCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: rS(6),
    // justifyContent:'center',
    alignItems: 'center',
    marginBottom: rV(6),
    backgroundColor: '#FAFAFA',
  },

  billBusterChildHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: rV(7),
    // paddingVertical: rV(8),
    // paddingHorizontal: rS(8),
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E7EB',
  },

  billBusterChildHeaderText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#6B7280',
  },

  billBusterChildValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // paddingTop: rV(8)
    // paddingVertical: rV(8),
    // paddingHorizontal: rS(8),
  },

  billBusterChildValueText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#222222',
  },

  billBusterChildDiscountText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#388D18',
  },

  billBusterChildFreeQtyText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#388D18',
  },
  billBusterSchemeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: rS(8),
    backgroundColor: '#FAFAFA',
  },

  billBusterSchemeDetailCheckbox: {
    // width: rS(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rS(8),
  },

  billBusterSchemeDetailContent: {
    flex: 1,
  },

  billBusterDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rV(3),
  },

  billBusterLabel: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#6B7280',
    flex: 0.45,
  },

  billBusterValue: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#222222',
    flex: 0.55,
    textAlign: 'right',
  },

  billBusterDiscount: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#388D18',
    flex: 0.55,
    textAlign: 'right',
  },

  billBusterButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: rS(12),
    paddingVertical: rV(8),
    // paddingBottom: rV(12),
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    gap: rS(10),
  },

  billBusterCancelButton: {
    // minWidth: rS(80),
    height: rV(22),
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#264B79',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(15),
  },

  billBusterCancelText: {
    color: '#264B79',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },

  billBusterApplyButton: {
    // minWidth: rS(80),
    height: rV(22),
    borderRadius: 7,
    backgroundColor: '#264B79',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(15),
  },

  billBusterApplyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
  discardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  discardModal: {
    width: wp(30),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rV(8),
    paddingHorizontal: rS(10),
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeMedium,
    color: '#3A434A',
  },
  divider: {
    borderBottomColor: '#D9D9D9',
    borderBottomWidth: 0.8,
  },

  discardMessage: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
    marginVertical: rV(10),
    color: '#363636',
    textAlign: 'center',
  },

  discardButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: rV(16),
    paddingHorizontal: rS(10),
  },

  cancelButton: {
    paddingHorizontal: rS(12),
    paddingVertical: rV(6),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#264B79',
  },

  cancelButtonText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    textAlign: 'center',
  },

  yesButton: {
    paddingHorizontal: rS(12),
    paddingVertical: rV(6),
    borderRadius: 6,
    backgroundColor: '#264B79',
  },

  yesButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Fonts.FigtreeMedium,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // scannerHeader: {
  //   height: rV(25),
  //   width: '100%',
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'space-between',
  //   paddingHorizontal: rS(18),
  //   backgroundColor: '#264B79',
  //   // zIndex: 10,
  //   // elevation: 10,
  // },

  closeScannerButton: {
    width: rS(60),
    height: rV(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  closeScannerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.FigtreeRegular,
  },

  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    textAlign: 'center',
  },

  headerRightSpace: {
    width: rS(50),
  },

  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },

  camera: {
    flex: 1,
    width: '100%',
  },

  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 5,
    elevation: 5,
  },

  scanBox: {
    width: '85%',
    height: rV(180),
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 10,
  },

  scanInstruction: {
    color: 'red',
    fontSize: rS(16),
    marginTop: rV(25),
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'center',
  },

  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: rS(30),
    height: rV(30),
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },

  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: rS(30),
    height: rV(30),
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },

  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: rS(30),
    height: rV(30),
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },

  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: rS(30),
    height: rV(30),
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },

  scannerCenter: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(20),
  },

  cameraMessage: {
    color: '#FFFFFF',
    fontSize: rS(18),
    textAlign: 'center',
  },

  allowCameraButton: {
    marginTop: rV(20),
    paddingHorizontal: rS(20),
    paddingVertical: rV(10),
    backgroundColor: '#264B79',
    borderRadius: 8,
  },

  allowCameraText: {
    color: '#FFFFFF',
    fontSize: rS(16),
    fontFamily: Fonts.FigtreeMedium,
  },
  billBusterSuccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'center',
    // marginTop: rV(8),
    // paddingHorizontal: rS(8),
  },

  billBusterSuccessText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#16803C',
    // marginRight: rS(6),
  },

  billBusterInfoButton: {
    width: rS(24),
    height: rV(24),
    alignItems: 'center',
    justifyContent: 'center',
  },

  freeProductDetailsModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  freeProductCard: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    // padding: rS(12),
    marginBottom: rV(10),
    backgroundColor: '#FFFFFF',
  },

  freeProductDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: rV(7),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },

  freeProductLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
    color: '#666666',
  },

  freeProductValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#222222',
  },

  freeProductModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },

  receiptOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e9e9e9',
    zIndex: 9999,
    marginTop: rV(20),
  },
  receiptSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#264B79',
    paddingHorizontal: rS(10),
    paddingVertical: rV(8),
  },
  receiptChip: {
    paddingHorizontal: rS(12),
    paddingVertical: rV(5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    marginRight: rS(8),
  },
  receiptChipActive: {
    backgroundColor: '#FFFFFF',
  },
  receiptChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
  },
  receiptChipTextActive: {
    color: '#264B79',
  },
  receiptCloseBtn: {
    paddingHorizontal: rS(12),
    paddingVertical: rV(5),
    borderRadius: 6,
    backgroundColor: '#C8682D',
    marginLeft: rS(8),
  },
  receiptCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  /* =========================================================
   RECEIPT MODAL
========================================================= */

  receiptModalOverlay: {
    // flex: 1,
    // backgroundColor: 'rgba(0,0,0,0.55)',
    // justifyContent: 'center',
    // alignItems: 'center',
    // paddingHorizontal: rS(20),
    // paddingVertical: rV(20),
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(16),
    paddingVertical: rV(16),
  },

  receiptModalContainer: {
    // width: '100%',
    maxWidth: rS(650),
    // height: '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },

  receiptModalHeader: {
    // minHeight: rV(60),
    // paddingHorizontal: rS(8),
    paddingVertical: rV(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },

  receiptModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#111111',
  },

  receiptModalSubTitle: {
    marginTop: rV(3),
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#777777',
  },

  receiptCloseButton: {
    width: rS(36),
    height: rS(36),
    borderRadius: rS(18),
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiptModalBody: {
    flex: 1,
    backgroundColor: '#EEEEEE',
  },

  receiptLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiptLoadingText: {
    // marginTop: rV(10),
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#555555',
  },

  receiptModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: rS(10),
    paddingHorizontal: rS(8),
    paddingVertical: rV(8),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },

  receiptCloseAction: {
    minWidth: rS(100),
    height: rV(28),
    paddingHorizontal: rS(18),
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#264B79',
    alignItems: 'center',
    justifyContent: 'center',
  },

  receiptCloseActionText: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },

  receiptPrintButton: {
    minWidth: rS(130),
    height: rV(28),
    paddingHorizontal: rS(18),
    borderRadius: 7,
    backgroundColor: '#264B79',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rS(8),
  },

  receiptPrintButtonText: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#FFFFFF',
  },
  printerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  printerModalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
  },

  printerModalTitle: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeBold,
    color: '#111111',
    marginBottom: 15,
  },

  printerItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  printerName: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#111111',
  },

  printerAddress: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#777777',
    marginTop: 4,
  },

  printerCancelButton: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
});

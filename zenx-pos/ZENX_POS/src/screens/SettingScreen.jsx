import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  DeviceEventEmitter,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import GreySettingIcon from '../assets/Icons/GreySettingIcon'
import Toast from 'react-native-toast-message';
import CheckIcon from '../assets/Icons/checkIcon'
import UnCheckIcon from '../assets/Icons/unCheckIcon'
import DeleteIcon from '../assets/Icons/DeleteIcon'
import PlusIcon from '../assets/Icons/PlusIcon'
import { Dropdown } from 'react-native-element-dropdown';
import SearchIcon from '../assets/Icons/SearchIcon'
import ExportIcon from '../assets/Icons/ExportIcon'
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import EditIcon from '../assets/Icons/EditIcon';


export default function SettingScreen() {
  const navigation = useNavigation()
  const { getMethod, postMethod } = HelperModule()
  const MENU = [
    { id: 'hardware', title: 'Hardware Settings' },
    { id: 'billing', title: 'Billing/Tax' },
    { id: 'billColumns', title: 'Bill Cols. Display' },
    { id: 'kot', title: 'KOT Settings' },
    { id: 'keyMapping', title: 'Key Mapping' },
    { id: 'hotKeys', title: 'Hot Keys' },
  ];

  const [selectedMenu, setSelectedMenu] = useState('hardware');
  const [keyMappings, setKeyMappings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [billColumns, setBillColumns] = useState([]);
  const [billLoading, setBillLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentModeData, setPaymentModeData] = useState([])
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [selectedHotKey, setSelectedHotKey] = useState(null);
  const [hotKeyList, setHotKeyList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [billingData, setBillingData] = useState({
    billPrefix: '',
    billCaption: '',
    paymentModeId: 0,
    paymentModeName: '',
    billFormatNumber: '',
    refundDays: '',
    discountOnDiscountedItems: 0,
    companyLogoOnBills: 0,
    confirmationToPrintBill: 0,
    askSalesmanCode: 0,
    happyHours: 0,
    askQtyWhileAddingItems: 0,
    printTokenCategoryWise: 0,
    enableSplitSummary: 0,
    resetBillNoAfterDayClose: 0,
    qrCodeInBill: 0,
    exclusiveGstBilling: 0,
    descriptions: []
  });
  const [kotData, setKotData] = useState({
    kotPrefix: '',
    enableKot: 0,
    enableKds: 0,
    printKotCategoryWise: 0,
    enableTakeAway: 0,
    descriptions: []
  });

  const [hardwareData, setHardwareData] = useState({
  printerPath: '',
  networkPath: '',
  kotPrinterPath: '',
  barcodePath: '',
  barcodePrinterName: '',
  barcodePort: '',
  weighingMachineBrand: '',
  weighingMachinePort: '',
  cashDrawer: 0,
});

  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    getHotKeys(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, [])
  );

  useEffect(() => {
    getHotKeys(1);
  }, []);

  const getHotKeys = async (pageNumber = 1) => {
    try {
      const activePage = typeof pageNumber === 'number' ? pageNumber : 1;
      setLoading(true);
      setCurrentPage(activePage);
      const payload = {
        searchStr: searchText,
        status: status,
        page: activePage,
      };
      console.log('GET HOT KEYS PAYLOAD =====>', payload);
      const response = await postMethod(
        ApiServices.zenxposGetHotKey, payload
      );
      console.log('GET HOT KEYS RESPONSE =====>', response);
      if (response?.success) {
        setHotKeyList(response?.data?.hotKeys || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log('GET HOT KEYS ERROR =====>', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const payload = { id: id };
      const response = await postMethod(ApiServices.zenxposGetHotKeyById, payload);
      if (response?.success) {
        navigation.navigate('AddNewHotKeyScreen', {hotKeyData: response.data})
      }
    } catch (error) {
      console.log('GET HOT KEY BY ID ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPagination = () => {
  if (!pagination || pagination.lastPage <= 1) return null;

  const { lastPage } = pagination;

  const getPageNumbers = () => {
    const pages = [];

    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) {
        pages.push(i);
      }
      return pages;
    }

    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', lastPage];
    }

    if (currentPage >= lastPage - 2) {
      return [
        1,
        '...',
        lastPage - 3,
        lastPage - 2,
        lastPage - 1,
        lastPage,
      ];
    }
    return [
      1,
      '...',
      currentPage - 1,
      currentPage,
      currentPage + 1,
      '...',
      lastPage,
    ];
  };

  const pages = getPageNumbers();

  return (
    <View style={styles.paginationWrapper}>

      {/* First */}
      <TouchableOpacity
        style={styles.navButton}
        disabled={currentPage === 1}
        onPress={() => getHotKeys(1)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageLeftIcon />
          <Text style={styles.navButtonText}> First</Text>
        </View>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity
        style={styles.navButton}
        disabled={currentPage === 1}
        onPress={() => getHotKeys(currentPage - 1)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageBackIcon />
          <Text style={styles.navButtonText}> Back</Text>
        </View>
      </TouchableOpacity>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        const key = `${page}-${index}`;
        if (page === '...') {
          return (
            <View
              key={key}
              style={styles.pageButton}
            >
              <Text style={styles.pageButtonText}>...</Text>
            </View>
          );
        }

        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.pageButton,
              currentPage === page && styles.activePageButton,
            ]}
            onPress={() => getHotKeys(page)}
          >
            <Text
              style={[
                styles.pageButtonText,
                currentPage === page && styles.activePageButtonText,
              ]}
            >
              {page}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Next */}
      <TouchableOpacity
        style={styles.navButton}
        disabled={currentPage === lastPage}
        onPress={() => getHotKeys(currentPage + 1)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Next </Text>
          <PageNextIcon />
        </View>
      </TouchableOpacity>

      {/* Last */}
      <TouchableOpacity
        style={styles.navButton}
        disabled={currentPage === lastPage}
        onPress={() => getHotKeys(lastPage)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Last </Text>
          <PageRightIcon />
        </View>
      </TouchableOpacity>

    </View>
  );
};
  const renderItem = ({ item, index }) => {
    const itemsPerPage = pagination?.perPage || 10;
    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {serialNumber}
        </Text>
        <Text style={[styles.rowText, { width: '20%' }]}>
          {item.productCode}
        </Text>
         <View style={{ width: '20%', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.rowText}>
            {item.productFullName}
          </Text>
          {item.packSize ? (
            <Text style={styles.rowText}>
              {item.packSize}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.rowText, { width: '17%' }]}>
          {item.key}
        </Text>
        <View
          style={{
            width: '15%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor:
                  item.status === 0
                    ? '#C21414'
                    : '#264B79',
              },
            ]}>
            <Text style={styles.statusText}>
              {item.status === 1 ? 'Active' : 'In-Active'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={{
            width: '15%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleEdit(item.id)}>
          <EditIcon />
        </TouchableOpacity>
      </View>
    );
  };


  const SHORTCUT_KEYS = [
    "F1", "F2", "F3", "F4",
    "F5", "F6", "F7", "F8",
    "F9", "F10", "F11", "F12",
    "ESC", "CLEAR"
  ];

  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Both', value: '' }
  ];

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'HardwareKeyPressed',
      key => {
        console.log('Pressed:', key);

        if (selectedCard) {
          onChangeShortKey(selectedCard, key);
        }
      },
    );

    return () => subscription.remove();
  }, [selectedCard]);

  const getKeyMappings = async () => {
    try {
      setLoading(true);

      const response = await getMethod(
        ApiServices.zenxposGetKeyMappings,
      );

      if (response.success) {
        setKeyMappings(response.data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const getBillColumns = async () => {
    try {
      setBillLoading(true);

      const response = await getMethod(
        ApiServices.zenxposGetBillCols,
      );

      if (response.success) {
        setBillColumns(response.data || []);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setBillLoading(false);
    }
  };


  const getBillingSettings = async () => {
    try {
      setLoading(true);
      const response = await getMethod(ApiServices.zenxposGetBillingSettings);
      console.log(":::::: get billing settings::::::", response)
      console.log(":::: get billing settings:::", response)
      if (response.success) {
        const sanitizedData = {
        ...response.data,
        billPrefix: response.data.billPrefix ?? '',
        billCaption: response.data.billCaption ?? '',
        billFormatNumber: response.data.billFormatNumber ?? '',
        refundDays: response.data.refundDays ?? '',
        // Sanitize descriptions array
        descriptions: response.data.descriptions?.map(item => ({
          ...item,
          description: item.description ?? ''
        })) ?? []
      };
      setBillingData(sanitizedData);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentModes = async () => {
    try {
      const payload = { searchStr: "", status: 1, page: "" };
      const response = await postMethod(ApiServices.zenxposGetPaymentModes, payload);
      if (response.success) {
        const formattedData = response.data.paymentModes.map(item => ({
          label: item.paymentMode,
          value: item.id
        }));
        setPaymentModeData(formattedData);
      }
    } catch (e) {
      console.log("Payment Modes Error:", e);
    }
  };
  const getKotSettings = async () => {
    try {
      setLoading(true);
      const response = await getMethod(ApiServices.zenxposGetKotSettings);
      if (response.success) {
         const sanitizedData = {
        ...response.data,
        kotPrefix: response.data.kotPrefix ?? '',
        descriptions: response.data.descriptions?.map(item => ({
          ...item,
          description: item.description ?? ''
        })) ?? []
      };
      setKotData(sanitizedData);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const getHardwareSettings = async () => {
  try {
    setLoading(true);
    const response = await getMethod(ApiServices.zenxposGetHardwareSettings);
    if (response.success) {
       const sanitizedData = {
        printerPath: response.data?.printerPath ?? '',
        networkPath: response.data?.networkPath ?? '',
        kotPrinterPath: response.data?.kotPrinterPath ?? '',
        barcodePath: response.data?.barcodePath ?? '',
        barcodePrinterName: response.data?.barcodePrinterName ?? '',
        barcodePort: response.data?.barcodePort ?? '',
        weighingMachineBrand: response.data?.weighingMachineBrand ?? '',
        weighingMachinePort: response.data?.weighingMachinePort ?? '',
        cashDrawer: response.data?.cashDrawer ?? 0,
      };
      setHardwareData(sanitizedData);
    }
  } catch (e) {
    console.log("Hardware Fetch Error:", e);
  } finally {
    setLoading(false);
  }
};

 const updateHardwareField = (key, value) => {
  setHardwareData(prev => ({ ...prev, [key]: value }));
};

  useEffect(() => {
    if (selectedMenu === 'keyMapping') getKeyMappings();
    if (selectedMenu === 'billColumns') getBillColumns();
    if (selectedMenu === 'billing') {
      getBillingSettings();
      getPaymentModes(); // Fetch dropdown data
    }
    if (selectedMenu === 'kot') getKotSettings();
    if(selectedMenu === "hardware") getHardwareSettings();
  }, [selectedMenu]);


  const updateBillingField = (key, value) => {
    setBillingData(prev => ({ ...prev, [key]: value }));
  };

  const toggleBillingSwitch = (key) => {
    setBillingData(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
  };

  const handleAddNote = () => {
    setBillingData(prev => ({
      ...prev,
      descriptions: [...prev.descriptions, { id: "", description: "" }]
    }));
  };

  const handleRemoveNote = async (index) => {
    const itemToRemove = billingData.descriptions[index];

    // If the item has an ID, call the delete API
    if (itemToRemove.id) {
      try {
        setLoading(true);
        const payload = { id: itemToRemove.id };
        const response = await postMethod(ApiServices.zenxposDeleteBillingDescription, payload);

        if (response.success) {
          Toast.show({ type: 'success', text1: 'Deleted', text2: response.message });
          // After successful API deletion, remove from local state
          const newList = [...billingData.descriptions];
          newList.splice(index, 1);
          setBillingData(prev => ({ ...prev, descriptions: newList }));
        } else {
          Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Could not delete note' });
        }
      } catch (e) {
        console.log("Delete Note Error:", e);
      } finally {
        setLoading(false);
      }
    } else {
      // If no ID, just remove from local state
      const newList = [...billingData.descriptions];
      newList.splice(index, 1);
      setBillingData(prev => ({ ...prev, descriptions: newList }));
    }
  };
  // const handleRemoveNote = (index) => {
  //   const newList = [...billingData.descriptions];
  //   newList.splice(index, 1);
  //   setBillingData(prev => ({ ...prev, descriptions: newList }));
  // };

  const handleNoteChange = (text, index) => {
    const newList = [...billingData.descriptions];
    newList[index].description = text;
    setBillingData(prev => ({ ...prev, descriptions: newList }));
  };

  const saveBillingSettings = async () => {
    try {
      setLoading(true);
      const response = await postMethod(ApiServices.zenxposAddBillingSettings, billingData);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response.message });
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };
  const onToggleBillColumn = id => {
    setBillColumns(prev =>
      prev.map(item =>
        item.billColId === id
          ? {
            ...item,
            appStatus: item.appStatus ? 0 : 1,
          }
          : item,
      ),
    );
  };

  const setDefaultKeys = async () => {
    try {
      setLoading(true);

      const response = await getMethod(
        ApiServices.zenxposDefaultKeyMapping,
      );

      console.log("::::: default key mapping:::::", response)

      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Brand added successfully' });
        getKeyMappings();
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultBillCols = async () => {
    try {
      setLoading(true);

      const response = await getMethod(
        ApiServices.zenxposDefaultBillCols,
      );

      console.log("::::: default bill cols:::::", response)

      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Brand added successfully' });
        getBillColumns();
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const onChangeShortKey = (id, value) => {
    setKeyMappings(prev =>
      prev.map(item =>
        item.keyMappingId === id
          ? { ...item, shortKey: value }
          : item,
      ),
    );
  };

  const saveKeyMappings = async () => {
    try {
      setLoading(true);
      setErrorMessage('')

      const payload = {
        keyMappings: keyMappings.map(item => ({
          keyMappingId: item.keyMappingId,
          shortKey: item.shortKey,
        })),
      };

      const response = await postMethod(
        ApiServices.zenxposAddKeyMapping,
        payload,
      );

      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Key mappings saved successfully.' });
        // console.log(":::::save key mapping:::::", response?.message)
      } else {
        setErrorMessage(
          response?.errors || response?.message || 'Something went wrong.'
        );
      }
    } catch (error) {
      console.log(error);

      setErrorMessage(
        error?.response?.data?.errors ||
        error?.response?.data?.message ||
        error?.message ||
        'Something went wrong.'
      );
    } finally {
      setLoading(false);
    }
  };

  const saveHardwareSettings = async () => {
  try {
    setLoading(true);
    const response = await postMethod(ApiServices.zenxposAddHardwareSettings, hardwareData);
    if (response.success) {
      Toast.show({ type: 'success', text1: 'Success', text2: response.message });
    }
  } catch (e) {
    console.log("Hardware Save Error:", e);
  } finally {
    setLoading(false);
  }
};

  const saveBillColumns = async () => {
    try {
      setLoading(true);

      const payload = {
        billCols: billColumns.map(item => ({
          billColId: item.billColId,
          appStatus: item.appStatus,
        })),
      };

      const response = await postMethod(
        ApiServices.zenxposAddBillCol,
        payload,
      );

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message,
        });
        getBillColumns()
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };
  const updateKotField = (key, value) => {
    setKotData(prev => ({ ...prev, [key]: value }));
  };

  const toggleKotSwitch = (key) => {
    setKotData(prev => ({ ...prev, [key]: prev[key] === 1 ? 0 : 1 }));
  };

  const handleAddKotNote = () => {
    setKotData(prev => ({
      ...prev,
      descriptions: [...prev.descriptions, { id: "", description: "" }]
    }));
  };

  const handleRemoveKotNote = async (index) => {
    const itemToRemove = kotData.descriptions[index];

    if (itemToRemove.id) {
      try {
        setLoading(true);
        const payload = { id: itemToRemove.id };
        const response = await postMethod(ApiServices.zenxposDeleteKotDescription, payload);
        if (response.success) {
          Toast.show({ type: 'success', text1: 'Deleted', text2: response.message });
          const newList = [...kotData.descriptions];
          newList.splice(index, 1);
          setKotData(prev => ({ ...prev, descriptions: newList }));
        }
      } catch (e) {
        console.log("Delete Kot Note Error:", e);
      } finally {
        setLoading(false);
      }
    } else {
      const newList = [...kotData.descriptions];
      newList.splice(index, 1);
      setKotData(prev => ({ ...prev, descriptions: newList }));
    }
  };

  const handleKotNoteChange = (text, index) => {
    const newList = [...kotData.descriptions];
    newList[index].description = text;
    setKotData(prev => ({ ...prev, descriptions: newList }));
  };

  const saveKotSettings = async () => {
    try {
      setLoading(true);
      const response = await postMethod(ApiServices.zenxposAddKotSettings, kotData);
      if (response.success) {
        Toast.show({ type: 'success', text1: 'Success', text2: response.message });
        getKotSettings(); // Refresh to get proper IDs for new notes
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />
      <View style={styles.subContainer}>
        <View style={styles.sidebar}>
          <View style={styles.settingHeader}>
            <GreySettingIcon />
            <Text style={styles.settingTitle}>Settings</Text>
          </View>

          <View style={styles.divider} />

          {MENU.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              onPress={() => setSelectedMenu(item.id)}
              style={[
                styles.menuItem,
                selectedMenu === item.id && styles.activeMenu,
              ]}>
              <Text
                style={[
                  styles.menuText,
                  selectedMenu === item.id && styles.activeMenuText,
                ]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.contentContainer}>
         {selectedMenu === 'hardware' && (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: rV(80),
      }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
    <Text style={styles.sectionTitle}>HARDWARE SETTINGS</Text>

    {/* Row 1 */}
    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Printer Path</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Printer Path'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.printerPath}
          onChangeText={(val) => updateHardwareField('printerPath', val)}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Network Path</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Network Path'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.networkPath}
          onChangeText={(val) => updateHardwareField('networkPath', val)}
        />
      </View>
    </View>

    {/* Row 2 */}
    <View style={styles.row}>
      <View style={[styles.inputGroup, { flex: 0.485 }]}>
        <Text style={styles.label}>KOT Printer Path</Text>
        <TextInput
          style={styles.input}
          placeholder='KOT Printer Path'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.kotPrinterPath}
          onChangeText={(val) => updateHardwareField('kotPrinterPath', val)}
        />
      </View>
    </View>

    <View style={[styles.divider, { marginBottom: rV(10), borderBottomColor: '#DDDDDD' , borderBottomWidth:0.5}]} />

    {/* Barcode Section */}
    <Text style={[styles.sectionTitle, { fontSize: 16 }]}>BARCODE</Text>
    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barcode Path</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Barcode Path'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.barcodePath}
          onChangeText={(val) => updateHardwareField('barcodePath', val)}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barcode Printer Name</Text>
        <TextInput
          style={styles.input}
          placeholder='Barcode Printer Name'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.barcodePrinterName}
          onChangeText={(val) => updateHardwareField('barcodePrinterName', val)}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Barcode Port</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Barcode Port'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.barcodePort}
          onChangeText={(val) => updateHardwareField('barcodePort', val)}
        />
      </View>
    </View>

    <View style={[styles.divider, { marginBottom: rV(10), borderBottomColor: '#DDDDDD',borderBottomWidth:0.5 }]} />

    {/* Weighing Machine Section */}
    <Text style={[styles.sectionTitle, { fontSize: 16 }]}>WEIGHING MACHINE</Text>
    <View style={styles.row}>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Brand </Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Brand'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.weighingMachineBrand}
          onChangeText={(val) => updateHardwareField('weighingMachineBrand', val)}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter Port'
          placeholderTextColor={'#9A9A9A'}
          value={hardwareData.weighingMachinePort}
          onChangeText={(val) => updateHardwareField('weighingMachinePort', val)}
        />
      </View>
    </View>

    <View style={[styles.divider, { marginBottom: rV(10), borderBottomColor: '#DDDDDD' ,borderBottomWidth:0.5}]} />

    {/* Cash Drawer Toggle */}
    <View style={[styles.row, { alignItems: 'center' }]}>
      <Text style={[styles.label, { marginBottom: 0, marginRight: 20 }]}>Cash Drawer</Text>
      <TouchableOpacity onPress={() => updateHardwareField('cashDrawer', hardwareData.cashDrawer === 1 ? 0 : 1)}>
        <View style={[styles.switchOuter, hardwareData.cashDrawer === 1 && styles.switchActive]}>
          <View style={[styles.switchInner, { alignSelf: hardwareData.cashDrawer === 1 ? 'flex-end' : 'flex-start' }]} />
        </View>
      </TouchableOpacity>
    </View>

    <TouchableOpacity 
      style={[styles.updateButton,]} 
      onPress={saveHardwareSettings}
    >
      <Text style={styles.updateText}>Update Changes</Text>
    </TouchableOpacity>
    </ScrollView>
  </KeyboardAvoidingView>
)}
          {selectedMenu === 'billing' && (
           <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: rV(80),
      }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
              <Text style={styles.sectionTitle}>BILLING/TAX</Text>

              {/* Top Inputs Row */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bill Prefix</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter Bill Prefix'
                    placeholderTextColor={'#9A9A9A'}
                    value={billingData.billPrefix}
                    onChangeText={(val) => updateBillingField('billPrefix', val)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bill Caption </Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter Bill Caption'
                    placeholderTextColor={'#9A9A9A'}
                    value={billingData.billCaption}
                    onChangeText={(val) => updateBillingField('billCaption', val)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Default Payment Mode</Text>
                  {/* <Dropdown
                                style={styles.dropdownPlaceholder}
                                containerStyle={{ marginTop: rV(-20) }}
                                data={paymentModeData}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Payment Mode"
                                value={paymentMode}
                                onChange={item => {
                                    setPaymentMode(item.value);
                                }}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                itemTextStyle={styles.itemTextStyle}
                                iconColor="#1B1B1B"
                            /> */}
                  <Dropdown
                    style={styles.dropdownPlaceholder}
                    data={paymentModeData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Payment Mode"
                    value={billingData.paymentModeId}
                    onChange={item => updateBillingField('paymentModeId', item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor="#1B1B1B"

                  />
                  {/* <View style={styles.dropdownPlaceholder}>
          <Text>{billingData.paymentModeName || 'Select'}</Text>
        </View> */}
                </View>
              </View>

              {/* Second Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.label}>Bill Format Number </Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter Bill Format Number'
                    placeholderTextColor={'#9A9A9A'}
                    value={billingData.billFormatNumber}
                    onChangeText={(val) => updateBillingField('billFormatNumber', val)}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Bill Entry Days for Refund</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Enter Bill Entry'
                    placeholderTextColor={'#9A9A9A'}
                    value={billingData.refundDays}
                    onChangeText={(val) => updateBillingField('refundDays', val)}
                  />
                  {/* <View style={styles.dropdownPlaceholder}>
           <Text>{billingData.refundDays ? `${billingData.refundDays} Days` : 'Select'}</Text>
        </View> */}
                </View>
              </View>

              {/* Bill Notes Section */}
              <View style={[styles.row, { justifyContent: 'space-between', }]}>
                <Text style={styles.sectionSubTitle}>BILL NOTES</Text>
                <TouchableOpacity onPress={handleAddNote} style={styles.addBtn}>
                  <PlusIcon />
                  <Text style={styles.addBtnText}> Add</Text>
                </TouchableOpacity>
              </View>

              {billingData.descriptions.map((item, index) => (
                <View key={index} style={styles.noteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Description </Text>
                    <TextInput
                      style={styles.input}
                      value={item.description}
                      onChangeText={(text) => handleNoteChange(text, index)}
                    />
                  </View>
                  <TouchableOpacity onPress={() => handleRemoveNote(index)} style={styles.deleteBtn}>
                    <DeleteIcon />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Toggle Switches Grid */}
              <View style={[styles.row, { flexWrap: 'wrap', marginTop: 20 }]}>
                {[
                  { label: 'Apply Discount on Discounted Items', key: 'discountOnDiscountedItems' },
                  { label: 'Show Company Logo on Bills', key: 'companyLogoOnBills' },
                  { label: 'Ask confirmation to print bill', key: 'confirmationToPrintBill' },
                  { label: 'Ask Salesman Code', key: 'askSalesmanCode' },
                  { label: 'Activate Happy Hours', key: 'happyHours' },
                  { label: 'Ask Quantity while adding item', key: 'askQtyWhileAddingItems' },
                  { label: 'Print token category-wise', key: 'printTokenCategoryWise' },
                  { label: 'Enable Split Summary', key: 'enableSplitSummary' },
                  { label: 'Reset Bill.No after Day Close', key: 'resetBillNoAfterDayClose' },
                  { label: 'Show QR Code in Bill', key: 'qrCodeInBill' },
                  { label: 'Exclusive GST Billing', key: 'exclusiveGstBilling' }

                ].map((item, idx) => (
                  <View key={idx} style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>{item.label}</Text>
                    <TouchableOpacity onPress={() => toggleBillingSwitch(item.key)}>
                      <View style={[styles.switchOuter, billingData[item.key] === 1 && styles.switchActive]}>
                        <View style={[styles.switchInner, billingData[item.key] === 1 ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <TouchableOpacity style={styles.updateButton} onPress={saveBillingSettings}>
                <Text style={styles.updateText}>Update Changes</Text>
              </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
          )}
          {selectedMenu === 'billColumns' && (
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: rV(15),
                }}>
                <Text
                  style={{
                    color: '#264B79',
                    fontSize: 16,
                    fontFamily: Fonts.FigtreeSemiBold,
                  }}>
                  BILL COLUMNS DISPLAY
                </Text>

                <TouchableOpacity
                  style={styles.defaultKeyTouchable}
                  onPress={setDefaultBillCols}>
                  <Text style={styles.defaultKeyText}>
                    Default Bill Cols
                  </Text>
                </TouchableOpacity>
              </View>
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#264B79"
                  style={{ marginTop: rV(40) }}
                />
              ) : (
                <FlatList
                  data={billColumns}
                  numColumns={4}
                  keyExtractor={item => item.billColId.toString()}
                  columnWrapperStyle={{
                    justifyContent: 'space-between',
                    marginBottom: rV(10),
                  }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onToggleBillColumn(item.billColId)}
                      style={styles.billColumnItem}>
                      <View
                        style={[
                          styles.checkbox,
                        ]}>
                        {item.appStatus === 1 ? (
                          <CheckIcon />

                        ) :
                          (<UnCheckIcon />

                          )}
                      </View>

                      <Text style={styles.billColumnText}>
                        {item.colName}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={
                    <TouchableOpacity
                      style={styles.updateButton}
                      onPress={saveBillColumns}
                      disabled={loading}>
                      <Text style={styles.updateText}>Update Changes</Text>
                    </TouchableOpacity>
                  }
                />
              )}

              {/* <TouchableOpacity
                style={styles.updateButton}
                onPress={saveBillColumns}>
                <Text style={styles.updateText}>
                  Update Changes
                </Text>
              </TouchableOpacity> */}
            </View>
          )}
          {selectedMenu === 'kot' && (
              <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: rV(80),
      }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
              <Text style={styles.sectionTitle}>KOT SETTINGS</Text>

              {/* Prefix Row */}
              <View style={styles.row}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>KOT Prefix</Text>
                  <TextInput
                    style={[styles.input, { width: '50%' }]} // Match design width

                    value={kotData.kotPrefix}
                    onChangeText={(val) => updateKotField('kotPrefix', val)}
                    placeholder="KOT"
                    placeholderTextColor={'#9A9A9A'}
                  />
                </View>
              </View>

              {/* KOT Notes Section */}
              <View style={[styles.row, { justifyContent: 'space-between', marginTop: rV(15), alignItems: 'center' }]}>
                <Text style={styles.sectionSubTitle}>KOT NOTES</Text>
                <TouchableOpacity onPress={handleAddKotNote} style={styles.addBtn}>
                  <PlusIcon />
                  <Text style={styles.addBtnText}> Add</Text>
                </TouchableOpacity>
              </View>

              {kotData.descriptions.map((item, index) => (
                <View key={index} style={styles.noteRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Description <Text style={{ color: 'red' }}>*</Text></Text>
                    <TextInput
                      style={styles.input}
                      value={item.description}
                      onChangeText={(text) => handleKotNoteChange(text, index)}
                      placeholder="Thank you! Visit Again"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveKotNote(index)}
                    style={styles.deleteBtn}
                    disabled={loading}
                  >
                    <DeleteIcon />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Toggle Switches Grid */}
              <View style={[styles.row, { flexWrap: 'wrap', marginTop: rV(20) }]}>
                {[
                  { label: 'Enable KOT', key: 'enableKot' },
                  { label: 'Enable KDS', key: 'enableKds' },
                  { label: 'Print KOT category-wise', key: 'printKotCategoryWise' },
                  { label: 'Enable Take Away', key: 'enableTakeAway' },
                ].map((item, idx) => (
                  <View key={idx} style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>{item.label}</Text>
                    <TouchableOpacity onPress={() => toggleKotSwitch(item.key)}>
                      <View style={[styles.switchOuter, kotData[item.key] === 1 && styles.switchActive]}>
                        <View style={[styles.switchInner, kotData[item.key] === 1 ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={saveKotSettings}
                disabled={loading}>
                <Text style={styles.updateText}>Update Changes</Text>
              </TouchableOpacity>
            </ScrollView>
            </KeyboardAvoidingView>
          )}
          {selectedMenu === 'keyMapping' &&
            <View style={{flex:1}}>
                <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: rV(20),
      }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rS(6) }}>
                  <Text style={{ color: '#264B79', fontSize: 16, fontFamily: Fonts.FigtreeSemiBold }}>KEY MAPPING</Text>
                  <TouchableOpacity
                    style={styles.defaultKeyTouchable}
                    onPress={setDefaultKeys}
                  >
                    <Text style={styles.defaultKeyText}>
                      Default Keys
                    </Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  data={keyMappings}
                  numColumns={3}
                  keyExtractor={item => item.keyMappingId.toString()}
                  columnWrapperStyle={{
                    justifyContent: 'space-between',
                    marginBottom: rV(10),
                  }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedCard(item);
                      }}
                      style={[
                        styles.keyCard,
                        selectedCard?.keyMappingId === item.keyMappingId &&
                        styles.activeKeyCard,
                      ]}
                    >
                      <Text style={styles.keyTitle}>{item.keyName}</Text>

                      <View style={styles.keyInput}>
                        <Text style={styles.keyText}>
                          {item.shortKey || "Select"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    //                 <View
                    //                   style={[
                    //                     styles.keyCard,
                    //                     selectedCard === item.keyMappingId && styles.activeKeyCard,
                    //                   ]}>
                    //                   <Text style={styles.keyTitle}>
                    //                     {item.keyName}
                    //                   </Text>

                    //                   {/* <TextInput
                    //   value={item.shortKey}
                    //   placeholder="Key"
                    //   style={styles.keyInput}
                    //   onFocus={() => setSelectedCard(item.keyMappingId)}
                    //   onBlur={() => setSelectedCard(null)} 
                    //   onChangeText={text =>
                    //     onChangeShortKey(item.keyMappingId, text)
                    //   }
                    // /> */}
                    //                <TextInput
                    //     value={item.shortKey}
                    //     editable
                    //     showSoftInputOnFocus={false}
                    //     onFocus={() => setSelectedCard(item.keyMappingId)}
                    //     onBlur={() => setSelectedCard(null)}
                    //     style={styles.keyInput}
                    // />

                    //                 </View>
                  )}
                />
                {selectedCard && (
                  <View style={styles.shortcutContainer}>
                    <Text style={styles.shortcutTitle}>
                      Select Shortcut for "{selectedCard.keyName}"
                    </Text>

                    <FlatList
                      data={SHORTCUT_KEYS}
                      numColumns={5}
                      keyExtractor={(item) => item}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.shortcutButton,
                            item === "CLEAR" && styles.clearButton,
                            keyMappings.find(
                              x => x.keyMappingId === selectedCard.keyMappingId
                            )?.shortKey === item && styles.selectedShortcut,
                          ]}
                          onPress={() => {
                            const selectedKey = item === "CLEAR" ? "" : item;

                            onChangeShortKey(
                              selectedCard.keyMappingId,
                              selectedKey
                            );

                            setSelectedCard(null);
                          }}
                        >
                          <Text
                            style={[
                              styles.shortcutText,
                              item === "CLEAR" && styles.clearButtonText,
                              keyMappings.find(
                                x => x.keyMappingId === selectedCard.keyMappingId
                              )?.shortKey === item &&
                              styles.selectedShortcutText,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
                {errorMessage ? (
                  <Text style={styles.errorText}>
                    {errorMessage}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={saveKeyMappings}>
                  <Text style={styles.updateText}>
                    Update Changes
                  </Text>
                </TouchableOpacity>
              </ScrollView>
              </KeyboardAvoidingView>
            </View>}

          {selectedMenu === 'hotKeys' &&  <View style={{ flex: 1 }}> 
               <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: rV(80),
      }}
      showsVerticalScrollIndicator={true}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled={true}
    >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <Text style={{ color: '#264B79', fontSize: 16, fontFamily: Fonts.FigtreeSemiBold }}>HOT KEYS</Text>
              <TouchableOpacity
                style={styles.addHotKeyTouchable}
                onPress={()=>navigation.navigate('AddNewHotKeyScreen')}
              >
                <PlusIcon />
                <Text style={styles.addHotKeyText}>
                  Add Hot Key
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterMainContainer}>
              <View style={styles.leftFilterContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by Item Code/Name/key"
                  placeholderTextColor={'#919191'}
                  value={searchText}
                  onChangeText={text => setSearchText(text)}
                />
                <Dropdown
                  style={styles.dropdown}
                  data={statusData}
                  labelField="label"
                  valueField="value"
                  placeholder="Status"
                  value={status}
                  onChange={item => setStatus(item.value)}
                  placeholderStyle={styles.placeholderStyle}
                  selectedTextStyle={styles.selectedTextStyle}
                  itemTextStyle={styles.itemTextStyle}
                  iconColor="#1B1B1B"
                />
                <TouchableOpacity
                  style={styles.searchButton}
                onPress={getHotKeys}
                >
                  <SearchIcon />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.exportContainer}>
                <ExportIcon />
                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, { width: '15%' }]}>
                  S.No
                </Text>
                <Text style={[styles.headerText, { width: '20%' }]}>
                  Product Code
                </Text>
                <Text style={[styles.headerText, { width: '20%' }]}>
                  Varinat Name
                </Text>
                <Text style={[styles.headerText, { width: '17%' }]}>
                  Key
                </Text>
                <Text style={[styles.headerText, { width: '15%' }]}>
                  Status
                </Text>
                <Text style={[styles.headerText, { width: '15%' }]}>
                  Actions
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#264B79"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <FlatList
                  data={hotKeyList}
                  keyExtractor={item => item.id.toString()}
                  renderItem={renderItem}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>
                      No Host Keys Found
                    </Text>
                  )}
                />
              )}
            </View>
            <View style={styles.paginationSection}>
              {renderPagination()}
            </View>
            </ScrollView>
            </KeyboardAvoidingView>
          </View>}
        </View>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: rS(12),
    paddingBottom: rV(10),
    borderTopColor: '#F4F4F4',
    borderTopWidth: 1,
    flexDirection: 'row'
  },

  sidebar: {
    flex: 0.25,
    backgroundColor: '#264B79',
    borderRadius: 10,
    marginTop: rV(10),
    marginRight: rS(12),
  },

  contentContainer: {
    flex: 0.75,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: rV(10),
    paddingVertical: rV(16),
    paddingHorizontal: rS(16),
    minHeight:0
  },

  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rV(7),
    justifyContent: 'center',
  },

  settingTitle: {
    color: '#DDDDDD',
    marginLeft: rS(6),
    fontSize: 15,
    fontFamily: Fonts.FigtreeMedium,
    textTransform: 'uppercase',
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#3E628E',
  },

  menuItem: {
    marginHorizontal: rS(14),
    marginTop: rV(12),
    paddingVertical: rV(7),
    paddingHorizontal: rS(16),
    borderRadius: 10,
  },

  activeMenu: {
    backgroundColor: '#466894',
  },

  menuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },

  activeMenuText: {
    fontFamily: Fonts.FigtreeMedium,
  },
  defaultKeyTouchable: {
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignSelf: 'center',
    paddingHorizontal: rS(8),
    justifyContent: 'center',
    alignItems: 'center',
  },

  defaultKeyText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'center',
    color: '#264B79',
  },
  keyCard: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#E9E9E9',
    borderRadius: 8,
    // padding: 18,
    paddingHorizontal: rS(8),
    // paddingVertical:rV(8),
    paddingVertical: rV(6),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  activeKeyCard: {
    borderColor: '#264B79',
    borderWidth: 1,
  },

  keyTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
  },

  keyInput: {
    width: 95,
    height: rV(20),
    borderWidth: 1,
    borderColor: '#E9E9E9',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: rV(4),
    fontFamily: Fonts.FigtreeRegular,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center'
    // marginHorizontal: rS(14)
  },
  updateButton: {
    alignSelf: 'flex-end',
    marginTop: rV(15),
    backgroundColor: '#264B79',
    borderRadius: 8,
    paddingHorizontal: rS(25),
    height: rV(27),
    justifyContent: 'center',
  },

  updateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
  addHotKeyTouchable: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
  },

  addHotKeyText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },

  keyText: {
    textAlign: 'center',
    color: '#919191',
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 14
  },

  filterMainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rV(10),
  },
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
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    color: '#919191',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },
  leftFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchInput: {
    height: rV(27),
    backgroundColor: '#FFFFFF',
    borderColor: '#EAEAEA',
    borderWidth: 1,
    width: rS(155),
    borderRadius: 6,
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
    paddingHorizontal: rS(10),
  },

  dropdown: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    width: rS(70),
    marginLeft: rS(6),
  },

  placeholderStyle: {
    fontSize: 14,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },

  selectedTextStyle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  itemTextStyle: {
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
  },

  searchButton: {
    width: rS(28),
    height: rV(27),
    backgroundColor: '#264B79',
    borderRadius: 6,
    marginLeft: rS(6),
    justifyContent: 'center',
    alignItems: 'center',
  },

  exportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  exportText: {
    fontSize: 15,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    marginLeft: rS(3),
  },

  shortcutContainer: {
    marginTop: rV(10),
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },

  shortcutTitle: {
    fontSize: 15,
    color: '#264B79',
    fontFamily: Fonts.FigtreeSemiBold,
    marginBottom: rV(6),
  },

  shortcutButton: {
    width: '18%',
    marginHorizontal: '1%',
    marginVertical: 5,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#264B79',
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedShortcut: {
    backgroundColor: '#264B79',
  },

  shortcutText: {
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 14
  },

  selectedShortcutText: {
    color: '#FFFFFF',
  },
  clearButton: {
    borderColor: '#E53935',
    backgroundColor: '#FFF5F5',
  },

  clearButtonText: {
    color: '#E53935',
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 14
  },
  billColumnItem: {
    width: '25%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: rV(12),
  },

  checkbox: {
    // width: 18,
    // height: 18,
    // borderWidth: 1,
    // borderColor: '#C7C7C7',
    // borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rS(8),
  },

  checkboxSelected: {
    // backgroundColor: '#EAF4FF',
    // borderColor: '#8BB6E6',
  },

  billColumnText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  sectionTitle: {
    color: '#264B79',
    fontSize: 16,
    fontFamily: Fonts.FigtreeSemiBold,
    marginBottom: 15,
  },
  sectionSubTitle: {
    color: '#264B79',
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  row: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: rV(15),
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#000000',
    marginBottom: rV(5),
    fontFamily: Fonts.FigtreeRegular,
  },
  input: {
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 6,
    height: rV(28),
    paddingHorizontal: rS(5),
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000'
  },
  dropdownPlaceholder: {
    height: rV(28),
    borderColor: '#C0C0C0',
    borderWidth: 1,
    borderRadius: 8,
    // marginHorizontal: rS(14),
    paddingHorizontal: rS(10),
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    backgroundColor: '#FFFFFF',
    // borderWidth: 1,
    // borderColor: '#E9E9E9',
    // borderRadius: 6,
    // height: 40,
    // paddingHorizontal: 10,
    // justifyContent: 'center',
    // backgroundColor: '#fff',
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },
  selectedTextStyle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  itemTextStyle: {
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: rV(10),
  },
  deleteBtn: {
    marginBottom: rV(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchContainer: {
    width: '48%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rV(15),
    paddingRight: rS(15),
  },
  switchLabel: {
    fontSize: 15,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    flex: 1,
  },
  switchOuter: {
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D1D1D1',
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#264B79',
  },
  switchInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  pageButton: {
    width: rS(28),
    height: rV(23),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9E9E9',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginHorizontal: rS(1.5),
  },
  activePageButton: {
    backgroundColor: '#264B79',
    // borderColor: 'red',
  },
  pageButtonText: {
    fontSize: 13,
    color: '#333',
  },
  activePageButtonText: {
    color: '#FFF',
  },
  paginationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    // flexDirection: 'row',
    paddingHorizontal: rS(10),
    paddingVertical: rV(5),
    borderWidth: 1,
    borderColor: '#E9E9E9',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginHorizontal: rS(1.5),
  },
  navButtonText: {
    fontSize: 13,
    color: '#333',
    fontFamily: Fonts.FigtreeMedium,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rV(10),
    paddingHorizontal: rS(10),
    // borderBottomWidth: 1,
    // borderBottomColor: '#F2F2F2',
  },

  rowText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'center',
  },

  statusContainer: {
    borderRadius: 20,
    paddingVertical: rV(4),
    justifyContent: 'center',
    alignItems: 'center',
    width: rS(37),
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
  },
  paginationSection: {
    paddingTop: rV(10),
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },


});

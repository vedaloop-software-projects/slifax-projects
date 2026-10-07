import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView, Image, Switch, BackHandler } from 'react-native'
import React, { useCallback, useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import CustomHeader from '../components/CustomHeader'
import { rS, rV } from '../constants/responsive'
import Fonts from '../constants/Fonts'
import { Dropdown } from 'react-native-element-dropdown'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import CalenderIcon from '../assets/Icons/CalenderIcon'
import RadioIcon from '../assets/Icons/RadioIcon'
import UnRadioIcon from '../assets/Icons/UnRadioIcon'
import { HelperModule } from '../helper/HelperModule'
import ApiServices from '../helper/ApiServices'
import Toast from 'react-native-toast-message';
import BulkUpload from '../assets/Icons/BulkUpload'
import PlusIcon from '../assets/Icons/PlusIcon';
import BasicDetailsIcon from '../assets/Icons/BasicDetailsIcon'
import VariantDetailsIcon from '../assets/Icons/VariantDetailsIcon'
import BillingControlsIcon from '../assets/Icons/BillingControlsIcon'
import FillBillingControlsIcon from '../assets/Icons/FillBillingControlsIcon'
import FillVariantIcon from '../assets/Icons/FillVariantIcon'
import { launchImageLibrary } from 'react-native-image-picker';
import UploadIcon from '../assets/Icons/UploadIcon'
import EditIcon from '../assets/Icons/EditIcon'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import UpArrow from '../assets/Icons/UpArrow'
import CancelBlackIcon from '../assets/Icons/CancelBlackIcon'
import NextIcon from '../assets/Icons/NextIcon'

export default function NewProductScreen() {
  const navigation = useNavigation()
  const route = useRoute();
  const { postMethod } = HelperModule()
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // Form Data - Basic Details
  const [productId, setProductId] = useState(null);
  const [productCode, setProductCode] = useState('')
  const [productShortName, setProductShortName] = useState('')
  const [productFullName, setProductFullName] = useState('')
  const [eanCode, setEANCode] = useState('')
  const [category, setCategory] = useState(null)
  const [subCategory, setSubCategory] = useState(null)
  const [brands, setBrands] = useState(null)
  const [unitType, setUnitType] = useState(null);
  const [qoh, setQoh] = useState('')
  const [hsn, setHSN] = useState('')
  const [tax, setTax] = useState(null)
  const [taxPercent, setTaxPercent] = useState(0);
  const [status, setStatus] = useState('Active');
  const [productImage, setProductImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageName, setImageName] = useState('');

  // Form Data - Variant & Pricing
  const [packSize, setPackSize] = useState('')
  const [size, setSize] = useState(null)
  const [colour, setColour] = useState(null)
  const [basicCost, setBasicCost] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [mrp, setMrp] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [wsPrice, setWSPrice] = useState('')
  const [variantQty, setVariantQty] = useState('')
  const [priority, setPriority] = useState('')
  const [margin, setMargin] = useState('')
  const [marginOn, setMarginOn] = useState('MRP')
  const [variantStatus, setVariantStatus] = useState('Active')
  const [variantList, setVariantList] = useState([]);

  // Form Data - Billing Controls
  const [billingControls, setBillingControls] = useState({
    allowWeighingScale: false,
    allowDecimals: false,
    allowDiscount: false,
    allowPriceOverride: false,
    kotRequired: false,
    kit: false,
  });

  // Master Data for Dropdowns
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [brandsData, setBrandsData] = useState([]);
  const [unitTypeData, setUnitTypeData] = useState([]);
  const [taxData, setTaxData] = useState([]);
  const [sizeData, setSizeData] = useState([])
  const [colourData, setColourData] = useState([])

  const billingControlsData = [
    {
      leftLabel: 'Allow Weighing Scale at Billing',
      leftKey: 'allowWeighingScale',
      rightLabel: 'Allow Decimals',
      rightKey: 'allowDecimals',
    },
    {
      leftLabel: 'Allow Discount',
      leftKey: 'allowDiscount',
      rightLabel: 'Allow Price Override',
      rightKey: 'allowPriceOverride',
    },
    {
      leftLabel: 'KOT Required',
      leftKey: 'kotRequired',
      rightLabel: 'KIT',
      rightKey: 'kit',
    },
  ];

  // Calculations
  const calculateMargin = (cp, targetPrice) => {
    const cpNum = parseFloat(cp) || 0;
    const targetNum = parseFloat(targetPrice) || 0;
    if (targetNum === 0 || cpNum === 0) return '0.00';
    // Formula: ((Price - CP) / Price) * 100
    const res = ((targetNum - cpNum) / targetNum) * 100;
    return res.toFixed(2);
  };

  const handleCostPriceChange = (val) => {
    const cp = parseFloat(val) || 0;
    setCostPrice(val);

    const xValue = (cp * taxPercent) / (100 + taxPercent);
    const bc = cp - xValue;
    setBasicCost(bc > 0 ? bc.toFixed(2) : '');

    setErrors(prev => ({ ...prev, basicCost: null, costPrice: null }));

    // Margin Calculation: target value ni direct ga state nundi ikkada use cheyachu
    let target = 0;
    if (marginOn === 'MRP') target = mrp;
    else if (marginOn === 'Sale Price') target = salePrice;
    else if (marginOn === 'WS Price') target = wsPrice;

    setMargin(calculateMargin(val, target));
  };


  const handleBasicCostChange = (val) => {
    const bc = parseFloat(val) || 0;
    setBasicCost(val);

    const xValue = (bc * taxPercent) / 100;
    const cp = bc + xValue;
    const cpStr = cp > 0 ? cp.toFixed(2) : '';
    setCostPrice(cpStr);
    setErrors(prev => ({ ...prev, basicCost: null, costPrice: null }));

    // CP update ayyaka margin update
    let target = 0;
    if (marginOn === 'MRP') target = mrp;
    else if (marginOn === 'Sale Price') target = salePrice;
    else if (marginOn === 'WS Price') target = wsPrice;

    setMargin(calculateMargin(cpStr, target));
  };


  const updateDynamicMargin = (cpVal = costPrice, type = marginOn) => {
    let target = 0;
    // Note: Use current state values for target if not provided
    if (type === 'MRP') target = mrp;
    else if (type === 'Sale Price') target = salePrice;
    else if (type === 'WS Price') target = wsPrice;

    setMargin(calculateMargin(cpVal, target));
  };


  useEffect(() => {
    updateDynamicMargin();
  }, [marginOn]);

useFocusEffect(
  React.useCallback(() => {
    const onBackPress = () => {
      Alert.alert(
        'Discard Changes?',
        'Are you sure you want to go back? Any unsaved details will be lost.',
        [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel',
          },
          {
            text: 'Discard',
            onPress: () => navigation.navigate('ProductScreen'),
          },
        ],
        { cancelable: false }
      );

      return true; 
    };
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    if (!route.params?.editData) {
      setIsEditMode(false);
      setProductId(null);
      resetForm();
    } else {
      if (route.params.editData.productDetails?.categoryId) {
        getSubCategories(route.params.editData.productDetails.categoryId);
      }
    }

    return () => subscription.remove();
    
  }, [route.params?.editData, navigation]) 
);

    const getCategories = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET CATEGORIES PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetCategories,
        payload,
      );

      console.log('GET CATEGORIES RESPONSE =====>', response);

      if (response?.success) {

        const formattedCategories = response?.data?.categories?.map(item => ({
          label: item.categoryName,
          value: item.id,
        }));

        setCategories(formattedCategories || []);
      }

    } catch (error) {
      console.log('GET CATEGORIES ERROR =====>', error);
    }
  };

  const getSubCategories = async (catId) => {
    try {
      if (!catId) {
        setSubCategories([]);
        return;
      }
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
        categoryId: catId,
      };

      console.log('GET SUB-CATEGORIES PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetSubCategories,
        payload,
      );

      console.log('GET SUB-CATEGORIES RESPONSE =====>', response);

      if (response?.success) {

        const formattedSubCategories = response?.data?.subCategories?.map(item => ({
          label: item.subCategoryName,
          value: item.id,
        }));

        setSubCategories(formattedSubCategories || []);
      }

    } catch (error) {
      console.log('GET SUB-CATEGORIES ERROR =====>', error);
    }
  };

  const getBrands = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET BRANDS PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetBrands,
        payload,
      );

      console.log('GET BRANDS RESPONSE =====>', response);

      if (response?.success) {

        const formattedBrands = response?.data?.brands?.map(item => ({
          label: item.brandName,
          value: item.id,
        }));

        setBrandsData(formattedBrands || []);
      }

    } catch (error) {
      console.log('GET BRANDS ERROR =====>', error);
    }
  };

  const getUnits = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET UNITS PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetUnitTypes,
        payload,
      );

      console.log('GET UNITS RESPONSE =====>', response);

      if (response?.success) {

        const formattedUnits = response?.data?.unitTypes?.map(item => ({
          label: item.unitTypeName,
          value: item.id,
        }));

        setUnitTypeData(formattedUnits || []);
      }

    } catch (error) {
      console.log('GET UNITS ERROR =====>', error);
    }
  };

  const getTaxes = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET TAXES PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetTaxes,
        payload,
      );

      console.log('GET TAXES RESPONSE =====>', response);

      if (response?.success) {

        const formattedTaxes = response?.data?.taxes?.map(item => ({
          label: String(item.taxPercent),
          value: item.id,
          taxPercent: item.taxPercent
        }));

        setTaxData(formattedTaxes || []);
      }

    } catch (error) {
      console.log('GET TAXES ERROR =====>', error);
    }
  };

  const getSizes = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET SIZES PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetSizes,
        payload,
      );

      console.log('GET SIZES RESPONSE =====>', response);

      if (response?.success) {

        const formattedSizes = response?.data?.sizes?.map(item => ({
          label: item.sizeName,
          value: item.id,
        }));

        setSizeData(formattedSizes || []);
      }

    } catch (error) {
      console.log('GET SIZES ERROR =====>', error);
    }
  };

  const getColours = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
      };

      console.log('GET COLOURS PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetColours,
        payload,
      );

      console.log('GET COLOURS RESPONSE =====>', response);

      if (response?.success) {

        const formattedColours = response?.data?.colours?.map(item => ({
          label: item.colourName,
          value: item.id,
        }));

        setColourData(formattedColours || []);
      }

    } catch (error) {
      console.log('GET COLOURS ERROR =====>', error);
    }
  };
  useEffect(() => {
    getCategories()
    getSubCategories()
    getBrands()
    getUnits()
    getTaxes()
    getSizes()
    getColours()

  }, [])

    const fetchUpdatedProductDetails = async () => {
    try {
      const payload = { productId: productId };
      const response = await postMethod(ApiServices.zenxposGetProductByID, payload);
      if (response?.success) {
        const { variants } = response.data;
        const mappedVariants = variants.map(v => ({
          variantId: v.id,
          packSize: v.packSize,
          sizeId: v.sizeId,
          colourId: v.colourId,
          basicCost: v.basicCost,
          costPrice: v.costPrice,
          mrp: v.mrp,
          salePrice: v.salePrice,
          wholeSalePrice: v.wholeSalePrice,
          variantQty: v.variantQty,
          priority: v.priority,
          status: v.status,
          margin: calculateMargin(v.costPrice, v.mrp),
          marginOn: 'MRP'
        }));
        setVariantList(mappedVariants);
      }
    } catch (error) {
      console.log("Error refreshing variants:", error);
    }
  };



  // const resetForm = () => {
  //   setCurrentStep(1);

  //   setProductCode('');
  //   setProductShortName('');
  //   setProductFullName('');
  //   setEANCode('');
  //   setCategory(null);
  //   setSubCategory(null);
  //   setBrands(null);
  //   setUnitType(null);
  //   setQoh('');
  //   setHSN('');
  //   setTax(null);

  //   setPackSize('');
  //   setSize(null);
  //   setColour(null);
  //   setBasicCost('');
  //   setCostPrice('');
  //   setMrp('');
  //   setSalePrice('');
  //   setWSPrice('');
  //   setVariantQty('');
  //   setPriority('');
  //   setMargin('');
  //   setSelectedImage(null);
  //   setProductImage(null);
  //   setImageName('');

  //   setStatus('Active');
  //   setVariantStatus('Active');
  //   setMarginOn('MRP');

  //   setBillingControls({
  //     allowWeighingScale: false,
  //     allowDecimals: false,
  //     allowDiscount: false,
  //     allowPriceOverride: false,
  //     kotRequired: false,
  //     kit: false,
  //   });

  //   setErrors({});
  //   setVariantList([])
  // };
  // useFocusEffect(
  //   React.useCallback(() => {
  //     resetForm();
  //   }, [])
  // );

      const resetForm = () => {
        setCurrentStep(1); 
        setProductCode(''); 
        setProductShortName(''); 
        setProductFullName('');
        setEANCode(''); 
        setCategory(null); 
        setSubCategories([]);
        setSubCategory(null); 
        setBrands(null); 
        setUnitType(null);
        setQoh('0'); 
        setHSN(''); 
        setTax(null); 
        setUnitType(null);
        setVariantList([]); 
        setErrors({}); 
        setProductImage(null);
        setSelectedImage(null);
        setImageName('');
        
        setStatus('Active');
        setBillingControls({
      allowWeighingScale: false,
      allowDecimals: false,
      allowDiscount: false,
      allowPriceOverride: false,
      kotRequired: false,
      kit: false,
    });
        resetVariantFields();

    };

      const resetVariantFields = () => {
        setPackSize(''); 
        setSize(null); 
        setColour(null); 
        setBasicCost(''); 
        setCostPrice('');
        setMrp(''); 
        setSalePrice(''); 
        setWSPrice(''); 
        setVariantQty(''); 
        setPriority('');
        setMargin('');
        setMarginOn('MRP');
        setVariantStatus('Active')
        setIsEditing(false); 
        setEditingIndex(null);
    };


    useFocusEffect(
    React.useCallback(() => {
      // Only reset the form if we are NOT editing
      setErrors({})
      if (!route.params?.editData) {
        setIsEditMode(false);
        setProductId(null);
        resetForm();
      } else {
      // If editing, you might want to ensure subcategories 
      // are loaded for that specific category
      if (route.params.editData.productDetails?.categoryId) {
        getSubCategories(route.params.editData.productDetails.categoryId);
      }
    }
    }, [route.params?.editData]) 
  );


  useEffect(() => {
    const editData = route.params?.editData;

    if (editData && editData.productDetails) {
      setIsEditMode(true);
      setCurrentStep(1);
      const { productDetails, variants, productControl } = editData;
      setProductImage(null);
      setSelectedImage(null);
      setImageName('')
      setProductId(productDetails.id);
      setProductCode(productDetails.productCode);
      setProductShortName(productDetails.productShortName);
      setProductFullName(productDetails.productFullName);
      setEANCode(productDetails.eanCode || '');
      setCategory(productDetails.categoryId);
      getSubCategories(productDetails.categoryId);
      setSubCategory(productDetails.subCategoryId);
      setBrands(productDetails.brandId);
      setUnitType(productDetails.unitTypeId);
      setQoh(productDetails.qoh?.toString());
      setHSN(productDetails.hsnCode);
      setTax(productDetails.taxId);
      setStatus(productDetails.status === 1 ? 'Active' : 'In-Active');
      if (productDetails.productImage) {
        const imgUri = productDetails.productImage;
        setProductImage(imgUri);
        setImageName(imgUri.split('/').pop());
        // setImageName(imgUri);
      }
      if (variants) {
        setVariantList(variants.map(v => ({
          variantId: v.id, packSize: v.packSize, sizeId: v.sizeId, colourId: v.colourId,
          basicCost: v.basicCost, costPrice: v.costPrice, mrp: v.mrp, salePrice: v.salePrice,
          wholeSalePrice: v.wholeSalePrice, variantQty: v.variantQty, priority: v.priority, status: v.status
        })));
      }

      // 3. Billing Controls (Map 0/1 to boolean)
      if (productControl) {
        setBillingControls({
          allowWeighingScale: productControl.allowWeighingScale === 1,
          allowDecimals: productControl.allowDecimals === 1,
          allowDiscount: productControl.allowDiscount === 1,
          allowPriceOverride: productControl.allowPriceOverride === 1,
          kotRequired: productControl.kotRequired === 1,
          kit: productControl.kit === 1,
        });
      }
    }
  }, [route.params?.editData]);


    const validateForm = () => {
    let newErrors = {};

    // Product Code
    if (!productCode.trim()) {
      newErrors.productCode = 'Product Code is required';
    } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(productCode.trim())) {
      newErrors.productCode = "Brand code must contain at least one letter and only letters/numbers are allowed";
    }

    // Product Short Name
    if (!productShortName.trim()) {
      newErrors.productShortName = 'Product Short Name is required';
    } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(productShortName.trim())) {
      newErrors.productShortName = 'Product Short Name must contain at least one letter and only letters, numbers, and spaces are allowed';
    }

    // Product Full Name
    if (!productFullName.trim()) {
      newErrors.productFullName = 'Product Full Name is required';
    } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(productFullName.trim())) {
      newErrors.productFullName = 'Product Full Name must contain at least one letter and only letters, numbers, and spaces are allowed';
    }

    // Category
    if (!category) {
      newErrors.category = 'Please select a Category';
    }

    // Unit Type
    if (!unitType) {
      newErrors.unitType = 'Please select a Unit Type';
    }

    // HSN Code
    if (!hsn.trim()) {
      newErrors.hsn = 'HSN Code is required';
    } else if (!/^\d+$/.test(hsn)) {
      newErrors.hsn = 'HSN Code must contain only numbers';
    } else if (!/^\d{2,8}$/.test(hsn)) {
      newErrors.hsn = 'HSN Code must be between 2 and 8 digits';
    }
    if (!tax) {
      newErrors.tax = 'Please select Tax/GST';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const validateVariantForm = () => {
    let newErrors = {};

    // Pack Size
    if (!packSize.trim()) {
      newErrors.packSize = 'Pack Size is required';
    } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(productCode.trim())) {
      newErrors.productCode = "Pack size must contain at least one letter and only letters/numbers are allowed";
    }

    // Basic Cost
    if (!basicCost.trim()) {
      newErrors.basicCost = 'basic cost is required';
    }
    if (!costPrice.trim()) {
      newErrors.costPrice = 'cost price is required';
    }
    if (!mrp.trim()) {
      newErrors.mrp = 'mrp is required';
    }

    if (!salePrice.trim()) {
      newErrors.salePrice = 'sale price is required';
    }
    if (!wsPrice.trim()) {
      newErrors.wsPrice = 'ws price is required';
    }
    if (!priority.trim()) {
      newErrors.priority = 'priority is required';
    }

    const cpNum = parseFloat(costPrice) || 0;
    const mrpNum = parseFloat(mrp) || 0;
    const spNum = parseFloat(salePrice) || 0;
    const wsNum = parseFloat(wsPrice) || 0;

    if (mrp.trim() && mrpNum < cpNum) {
      newErrors.mrp = 'MRP must be greater than CP';
    }

    // Rule 2: Sale Price cannot be greater than MRP (as per Image 2 notes)
    if (salePrice.trim() && spNum > mrpNum) {
      newErrors.salePrice = 'Sale Price must be less than MRP';
    }

    if (salePrice.trim() && spNum < cpNum) {
      newErrors.salePrice = 'Sale Price must be greater than CP';
    }

    if (wsPrice.trim() && wsNum > mrpNum) {
      newErrors.wsPrice = 'WS Price must be less than MRP';
    }

    if (salePrice.trim() && wsNum < cpNum) {
      newErrors.wsPrice = 'WS Price must be greater than CP';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

   const handleSaveVariant = async () => {
    if (!validateVariantForm()) return;

    const variantData = {
      packSize: packSize,
      sizeId: size,
      colourId: colour,
      basicCost: Number(basicCost),
      costPrice: Number(costPrice),
      mrp: Number(mrp),
      salePrice: Number(salePrice),
      wholeSalePrice: Number(wsPrice),
      priority: Number(priority),
      // variantQty: Number(variantQty) || 0,
      status: variantStatus === 'Active' ? 1 : 0,
      dineInPrice: Number(salePrice),
      takeAwayPrice: Number(salePrice),
      salonDuration: 0,
      margin: margin, 
      marginOn:marginOn,
      
      
    };

    if (isEditMode) {
      setLoading(true);
      try {
        let response;
         if (isEditing) {
                    response = await postMethod(ApiServices.zenxposUpdateVariant, { ...variantData, variantId: variantList[editingIndex].variantId });
                }  else {
                    response = await postMethod(ApiServices.zenxposAddVariant, { ...variantData, productId });
                }

        if (response?.success) {
          Toast.show({ type: 'success', text1: response.message });
          resetVariantFields();
          await fetchUpdatedProductDetails(); 
        } else {
          Toast.show({ type: 'error', text1: response?.message || 'Variant update failed' });
        }
      } catch (error) {
        console.log("Variant API Error:", error);
      } finally {
        setLoading(false);
      }
    } else {
      // // ORIGINAL LOCAL LOGIC FOR NEW PRODUCT
      // const newPriority = Number(priority);
      // let updatedList = [...variantList];
      // if (isEditing) updatedList.splice(editingIndex, 1);

      // updatedList = updatedList.map(item =>
      //   item.priority >= newPriority ? { ...item, priority: item.priority + 1 } : item
      // );

      // const finalInsertedList = [...updatedList, { ...variantData, variantId: 0 }]
      //   .sort((a, b) => a.priority - b.priority);

      // setVariantList(finalInsertedList);
      // setIsEditing(false);
      // setEditingIndex(null);
      // resetVariantFields();
      let list = [...variantList];
            if (isEditing) list.splice(editingIndex, 1);
            list.push({ ...variantData, variantId: 0 });
            setVariantList(list.sort((a, b) => a.priority - b.priority));
            resetVariantFields();
      Toast.show({ type: 'success', text1: 'Variant saved locally' });
    }
  };

   const handleEditVariant = (item, index) => {
    setIsEditing(true);
    setEditingIndex(index);

    // Fill the input fields with the selected variant's data
    setPackSize(item.packSize);
    setSize(item.sizeId);
    setColour(item.colourId);
    setBasicCost(item.basicCost.toString());
    setCostPrice(item.costPrice.toString());
    setMrp(item.mrp.toString());
    setSalePrice(item.salePrice.toString());
    setWSPrice(item.wholeSalePrice.toString());
    setVariantQty(item.variantQty ? item.variantQty.toString() : '0');
    setPriority(item.priority.toString());
    setMargin(item.margin);
    setMarginOn(item.marginOn);
    setVariantStatus(item.status === 1 ? 'Active' : 'In-Active');
    setCurrentStep(2);
  };

   const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      setErrors({})

      const details = {
                productId: isEditMode ? productId : undefined,
                productCode, productShortName, productFullName, eanCode, categoryId: category,
                subCategoryId: subCategory, brandId: brands, unitTypeId: unitType, hsnCode: hsn, taxId: tax,
                status: status === 'Active' ? 1 : 0
            };

             const controls = {
                productId,
                allowWeighingScale: billingControls.allowWeighingScale ? 1 : 0,
                allowDecimals: billingControls.allowDecimals ? 1 : 0,
                allowDiscount: billingControls.allowDiscount ? 1 : 0,
                allowPriceOverride: billingControls.allowPriceOverride ? 1 : 0,
                kotRequired: billingControls.kotRequired ? 1 : 0,
                kit: billingControls.kit ? 1 : 0
            };

             if (isEditMode) {
                // Update Product + Update Controls
                const fd = new FormData();
                fd.append('productDetails', JSON.stringify(details));
                if (selectedImage?.uri) fd.append('productImage', { uri: selectedImage.uri, type: selectedImage.type, name: selectedImage.fileName });
                
                const res1 = await postMethod(ApiServices.zenxposUpdateProduct, fd);
                const res2 = await postMethod(ApiServices.zenxposUpdateProductControls, controls);

                if (res1?.success && res2?.success) {
                    Toast.show({ type: 'success', text1: 'Product updated successfully' });
                    navigation.navigate("ProductScreen");
                }
            } else {
                // Add New Product Flow
                const fd = new FormData();
                fd.append('productDetails', JSON.stringify(details));
                fd.append('productControl', JSON.stringify(controls));
                fd.append('variants', JSON.stringify(variantList.map(v => ({ ...v, variantId: 0 }))));
                if (selectedImage?.uri) fd.append('productImage', { uri: selectedImage.uri, type: selectedImage.type, name: selectedImage.fileName });

                const res = await postMethod(ApiServices.zenxposAddProduct, fd);
                if (res?.success) {
                    Toast.show({ type: 'success', text1: 'Product created successfully' });
                    navigation.navigate("ProductScreen");
                }
            }
        } catch (e) { console.log(e); } finally { setLoading(false); }
    };
  
  const pickProductImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      },
      response => {
        if (response.didCancel) {
          return;
        }

        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Unable to select image');
          return;
        }

        if (response.assets?.length > 0) {
          const image = response.assets[0];

          const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/svg+xml',
          ];

          const fileExtension = image?.fileName
            ?.split('.')
            ?.pop()
            ?.toLowerCase();

          const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg'];

          if (
            !allowedTypes.includes(image.type) &&
            !allowedExtensions.includes(fileExtension)
          ) {
            Alert.alert(
              'Invalid File',
              'Only PNG, JPG, JPEG and SVG files are allowed.'
            );
            return;
          }

          setSelectedImage(image);
          setProductImage(image.uri);
          setImageName(image.fileName || 'product_image');
        }
      },
    );
  };

  // const resetVariantFields = () => {
  //   setPackSize('');
  //   setSize(null);
  //   setColour(null);
  //   setBasicCost('');
  //   setCostPrice('');
  //   setMrp('');
  //   setSalePrice('');
  //   setWSPrice('');
  //   setVariantQty('');
  //   setPriority('');
  //   setMargin('');
  //   setVariantStatus('Active');
  //   setMarginOn('MRP');
  //   setIsEditing(false);
  //   setEditingIndex(null);
  // };

  

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }
    setCurrentStep(2);
  };

  const handleSaveNext = () => {
    // if (!validateVariantForm()) {
    //   return;
    // }
    if (variantList.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Please save the variant first.',
        text2: 'Click "Save Variant" before proceeding.',
      });
      return;
    }

    setCurrentStep(3);
  };


  const handleManageProducts = () => {
    Alert.alert(
      'Confirmation',
      'Do you want to discard the details?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: () => navigation.navigate('ProductScreen'),
        },
      ],
      { cancelable: false }
    );
  };


  const RenderStepper = () => (
    <View style={styles.stepperMainContainer}>
      {/* Background Line */}
      <View style={styles.stepLine} />

      <View style={styles.stepsRow}>
        {/* Step 1 */}
        <View style={styles.stepItem}>
          <Text style={styles.stepLabel}>Basic Details</Text>
          <BasicDetailsIcon />
        </View>

        {/* Step 2 */}
        <View style={styles.stepItem}>
          <Text style={styles.stepLabel}>Variant & Pricing Details</Text>
          {currentStep >= 2 ? <FillVariantIcon /> : <VariantDetailsIcon />}
        </View>

        {/* Step 3 */}
        <View style={styles.stepItem}>
          <Text style={styles.stepLabel}>Billing Controls</Text>
          {currentStep >= 3 ? <FillBillingControlsIcon /> : <BillingControlsIcon />}
        </View>
      </View>
    </View>
  );



  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        {/* Top Header */}
        <View style={styles.productRowContainer}>
          <View>
            <Text style={styles.productText}>Products</Text>
            <Text style={styles.productSubText}>
              Create or Manage Products
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: rS(8) }}>
            {/* <TouchableOpacity
              style={styles.bulkUploadTouchable}
              onPress={() => navigation.navigate('BulkUploadScreen')}>
              <BulkUpload />
              <Text style={styles.bulkUploadText}>Bulk Upload</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.newProductTouchable}
              onPress={handleManageProducts}>
              <Text style={styles.addNewProductText}>Manage Products</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.formContainer}>

          {/* <ScrollView showsVerticalScrollIndicator={false}  > */}
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <RenderStepper />

            {currentStep === 1 && <View style={styles.formSubContainer}>
              {/* <Text style={styles.basicDetailsText}>BASIC Details</Text> */}
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Product Code <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter product code"
                    placeholderTextColor={'#9A9A9A'}
                    editable={!isEditMode}
                    style={[
                      styles.input,
                      { marginRight: rS(20) },
                      isEditMode && styles.disabledInput
                    ]}

                    value={productCode}
                    onChangeText={(val) => {
                      const filteredText = val.replace(/[^A-Za-z0-9]/g, '');
                      setProductCode(filteredText)
                      setErrors(prev => ({
                        ...prev,
                        productCode: null,
                      }));
                    }}
                    maxLength={10}
                  />
                  {errors.productCode && <Text style={styles.errorText}>{errors.productCode}</Text>}

                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Product Short Name <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter product short name"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={productShortName}
                    onChangeText={(val) => {
                      const filteredText = val.replace(/[^A-Za-z0-9\s]/g, '');
                      setProductShortName(filteredText)
                      setErrors(prev => ({
                        ...prev,
                        productShortName: null,
                      }));
                    }}
                  />
                  {errors.productShortName && <Text style={styles.errorText}>{errors.productShortName}</Text>}
                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Product Full Name <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter product full name"
                    placeholderTextColor={'#9A9A9A'}
                    style={styles.input}
                    value={productFullName}
                    // onChangeText={setCity}
                    onChangeText={(val) => {
                      const filteredText = val.replace(/[^A-Za-z0-9\s]/g, '');
                      setProductFullName(filteredText);
                      setErrors(prev => ({
                        ...prev,
                        productFullName: null,
                      }));
                    }}
                  />
                  {errors.productFullName && <Text style={styles.errorText}>{errors.productFullName}</Text>}

                </View>

              </View>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Barcode/EANCode
                  </Text>

                  <TextInput
                    placeholder="Enter barcode/eancode"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={eanCode}
                    maxLength={15}
                    onChangeText={setEANCode}
                  />
                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Category <Text style={styles.required}>*</Text>
                  </Text>

                  <Dropdown
                    style={[styles.dropdown, { marginRight: rS(20) }]}
                    data={categories}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Category"
                    value={category}
                    search
                    searchPlaceholder='Search Category...'
                    renderRightIcon={() => (
                      category ? (
                        <TouchableOpacity onPress={() => {
                          setCategory(null);
                          setSubCategory(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    onChange={(item) => {
                      setCategory(item.value);
                      setSubCategory(null);
                      getSubCategories(item.value);
                      setErrors(prev => ({
                        ...prev,
                        category: null,
                      }));
                    }}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    inputSearchStyle={styles.inputSearchStyle}
                    iconColor='#1B1B1B'
                  />
                  {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Sub Category
                  </Text>
                  <Dropdown
                    style={styles.dropdown}
                    data={subCategories}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Sub Category"
                    value={subCategory}
                    search
                    searchPlaceholder='Search Sub Category...'
                    renderRightIcon={() => (
                      subCategory ? (
                        <TouchableOpacity onPress={() => {
                          // setCategory(null);
                          setSubCategory(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    inputSearchStyle={styles.inputSearchStyle}
                    onFocus={() => {
                      if (!category) {
                        Toast.show({
                          type: 'error',
                          text1: 'Required',
                          text2: 'Please select a category first',
                        })
                      }
                    }}
                    onChange={(item) => setSubCategory(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}

                    iconColor='#1B1B1B'
                  />



                </View>

              </View>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Brand
                  </Text>

                  <Dropdown
                    style={[styles.dropdown, { marginRight: rS(20) }]}
                    data={brandsData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Brand"
                    value={brands}
                    search
                    searchPlaceholder='Search Brands...'
                    renderRightIcon={() => (
                      brands ? (
                        <TouchableOpacity onPress={() => {
                          setBrands(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    inputSearchStyle={styles.inputSearchStyle}
                    onChange={(item) => setBrands(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />

                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Unit Type <Text style={styles.required}>*</Text>
                  </Text>

                  <Dropdown
                    style={[styles.dropdown, { marginRight: rS(20) }]}
                    data={unitTypeData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Unit Type"
                    value={unitType}
                    search
                    searchPlaceholder='Search Unit Type...'
                    renderRightIcon={() => (
                      unitType ? (
                        <TouchableOpacity onPress={() => {
                          setUnitType(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    inputSearchStyle={styles.inputSearchStyle}
                    onChange={
                      (item) => {
                        setUnitType(item.value);
                        setErrors(prev => ({
                          ...prev,
                          unitType: null,
                        }));
                      }

                    }
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />
                  {errors.unitType && <Text style={styles.errorText}>{errors.unitType}</Text>}

                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    QOH (Quantity on Hand)
                  </Text>

                  <TextInput
                    placeholder="Enter QOH"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, styles.disabledInput]}
                    value={qoh}
                    editable={false}
                    // onChangeText={setCity}
                    onChangeText={(val) => {
                      setQoh(val)
                    }}
                  />

                </View>

              </View>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.170 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    HSN Code <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter HSN"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(15) }]}
                    value={hsn}
                    // editable={false}
                    // onChangeText={setFreeMrp}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');

                      setHSN(numericValue)
                      setErrors(prev => ({
                        ...prev,
                        hsn: null,
                      }));
                    }}
                    maxLength={8}
                    keyboardType='number-pad'
                  />
                  {errors.hsn && <Text style={styles.errorText}>{errors.hsn}</Text>}

                </View>
                <View style={{ flex: 0.170 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Tax/GST % <Text style={styles.required}>*</Text>
                  </Text>

                  <Dropdown
                    style={[styles.dropdown, { marginRight: rS(15) }]}
                    data={taxData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Tax"
                    value={tax}
                    search
                    searchPlaceholder='Search Tax...'
                    renderRightIcon={() => (
                      tax ? (
                        <TouchableOpacity onPress={() => {
                          setTax(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    inputSearchStyle={styles.inputSearchStyle}
                    onChange={(item) => {
                      setTax(item.value);
                      setTaxPercent(item.taxPercent || 0)
                      setErrors(prev => ({
                        ...prev,
                        tax: null,
                      }));
                    }
                    }
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />



                  {/* <TextInput
                                                        placeholder="Enter unit"
                                                        placeholderTextColor={'#9A9A9A'}
                                                        style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
                                                        value={hsn}
                                                        editable={false}
                                                        onChangeText={(text) => {
                                                           setHSN(text)
                                                        }}
                                                        maxLength={10}
                                                        keyboardType='number-pad'
                                                    /> */}
                  {errors.tax && <Text style={styles.errorText}>{errors.tax}</Text>}

                </View>

                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Product Image
                  </Text>

                  <View style={[styles.imageUploadRow, { marginRight: rS(20) }]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={[styles.imageInputContainer,]}
                      onPress={pickProductImage}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.imageNameText,
                          !imageName && { color: '#9A9A9A' },
                        ]}
                      >
                        {imageName || 'Choose Image'}
                      </Text>

                      <UploadIcon />
                    </TouchableOpacity>
                    {productImage ? (
  <Image
    // Ensure the uri is passed correctly
    source={{ uri: productImage }} 
    style={styles.previewImage}
    // Added this to handle loading errors
    onError={(e) => console.log("Image Load Error: ", e.nativeEvent.error)}
  />
) : null}


                    {/* {productImage ? (
                      <Image
                        source={{ uri: productImage?.startsWith('http') ? productImage : productImage }}
                        style={styles.previewImage}
                      />
                    ) : null} */}
                  </View>
                </View>
                <View style={{ flex: 0.35 }}>
                  <Text style={styles.radioLabel}>Status: <Text style={styles.required}>*</Text></Text>
                  <View style={styles.statusRow}>


                    {/* Active */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setStatus('Active');
                      }}>

                      {status === 'Active' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>Active</Text>
                    </TouchableOpacity>

                    {/* Inactive */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setStatus('In-Active');
                      }}
                    >

                      {status === 'In-Active' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>In-Active</Text>
                    </TouchableOpacity>
                  </View>

                </View>

              </View>

              {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
              <TouchableOpacity
                style={styles.basicSaveTouchable}
                onPress={handleSave}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                    <>
                    <Text style={styles.saveText}>Next</Text>
                    <NextIcon />
                    </>
                )}
              </TouchableOpacity>
            </View>}
            {currentStep === 2 && <View style={styles.formSubContainer}>
              <Text style={styles.basicDetailsText}>VARIANT & PRICING Details</Text>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Pack Size / Variant Name <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter Pack Size"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={packSize}
                    onChangeText={(val) => {
                      const filteredText = val.replace(/[^A-Za-z0-9. ]/g, '');
                      setPackSize(filteredText)
                      setErrors(prev => ({
                        ...prev,
                        packSize: null,
                      }));
                    }}
                    maxLength={10}
                  />
                  {errors.packSize && <Text style={styles.errorText}>{errors.packSize}</Text>}

                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Size
                  </Text>
                  <Dropdown
                    style={[styles.dropdown, { marginRight: rS(20) }]}
                    data={sizeData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Size"
                    value={size}
                    search
                    searchPlaceholder='Search Size...'
                    inputSearchStyle={styles.inputSearchStyle}
                    renderRightIcon={() => (
                      size ? (
                        <TouchableOpacity onPress={() => {
                          setSize(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    onChange={(item) => setSize(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />

                  {errors.size && <Text style={styles.errorText}>{errors.size}</Text>}
                </View>
                <View style={{ flex: 0.35 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Color
                  </Text>
                  <Dropdown
                    style={styles.dropdown}
                    data={colourData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Color"
                    value={colour}
                    search
                    searchPlaceholder='Search Colors...'
                    inputSearchStyle={styles.inputSearchStyle}
                    renderRightIcon={() => (
                      colour ? (
                        <TouchableOpacity onPress={() => {
                          setColour(null);
                        }}>
                          <CancelBlackIcon />
                        </TouchableOpacity>
                      ) : (
                        <UpArrow />
                      )
                    )}
                    onChange={(item) => setColour(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />

                  {errors.colour && <Text style={styles.errorText}>{errors.colour}</Text>}

                </View>

              </View>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Basic Cost <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter basic cost"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(10) }]}
                    value={basicCost}
                    // onChangeText={setFreeMrp}
                    // onChangeText={(text) => {
                    //   const numericValue = text.replace(/[^0-9]/g, '');
                    //   setBasicCost(numericValue);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     basicCost: null,
                    //   }));
                    // }}
                    onChangeText={handleBasicCostChange}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.basicCost && <Text style={styles.errorText}>{errors.basicCost}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Cost Price <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter cost price"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={costPrice}
                    // onChangeText={(text) => {
                    //   const numericValue = text.replace(/[^0-9]/g, '');
                    //   setCostPrice(numericValue);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     costPrice: null,
                    //   }));
                    // }}
                    onChangeText={handleCostPriceChange}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.costPrice && <Text style={styles.errorText}>{errors.costPrice}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    MRP <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter mrp"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(10) }]}
                    value={mrp}
                    // onChangeText={setFreeMrp}
                    // onChangeText={(text) => {
                    //   const numericValue = text.replace(/[^0-9]/g, '');
                    //   setMrp(numericValue);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     mrp: null,
                    //   }));
                    // }}
                    // MRP onChangeText update:
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      setMrp(numericValue);
                      if (errors.mrp) setErrors(prev => ({ ...prev, mrp: null }));

                      if (marginOn === 'MRP') {
                        // Direct ga 'text' parameter ni target ga use cheyandi
                        setMargin(calculateMargin(costPrice, text));
                      }
                    }}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.mrp && <Text style={styles.errorText}>{errors.mrp}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Sale Price <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter sale price"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={salePrice}
                    // onChangeText={(text) => {
                    //   const numericValue = text.replace(/[^0-9]/g, '');
                    //   setSalePrice(numericValue);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     salePrice: null,
                    //   }));
                    // }}
                    // Sale Price onChangeText update:
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      setSalePrice(numericValue);
                      setErrors(prev => ({ ...prev, salePrice: null }));

                      if (marginOn === 'Sale Price') {
                        // Direct ga 'text' ni target ga use cheyandi
                        setMargin(calculateMargin(costPrice, text));
                      }
                    }}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.salePrice && <Text style={styles.errorText}>{errors.salePrice}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    WS Price <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter WS price"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(20) }]}
                    value={wsPrice}
                    // onChangeText={(text) => {
                    //   const numericValue = text.replace(/[^0-9]/g, '');
                    //   setWSPrice(numericValue);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     wsPrice: null,
                    //   }));
                    // }}
                    // WS Price onChangeText update:
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      setWSPrice(numericValue);
                      setErrors(prev => ({ ...prev, wsPrice: null }));

                      if (marginOn === 'WS Price') {
                        // Direct ga 'text' ni target ga use cheyandi
                        setMargin(calculateMargin(costPrice, text));
                      }
                    }}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.wsPrice && <Text style={styles.errorText}>{errors.wsPrice}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Variant Qty
                  </Text>

                  <TextInput
                    placeholder="Enter Variant Qty"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, styles.disabledInput]}
                    value={variantQty}
                    editable={false}
                    onChangeText={(text) => {
                      setVariantQty(text);
                      setErrors(prev => ({
                        ...prev,
                        variantQty: null,
                      }));
                    }}

                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.variantQty && <Text style={styles.errorText}>{errors.variantQty}</Text>}

                </View>

              </View>
              <View style={styles.firstRowContainer}>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Priority <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter Priority"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, { marginRight: rS(10) }]}
                    value={priority}
                    // onChangeText={setFreeMrp}
                    onChangeText={(text) => {
                      const numericValue = text.replace(/[^0-9]/g, '');
                      setPriority(numericValue);
                      setErrors(prev => ({
                        ...prev,
                        priority: null,
                      }));
                    }}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.priority && <Text style={styles.errorText}>{errors.priority}</Text>}

                </View>
                <View style={{ flex: 0.175 }}>
                  <Text allowFontScaling={false} style={styles.label}>
                    Margin % <Text style={styles.required}>*</Text>
                  </Text>

                  <TextInput
                    placeholder="Enter margin"
                    placeholderTextColor={'#9A9A9A'}
                    style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
                    value={margin}
                    editable={false}
                    // onChangeText={(text) => {
                    //   setMargin(text);
                    //   setErrors(prev => ({
                    //     ...prev,
                    //     margin: null,
                    //   }));
                    // }}
                    maxLength={10}
                    keyboardType='number-pad'
                  />
                  {errors.margin && <Text style={styles.errorText}>{errors.margin}</Text>}

                </View>
                <View style={{
                  flex: 0.35,
                }}>
                  <Text style={styles.radioLabel}>Margin On: <Text style={styles.required}>*</Text></Text>
                  <View style={styles.statusRow}>

                    {/* MRP */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setMarginOn('MRP');
                      }}>

                      {marginOn === 'MRP' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>MRP</Text>
                    </TouchableOpacity>

                    {/* Sale Price */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setMarginOn('Sale Price');
                      }}
                    >

                      {marginOn === 'Sale Price' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>Sale Price</Text>
                      {/* WS Price */}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setMarginOn('WS Price');
                      }}
                    >

                      {marginOn === 'WS Price' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>WS Price</Text>
                    </TouchableOpacity>
                  </View>

                </View>

                <View style={{ flex: 0.35 }}>
                  <Text style={styles.radioLabel}>Variant Status: <Text style={styles.required}>*</Text></Text>
                  <View style={styles.statusRow}>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setVariantStatus('Active');
                      }}>

                      {variantStatus === 'Active' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.radioContainer}
                      onPress={() => {
                        setVariantStatus('In-Active');
                      }}
                    >

                      {variantStatus === 'In-Active' ? <RadioIcon /> : <UnRadioIcon />}

                      <Text style={styles.radioText}>In-Active</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>



              {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
              
    <View style={styles.variantActionContainer}>
      {/* 1. Left Spacer (Empty view to balance the right button) */}
      <View style={styles.flexSide} />

      {/* 2. Middle Group (Back and Save Variant) */}
      <View style={styles.centerGroup}>
        <TouchableOpacity
          style={styles.backTouchable}
          onPress={() => setCurrentStep(1)}
        >
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveTouchable}
          onPress={handleSaveVariant}
        >
          <Text style={styles.saveText}>
            {isEditing ? "Update Variant" : "Save Variant"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Right Group (Save & Next) */}
      <View style={[styles.flexSide, { alignItems: 'flex-end' }]}>
        <TouchableOpacity
          style={styles.saveTouchable}
          onPress={handleSaveNext}
        >
          <Text style={styles.saveText}>Next</Text>
          <NextIcon />
        </TouchableOpacity>
      </View>
    </View>
              {/* <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backTouchable}
                  onPress={() => setCurrentStep(1)}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.backText}>Back</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backTouchable}
                  onPress={handleSaveVariant}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.backText}>
                      {isEditing ? "Update Variant" : "Save Variant"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveTouchable}
                  onPress={handleSaveNext}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                    <Text style={styles.saveText}>Next</Text>
                    <NextIcon />
                    </>
                    
                  )}
                </TouchableOpacity>
              </View> */}

            </View>}
            {currentStep === 3 && <View style={styles.formSubContainer}>
              <Text style={styles.billingControlsText}>BILLING CONTROLS</Text>
              <View>
                {billingControlsData.map((item, index) => (
                  <View
                    key={index}
                    style={[
                      styles.billingRow,
                      index === billingControlsData.length - 1 && {
                        borderBottomWidth: 0,
                      },
                    ]}
                  >
                    {/* Left Side */}
                    <View style={styles.billingItem}>
                      <Text style={styles.billingLabel}>{item.leftLabel}</Text>
                      <Switch
                        value={billingControls[item.leftKey]}
                        onValueChange={(value) =>
                          setBillingControls(prev => ({
                            ...prev,
                            [item.leftKey]: value,
                          }))
                        }
                        trackColor={{ false: '#EFEFEF', true: '#264B79' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {/* Right Side */}
                    <View style={styles.billingItem}>
                      <Text style={styles.billingLabel}>{item.rightLabel}</Text>
                      <Switch
                        value={billingControls[item.rightKey]}
                        onValueChange={(value) =>
                          setBillingControls(prev => ({
                            ...prev,
                            [item.rightKey]: value,
                          }))
                        }
                        trackColor={{ false: '#EFEFEF', true: '#264B79' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                ))}
              </View>
              {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.backTouchable}
                  onPress={() => setCurrentStep(2)}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.backText}>Back</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveTouchable}
                  onPress={handleFinalSubmit}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>

            </View>}
            {currentStep === 2 && variantList.length > 0 && (
              <View style={styles.variantTableContainer}>
                <Text style={styles.allVariantsTitle}>ALL VARIANTS</Text>

                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, { flex: 0.7 }]}>S.No</Text>
                  <Text style={[styles.headerText, { flex: 1.2 }]}>Variant Qty</Text>
                  <Text style={[styles.headerText, { flex: 1.2 }]}>Pack Size</Text>
                  <Text style={[styles.headerText, { flex: 1 }]}>CP</Text>
                  <Text style={[styles.headerText, { flex: 1 }]}>MRP</Text>
                  <Text style={[styles.headerText, { flex: 1 }]}>SP</Text>
                  <Text style={[styles.headerText, { flex: 0.9 }]}>Priority</Text>
                  <Text style={[styles.headerText, { flex: 0.8 }]}>Status</Text>
                  <Text style={[styles.headerText, { flex: 0.8, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {variantList.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.rowText, { flex: 0.7 }]}>{index + 1}</Text>
                    <Text style={[styles.rowText, { flex: 1.2 }]}>{item.variantQty}</Text>
                    <Text style={[styles.rowText, { flex: 1.2 }]}>{item.packSize}</Text>
                    <Text style={[styles.rowText, { flex: 1 }]}>₹{item.costPrice}</Text>
                    <Text style={[styles.rowText, { flex: 1 }]}>₹{item.mrp}</Text>
                    <Text style={[styles.rowText, { flex: 1 }]}>₹{item.salePrice}</Text>
                    <Text style={[styles.rowText, { flex: 0.8 }]}>{item.priority}</Text>
                    <Text style={[styles.rowText, { flex: 0.8 }]}> {item.status === 1 ? 'Active' : 'In-Active'}</Text>
                    <TouchableOpacity
                      style={{ flex: 0.8, alignItems: 'center' }}
                      onPress={() => handleEditVariant(item, index)}
                    >
                      <EditIcon />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </KeyboardAwareScrollView>
        </View>

      </View>

    </SafeAreaView>
  )
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
  },

  productRowContainer: {
    flexDirection: 'row',
    marginTop: rV(10),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productText: {
    color: '#000000',
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 22,
  },
  productSubText: {
    color: '#919191',
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    marginTop: rV(2),
  },
  newProductTouchable: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
  },
  addNewProductText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    marginBottom: rV(10),
  },
  bulkUploadTouchable: {
    flexDirection: 'row',
    backgroundColor: '#264B79',
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
  },
  bulkUploadText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#FFFFFF',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: rV(14),
    flex: 1,
    // marginBottom: rV(50),
  },
  stepperMainContainer: { marginTop: rV(20), paddingHorizontal: rS(20), alignItems: 'center' },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', zIndex: 2 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepLine: {
    position: 'absolute',
    top: rV(30),
    height: 1,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9E9E9',
  },
  stepLabel: { fontSize: 14, fontFamily: Fonts.FigtreeMedium, color: '#264B79', marginBottom: rV(8), textAlign: 'center' },
  formSubContainer: {
    marginHorizontal: rS(14),
    marginVertical: rV(16),
  },
  basicDetailsText: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    textTransform: 'uppercase',
    color: '#264B79',
    marginBottom: rV(10)
  },
  billingControlsText: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    textTransform: 'uppercase',
    color: '#264B79',
    // marginBottom: rV(10)
  },
  firstRowContainer: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    marginBottom: rV(5),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  radioLabel: {
    fontSize: 14,
    marginBottom: rV(10),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  required: {
    color: '#E71414',
  },
  input: {
    height: rV(28),
    borderColor: '#C0C0C0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: rS(10),
    fontSize: 16,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    backgroundColor: '#FFFFFF',
    marginBottom: rV(10)
  },
  disabledInput: {
    backgroundColor: '#F2F0EF',
  },
  dropdown: {
    height: rV(28),
    borderColor: '#C0C0C0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: rS(10),
    fontSize: 16,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    backgroundColor: '#FFFFFF',
    marginBottom: rV(10)
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
  inputSearchStyle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  variantActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: rV(20),
    width: '100%',
  },
  flexSide: {
    flex: 1, // This ensures the left and right sections take equal space
  },
   centerGroup: {
    flexDirection: 'row',
    gap: rS(10),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backTouchable: {
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: rV(8),
    width: rS(70),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rV(10),
    marginBottom: rV(10),
    marginLeft: rS(8),
  },
  saveTouchable: {
    backgroundColor: '#264B79',
    borderRadius: 8,
    paddingVertical: rV(8),
    width: rS(70),
    justifyContent: 'center',
    flexDirection:'row',
    alignItems: 'center',
    marginTop: rV(10),
    marginBottom: rV(10),
    marginLeft: rS(8),
  },
  basicSaveTouchable: {
    backgroundColor: '#264B79',
    borderRadius: 8,
    paddingVertical: rV(8),
    width: rS(70),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection:'row',
    marginTop: rV(10),
    marginBottom: rV(10),
    // marginLeft: rS(8),
  },
  backText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    textAlign: 'center',
  },
  saveText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#FFFFFF',
    marginRight:rS(3),
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#838383',
    fontFamily: Fonts.FigtreeRegular,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: rS(6),
  },
  radioText: {
    marginLeft: rS(6),
    fontSize: 16,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  imageUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageInputContainer: {
    flex: 1,
    height: rV(28),
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 8,
    paddingHorizontal: rS(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginBottom: rV(10)
  },
  imageNameText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
    marginRight: rS(10),
  },
  previewImage: {
    width: rS(28),
    height: rV(28),
    borderRadius: 6,
    marginLeft: rS(10),
    resizeMode: 'cover',
    marginBottom: rV(10)
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDDDDD',
    paddingVertical: rV(10),
  },

  billingItem: {
    width: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  billingLabel: {
    flex: 1,
    fontSize: 15,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
  },
  variantTableContainer: {
    borderRadius: 8,
    marginHorizontal: rS(14),
  },
  allVariantsTitle: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
    marginBottom: rV(10),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    paddingHorizontal: rS(5),
    borderRadius: 8,
  },
  headerText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: rV(10),
    paddingHorizontal: rS(5),
    // borderBottomWidth: 1,
    // borderBottomColor: '#E1E9F4',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
  },
});
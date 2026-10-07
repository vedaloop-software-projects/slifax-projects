import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import PlusIcon from '../assets/Icons/PlusIcon';
import BulkUpload from '../assets/Icons/BulkUpload';
import ExportIcon from '../assets/Icons/ExportIcon';
import SearchIcon from '../assets/Icons/SearchIcon';
import EditIcon from '../assets/Icons/EditIcon';
import AddNewGroupWiseDiscountModal from '../components/AddNewGroupWiseDiscountModal';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';

import PageLeftIcon from '../assets/Icons/PageLeftIcon';
import PageBackIcon from '../assets/Icons/PageBackIcon';
import PageNextIcon from '../assets/Icons/PageNextIcon';
import PageRightIcon from '../assets/Icons/PageRightIcon';
import { rS, rV } from '../constants/responsive';
import { Dropdown } from 'react-native-element-dropdown';
import EyeIcon from '../assets/Icons/EyeIcon';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ViewProductVariantsModal from '../components/ViewProductVariantsModal';
import Toast from 'react-native-toast-message';

export default function ProductScreen() {
  // const [isAddNewGroupWiseDiscountVisible, setIsAddNewGroupWiseDiscountVisible] = useState(false);
  const { postMethod } = HelperModule();

  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [groupType, setGroupType] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupNameData, setGroupNameData] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [productList, setProductList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [selectedProductData, setSelectedProductData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const user = useSelector(state => state.auth.user);

  const businessTypeId = user?.businessTypeId;

  console.log('BUSINESS TYPE ID ===>', businessTypeId);

  const getCategories = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(
        ApiServices.zenxposGetCategories,
        payload,
      );
      if (response?.success) {
        const formattedCategories = response?.data?.categories?.map(item => ({
          label: item.categoryName,
          value: item.id,
        }));
        setGroupNameData(formattedCategories || []);
      }
    } catch (error) {
      console.log('GET CATEGORIES ERROR =====>', error);
    }
  };

  const getSubCategories = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '', categoryId: '' };
      const response = await postMethod(
        ApiServices.zenxposGetSubCategories,
        payload,
      );
      if (response?.success) {
        const formattedCategories = response?.data?.subCategories?.map(
          item => ({
            label: item.subCategoryName,
            value: item.id,
          }),
        );
        setGroupNameData(formattedCategories || []);
      }
    } catch (error) {
      console.log('GET SUB-CATEGORIES ERROR =====>', error);
    }
  };

  const getBrands = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(ApiServices.zenxposGetBrands, payload);
      if (response?.success) {
        const formattedBrands = response?.data?.brands?.map(item => ({
          label: item.brandName,
          value: item.id,
        }));
        setGroupNameData(formattedBrands || []);
      }
    } catch (error) {
      console.log('GET BRANDS ERROR =====>', error);
    }
  };

  const getColours = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(ApiServices.zenxposGetColours, payload);
      if (response?.success) {
        const formattedColours = response?.data?.colours?.map(item => ({
          label: item.colourName,
          value: item.id,
        }));
        setGroupNameData(formattedColours || []);
      }
    } catch (error) {
      console.log('GET COLOURS ERROR =====>', error);
    }
  };

  const getSizes = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(ApiServices.zenxposGetSizes, payload);
      if (response?.success) {
        const formattedSizes = response?.data?.sizes?.map(item => ({
          label: item.sizeName,
          value: item.id,
        }));
        setGroupNameData(formattedSizes || []);
      }
    } catch (error) {
      console.log('GET SIZES ERROR =====>', error);
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    setGroupType('');
    setGroupId('');
    setGroupNameData([]);
    getProducts(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, []),
  );

  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Status', value: '' },
  ];

  const groupTypeData = [
    { label: 'Category', value: '1' },
    { label: 'Sub-Category', value: '2' },
    { label: 'Brand', value: '3' },
    { label: 'Colour', value: '4' },
    { label: 'Size', value: '5' },
  ];

  useEffect(() => {
    getProducts(1);
  }, []);

  const getProducts = async (pageNumber = 1) => {
    try {
      const activePage = typeof pageNumber === 'number' ? pageNumber : 1;
      setLoading(true);
      setCurrentPage(activePage);

      const payload = {
        searchStr: searchText,
        categoryId: groupType === '1' ? groupId : '',
        subCategoryId: groupType === '2' ? groupId : '',
        brandId: groupType === '3' ? groupId : '',
        colourId: groupType === '4' ? groupId : '',
        sizeId: groupType === '5' ? groupId : '',
        taxId: '',
        status: status,
        page: activePage,
      };

      console.log('GET PRODUCTS PAYLOAD =====>', payload);
      const response = await postMethod(
        ApiServices.zenxposGetProducts,
        payload,
      );
      console.log('GET PRODUCTS RESPONSE =====>', response);

      if (response?.success) {
        setProductList(response?.data?.products || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log('GET PRODUCTS ERROR =====>', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async id => {
    try {
      setLoading(true);
      const payload = { productId: id };
      const response = await postMethod(
        ApiServices.zenxposGetProductByID,
        payload,
      );

      console.log(':::::::: product id::::::', response);

      if (response?.success) {
        navigation.navigate('NewProductScreen', { editData: response.data });
        // setIsAddNewGroupWiseDiscountVisible(true);
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Failed to fetch product details',
        );
      }
    } catch (error) {
      console.log('GET PRODUCT BY ID ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  // const handleView = (id) => {
  //   console.log('View product details for ID:', id);
  // };

  const getGroupNamePlaceholder = () => {
    switch (groupType) {
      case '1':
        return 'Category';
      case '2':
        return 'Sub-Category';
      case '3':
        return 'Brand';
      case '4':
        return 'Colour';
      case '5':
        return 'Size';
      default:
        return 'Filter Type';
    }
  };

  const handleView = async id => {
    try {
      // setLoading(true);
      const payload = { productId: id };
      const response = await postMethod(
        ApiServices.zenxposGetProductByID,
        payload,
      );

      if (response?.success) {
        setSelectedProductData(response.data); // Store full data including variants
        setIsViewModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to fetch details');
      }
    } catch (error) {
      console.log('VIEW ERROR:', error);
    }
    // finally {
    //   setLoading(false);
    // }
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
        onPress={() => getProducts(1)}
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
        onPress={() => getProducts(currentPage - 1)}
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
            onPress={() => getProducts(page)}
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
        onPress={() => getProducts(currentPage + 1)}
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
        onPress={() => getProducts(lastPage)}
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
        {/* S.No */}
        <Text style={[styles.rowText, { width: '7%' }]}>{serialNumber}</Text>

        {/* Product Code & EAN */}
        <View style={{ width: '15%', alignItems: 'flex-start' }}>
          <Text style={styles.productCodeText}>{item.productCode}</Text>
          <Text style={styles.subText}>{item.eanCode}</Text>
        </View>

        {/* Product Name & Category */}
        <View style={{ width: '20%', alignItems: 'flex-start' }}>
          <Text style={styles.productCodeText}>{item.productFullName}</Text>
          <Text style={styles.subText}>{item.categoryName}</Text>
        </View>

        {/* GST % & HSN */}
        <View style={{ width: '13%', alignItems: 'flex-start' }}>
          <Text style={styles.productCodeText}>{item.taxName}</Text>
          <Text style={styles.subText}>{`HSN ${item.hsnCode}`}</Text>
        </View>

        {/* QOH */}
        <Text style={[styles.rowText, { width: '12%', textAlign: 'left' }]}>
          {item.qoh}
        </Text>

        {/* Price & MRP */}
        <View style={{ width: '11%', alignItems: 'flex-start' }}>
          <Text style={styles.productCodeText}>₹{item.salePrice}</Text>
          <Text style={styles.subText}>MRP: ₹{item.mrp}</Text>
        </View>

        {/* Status Badge */}
        <View
          style={{
            width: '11%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor: item.status === 0 ? '#C21414' : '#264B79',
              },
            ]}
          >
            <Text style={styles.statusText}>
              {item.status === 1 ? 'Active' : 'In-Active'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View
          style={{
            width: '11%',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: rS(10),
          }}
        >
          <TouchableOpacity onPress={() => handleEdit(item.productId)}>
            <EditIcon />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleView(item.productId)}>
            <EyeIcon />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        {/* Top Header */}
        <View style={styles.categoryRowContainer}>
          <View>
            <Text style={styles.categoryText}>Products</Text>
            <Text style={styles.categorySubText}>
              Create or Manage Products
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: rS(8) }}>
            <TouchableOpacity
              style={styles.bulkUploadTouchable}
              onPress={() => {
                navigation.navigate('BulkUploadScreen');
              }}
            >
              <BulkUpload />
              <Text style={styles.bulkUploadText}>Bulk Upload</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newCategoryTouchable}
              onPress={() => {
                setSelectedProduct(null);
                navigation.navigate('NewProductScreen');
                // setIsAddNewGroupWiseDiscountVisible(true);
              }}
            >
              <PlusIcon />
              <Text style={styles.addNewCategoryText}>Add New Product</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Product Name"
              placeholderTextColor={'#919191'}
              value={searchText}
              onChangeText={text => setSearchText(text)}
            />

            <Dropdown
              style={styles.dropdown}
              data={groupTypeData}
              labelField="label"
              valueField="value"
              placeholder="Filter"
              value={groupType}
              search
              searchPlaceholder="Search Filter...."
              onChange={item => {
                setGroupType(item.value);
                setGroupId('');
                setGroupNameData([]);

                if (item.value === '1') {
                  getCategories();
                } else if (item.value === '2') {
                  getSubCategories();
                } else if (item.value === '3') {
                  getBrands();
                } else if (item.value === '4') {
                  getColours();
                } else if (item.value === '5') {
                  getSizes();
                }
              }}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconColor="#1B1B1B"
            />

            <Dropdown
              style={styles.dropdown}
              data={groupNameData}
              labelField="label"
              valueField="value"
              placeholder={getGroupNamePlaceholder()}
              value={groupId}
              search
              searchPlaceholder="Search Filter Type...."
              onFocus={() => {
                if (!groupType) {
                  Toast.show({
                    type: 'error',
                    text1: 'Please select filter',
                    position: 'top',
                    visibilityTime: 2000,
                  });
                }
              }}
              onChange={item => setGroupId(item.value)}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconColor="#1B1B1B"
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
              onPress={() => getProducts(1)}
            >
              <SearchIcon />
            </TouchableOpacity>

            {/* <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <RefreshIcon />
            </TouchableOpacity> */}
          </View>

          <TouchableOpacity style={styles.exportContainer}>
            <ExportIcon />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Table */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: '7%' }]}>S.No</Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Product Code
            </Text>
            <Text style={[styles.headerText, { width: '20%' }]}>
              Product Name
            </Text>
            <Text style={[styles.headerText, { width: '13%' }]}>GST %</Text>
            <Text style={[styles.headerText, { width: '12%' }]}>QOH</Text>
            <Text style={[styles.headerText, { width: '11%' }]}>Price</Text>
            <Text
              style={[styles.headerText, { width: '11%', textAlign: 'center' }]}
            >
              Status
            </Text>
            <Text
              style={[styles.headerText, { width: '11%', textAlign: 'center' }]}
            >
              Actions
            </Text>
          </View>

          {/* Table Rows */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#264B79"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <FlatList
              data={productList}
              keyExtractor={item => item.productId.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>No Products Found</Text>
              )}
            />
          )}
        </View>

        {/* Pagination */}
        <View style={styles.paginationSection}>{renderPagination()}</View>
      </View>

      {/* <AddNewGroupWiseDiscountModal
        isVisible={isAddNewGroupWiseDiscountVisible}
        onClose={() => {
          setSelectedProduct(null);
          setIsAddNewGroupWiseDiscountVisible(false);
        }}
        onSuccess={getProducts}
        editData={selectedProduct}
      /> */}
      <ViewProductVariantsModal
        isVisible={isViewModalVisible}
        onClose={() => setIsViewModalVisible(false)}
        productData={selectedProductData}
      />
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
  },
  categoryRowContainer: {
    flexDirection: 'row',
    marginTop: rV(10),
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    color: '#000000',
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 22,
  },
  categorySubText: {
    color: '#919191',
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    marginTop: rV(2),
  },
  newCategoryTouchable: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
  },
  addNewCategoryText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
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
  filterMainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: rV(10),
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
    marginRight: rS(6),
  },
  dropdown: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    width: rS(70),
    marginRight: rS(6),
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
  searchButton: {
    width: rS(28),
    height: rV(27),
    backgroundColor: '#264B79',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: rS(6),
  },
  resetButton: {
    width: rS(28),
    height: rV(27),
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
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
    textAlign: 'left',
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
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'left',
  },
  productCodeText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    fontWeight: '500',
  },
  subText: {
    fontSize: 12,
    color: '#9A9A9A',
    fontFamily: Fonts.FigtreeRegular,
    marginTop: rV(2),
  },
  // statusContainer: {
  //   borderRadius: 15,
  //   paddingVertical: rV(3),
  //   paddingHorizontal: rS(12),
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   minWidth: rS(65),
  // },
  // statusText: {
  //   color: '#FFFFFF',
  //   fontSize: 12,
  //   fontFamily: Fonts.FigtreeMedium,
  // },
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
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    color: '#919191',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },
  paginationSection: {
    paddingTop: rV(10),
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
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
});

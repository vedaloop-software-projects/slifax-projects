import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import PlusIcon from '../assets/Icons/PlusIcon';
import ExportIcon from '../assets/Icons/ExportIcon';
import SearchIcon from '../assets/Icons/SearchIcon';

import { rS, rV } from '../constants/responsive';
import { Dropdown } from 'react-native-element-dropdown';
import EditIcon from '../assets/Icons/EditIcon'
import AddNewGroupWiseDiscountModal from '../components/AddNewGroupWiseDiscountModal'
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import { useFocusEffect } from '@react-navigation/native';

export default function GroupWiseDiscountScreen() {
  const [isAddNewGroupWiseDiscountVisible, setIsAddNewGroupWiseDiscountVisible] = useState(false);
  const { postMethod } = HelperModule();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [groupType, setGroupType] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groupNameData, setGroupNameData] = useState([])
  const [selectedGroupWiseDiscount, setSelectedGroupWiseDiscount] = useState(null);
  const [groupWiseDiscountList, setGroupWiseDiscountList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

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
        setGroupNameData(formattedCategories || []);
      }
    } catch (error) {
      console.log('GET CATEGORIES ERROR =====>', error);
    }
  };
  const getSubCategories = async () => {
    try {
      const payload = {
        searchStr: '',
        status: 1,
        page: '',
        categoryId: "",
      };
      console.log('GET SUB-CATEGORIES PAYLOAD =====>', payload);
      const response = await postMethod(
        ApiServices.zenxposGetSubCategories,
        payload,
      );
      console.log('GET SUB-CATEGORIES RESPONSE =====>', response);
      if (response?.success) {
        const formattedCategories = response?.data?.subCategories?.map(item => ({
          label: item.subCategoryName,
          value: item.id,
        }));
        setGroupNameData(formattedCategories || []);
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
        setGroupNameData(formattedBrands || []);
      }
    } catch (error) {
      console.log('GET BRANDS ERROR =====>', error);
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
        setGroupNameData(formattedColours || []);
      }
    } catch (error) {
      console.log('GET COLOURS ERROR =====>', error);
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
        setGroupNameData(formattedSizes || []);
      }
    } catch (error) {
      console.log('GET SIZES ERROR =====>', error);
    }
  };

  useEffect(() => {
    getCategories()
    getSubCategories()
    getBrands()
    getColours()
    getSizes()
  }, [])
  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    setGroupType('')
    setGroupId('')
    getGroupWiseDiscounts(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, [])
  );

  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Status', value: '' }
  ];

  const groupTypeData = [
    { label: 'Category', value: '1' },
    { label: 'Sub-Category', value: '2' },
    { label: 'Brand', value: '3' },
    { label: 'Colour', value: '4' },
    { label: 'Size', value: '5' },
    { label: 'Group Type', value: '' }
  ];

  useEffect(() => {
    getGroupWiseDiscounts(1);
  }, []);

  const getGroupWiseDiscounts = async (pageNumber = 1) => {
    try {
      const activePage = typeof pageNumber === 'number' ? pageNumber : 1;

      setLoading(true);
      setCurrentPage(activePage);
      const payload = {
        // searchStr: searchText,
        status: status,
        page: activePage,
        groupType: groupType,
        groupId: groupId
      };
      console.log('GET GROUP WISE DISCOUNTS PAYLOAD =====>', payload);
      const response = await postMethod(
        ApiServices.zenxposGetGroupWiseDiscounts, payload
      );
      console.log('GET GROUP WISE DISCOUNTS RESPONSE =====>', response);
      if (response?.success) {
        setGroupWiseDiscountList(response?.data?.groupWiseDiscounts || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log('GET GROUP WISE DISCOUNTS ERROR =====>', error.message || error);
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const payload = { id: id };
      const response = await postMethod(ApiServices.zenxposGetGroupWiseDiscountById, payload);
      if (response?.success) {
        setSelectedGroupWiseDiscount(response.data);
        setIsAddNewGroupWiseDiscountVisible(true);
      }
    } catch (error) {
      console.log('GET GROUP WISE DISCOUNT BY ID ERROR:', error);
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
        onPress={() => getGroupWiseDiscounts(1)}
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
        onPress={() => getGroupWiseDiscounts(currentPage - 1)}
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
            onPress={() => getGroupWiseDiscounts(page)}
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
        onPress={() => getGroupWiseDiscounts(currentPage + 1)}
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
        onPress={() => getGroupWiseDiscounts(lastPage)}
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
        <Text style={[styles.rowText, { width: '10%' }]}>
          {serialNumber}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.groupTypeName}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.groupName}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.discount}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.toDate}
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
          }} onPress={() => handleEdit(item.id)}>
          <EditIcon />
        </TouchableOpacity>
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
            <Text style={styles.categoryText}>Group-wise Discounts</Text>
            <Text style={styles.categorySubText}>
              Create or Manage Group-wise Discounts
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newCategoryTouchable}
            onPress={() => {
              setSelectedGroupWiseDiscount(null);
              setIsAddNewGroupWiseDiscountVisible(true);
            }}>
            <PlusIcon />
            <Text style={styles.addNewCategoryText}>
              Add New
            </Text>
          </TouchableOpacity>
        </View>
        {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <Dropdown
              style={styles.dropdown}
              data={groupTypeData}
              labelField="label"
              valueField="value"
              placeholder="Group Type"
              value={groupType}
              search
              searchPlaceholder='Search Group Type...'
              onChange={item => {
                setGroupType(item.value);
                setGroupId('');
                setGroupNameData([])
                if (item.value === '1') {
                  getCategories();
                }
                if (item.value === '2') {
                  getSubCategories()
                }
                if (item.value === '3') {
                  getBrands()
                }
                if (item.value === '4') {
                  getColours()
                }
              }}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconColor='#1B1B1B'
            />
            <Dropdown
              style={styles.dropdown}
              data={groupNameData}
              labelField="label"
              valueField="value"
              placeholder="Group Name"
              value={groupId}
              search
              searchPlaceholder='Search Group Name...'
              onChange={item => setGroupId(item.value)}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconColor='#1B1B1B'
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
              itemTextStyle={styles.itemTextStyles}
              iconColor='#1B1B1B'
            />
            <TouchableOpacity style={styles.searchButton} onPress={getGroupWiseDiscounts}>
              <SearchIcon />
            </TouchableOpacity>
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
            <Text style={[styles.headerText, { width: '10%' }]}>
              S.No
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Group Type
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Group Name
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Discount %
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Expires on
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Status
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
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
              data={groupWiseDiscountList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  No Group-wise Discounts Found
                </Text>
              )}
            />
          )}
        </View>
        {/* Pagination */}
        <View style={styles.paginationSection}>
          {renderPagination()}
        </View>
      </View>
      <AddNewGroupWiseDiscountModal
        isVisible={isAddNewGroupWiseDiscountVisible}
        onClose={() => {
          setSelectedGroupWiseDiscount(null);
          setIsAddNewGroupWiseDiscountVisible(false);
        }
        }
        onSuccess={getGroupWiseDiscounts}
        editData={selectedGroupWiseDiscount}
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
  },
  addNewCategoryText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
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
    // marginLeft: rS(6),
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
  paginationContainer: {
    marginTop: rV(10),
    alignItems: 'flex-end',
  },
  pageText: {
    fontSize: 13,
    color: '#666666',
    fontFamily: Fonts.FigtreeRegular,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    color: '#919191',
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: rV(4),
    // marginBottom: rV(5),
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
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import PlusIcon from '../assets/Icons/PlusIcon';
import ExportIcon from '../assets/Icons/ExportIcon';
import SearchIcon from '../assets/Icons/SearchIcon';
import { rS, rV } from '../constants/responsive';
import { Dropdown } from 'react-native-element-dropdown';
import EditIcon from '../assets/Icons/EditIcon';
import AddNewCouponModal from '../components/AddNewCouponModal';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalenderIcon from '../assets/Icons/CalenderIcon'
import colors from '../constants/colors';

export default function CouponScreen() {
  const [isAddNewCouponVisible, setIsAddNewCouponVisible] = useState(false);
  const { postMethod } = HelperModule();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponList, setCouponList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());

  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    setFromDate('')
    setToDate('')
    getCoupons(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, [])
  );


  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Both', value: '' }
  ];

  useEffect(() => {
    getCoupons(1);
  }, []);

   const formatDate = date => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    };
  
    const convertStringToDate = dateString => {
      if (!dateString) {
        return new Date();
      }
      const [day, month, year] = dateString.split('-');
      return new Date(year, month - 1, day);
    };
  
    const handleFromDateChange = (event, selectedDate) => {
      if (Platform.OS === 'android') {
        setShowFromDatePicker(false);
        if (selectedDate) {
          setFromDate(formatDate(selectedDate));
        }
      } else {
        if (selectedDate) {
          setTempFromDate(selectedDate);
        }
      }
    };

     const handleToDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
          setShowToDatePicker(false);
          if (selectedDate) {
            setToDate(formatDate(selectedDate));
          }
        } else {
          if (selectedDate) {
            setTempToDate(selectedDate);
          }
        }
      };

  const getCoupons = async (pageNumber = 1) => {
    try {
      const activePage = typeof pageNumber === 'number' ? pageNumber : 1;
      setLoading(true);
      setCurrentPage(activePage);
      const payload = {
        searchStr: searchText,
        status: status,
        page: activePage,
        fromDate,
        toDate,
      };
      console.log('GET COUPONS PAYLOAD =====>', payload);
      const response = await postMethod(
        ApiServices.zenxposGetCoupons, payload
      );
      console.log('GET COUPONS RESPONSE =====>', response);
      if (response?.success) {
        setCouponList(response?.data?.coupons || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log('GET COUPONS ERROR =====>', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const payload = { id: id };
      const response = await postMethod(ApiServices.zenxposGetCouponById, payload);
      console.log(":::: coupon by id response:::", response)
      if (response?.success) {
        setSelectedCoupon(response.data);
        setIsAddNewCouponVisible(true);
      }
    } catch (error) {
      console.log('GET COUPON BY ID ERROR:', error);
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
        onPress={() => getCoupons(1)}
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
        onPress={() => getCoupons(currentPage - 1)}
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
            onPress={() => getCoupons(page)}
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
        onPress={() => getCoupons(currentPage + 1)}
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
        onPress={() => getCoupons(lastPage)}
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
        <Text style={[styles.rowText, { width: '10%' }]}>
          {item.couponCode}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.couponName}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.minAmount}
        </Text>
        <Text style={[styles.rowText, { width: '10%' }]}>
          {Number(item.discountPercentage) > 0
            ? `${Number(item.discountPercentage)} %`
            : `₹ ${parseFloat(item.discountValue)}`}
        </Text>
        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.toDate}
        </Text>
        <View
          style={{
            width: '14%',
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
            width: '11%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleEdit(item.id)}>
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
            <Text style={styles.categoryText}>Coupons</Text>
            <Text style={styles.categorySubText}>
              Create or Manage Coupons
            </Text>
          </View>
          <TouchableOpacity
            style={styles.newCategoryTouchable}
            onPress={() => {
              setSelectedCoupon(null);
              setIsAddNewCouponVisible(true);
            }}
          >
            <PlusIcon />
            <Text style={styles.addNewCategoryText}>
              New Coupon
            </Text>
          </TouchableOpacity>
        </View>
        {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Coupon Name"
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
                activeOpacity={0.8}
                style={[
                  styles.input,
                  {
                    // marginRight: rS(12),
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                ]}
                onPress={() => {
                  setTempFromDate(convertStringToDate(fromDate));
                  setShowFromDatePicker(true);
                }}>
                <Text
                  style={{
                    color: fromDate ? '#000' : '#9A9A9A',
                    fontFamily: Fonts.FigtreeRegular,
                  }}>
                  {fromDate || 'From Date'}
                </Text>
                <CalenderIcon />
              </TouchableOpacity>
                <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.input, {
                  // marginRight: rS(12),
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                },]}
                onPress={() => {
                  setTempToDate(convertStringToDate(toDate));
                  setShowToDatePicker(true);
                }}>
                <Text
                  style={{
                    color: toDate ? '#000' : '#9A9A9A',
                    fontFamily: Fonts.FigtreeRegular,
                  }}>
                  {toDate || 'To Date'}
                </Text>
                <CalenderIcon />
              </TouchableOpacity>

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
                  minimumDate={
                    fromDate
                      ? convertStringToDate(fromDate)
                      : undefined
                  }
                  onChange={handleToDateChange}
                />
              )}
              <Modal
                visible={Platform.OS === 'ios' && showFromDatePicker}
                transparent
                animationType="slide">
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                  }}>
                  <View
                    style={{
                      backgroundColor: '#fff',
                      paddingBottom: 30,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                      }}>
                      <TouchableOpacity
                        onPress={() => setShowFromDatePicker(false)}>
                        <Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setFromDate(formatDate(tempFromDate));
                          setShowFromDatePicker(false);
                        }}>
                        <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>
                          Done
                        </Text>
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
              <Modal
                visible={Platform.OS === 'ios' && showToDatePicker}
                transparent
                animationType="slide">
                <View
                  style={{
                    flex: 1,
                    justifyContent: 'flex-end',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                  }}>
                  <View
                    style={{
                      backgroundColor: '#fff',
                      paddingBottom: 30,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: '#eee',
                      }}>
                      <TouchableOpacity
                        onPress={() => setShowToDatePicker(false)}>
                        <Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setToDate(formatDate(tempToDate));
                          setShowToDatePicker(false);
                        }}>
                        <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempToDate}
                      mode="date"
                      display="spinner"
                      onChange={handleToDateChange}
                    />
                  </View>
                </View>
              </Modal>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={getCoupons}>
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
          {/* Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: '10%' }]}>
              S.No
            </Text>
            <Text style={[styles.headerText, { width: '10%' }]}>
              Coupon Code
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Coupon Name
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Bill Amount
            </Text>
            <Text style={[styles.headerText, { width: '10%' }]}>
              Discount
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Expire on
            </Text>
            <Text style={[styles.headerText, { width: '15%' }]}>
              Status
            </Text>
            <Text style={[styles.headerText, { width: '10%' }]}>
              Actions
            </Text>
          </View>
          {/* Loader */}
          {loading ? (
            <ActivityIndicator
              size="large"
              color="#264B79"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <FlatList
              data={couponList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  No Coupons Found
                </Text>
              )}
            />
          )}
        </View>
        {/* Pagination */}
        {/* <View style={styles.paginationContainer}>
          <Text style={styles.pageText}>
            Page {pagination?.currentPage || 1} of{' '}
            {pagination?.lastPage || 1}
          </Text>
        </View> */}
        <View style={styles.paginationSection}>
          {renderPagination()}
        </View>
      </View>
      <AddNewCouponModal
        isVisible={isAddNewCouponVisible}
        onClose={() => {
          setSelectedCoupon(null);
          setIsAddNewCouponVisible(false);
        }
        }
        onSuccess={getCoupons}
        editData={selectedCoupon}
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
    input: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    // marginHorizontal: rS(14),
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    width: rS(67),
    marginLeft: rS(6),
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

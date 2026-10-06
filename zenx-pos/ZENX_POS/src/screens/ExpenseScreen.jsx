import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, TextInput, ScrollView, FlatList, ActivityIndicator, Alert } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import CustomHeader from '../components/CustomHeader'
import { SafeAreaView } from 'react-native-safe-area-context'
import { rS, rV } from '../constants/responsive'
import Fonts from '../constants/Fonts'
import { Dropdown } from 'react-native-element-dropdown'
import ExportIcon from '../assets/Icons/ExportIcon';
import ApiServices from '../helper/ApiServices'
import { HelperModule } from '../helper/HelperModule'
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../constants/colors'
import CalenderIcon from '../assets/Icons/CalenderIcon'
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import SearchIcon from '../assets/Icons/SearchIcon';
import { useFocusEffect } from '@react-navigation/native'
import CancelIcon from '../assets/Icons/CancelIcon'
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export default function ExpenseScreen() {
  const [filterExpenseType, setFilterExpenseType] = useState('');
  const [filterExpenseHead, setFilterExpenseHead] = useState(null);
  const [expenseType, setExpenseType] = useState('')
  const [expenseHead, setExpenseHead] = useState(null)
  const [expenseHeadData, setExpenseHeadData] = useState([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [date, setDate] = useState('')
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempFromDate, setTempFromDate] = useState(new Date());
  const [tempToDate, setTempToDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date())
  const [amount, setAmount] = useState('')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState({});
  const [expenseList, setExpenseList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);


  const [status, setStatus] = useState('');
  const { postMethod } = HelperModule()

  const expenseTypeData = [
    { label: 'In', value: '1' },
    { label: 'Out', value: '2' },
  ];

  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'Cancelled', value: '0' },
    { label: 'Both', value: '' }
  ];

  const resetFilters = () => {
    setFilterExpenseHead(null);
    setFilterExpenseType('');
    setFromDate('');
    setToDate('');
    setStatus('');
    setCurrentPage(1);
  };

  useFocusEffect(
    useCallback(() => {
      resetFilters();
    }, [])
  );


  // useEffect(() => {
  //   getExpensesHead()
  //   getExpenses(1);
  // }, [])

  useFocusEffect(
    useCallback(() => {
      getExpensesHead()
      getExpenses(1);
    }, [])
  );

  const getExpensesHead = async () => {
    try {
      const payload = { searchStr: '', status: 1, page: '' };
      const response = await postMethod(ApiServices.zenxposGetExpenseHeads, payload);
      if (response?.success) {
        const formattedExpensesHead = response?.data?.expenseHeads?.map(item => ({
          label: item.expenseHead,
          value: item.id,
        }));
        setExpenseHeadData(formattedExpensesHead || []);
      }
    } catch (error) {
      console.log('GET EXPENSES HEAD ERROR =====>', error);
    }
  };

  const getExpenses = async (pageNumber = 1) => {
    try {
      const activePage =
        typeof pageNumber === 'number' ? pageNumber : 1;

      setLoading(true);
      setCurrentPage(activePage);

      const payload = {
        fromDate,
        toDate,
        expenseHeadId: filterExpenseHead || '',
        expenseType: filterExpenseType || '',
        status: status,
        page: activePage,
      };

      console.log('GET EXPENSES PAYLOAD', payload);

      const response = await postMethod(
        ApiServices.zenxposGetExpense,
        payload,
      );

      console.log(response);

      if (response?.success) {
        setExpenseList(response?.data?.expenses || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelExpense = (id) => {
    Alert.alert(
      'Cancel Expense',
      'Are you sure you want to cancel the expense entry?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => handleCancelExpense(id),
        },
      ],
      {
        cancelable: true,
      },
    );
  };

  const handleCancelExpense = async (id) => {
    try {
      setLoading(true);

      const payload = {
        id,
      };

      console.log('CANCEL EXPENSE PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposCancelExpense,
        payload,
      );

      console.log('CANCEL EXPENSE RESPONSE =====>', response);

      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message,
        });

        getExpenses(currentPage);
      }
    } catch (error) {
      console.log('CANCEL EXPENSE ERROR =====>', error);

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2:
          error?.response?.data?.message ||
          'Failed to cancel expense.',
      });
    } finally {
      setLoading(false);
    }
  };

  // const handleCancelExpense = async (id) => {
  //   try {
  //     setLoading(true);

  //     const payload = {
  //       id,
  //     };

  //     console.log('CANCEL EXPENSE PAYLOAD =====>', payload);

  //     const response = await postMethod(
  //       ApiServices.zenxposCancelExpense,
  //       payload,
  //     );

  //     console.log('CANCEL EXPENSE RESPONSE =====>', response);

  //     if (response?.success) {
  //       // alert(response.message);

  //       // Refresh current page
  //       getExpenses(currentPage);
  //     }
  //   } catch (error) {
  //     console.log('CANCEL EXPENSE ERROR =====>', error);
  //     alert('Something went wrong.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };
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

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setDate(formatDate(selectedDate));
        setErrors(prev => ({
          ...prev,
          date: '',
        }));
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
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

  const validateForm = () => {
    let tempErrors = {};

    if (!date) {
      tempErrors.date = "Date is required.";
    }

    if (!expenseHead) {
      tempErrors.expenseHead = "Expense Head is required.";
    }

    if (!expenseType) {
      tempErrors.expenseType = "Expense Type is required.";
    }

    if (!amount || amount.trim() === "") {
      tempErrors.amount = "Amount is required.";
    }

    if (!remark || remark.trim() === "") {
      tempErrors.remark = "Remark is required.";
    }

    setErrors(tempErrors);

    return Object.keys(tempErrors).length === 0;
  };

  const handleSave = async () => {
    setErrors({});

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        expenseHeadId: expenseHead,
        transactionDate: date,
        expenseType: Number(expenseType), // 1 = In, 2 = Out
        amount: Number(amount),
        remarks: remark.trim(),
      };

      console.log('ADD EXPENSE PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposAddExpense,
        payload,
      );

      console.log('ADD EXPENSE RESPONSE =====>', response);

      if (response?.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message,
        });

        // Clear form
        setDate('');
        setExpenseHead(null);
        setExpenseType('');
        setAmount('');
        setRemark('');
        setErrors({
          general: '',
        });
        // Refresh expense list
        getExpenses(currentPage);
      }
    } catch (error) {
      console.log('ADD EXPENSE ERROR =====>', error?.response?.data);

      const backendError =
        error?.response?.data?.errors ||
        error?.response?.data?.error ||
        error?.response?.data?.message;
      setErrors(prev => ({
        ...prev,
        general: Array.isArray(backendError)
          ? backendError.join(', ')
          : typeof backendError === 'object'
            ? Object.values(backendError).flat().join(', ')
            : backendError || 'Failed to connect to server',
      }));
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
        onPress={() => getExpenses(1)}
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
        onPress={() => getExpenses(currentPage - 1)}
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
            onPress={() => getExpenses(page)}
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
        onPress={() => getExpenses(currentPage + 1)}
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
        onPress={() => getExpenses(lastPage)}
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

    const serialNumber =
      (currentPage - 1) * itemsPerPage + index + 1;

    return (

      <View style={styles.tableRow}>

        <Text style={[styles.rowText, { width: '8%' }]}>
          {serialNumber}
        </Text>

        <Text style={[styles.rowText, { width: '12%' }]}>
          {item.transactionDate}
        </Text>

        <Text style={[styles.rowText, { width: '12%' }]}>
          {item.expenseType == 1 ? 'In' : 'Out'}
        </Text>

        <Text style={[styles.rowText, { width: '12%' }]}>
          ₹{item.amount}
        </Text>

        <Text style={[styles.rowText, { width: '10%' }]}>
          {item.expenseHeadName}
        </Text>

        {/* <Text   numberOfLines={1}
        style={[styles.rowText,{width:'15%'}]}>
        {item.remarks}
      </Text> */}

        <Text
          numberOfLines={1}
          style={[styles.rowText, { width: '24%' }]}>
          {item.remarks}
        </Text>

        <View
          style={{
            width: '12%',
            alignItems: 'center'
          }}>
          <View
            style={[
              styles.statusContainer,
              {
                backgroundColor:
                  item.status == 1
                    ? '#264B79'
                    : '#C21414',
              },
            ]}>
            <Text style={styles.statusText}>
              {item.status == 1
                ? 'Active'
                : 'Cancelled'}
            </Text>
          </View>
        </View>
        <View
          style={{
            width: '10%',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {item.status === 1 ? (
            <TouchableOpacity
              onPress={() => confirmCancelExpense(item.id)}>
              <CancelIcon />
            </TouchableOpacity>
          ) : (
            <Text
              style={{
                color: '#919191',
                fontSize: 12,
                fontFamily: Fonts.FigtreeRegular,
              }}>
              -
            </Text>
          )}
        </View>

      </View>
    );
  };


  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />
      <View style={styles.subContainer}>
        <View style={{ flex: 0.75, }}>
          <View style={styles.categoryRowContainer}>
            <View>
              <Text style={styles.categoryText}>Expenses Entry</Text>
              <Text style={styles.categorySubText}>
                Manage Expenses
              </Text>
            </View>
            <TouchableOpacity style={styles.exportContainer}>
              <ExportIcon />

              <Text style={styles.exportText}>Export</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filterMainContainer}>
            <View style={styles.leftFilterContainer}>
              <Dropdown
                style={styles.dropdown}
                data={expenseTypeData}
                labelField="label"
                valueField="value"
                placeholder="Expenses Type"
                value={filterExpenseType}
                onChange={item => setFilterExpenseType(item.value)}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                iconColor='#1B1B1B'
              />
              <Dropdown
                style={[styles.dropdown, { marginLeft: rS(6), }]}
                data={expenseHeadData}
                labelField="label"
                valueField="value"
                placeholder="Expenses Head"
                value={filterExpenseHead}
                search
                searchPlaceholder='Search Expense Head...'
                onChange={item => setFilterExpenseHead(item.value)}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                inputSearchStyle={styles.inputSearchStyle}
                iconColor='#1B1B1B'
              />

              <Dropdown
                style={[styles.dropdown, { marginLeft: rS(6), }]}
                data={statusData}
                labelField="label"
                valueField="value"
                placeholder="Status"
                value={status}
                onChange={item => setStatus(item.value)}
                placeholderStyle={styles.placeholderStyle}
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                iconColor='#1B1B1B'
              />

              {/* <View style={{ flex: 0.5 }}> */}
              {/* From Date */}
              {/* <Text allowFontScaling={false} style={styles.label}>
                                From Date <Text style={styles.required}>*</Text>
                            </Text> */}
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
              {/* {fromDateError ? (
                                <Text style={styles.errorText}>
                                    {fromDateError}
                                </Text>
                            ) : null} */}
              {/* </View> */}
              {/* <View style={{ flex: 0.5 }}> */}
              {/* <Text allowFontScaling={false} style={styles.label}>
                                To Date <Text style={styles.required}>*</Text>
                            </Text> */}
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
              {/* {toDateError ? (
                                <Text style={styles.errorText}>
                                    {toDateError}
                                </Text>
                            ) : null} */}
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
              {/* </View> */}
              {/* <TouchableOpacity style={styles.exportContainer}>
                <ExportIcon />

                <Text style={styles.exportText}>Export</Text>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={styles.searchButton}
                onPress={getExpenses}>
                <SearchIcon />
              </TouchableOpacity>

            </View>


          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#FFFFFF',
              marginTop: rV(10),
              marginRight: rS(5),
              borderRadius: 8,
              overflow: 'hidden',
            }}>

            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { width: '8%' }]}>S.No</Text>
              {/* <Text style={[styles.headerText,{width:'15%'}]}>Receipt</Text> */}
              <Text style={[styles.headerText, { width: '12%' }]}>Date</Text>
              <Text style={[styles.headerText, { width: '12%' }]}>IN/OUT</Text>
              {/* <Text style={[styles.headerText,{width:'18%'}]}>Head</Text> */}
              {/* <Text style={[styles.headerText,{width:'10%'}]}>Type</Text> */}
              <Text style={[styles.headerText, { width: '12%' }]}>Amount</Text>
              <Text style={[styles.headerText, { width: '10%' }]}>Category</Text>
              <Text style={[styles.headerText, { width: '24%' }]}>Remarks</Text>
              <Text style={[styles.headerText, { width: '12%' }]}>Status</Text>
              <Text style={[styles.headerText, { width: '10%' }]}>Actions</Text>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color="#264B79"
                style={{ marginTop: 20 }}
              />
            ) : (
              <FlatList
                data={expenseList}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                ListEmptyComponent={() => (
                  <Text style={styles.emptyText}>
                    No Expenses Found
                  </Text>
                )}
              />
            )}



          </View>
          <View style={styles.paginationSection}>
            {renderPagination()}
          </View>
        </View>
        <View style={{ flex: 0.25, backgroundColor: '#FFFFFF', marginTop: rV(10), borderRadius: 8 }}>
          <KeyboardAwareScrollView
            enableOnAndroid={true}
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold, fontSize: 18, marginTop: rV(10), marginLeft: rS(10) }}>ADD EXPENSES</Text>
            <Text allowFontScaling={false} style={styles.label}>
              Date <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.dateInput, {
                // marginRight: rS(12),
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              },]}
              onPress={() => {
                setTempDate(convertStringToDate(date));
                setShowDatePicker(true);
              }}>
              <Text
                style={{
                  color: date ? '#000' : '#9A9A9A',
                  fontFamily: Fonts.FigtreeRegular,
                }}>
                {date || 'Date'}
              </Text>
              <CalenderIcon />
            </TouchableOpacity>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
            <Text allowFontScaling={false} style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <Dropdown
              style={styles.dropdownInput}
              data={expenseHeadData}
              labelField="label"
              valueField="value"
              placeholder="Expense Head"
              value={expenseHead}
              onChange={item => {
                setExpenseHead(item.value);

                setErrors(prev => ({
                  ...prev,
                  expenseHead: '',
                }));
              }}
              search
              searchPlaceholder='Search Expense Head....'
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              inputSearchStyle={styles.inputSearchStyle}
              iconColor='#1B1B1B'
            />

            {errors.expenseHead && <Text style={styles.errorText}>{errors.expenseHead}</Text>}
            <Text allowFontScaling={false} style={styles.label}>
              IN/OUT <Text style={styles.required}>*</Text>
            </Text>
            <Dropdown
              style={styles.dropdownInput}
              data={expenseTypeData}
              labelField="label"
              valueField="value"
              placeholder="IN/OUT"
              value={expenseType}
              onChange={item => {
                setExpenseType(item.value);

                setErrors(prev => ({
                  ...prev,
                  expenseType: '',
                }));
              }}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              iconColor='#1B1B1B'
            />
            {errors.expenseType && <Text style={styles.errorText}>{errors.expenseType}</Text>}
            <Text allowFontScaling={false} style={styles.label}>
              Amount <Text style={styles.required}>*</Text>
            </Text>
            <TextInput placeholder='Enter Amount' placeholderTextColor={'#9A9A9A'} keyboardType='number-pad'
              onChangeText={text => {
                const numericValue = text.replace(/[^0-9]/g, '');

                setAmount(numericValue);

                setErrors(prev => ({
                  ...prev,
                  amount: '',
                }));
              }}
              value={amount} style={styles.dateInput} />
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            <Text allowFontScaling={false} style={styles.label}>
              Remarks <Text style={styles.required}>*</Text>
            </Text>
            <TextInput placeholder='Remark' placeholderTextColor={'#9A9A9A'}
              onChangeText={text => {
                setRemark(text);

                setErrors(prev => ({
                  ...prev,
                  remark: '',
                }));
              }}
              multiline
              textAlignVertical="top"
              value={remark} style={[styles.dateInput, styles.message]} />
            {errors.remark && <Text style={styles.errorText}>{errors.remark}</Text>}
            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
            <TouchableOpacity style={styles.saveTouchable} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </KeyboardAwareScrollView>
        </View>


      </View>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={convertStringToDate(date)}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      <Modal
        visible={Platform.OS === 'ios' && showDatePicker}
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
                onPress={() => setShowDatePicker(false)}>
                <Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setTempDate(formatDate(tempDate));
                  setShowDatePicker(false);
                }}>
                <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>
                  Done
                </Text>
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
    flexDirection: 'row'
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
    paddingHorizontal: rS(6),
    backgroundColor: '#FFFFFF',
    width: rS(67),
    // marginLeft: rS(6),
  },
  dropdownInput: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: rS(6),
    backgroundColor: '#FFFFFF',
    marginHorizontal: rS(10),
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
  dateInput: {
    height: rV(27),
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 6,
    // marginHorizontal: rS(14),
    paddingHorizontal: rS(8),
    backgroundColor: '#FFFFFF',
    // width: rS(67),
    marginHorizontal: rS(10),

  },
  message: {
    height: rV(45),
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
    marginLeft: rS(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: rS(6),
    // marginLeft: rS(4)
  },
  exportText: {
    fontSize: 15,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    marginLeft: rS(3),
  },
  required: {
    color: '#E71414',
  },
  label: {
    fontSize: 14,
    // paddingHorizontal: rS(14),
    marginTop: rV(10),
    marginBottom: rV(5),
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    marginLeft: rS(10)
  },
  saveTouchable: {
    backgroundColor: '#264B79',
    borderRadius: 8,
    paddingVertical: rV(8),
    width: rS(100),
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: rV(10),
    marginBottom: rV(10),
  },
  saveText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    // marginTop: rV(4),
    // marginBottom: rV(5),
    fontFamily: Fonts.FigtreeRegular,
    marginHorizontal: rS(10),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    paddingHorizontal: rS(10),
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
    fontSize: 13,
    color: '#000',
    textAlign: 'center',
    fontFamily: Fonts.FigtreeRegular,
  },

  statusContainer: {
    borderRadius: 20,
    paddingVertical: rV(4),
    width: rS(40),
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontFamily: Fonts.FigtreeMedium,
  },

  paginationSection: {
    paddingVertical: rV(10),
    alignItems: 'center',
  },

  paginationWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  navButton: {
    paddingHorizontal: rS(10),
    paddingVertical: rV(5),
    borderWidth: 1,
    borderColor: '#E9E9E9',
    backgroundColor: '#FFF',
    borderRadius: 4,
    marginHorizontal: rS(2),
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
    backgroundColor: '#FFF',
    borderRadius: 4,
    marginHorizontal: rS(2),
  },

  activePageButton: {
    backgroundColor: '#264B79',
  },

  pageButtonText: {
    fontSize: 13,
    color: '#333',
  },

  activePageButtonText: {
    color: '#FFF',
  },

  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },
})


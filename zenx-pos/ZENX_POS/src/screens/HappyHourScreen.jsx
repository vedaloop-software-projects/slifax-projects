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
import EditIcon from '../assets/Icons/EditIcon';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function HappyHourScreen() {
  const navigation =useNavigation()

  const { postMethod } = HelperModule();

  const [selectedTab, setSelectedTab] = useState('happyHours');

/* Happy Hours */
const [happyHourLoading, setHappyHourLoading] = useState(false);
const [happyHourList, setHappyHourList] = useState([]);
const [happyHourPagination, setHappyHourPagination] = useState({});
const [happyHourCurrentPage, setHappyHourCurrentPage] = useState(1);
const [happyHourSearch, setHappyHourSearch] = useState('');
const [happyHourStatus, setHappyHourStatus] = useState('');

/* Group Wise */
const [groupLoading, setGroupLoading] = useState(false);
const [groupWiseHappyHourList, setGroupWiseHappyHourList] = useState([]);
const [groupPagination, setGroupPagination] = useState({});
const [groupCurrentPage, setGroupCurrentPage] = useState(1);
const [groupSearch, setGroupSearch] = useState('');
const [groupStatus, setGroupStatus] = useState('');
const [groupType, setGroupType] = useState('');

useFocusEffect(
    useCallback(() => {
        if (selectedTab === 'happyHours') {
            setHappyHourSearch('');
            setHappyHourStatus('');
            getHappyHours(1);
        } else {
            setGroupSearch('');
            setGroupStatus('');
            // setGroupType('');
            getGroupWiseHappyHours(1);
        }
    }, [selectedTab])
);


  const statusData = [
    { label: 'Active', value: '1' },
    { label: 'In-Active', value: '0' },
    { label: 'Both', value: '' }
  ];

// useEffect(() => {
//     if (selectedTab === 'happyHours') {
//         getHappyHours(1);
//     } else {
//         getGroupWiseHappyHours(1);
//     }
// }, [selectedTab]);

const getHappyHours = async (page = 1) => {
    try {
        setHappyHourLoading(true);
        setHappyHourCurrentPage(page);

        const payload = {
            page,
            searchStr: happyHourSearch,
            status: happyHourStatus,
        };

        const response = await postMethod(
            ApiServices.zenxposGetHappyHours,
            payload,
        );

        if (response?.success) {
            setHappyHourList(response.data.happyHours || []);
            setHappyHourPagination(response.data.pagination || {});
        }
    } catch (error) {
    console.log('GET HAPPY HOURS ERROR', error);
  } finally {
        setHappyHourLoading(false);
    }
};

const getGroupWiseHappyHours = async (page = 1) => {
    try {
        setGroupLoading(true);
        setGroupCurrentPage(page);

        const payload = {
            page,
            searchStr: groupSearch,
            status: groupStatus,
        };

        const response = await postMethod(
            ApiServices.zenxposGetGroupWiseHappyHours,
            payload,
        );

        if (response?.success) {
            setGroupWiseHappyHourList(
                response.data.groupWiseHappyHours || [],
            );
            setGroupPagination(response.data.pagination || {});
        }
    } catch (error) {
    console.log('GET GROUP WISE HAPPY HOURS ERROR', error);
  } finally {
        setGroupLoading(false);
    }
};
const handleEdit = async id => {
    try {
        const endpoint =
            selectedTab === 'happyHours'
                ? ApiServices.zenxposGetHappyHourById
                : ApiServices.zenxposGetGroupWiseHappyHourById;

        const response = await postMethod(endpoint, { id });
        console.log(":::::: happy hours id::::::", response)

        if (response?.success) {
            navigation.navigate('AddNewHappyHourScreen', {
                happyHourData: response.data,
                type: selectedTab,
            });
        }
    } catch (e) {
        console.log(e);
    }
};

const renderHappyHourPagination = () => {
  if (
    !happyHourPagination ||
    happyHourPagination.lastPage <= 1
  )
    return null;

  const { lastPage } = happyHourPagination;

  const pages = [];

  for (let i = 1; i <= lastPage; i++) {
    pages.push(
      <TouchableOpacity
        key={i}
        style={[
          styles.pageButton,
          happyHourCurrentPage === i &&
            styles.activePageButton,
        ]}
        onPress={() => getHappyHours(i)}>
        <Text
          style={[
            styles.pageButtonText,
            happyHourCurrentPage === i &&
              styles.activePageButtonText,
          ]}>
          {i}
        </Text>
      </TouchableOpacity>,
    );
  }

  return (
    <View style={styles.paginationWrapper}>
      <TouchableOpacity
        style={styles.navButton}
        disabled={happyHourCurrentPage === 1}
        onPress={() => getHappyHours(1)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageLeftIcon />
          <Text style={styles.navButtonText}> First</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        disabled={happyHourCurrentPage === 1}
        onPress={() =>
          getHappyHours(happyHourCurrentPage - 1)
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageBackIcon />
          <Text style={styles.navButtonText}> Back</Text>
        </View>
      </TouchableOpacity>

      {pages}

      <TouchableOpacity
        style={styles.navButton}
        disabled={happyHourCurrentPage === lastPage}
        onPress={() =>
          getHappyHours(happyHourCurrentPage + 1)
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Next </Text>
          <PageNextIcon />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        disabled={happyHourCurrentPage === lastPage}
        onPress={() => getHappyHours(lastPage)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Last </Text>
          <PageRightIcon />
        </View>
      </TouchableOpacity>
    </View>
  );
};

  
const renderGroupWiseHappyHourPagination = () => {
  if (
    !groupPagination ||
    groupPagination.lastPage <= 1
  )
    return null;

  const { lastPage } = groupPagination;

  const pages = [];

  for (let i = 1; i <= lastPage; i++) {
    pages.push(
      <TouchableOpacity
        key={i}
        style={[
          styles.pageButton,
          groupCurrentPage === i &&
            styles.activePageButton,
        ]}
        onPress={() => getGroupWiseHappyHours(i)}>
        <Text
          style={[
            styles.pageButtonText,
            groupCurrentPage === i &&
              styles.activePageButtonText,
          ]}>
          {i}
        </Text>
      </TouchableOpacity>,
    );
  }

  return (
    <View style={styles.paginationWrapper}>
      <TouchableOpacity
        style={styles.navButton}
        disabled={groupCurrentPage === 1}
        onPress={() => getGroupWiseHappyHours(1)}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageLeftIcon />
          <Text style={styles.navButtonText}> First</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        disabled={groupCurrentPage === 1}
        onPress={() =>
          getGroupWiseHappyHours(groupCurrentPage - 1)
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <PageBackIcon />
          <Text style={styles.navButtonText}> Back</Text>
        </View>
      </TouchableOpacity>

      {pages}

      <TouchableOpacity
        style={styles.navButton}
        disabled={groupCurrentPage === lastPage}
        onPress={() =>
          getGroupWiseHappyHours(groupCurrentPage + 1)
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Next </Text>
          <PageNextIcon />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        disabled={groupCurrentPage === lastPage}
        onPress={() =>
          getGroupWiseHappyHours(lastPage)
        }>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.navButtonText}>Last </Text>
          <PageRightIcon />
        </View>
      </TouchableOpacity>
    </View>
  );
};

  const renderHappyHoursItem = ({ item, index }) => {
    const itemsPerPage = happyHourPagination?.perPage || 10;
    const serialNumber = (happyHourCurrentPage - 1) * itemsPerPage + index + 1;
    return (
      <View style={styles.tableRow}>
        <Text style={[styles.rowText, { width: '10%' }]}>
          {serialNumber}
        </Text>

        <Text style={[styles.rowText, { width: '15%' }]}>
          {item.happyHourName}
        </Text>

        {/* <Text style={[styles.rowText, { width: '12%' }]}>
          {item.billAmount}
        </Text> */}

         <Text style={[styles.rowText, { width: '10%' }]}>
          {item.discountPercentage || '-'}
        </Text>
        <Text
  style={[styles.rowText, { width: '20%' }]}
>
  {item.fromDate || '-'}
  {'\n'}
  {item.toDate || '-'}
</Text>
<Text style={[styles.rowText, { width: '15%' }]}>
          {item.toDate || '-'}
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
            width: '12%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => handleEdit(item.id)}>
          <EditIcon />
        </TouchableOpacity>
      </View>
    );
  };
const renderGroupWiseHappyHoursItem = ({ item, index }) => {
  const itemsPerPage = groupPagination?.perPage || 10;
  const serialNumber = (groupCurrentPage - 1) * itemsPerPage + index + 1;

  return (
    <View style={styles.tableRow}>
      <Text style={[styles.rowText,{width:'15%'}]}>
        {serialNumber}
      </Text>

      <Text style={[styles.rowText,{width:'15%'}]}>
        {item.happyHourName}
      </Text>

      <Text style={[styles.rowText,{width:'15%'}]}>
        {item.fromDate}
        {'\n'}
        {item.toDate}
      </Text>

      <Text style={[styles.rowText,{width:'15%'}]}>
        {item.toDate}
      </Text>

      <View
        style={{
          width:'20%',
          justifyContent:'center',
          alignItems:'center',
        }}>
        <View
          style={[
            styles.statusContainer,
            {
              backgroundColor:
                item.status === 1 ? '#264B79' : '#C21414',
            },
          ]}>
          <Text style={styles.statusText}>
            {item.status === 1 ? 'Active' : 'In-Active'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={{
          width:'15%',
          justifyContent:'center',
          alignItems:'center',
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
    <Text style={styles.categoryText}>Happy Hour</Text>
    <Text style={styles.categorySubText}>
      Create or Manage Happy Hour
    </Text>
  </View>

  <View style={styles.rightHeaderContainer}>
    {/* Tabs */}
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedTab === 'happyHours' && styles.activeTab,
        ]}
        onPress={() => setSelectedTab('happyHours')}>
        <Text
          style={[
            styles.tabText,
            selectedTab === 'happyHours' && styles.activeTabText,
          ]}>
          Happy Hours
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          selectedTab === 'groupWise' && styles.activeTab,
        ]}
        onPress={() => setSelectedTab('groupWise')}>
        <Text
          style={[
            styles.tabText,
            selectedTab === 'groupWise' && styles.activeTabText,
          ]}>
          Group-wise Happy Hours
        </Text>
      </TouchableOpacity>
    </View>

    {/* New Happy Hour */}
    <TouchableOpacity
      style={styles.newCategoryTouchable}
      onPress={() => navigation.navigate('AddNewHappyHourScreen', { type: selectedTab,})}>
      <PlusIcon />
      <Text style={styles.addNewCategoryText}>
        Create New
      </Text>
    </TouchableOpacity>
  </View>
</View>
{selectedTab === 'happyHours' ? (
  <>
       {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Happy Hour Name"
              placeholderTextColor={'#919191'}
              value={happyHourSearch}
              onChangeText={text => setHappyHourSearch(text)}
            />

            <Dropdown
              style={styles.dropdown}
              data={statusData}
              labelField="label"
              valueField="value"
              placeholder="Status"
              value={happyHourStatus}
              onChange={item => setHappyHourStatus(item.value)}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              iconColor="#1B1B1B"
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => getHappyHours(1)}>
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

            <Text style={[styles.headerText, { width: '15%' }]}>
              HH Name
            </Text>
             <Text style={[styles.headerText, { width: '10%' }]}>
              Discount
            </Text>
             <Text style={[styles.headerText, { width: '20%' }]}>
              From & To Date
            </Text>
             <Text style={[styles.headerText, { width: '15%' }]}>
              Expires On
            </Text>

            <Text style={[styles.headerText, { width: '15%' }]}>
              Status
            </Text>

            <Text style={[styles.headerText, { width: '10%' }]}>
              Actions
            </Text>
          </View>

          {/* Loader */}
          {happyHourLoading ? (
            <ActivityIndicator
              size="large"
              color="#264B79"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <FlatList
              data={happyHourList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderHappyHoursItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  No Happy Hours Found
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
          {renderHappyHourPagination()}
        </View>
  </>
  ) : (
  <>
     {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Group Wise Happy Hour Name"
              placeholderTextColor={'#919191'}
              value={groupSearch}
              onChangeText={text => setGroupSearch(text)}
            />

            <Dropdown
              style={styles.dropdown}
              data={statusData}
              labelField="label"
              valueField="value"
              placeholder="Status"
              value={groupStatus}
              onChange={item => setGroupStatus(item.value)}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              itemTextStyle={styles.itemTextStyle}
              iconColor="#1B1B1B"
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => getGroupWiseHappyHours(1)}>
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
            <Text style={[styles.headerText, { width: '15%' }]}>
              S.No
            </Text>

            <Text style={[styles.headerText, { width: '15%' }]}>
              HH Name
            </Text>
             <Text style={[styles.headerText, { width: '15%' }]}>
              From & To Date
            </Text>
             <Text style={[styles.headerText, { width: '15%' }]}>
              Expires On
            </Text>
            {/* <Text style={[styles.headerText, { width: '12%' }]}>
              Pack Size
            </Text> */}

            <Text style={[styles.headerText, { width: '20%' }]}>
              Status
            </Text>

            <Text style={[styles.headerText, { width: '15%' }]}>
              Actions
            </Text>
          </View>

          {/* Loader */}
          {groupLoading ? (
            <ActivityIndicator
              size="large"
              color="#264B79"
              style={{ marginVertical: 20 }}
            />
          ) : (
            <FlatList
              data={groupWiseHappyHourList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderGroupWiseHappyHoursItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  No Group Wise Happy Hours Found
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
          {renderGroupWiseHappyHourPagination()}
        </View>
        </>
)}
   
      </View>

      {/* <AddNewBrandModal
        isVisible={isAddNewBrandVisible}
        onClose={() => {
          setSelectedBrand(null);
          setIsAddNewBrandVisible(false);
        }
        }
        onSuccess={getBrands}
        editData={selectedBrand}
      /> */}
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
  rightHeaderContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},

tabContainer: {
  flexDirection: 'row',
  alignItems: 'center',
//   marginRight: rS(12),
  marginTop: 0,
  marginBottom: 0,
},

tabButton: {
  height: rV(27),
  paddingHorizontal: rS(16),
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#264B79',
  backgroundColor: '#FFFFFF',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: rS(8),
},

activeTab: {
  backgroundColor: '#264B79',
},
tabText: {
  fontSize: 14,
  fontFamily: Fonts.FigtreeMedium,
  color: '#264B79',
},

activeTabText: {
  color: '#FFFFFF',
},
groupWiseContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

groupWiseText: {
  fontSize: 16,
  fontFamily: Fonts.FigtreeMedium,
  color: '#264B79',
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

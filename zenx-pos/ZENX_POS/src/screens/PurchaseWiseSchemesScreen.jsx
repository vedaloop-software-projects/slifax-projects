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
import AddNewBrandModal from '../components/AddNewBrandModal';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import PageLeftIcon from '../assets/Icons/PageLeftIcon'
import PageBackIcon from '../assets/Icons/PageBackIcon'
import PageNextIcon from '../assets/Icons/PageNextIcon'
import PageRightIcon from '../assets/Icons/PageRightIcon'
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function PurchaseWiseSchemesScreen() {
  const navigation =useNavigation()

  const { postMethod } = HelperModule();

  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [status, setStatus] = useState('');
  const [selectedPurchaseWiseSchemes, setSelectedPurchaseWiseSchemes] = useState(null);

  const [purchaseWiseSchemesList, setPurchaseWiseSchemesList] = useState([]);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const resetFilters = () => {
    setSearchText('');
    setStatus('');
    getPurchaseWiseSchemes(1);
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
    getPurchaseWiseSchemes(1);
  }, []);

  const getPurchaseWiseSchemes = async (pageNumber = 1) => {
    try {
      const activePage = typeof pageNumber === 'number' ? pageNumber : 1;

      setLoading(true);
      setCurrentPage(activePage);

      const payload = {
        searchStr: searchText,
        status: status,
        page: activePage,
      };

      console.log('GET PURCHASE WISE SCHEMES PAYLOAD =====>', payload);

      const response = await postMethod(
        ApiServices.zenxposGetPurchaseWiseDiscounts, payload
      );

      console.log('GET PURCHASE WISE SCHEMES RESPONSE =====>', response);

      if (response?.success) {
        setPurchaseWiseSchemesList(response?.data?.purchaseWiseDiscounts || []);
        setPagination(response?.data?.pagination || {});
      }
    } catch (error) {
      console.log('GET PURCHASE WISE SCHEMES ERROR =====>', error.message || error);
    } finally {
      setLoading(false);
    }
  };

  // const getBrands = async () => {
  //   try {
  //     setLoading(true);
  //     setCurrentPage(pageNumber);

  //     const payload = {
  //       searchStr: searchText,
  //       status: status,
  //       page: pageNumber,
  //     };

  //     const response = await postMethod(
  //       ApiServices.zenxposGetBrands, payload
  //     );

  //     console.log('GET BRANDS RESPONSE =====>', response);

  //     if (response?.success) {
  //       setBrandList(response?.data?.brands || []);
  //       setPagination(response?.data?.pagination || {});
  //     }
  //   } catch (error) {
  //     console.log('GET BRANDS ERROR =====>', error);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const payload = { id: id };
      const response = await postMethod(ApiServices.zenxposGetPurchaseWiseDiscountById, payload);
      console.log(' get purchase wise id response:', response)

      if (response?.success) {
        // setSelectedPurchaseWiseSchemes(response.data);
        navigation.navigate('NewPurchaseWiseDiscountScreen', {purchaseWiseData: response.data})
        
        // setIsAddNewPurchaseWiseSchemesVisible(true);
      }
    } catch (error) {
      console.log('GET PURCHASE WISE SCHEMES BY ID ERROR:', error);
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
        onPress={() => getPurchaseWiseSchemes(1)}
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
        onPress={() => getPurchaseWiseSchemes(currentPage - 1)}
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
            onPress={() => getPurchaseWiseSchemes(page)}
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
        onPress={() => getPurchaseWiseSchemes(currentPage + 1)}
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
        onPress={() => getPurchaseWiseSchemes(lastPage)}
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
          {item.productFullName}
        </Text>

        <Text style={[styles.rowText, { width: '12%' }]}>
          {item.packSize}
        </Text>

         <Text style={[styles.rowText, { width: '12%' }]}>
          {item.mrp}
        </Text>
         <Text style={[styles.rowText, { width: '12%' }]}>
           {item.discounts?.length
    ? `${item.discounts[0].purchaseQty}/${item.discounts[0].salePrice}`
    : '-'}
        </Text>
        <Text style={[styles.rowText, { width: '12%' }]}>
          {item.toDate}
        </Text>


        <View
          style={{
            width: '12%',
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

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        {/* Top Header */}
        <View style={styles.categoryRowContainer}>
          <View>
            <Text style={styles.categoryText}>Purchase-Wise Schemes</Text>

            <Text style={styles.categorySubText}>
              Create or Manage Schemes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.newCategoryTouchable}
            onPress={() => {
              setSelectedPurchaseWiseSchemes(null);
              navigation.navigate('NewPurchaseWiseDiscountScreen')
            }}
          >
            <PlusIcon />

            <Text style={styles.addNewCategoryText}>
              New Scheme
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filterMainContainer}>
          <View style={styles.leftFilterContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Purchase Name"
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
              onPress={getPurchaseWiseSchemes}>
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
              Item Name
            </Text>

            <Text style={[styles.headerText, { width: '12%' }]}>
              Pack Size
            </Text>
             <Text style={[styles.headerText, { width: '12%' }]}>
              MRP
            </Text>
             <Text style={[styles.headerText, { width: '12%' }]}>
              Qty/Price
            </Text>
             <Text style={[styles.headerText, { width: '12%' }]}>
              Expires On
            </Text>

            <Text style={[styles.headerText, { width: '12%' }]}>
              Status
            </Text>

            <Text style={[styles.headerText, { width: '12%' }]}>
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
              data={purchaseWiseSchemesList}
              keyExtractor={item => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  No Purchase Wise Schemes Found
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

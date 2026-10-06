import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { rS, rV } from '../constants/responsive';
import Fonts from '../constants/Fonts';
import CancelBlackIcon from '../assets/Icons/CancelBlackIcon';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const ViewProductVariantsModal = ({ isVisible, onClose, productData }) => {
  if (!productData) return null;

  const { productDetails, variants } = productData;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {productDetails?.productFullName}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CancelBlackIcon />
            </TouchableOpacity>
          </View>
          {/* Variants Table */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { width: '12%' }]}>S.No</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>Pack Size</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>CP</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>MRP</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>SP</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>Priority</Text>
              <Text style={[styles.headerText, { width: '15%' }]}>Status</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: rV(10) }}>
              {variants && variants.length > 0 ? (
                variants.map((item, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.rowText, { width: '12%' }]}>{index + 1}</Text>
                    <Text style={[styles.rowText, { width: '15%' }]}>
                      {item.packSize}
                    </Text>
                    <Text style={[styles.rowText, { width: '15%' }]}>₹{item.costPrice}</Text>
                    <Text style={[styles.rowText, { width: '15%' }]}>₹{item.mrp}</Text>
                    <Text style={[styles.rowText, { width: '15%' }]}>₹{item.salePrice}</Text>
                    <Text style={[styles.rowText, { width: '15%' }]}>{item.priority}</Text>
                    <View style={{ width: '15%', justifyContent: 'center', alignItems: 'center' }}>
                      <View
                        style={[
                          styles.statusContainer,
                          // {
                          //   backgroundColor: item.status === 0 ? '#C21414' : '#264B79',
                          // },
                        ]}>
                        <Text style={styles.statusText}>
                          {item.status === 1 ? 'Active' : 'In-Active'}
                        </Text>
                      </View>
                    </View>
                    {/* <View style={{ width: '15%', alignItems: 'center' }}>
                         <View style={[
                            styles.statusBadge, 
                            { backgroundColor: item.status === 1 ? '#264B79' : '#C21414' }
                         ]}>
                            <Text style={styles.statusText}>
                                {item.status === 1 ? 'Active' : 'In-Active'}
                            </Text>
                         </View>
                    </View> */}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>No Variants Found</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: wp(90),
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
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
    flex: 1,
  },
  closeButton: {
    padding: rS(5),
  },
  tableWrapper: {
    padding: rS(10),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    borderRadius: 6,
    // marginBottom: rV(5),
  },
  headerText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
    paddingVertical: rV(8),
    // paddingHorizontal: rS(10),
  },
  rowText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
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
    color: '#333333',
    fontSize: 14,
    fontFamily: Fonts.FigtreeSemiBold,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    fontFamily: Fonts.FigtreeRegular,
    color: '#919191',
  },
});

export default ViewProductVariantsModal;
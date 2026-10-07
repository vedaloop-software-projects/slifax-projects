import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import Fonts from '../constants/Fonts';
import CancelBlackIcon from '../assets/Icons/CancelBlackIcon';

const EANVariantPickerModal = ({ isVisible, onClose, items, ean, onSelect }) => {
  if (!items || items.length === 0) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                Select Variant
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                EAN: {ean} • {items.length} matches
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CancelBlackIcon />
            </TouchableOpacity>
          </View>

          {/* Table */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text style={[styles.headerText, { width: '8%' }]}>S.No</Text>
              <Text style={[styles.headerText, { width: '28%' }]}>
                Product
              </Text>
              <Text style={[styles.headerText, { width: '14%' }]}>
                Pack Size
              </Text>
              <Text style={[styles.headerText, { width: '14%' }]}>CP</Text>
              <Text style={[styles.headerText, { width: '14%' }]}>MRP</Text>
              <Text style={[styles.headerText, { width: '22%' }]}>
                EAN
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: rV(10) }}
            >
              {items.map((item, index) => (
                <TouchableOpacity
                  key={`${item.productId}-${item.variantId}-${index}`}
                  style={styles.tableRow}
                  activeOpacity={0.7}
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.rowText, { width: '8%' }]}>
                    {index + 1}
                  </Text>
                  <View style={{ width: '28%' }}>
                    <Text style={styles.rowText} numberOfLines={1}>
                      {item.productFullName}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.productCode}
                    </Text>
                  </View>
                  <Text style={[styles.rowText, { width: '14%' }]}>
                    {item.packSize || '--'}
                  </Text>
                  <Text style={[styles.rowText, { width: '14%' }]}>
                    ₹{item.costPrice}
                  </Text>
                  <Text style={[styles.rowText, { width: '14%' }]}>
                    ₹{item.mrp}
                  </Text>
                  <Text style={[styles.rowText, { width: '22%' }]}>
                    {item.eanCode}
                  </Text>
                </TouchableOpacity>
              ))}
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
    width: wp(92),
    maxHeight: hp(70),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingBottom: rV(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rS(15),
    paddingVertical: rV(8),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Fonts.FigtreeRegular,
    color: '#666',
    marginTop: 2,
  },
  closeButton: { padding: rS(5) },
  tableWrapper: { padding: rS(10) },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EEF9FF',
    paddingVertical: rV(8),
    borderRadius: 6,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
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
  },
  rowText: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
    textAlign: 'center',
  },
  rowSub: {
    fontSize: 10,
    fontFamily: Fonts.FigtreeRegular,
    color: '#888',
    textAlign: 'center',
    marginTop: 1,
  },
});

export default EANVariantPickerModal;
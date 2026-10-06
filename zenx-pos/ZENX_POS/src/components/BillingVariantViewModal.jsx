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

const BillingVariantViewModal = ({
  isVisible,
  onClose,
  productData,
  onSelectVariant,
}) => {
  if (!productData) return null;
  const { productDetails, variants = [] } = productData;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.productHeaderInfo}>
              {/* Product Name */}
              <Text
                style={styles.title}
                numberOfLines={1}
              >
                {productDetails?.productFullName}
              </Text>
              {/* Product Code + EAN */}
              <View style={styles.codeRow}>
                <Text style={styles.codeText}>
                  <Text style={styles.codeLabel}>
                    Code:
                  </Text>{' '}
                  {productDetails?.productCode || '-'}
                </Text>
                <Text style={styles.separator}>
                  |
                </Text>
                <Text style={styles.codeText}>
                  <Text style={styles.codeLabel}>
                    EAN:
                  </Text>{' '}
                  {productDetails?.eanCode || '-'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <CancelBlackIcon />
            </TouchableOpacity>
          </View>
          {/* ================= VARIANTS ================= */}
          <View style={styles.tableWrapper}>
            <View style={styles.tableHeader}>
              <Text
                style={[
                  styles.headerText,
                  { width: '10%' },
                ]}
              >
                S.No
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { width: '20%' },
                ]}
              >
                Pack Size
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { width: '16%' },
                ]}
              >
                MRP
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { width: '16%' },
                ]}
              >
                SP
              </Text>
              <Text
                style={[
                  styles.headerText,
                  { width: '16%' },
                ]}
              >
                Priority
              </Text>
          <Text
  style={[
    styles.headerText,
    { width: '18%' },
  ]}
>
  Action
</Text>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingBottom: rV(10),
              }}
            >
              {variants.length > 0 ? (
                variants.map((item, index) => (
                  <TouchableOpacity
                    key={`${item.productId}-${item.variantId}-${index}`}
                    activeOpacity={0.7}
                    onPress={() => onSelectVariant(item)}
                    style={styles.tableRow}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        { width: '10%' },
                      ]}
                    >
                      {index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        styles.packSizeText,
                        { width: '20%' },
                      ]}
                    >
                      {item.packSize || '-'}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        { width: '16%' },
                      ]}
                    >
                      ₹{item.mrp ?? 0}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        { width: '16%' },
                      ]}
                    >
                      ₹{item.salePrice ?? 0}
                    </Text>
                    <Text
                      style={[
                        styles.rowText,
                        { width: '16%' },
                      ]}
                    >
                      {item.priority ?? '-'}
                    </Text>
                  <View
  style={{
    width: '18%',
    justifyContent: 'center',
    alignItems: 'center',
  }}
>
  <TouchableOpacity
    activeOpacity={0.7}
    style={styles.selectButton}
    onPress={() => onSelectVariant(item)}
  >
    <Text style={styles.selectButtonText}>
      Select
    </Text>
  </TouchableOpacity>
</View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  No Variants Found
                </Text>
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
    // maxHeight: hp(70),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingBottom: rV(18),
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rS(15),
    paddingVertical: rV(10),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  productHeaderInfo: {
    flex: 1,
    marginRight: rS(10),
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rV(4),
  },
  codeText: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#555555',
  },
  codeLabel: {
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
  separator: {
    marginHorizontal: rS(8),
    color: '#BBBBBB',
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
    paddingVertical: rV(9),
    borderRadius: 6,
  },
  headerText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    paddingVertical: rV(11),
  },
  rowText: {
    fontSize: 13,
    fontFamily: Fonts.FigtreeRegular,
    color: '#333333',
    textAlign: 'center',
  },
  packSizeText: {
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },
 selectButton: {
  backgroundColor: '#264B79',
  borderRadius: 6,
  paddingVertical: rV(5),
  paddingHorizontal: rS(12),
  minWidth: rS(55),
  alignItems: 'center',
  justifyContent: 'center',
},
selectButtonText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontFamily: Fonts.FigtreeSemiBold,
},
  emptyText: {
    textAlign: 'center',
    marginTop: rV(30),
    fontFamily: Fonts.FigtreeRegular,
    color: '#919191',
  },
});

export default BillingVariantViewModal;
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import { responsiveFontSize } from 'react-native-responsive-dimensions';
import {
  retailBill,
  textileBill,
  textileGstBill,
  retailGstBill,
  duplicateBill,
  retailBillNoTax,
  billQrRetail,
  billQrGst,
  billQrNoTax,
  billQrPlain,
} from '../../src/data/receiptData';
import Receipt from '../components/ReceptScreens/Receipt';
import KOTOrder from '../components/ReceptScreens/KOTOrder';
import A5Invoice from '../components/A5Invoice';
import { RECEIPT_SAMPLES } from '../../src/data/receiptSamples';
import { useNavigation } from '@react-navigation/native';
// const BILL_FORMATS = [
//   { id: 1, title: 'A4-Retail Bill Format', size: '21 x 29.7 cm' },
//   { id: 2, title: 'A4-Retail Bill Format\nfor Textile Business', size: '21 x 29.7 cm' },
//   { id: 3, title: 'A4-Retail Bill Format', size: '21 x 29.7 cm' },
//   { id: 4, title: 'A4-Retail Bill Format\nfor Textile Business', size: '21 x 29.7 cm' },
//   { id: 5, title: '3" Bill Format for\nRestaurant', size: '8 x 20 cm' },
//   { id: 6, title: '3" Bill Format', size: '8 x 20 cm' },
//   { id: 7, title: 'A5-Retail Bill Format', size: '14.8 x 21 cm' },
//   { id: 8, title: 'A5-Retail Bill Format\nfor Textile Business', size: '14.8 x 21 cm' },
//   { id: 9, title: 'A4-GST Bill Format', size: '21 x 29.7 cm' },
//   { id: 10, title: 'A4-GST Bill Format\nfor Textile Business', size: '21 x 29.7 cm' },
//   { id: 11, title: 'Thermal Bill Format', size: '8 x 20 cm' },
//   { id: 12, title: 'Retail Bill Format', size: '21 x 29.7 cm' },
//   { id: 13, title: 'Restaurant Bill Format', size: '8 x 20 cm' },
// ];

const BILL_FORMATS = [
  { id: 1, title: 'A4-Retail Bill Format', size: '21 x 29.7 cm', sampleKey: 'retailBill' },
  { id: 2, title: 'A4-Retail Bill Format\nfor Textile Business', size: '21 x 29.7 cm', sampleKey: 'textileBill' },
  { id: 3, title: 'A4-Retail Bill Format', size: '21 x 29.7 cm', sampleKey: 'retailBill' },
  { id: 4, title: 'A4-Retail Bill Format\nfor Textile Business', size: '21 x 29.7 cm', sampleKey: 'textileBill' },
  { id: 5, title: '3" Bill Format for\nRestaurant', size: '8 x 20 cm', sampleKey: 'KOTOrder' },
  { id: 6, title: '3" Bill Format', size: '8 x 20 cm', sampleKey: 'bill' },
  { id: 7, title: 'A5-Retail Bill Format', size: '14.8 x 21 cm', sampleKey: 'a5Clothes' },
  { id: 8, title: 'A5-Retail Bill Format\nfor Textile Business', size: '14.8 x 21 cm', sampleKey: 'a5Grocery' },
  { id: 9, title: 'A4-GST Bill Format', size: '21 x 29.7 cm', sampleKey: 'retailGstBill' },
  { id: 10, title: 'A4-GST Bill Format\nfor Textile Business', size: '21 x 29.7 cm', sampleKey: 'textileGstBill' },
  { id: 11, title: 'Thermal Bill Format', size: '8 x 20 cm', sampleKey: 'Rbill' },
  { id: 12, title: 'Retail Bill Format', size: '21 x 29.7 cm', sampleKey: 'duplicateBill' },
  { id: 13, title: 'Restaurant Bill Format', size: '8 x 20 cm', sampleKey: 'RbillQr' },
];
const BillThumbnail = ({ selected }) => {
  return (
    <View style={styles.thumbnailWrapper}>
      <View
        style={[
          styles.thumbnail,
          selected && styles.selectedThumbnail,
        ]}
      >
        {/* Top small lines */}
        <View style={styles.thumbnailTopLine} />
        <View style={styles.thumbnailTopLineSecond} />

        {/* First grey section */}
        <View style={styles.thumbnailGreySmall} />

        {/* Large grey content section */}
        <View style={styles.thumbnailGreyLarge} />

        {/* Bottom left line */}
        <View style={styles.thumbnailBottomRow}>
          <View style={styles.thumbnailBottomLineLeft} />
          <View style={styles.thumbnailBottomRight}>
            <View style={styles.thumbnailBottomLineRight} />
            <View style={styles.thumbnailBottomLineRightSmall} />
          </View>
        </View>
      </View>
    </View>
  );
};

const PreviewTableRow = ({ code, product, qty, amount }) => {
  return (
    <View style={styles.goodsRow}>
      <Text style={styles.goodsCell}>{code}</Text>
      <Text style={[styles.goodsCell, styles.goodsDescription]}>{product}</Text>
      <Text style={styles.goodsCell}>{qty}</Text>
      <Text style={styles.goodsCell}>{amount}</Text>
      <Text style={[styles.goodsCell, styles.goodsTax]}>0+0+0+0</Text>
    </View>
  );
};



const BillFormats = () => {
  const [selectedId, setSelectedId] = useState(2);
  const { width } = useWindowDimensions();

  const navigation = useNavigation();
  const SELECTED_BILL_FORMAT_KEY = '@selected_bill_format';
  // Left panel: responsive but capped
  const isSmallScreen = width < 700;
  const LEFT_COL_WIDTH = isSmallScreen
    ? Math.min(rS(240), width * 0.40)
    : Math.min(rS(290), width * 0.33);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptIndex, setReceiptIndex] = useState(0);

  const receiptSamples = [
    {
      key: 'retailBill',
      label: 'Retail',
      data: retailBill,
    },
    {
      key: 'retailGstBill',
      label: 'Retail + GST',
      data: retailGstBill,
    },
    {
      key: 'textileGstBill',
      label: 'Textile + GST',
      data: textileGstBill,
    },
    {
      key: 'duplicateBill',
      label: 'Duplicate',
      data: duplicateBill,
    },
    {
      key: 'textileBill',
      label: 'Textile',
      data: textileBill,
    },
    {
      key: 'a5Clothes',
      label: 'A5 Clothes',
      type: 'clothes',
    },
    {
      key: 'a5Grocery',
      label: 'A5 Grocery',
      type: 'grocery',
    },
    // NEW 4 chips — using billQr data
    { key: 'bill', label: '3" Bill', data: billQrRetail },
    { key: 'RbillQr', label: '3" RBill-QR', data: billQrGst },
    { key: 'Rbillwotax', label: '3" RBill-w/o tax', data: billQrNoTax },
    { key: 'Rbill', label: 'RBill', data: billQrPlain },
    {
      key: 'KOTOrder',
      label: 'KOT Order',
    },
  ];
  useEffect(() => {
    const loadSelectedBillFormat = async () => {
      try {
        const savedId = await AsyncStorage.getItem(
          SELECTED_BILL_FORMAT_KEY
        );

        if (savedId !== null) {
          setSelectedId(Number(savedId));
        }
      } catch (error) {
        console.log('Error loading bill format:', error);
      }
    };

    loadSelectedBillFormat();
  }, []);
  const activeReceipt = receiptSamples[receiptIndex]?.data;

  const activeSample = receiptSamples[receiptIndex];

  const rightScrollRef = useRef(null);
  const handleFormatSelect = async (id) => {
    setSelectedId(id);
    // Always move right preview back to top
    requestAnimationFrame(() => {
      rightScrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    });
  };
  useEffect(() => {
    requestAnimationFrame(() => {
      rightScrollRef.current?.scrollTo({
        y: 0,
        animated: false,
      });
    });
  }, [selectedId]);


  const handleApplyBillFormat = async () => {
    try {
      // Save selected bill format
      await AsyncStorage.setItem(
        SELECTED_BILL_FORMAT_KEY,
        String(selectedId)
      )
      console.log('Applied Bill Format:', selectedId);
      // Go to Dashboard
      navigation.navigate('Dashboard');
    } catch (error) {
      console.log('Error applying bill format:', error);
    }
  };
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>

      {/* HEADER */}
      <View style={styles.headerContainer}>
        <CustomHeader />
      </View>

      {/* MAIN ROW: LEFT + RIGHT */}
      <View style={styles.mainContainer}>

        {/* ============ LEFT PANEL ============ */}
        <View style={[styles.leftPanel, { width: LEFT_COL_WIDTH }]}>
          <View style={styles.leftHeader}>
            <Text style={styles.leftHeaderText} numberOfLines={1}>
              BILL FORMATS ({BILL_FORMATS.length})
            </Text>
          </View>
          <ScrollView
            style={styles.formatScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.formatScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {BILL_FORMATS.map((item) => {
              const selected = selectedId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => handleFormatSelect(item.id)}
                  style={[
                    styles.formatItem,
                    selected && styles.selectedFormatItem,
                  ]}
                >
                  <BillThumbnail selected={selected} />

                  <View style={styles.formatInfo}>
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={[
                        styles.formatTitle,
                        selected && styles.selectedFormatTitle,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <Text style={styles.formatSize} numberOfLines={1}>
                      {item.size}
                    </Text>
                  </View>

                  {selected && (
                    <View style={styles.checkCircle}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.applyContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.applyButton}
              onPress={handleApplyBillFormat}
            >
              <Text style={styles.applyButtonText}>
                Apply Bill Format
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.rightPanel}>
          {(() => {
            const format = BILL_FORMATS.find((f) => f.id === selectedId);
            const sample = RECEIPT_SAMPLES.find((s) => s.key === format?.sampleKey);

            if (!sample) {
              return (
                <View style={styles.emptyPreview}>
                  <Text style={styles.emptyPreviewText}>No preview available</Text>
                </View>
              );
            }

            return (
              <ScrollView
                ref={rightScrollRef}
                style={styles.previewScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.previewScrollContent}
              >
                {sample.key === 'KOTOrder' ? (
                  <KOTOrder />
                ) : sample.type ? (
                  <A5Invoice type={sample.type} />
                ) : (
                  <Receipt bill={sample.data} />
                )}
              </ScrollView>
            );
          })()}
        </View>

      </View>
    </SafeAreaView>
  );
};

export default BillFormats;
const styles = StyleSheet.create({
  /* ---------- MAIN ---------- */
  container: {
    flex: 1, backgroundColor: '#F8F8F8',

  },

  headerContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  mainContainer: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,            // ✅ critical for nested flex + ScrollView
  },

  /* ---------- LEFT PANEL ---------- */
  leftPanel: {
    marginLeft: rS(16),
    marginTop: rV(10),
    marginBottom: rV(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 8,
    minHeight: 0,            // ✅ allows inner ScrollView to size properly
    flexDirection: 'column',
    shadowColor: '#FFFF',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 0.8,
  },

  leftHeader: {
    height: 40,
    backgroundColor: '#E9E9E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },

  leftHeaderText: {
    fontSize: 15,
    color: '#264B79',
    fontFamily: Fonts.FigtreeBold,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  formatScroll: {
    flex: 1,
    minHeight: 0,            // ✅ THE key fix
  },

  formatScrollContent: {
    paddingBottom: rV(8),
  },

  /* ---------- FORMAT LIST ITEM ---------- */
  formatItem: {
    minHeight: rS(20),      // ✅ horizontal-scale, stable across screens
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rS(10),
    paddingVertical: rV(5),
    borderBottomWidth: 1,
    borderBottomColor: '#E6E6E6',
    backgroundColor: '#FFFFFF',
  },

  selectedFormatItem: {
    backgroundColor: '#DFF3FC',
  },

  /* ============================================================ */
  /* THUMBNAIL                                                     */
  /* ============================================================ */

  thumbnailWrapper: {
    width: rS(60),
    height: rV(70),

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: rS(4),
  },

  thumbnail: {
    width: rS(48),
    height: rV(68),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: rS(4),
    paddingTop: rV(9),
    paddingBottom: rV(8),
    elevation: 0.5,
    borderWidth: 0,
  },

  selectedThumbnail: {
    backgroundColor: '#FFFFFF',
  },

  /* ---------- TOP LINES ---------- */

  thumbnailTopLine: {
    width: '100%',
    height: rV(2),
    backgroundColor: '#E3E3E3',
    marginBottom: rV(2),
  },

  thumbnailTopLineSecond: {
    width: '100%',
    height: rV(2.5),
    backgroundColor: '#E3E3E3',
    marginBottom: rV(3),
  },

  /* ---------- SMALL GREY BLOCK ---------- */

  thumbnailGreySmall: {
    width: '100%',
    height: rV(6),

    backgroundColor: '#E3E3E3',
    marginBottom: rV(5),
  },

  /* ---------- LARGE GREY BLOCK ---------- */

  thumbnailGreyLarge: {
    width: '100%',
    height: rV(19),
    backgroundColor: '#E3E3E3',

    marginBottom: rV(5),
  },

  /* ---------- BOTTOM AREA ---------- */

  thumbnailBottomRow: {
    width: '100%',

    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'flex-start',
  },

  thumbnailBottomLineLeft: {
    width: '45%',
    height: rV(3),

    backgroundColor: '#E1E1E1',
  },

  thumbnailBottomRight: {
    width: '45%',

    alignItems: 'flex-end',
  },

  thumbnailBottomLineRight: {
    width: '100%',
    height: rV(2),

    backgroundColor: '#E3E3E3',

    marginBottom: rV(5),
  },

  thumbnailBottomLineRightSmall: {
    width: '65%',
    height: rV(2),
    backgroundColor: '#E3E3E3',
  },

  /* ---------- FORMAT TEXT ---------- */
  formatInfo: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,             // ✅ prevents text overflow
  },

  formatTitle: {
    fontSize: responsiveFontSize(1),
    lineHeight: 18,
    color: '#000000',
    fontWeight: "400",
    fontFamily: Fonts.FigtreeRegular,
    marginBottom: rV(4),
    flexShrink: 1,           // ✅ allows wrapping
  },

  selectedFormatTitle: {
    color: '#235183',
    fontFamily: Fonts.FigtreeMedium,
    fontWeight: "400",
    fontSize: responsiveFontSize(1)
  },

  formatSize: {
    fontSize: 12,
    color: '#969696',
    fontFamily: Fonts.FigtreeRegular,
  },

  /* ---------- APPLY BUTTON ---------- */
  applyContainer: {
    paddingHorizontal: rS(12),
    paddingTop: rV(10),
    paddingBottom: rV(12),
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  applyButton: {
    height: 44,
    backgroundColor: '#264B79',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: "500",
    fontFamily: Fonts.FigtreeMedium,
  },

  /* ---------- RIGHT PANEL ---------- */
  rightPanel: {
    flex: 1,
    minWidth: 0,             // ✅ RN Web flex fix
    backgroundColor: '#F8F8F8',
    marginTop: rV(10),
    marginBottom: rV(12),
  },

  previewScroll: {
    flex: 1,
  },

  previewScrollContent: {
    alignItems: 'center',
  },

  /* ---------- PREVIEW PAPER ---------- */
  previewWrapper: {
    width: rS(694),
    maxWidth: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  previewPaper: {
    paddingHorizontal: rS(18),
    paddingVertical: rV(12),
    minHeight: rV(690),
    backgroundColor: '#FFFFFF',
  },

  previewTopTitle: {
    textAlign: 'center',
    fontSize: 11,
    fontFamily: Fonts.FigtreeBold,
    color: '#222',
    marginBottom: rV(5),
  },

  previewHorizontalLine: {
    height: 1,
    backgroundColor: '#222',
    marginVertical: rV(8),
  },

  previewSectionTitle: {
    fontSize: 10,
    fontFamily: Fonts.FigtreeBold,
    color: '#111',
    marginBottom: rV(6),
  },

  /* ---------- INFO ROW ---------- */
  previewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: rV(5),
  },

  previewLabel: {
    fontSize: 7,
    fontFamily: Fonts.FigtreeBold,
    color: '#222',
    marginRight: rS(3),
  },

  previewValue: {
    fontSize: 7,
    color: '#222',
    marginRight: rS(22),
  },

  /* ---------- ADDRESS ---------- */
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: rS(25),
  },

  addressBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#555',
    minHeight: rV(75),
    padding: rS(7),
  },

  addressTitle: {
    fontSize: 8,
    fontFamily: Fonts.FigtreeBold,
    color: '#222',
    marginBottom: rV(4),
  },

  addressBold: {
    fontSize: 6.5,
    fontFamily: Fonts.FigtreeBold,
    color: '#222',
    marginBottom: rV(2),
  },

  addressText: {
    fontSize: 6.5,
    color: '#222',
    marginBottom: rV(1),
  },

  /* ---------- GOODS TABLE ---------- */
  goodsTable: {
    borderWidth: 1,
    borderColor: '#555',
  },

  goodsHeader: {
    flexDirection: 'row',
    minHeight: rV(28),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },

  goodsRow: {
    flexDirection: 'row',
    minHeight: rV(20),
    borderBottomWidth: 1,
    borderBottomColor: '#777',
  },

  goodsCell: {
    flex: 1,
    fontSize: 7,
    color: '#222',
    textAlign: 'center',
    paddingHorizontal: rS(3),
    paddingVertical: rV(4),
    borderRightWidth: 1,
    borderRightColor: '#777',
  },

  goodsDescription: {
    flex: 1.5,
  },

  goodsTax: {
    flex: 1.35,
    borderRightWidth: 0,
  },

  /* ---------- TOTALS ---------- */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: rV(8),
  },

  totalText: {
    fontSize: 7,
    color: '#222',
    fontFamily: Fonts.FigtreeMedium,
    marginRight: rS(8),
  },

  /* ---------- TRANSPORT ---------- */
  transportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: rV(35),
  },

  transportText: {
    flex: 1,
    fontSize: 7,
    color: '#222',
    marginRight: rS(8),
  },

  /* ---------- VEHICLE ---------- */
  vehicleTable: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#555',
  },

  vehicleHeader: {
    flex: 1,
    fontSize: 6.5,
    textAlign: 'center',
    color: '#222',
    paddingVertical: rV(5),
    paddingHorizontal: rS(2),
    borderRightWidth: 1,
    borderRightColor: '#777',
    fontFamily: Fonts.FigtreeBold,
  },

  vehicleData: {
    flexDirection: 'row',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#555',
  },

  vehicleDataText: {
    flex: 1,
    fontSize: 6.5,
    textAlign: 'center',
    color: '#222',
    paddingVertical: rV(5),
    borderRightWidth: 1,
    borderRightColor: '#777',
  },

  emptyPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPreviewText: {
    fontSize: 14,
    color: '#888',
    fontFamily: Fonts.FigtreeRegular,
  },
  //checked

  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#264B79',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rS(5),
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeBold,
    fontWeight: '700',
  },
});
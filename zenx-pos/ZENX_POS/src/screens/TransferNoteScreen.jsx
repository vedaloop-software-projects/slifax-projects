import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rS, rV, rMS } from '../constants/responsive';
import Fonts from '../constants/Fonts';
import TransferNote from '../components/TransferNote';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import RNPrint from 'react-native-print';
import { useSelector } from 'react-redux';
import { HelperModule } from '../helper/HelperModule';
import Apiservices from '../helper/ApiServices';
import { fmtNum, fmtInt } from '../utils/formatNumber';

const TransferNoteScreen = ({ route, navigation }) => {
  const user = useSelector((state) => state.auth.user);

  const [profile, setProfile] = useState(null);
  const [fetchedTransfer, setFetchedTransfer] = useState(null);
  const [loadingTransfer, setLoadingTransfer] = useState(false);

  const {
    transferData: routeTransferData,
    noteType = 'OUT',
    transferOutId,
    transferInId,
    stockAdjustmentId,
  } = route.params || {};

  const transferData = fetchedTransfer || routeTransferData;
  const items = transferData?.products || [];

  const isTransferIn = noteType === 'IN';
  const isAdjustment = noteType === 'ADJUSTMENT';

  // ---------- 0a. FETCH PROFILE ----------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { getMethod } = HelperModule();
        const res = await getMethod(Apiservices.zenxposGetProfile);
        if (res?.success) setProfile(res.data);
      } catch (err) {
        console.log('Profile fetch error:', err?.response?.data || err?.message);
      }
    };
    fetchProfile();
  }, []);

  // ---------- 0b. FETCH (IN / OUT / ADJUSTMENT) BY ID ----------
  useEffect(() => {
    const isIn = noteType === 'IN';
    const isAdj = noteType === 'ADJUSTMENT';
    const id = isIn ? transferInId : isAdj ? stockAdjustmentId : transferOutId;
    if (!id) return;

    const fetchTransfer = async () => {
      try {
        setLoadingTransfer(true);
        const { postMethod } = HelperModule();

        let endpoint, payload;
        if (isIn) {
          endpoint = Apiservices.zenxposGetTransferInById;
          payload = { transferInId: Number(id) };
        } else if (isAdj) {
          endpoint = Apiservices.zenxposGetStockAdjustmentById;
          payload = { stockAdjustmentId: Number(id) };
        } else {
          endpoint = Apiservices.zenxposGetTransferOutById;
          payload = { transferOutId: Number(id) };
        }

        const res = await postMethod(endpoint, payload);

        if (res?.success && res.data) {
          const d = res.data;
          let mapped;

          if (isAdj) {
            mapped = {
              adjustmentNumber: d.stockAdjustmentId ?? '',
              date: d.stockAdjustmentDate,
              reason: d.reason,
              remarks: d.remarks,
              status: d.status,
              products: (d.products || []).map((p) => {
                const cost = Number(p.costPrice) || 0;
                const q = Number(p.qty) || 0;
                return {
                  id: p.id,
                  dbId: p.id,
                  lineNum: p.lineNum,
                  productId: p.productId,
                  variantId: p.variantId,
                  itemCode: p.productCode ?? '',
                  variantCode: p.packSize ?? '',
                  eanCode: p.eanCode ?? '',
                  itemName: p.productFullName ?? '',
                  costPrice: p.costPrice ?? '0.000',
                  mrp: p.mrp ?? '0.000',
                  qty: String(q),
                  lineReason: p.reason ?? '',
                  totalAmount: (cost * q).toFixed(2),
                };
              }),
            };
          } else if (isIn) {
            mapped = {
              transferOutNumber: d.transferInNumber,
              transferInNumber: d.transferInNumber,
              date: d.transferInDate,
              sendTo: d.receivedFrom,
              receivedFrom: d.receivedFrom,
              remarks: d.remarks,
              status: d.status,
              products: (d.products || []).map((p) => {
                const cost = Number(p.costPrice) || 0;
                const q = Number(p.qty) || 0;
                return {
                  id: p.id,
                  dbId: p.id,
                  lineNum: p.lineNum,
                  productId: p.productId,
                  variantId: p.variantId,
                  itemCode: p.productCode ?? '',
                  variantCode: p.packSize ?? '',
                  eanCode: p.eanCode ?? '',
                  itemName: p.productFullName ?? '',
                  costPrice: p.costPrice ?? '0.000',
                  mrp: p.mrp ?? '0.000',
                  qty: String(q),
                  free: String(p.freeQty ?? '0'),
                  totalAmount: (cost * q).toFixed(2),
                };
              }),
            };
          } else {
            mapped = {
              transferOutNumber: d.transferOutNumber,
              date: d.transferOutDate,
              sendTo: d.sendTo,
              remarks: d.remarks,
              status: d.status,
              products: (d.products || []).map((p) => {
                const cost = Number(p.costPrice) || 0;
                const q = Number(p.qty) || 0;
                return {
                  id: p.id,
                  dbId: p.id,
                  lineNum: p.lineNum,
                  productId: p.productId,
                  variantId: p.variantId,
                  itemCode: p.productCode ?? '',
                  variantCode: p.packSize ?? '',
                  eanCode: p.eanCode ?? '',
                  itemName: p.productFullName ?? '',
                  costPrice: p.costPrice ?? '0.000',
                  mrp: p.mrp ?? '0.000',
                  qty: String(q),
                  totalAmount: (cost * q).toFixed(2),
                };
              }),
            };
          }
          setFetchedTransfer(mapped);
        } else {
          Alert.alert('Error', res?.message || 'Failed to load details.');
        }
      } catch (err) {
        console.error('fetchTransfer error:', err);
        Alert.alert('Error', 'Failed to load details.');
      } finally {
        setLoadingTransfer(false);
      }
    };

    fetchTransfer();
  }, [transferOutId, transferInId, stockAdjustmentId, noteType]);

  // ---------- BUILD META ROWS FOR PDF/CSV ----------
  const buildExportMetaRows = () => {
    const documentDate =
      transferData?.date || transferData?.transferOutDate || '';
    const transferToValue = isTransferIn
      ? transferData?.receivedFrom || '001'
      : isAdjustment
        ? transferData?.reason || 'Damaged'
        : transferData?.sendTo || '002';
    const documentId =
      transferData?.transferOutNumber ||
      transferData?.transferInNumber ||
      transferData?.adjustmentNumber ||
      transferData?.id ||
      '1';

    const statusValue = transferData?.status;
    const statusText =
      statusValue === 1 ? 'Completed' : statusValue === 0 ? 'Pending' : 'Pending';

    const locationLabel = isTransferIn
      ? 'In Location'
      : isAdjustment
        ? 'Location'
        : 'Out Location';
    const transferLabel = isTransferIn
      ? 'Received from'
      : isAdjustment
        ? 'Reason'
        : 'Transferred to';

    const locationCode = profile?.pincode || profile?.locationCode || '';
    const locationName = profile?.city || profile?.locationName || '';
    const locationAddress = [
      profile?.address,
      profile?.city,
      profile?.pincode ? `${profile.pincode}` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const userId = user?.id || user?.userId || profile?.userId || '';

    return [
      { label: 'Note.No', value: documentId },
      { label: `${locationLabel} Code`, value: locationCode },
      { label: `${locationLabel} Name`, value: locationName },
      { label: 'Address', value: locationAddress },
      { label: 'Date', value: documentDate },
      { label: transferLabel, value: transferToValue },
      { label: 'User ID', value: userId },
      { label: 'Status', value: statusText },
      { label: 'Remarks', value: transferData?.remarks || '' },
    ];
  };

  // ---------- 1. DATA MAPPING FOR EXPORTERS ----------
  const getExportData = () => {
    // ADJUSTMENT — same columns as OUT/IN per API response
    if (isAdjustment) {
      const headers = [
        'S.No',
        'P Code',
        'Product Name',
        'Variant Code',
        'EAN Code',
        'MRP',
        'Cost Price',
        'Qty',
        'Amount',
      ];

      const exportRows = items.map((item, index) => ({
        'S.No': index + 1,
        'P Code': item.itemCode || '',
        'Product Name': item.itemName || '',
        'Variant Code': item.variantCode || '',
        'EAN Code': item.eanCode || '',
        MRP: fmtNum(item.mrp),
        'Cost Price': fmtNum(item.costPrice),
        Qty: fmtInt(item.qty),
        Amount: fmtNum(item.totalAmount),
      }));

      const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
      const totalAmt = items
        .reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
        .toFixed(2);

      exportRows.push({
        'S.No': '',
        'P Code': '',
        'Product Name': `ITEMS: ${items.length}`,
        'Variant Code': '',
        'EAN Code': '',
        MRP: '',
        'Cost Price': '',
        Qty: fmtInt(totalQty),
        Amount: `₹${fmtNum(totalAmt)}`,
      });

      return { headers, exportRows };
    }

    // TRANSFER (IN or OUT)
    const headers = [
      'S.No',
      'P Code',
      'Product Name',
      'Variant Code',
      'EAN Code',
      'MRP',
      'Cost Price',
      'Qty',
    ];
    if (isTransferIn) headers.push('Free');
    headers.push('Amount');

    const exportRows = items.map((item, index) => {
      const row = {
        'S.No': index + 1,
        'P Code': item.itemCode || '',
        'Product Name': item.itemName || '',
        'Variant Code': item.variantCode || '',
        'EAN Code': item.eanCode || '',
        MRP: fmtNum(item.mrp),
        'Cost Price': fmtNum(item.costPrice),
        Qty: fmtInt(item.qty),
        Amount: fmtNum(item.totalAmount),
      };
      if (isTransferIn) row['Free'] = fmtInt(item.free);
      return row;
    });

    const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalFree = items.reduce((s, i) => s + (Number(i.free) || 0), 0);
    const totalAmt = items
      .reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
      .toFixed(2);

    const totalsRow = {
      'S.No': '',
      'P Code': '',
      'Product Name': `ITEMS: ${items.length}`,
      'Variant Code': '',
      'EAN Code': '',
      MRP: '',
      'Cost Price': '',
      Qty: fmtInt(totalQty),
      Amount: `₹${fmtNum(totalAmt)}`,
    };
    if (isTransferIn) totalsRow['Free'] = fmtInt(totalFree);

    exportRows.push(totalsRow);
    return { headers, exportRows };
  };

  // ---------- 2. EXPORT PDF ----------
  const handleExportPDF = async () => {
    if (items.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getExportData();
    const fileName = `Note_${noteType}_${Date.now()}`;
    const title = isTransferIn
      ? 'Transfer-IN NOTE'
      : isAdjustment
        ? 'STOCK ADJUSTMENT NOTE'
        : 'Transfer-OUT NOTE';

    await exportToPDF(
      exportRows,
      headers,
      fileName,
      title,
      profile?.businessName || user?.businessName || '',
      buildExportMetaRows(),
    );
  };

  // ---------- 3. EXPORT CSV ----------
  const handleExportCSV = async () => {
    if (items.length === 0) {
      Alert.alert('No Data', 'There are no items to export.');
      return;
    }
    const { headers, exportRows } = getExportData();
    const fileName = `Note_${noteType}_${Date.now()}`;
    const title = isTransferIn
      ? 'Transfer-IN NOTE'
      : isAdjustment
        ? 'STOCK ADJUSTMENT NOTE'
        : 'Transfer-OUT NOTE';

    await exportToCSV(
      exportRows,
      headers,
      fileName,
      profile?.businessName || user?.businessName || '',
      title,
      buildExportMetaRows(),
    );
  };

  // ---------- 4. PRINT ----------
  const handlePrint = async () => {
    if (items.length === 0) {
      Alert.alert('No Data', 'There are no items to print.');
      return;
    }

    const noteTitle = isTransferIn
      ? 'Transfer-IN NOTE'
      : isAdjustment
        ? 'STOCK ADJUSTMENT NOTE'
        : 'Transfer-OUT NOTE';
    const documentDate =
      transferData?.date || transferData?.transferOutDate || 'DD/MM/YYYY';
    const companyName = profile?.businessName || user?.businessName;
    const fullAddress = [
      profile?.address || user?.address,
      profile?.city || user?.city,
    ]
      .filter(Boolean)
      .join(', ');
    const userMobile = profile?.mobile || user?.mobile;
    const gstNo = profile?.gstNumber;
    const remarksText = transferData?.remarks || '';

    const metaRows = buildExportMetaRows();
    const metaPairs = [];
    for (let i = 0; i < metaRows.length; i += 2) {
      metaPairs.push([metaRows[i], metaRows[i + 1] || null]);
    }

    const metaTableHtml = metaRows.length
      ? `
        <table class="meta-table">
          <tbody>
            ${metaPairs
        .map(
          ([left, right]) => `
                  <tr>
                    <td class="meta-label">${left.label}</td>
                    <td class="meta-colon">:</td>
                    <td class="meta-value">${left.value}</td>
                    <td class="meta-label">${right ? right.label : ''}</td>
                    <td class="meta-colon">${right ? ':' : ''}</td>
                    <td class="meta-value">${right ? right.value : ''}</td>
                  </tr>
                `,
        )
        .join('')}
          </tbody>
        </table>
      `
      : '';

    const totalItems = items.length;
    const totalQty = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const totalFree = items.reduce((s, i) => s + (Number(i.free) || 0), 0);
    const totalAmt = items
      .reduce((s, i) => s + (Number(i.totalAmount) || 0), 0)
      .toFixed(2);

    const tableHeaders = `<th>S.No</th><th>P Code</th><th>Product Name</th><th>Variant Code</th><th>EAN Code</th><th class="text-right">MRP</th><th class="text-right">Cost Price</th><th class="text-center">Qty</th>${isTransferIn ? '<th class="text-center">Free</th>' : ''}<th class="text-right">Amount</th>`;
    const tableRows = items
      .map(
        (item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.itemCode || ''}</td>
              <td>${item.itemName || ''}</td>
              <td>${item.variantCode || ''}</td>
              <td>${item.eanCode || ''}</td>
              <td class="text-right">${fmtNum(item.mrp)}</td>
              <td class="text-right">${fmtNum(item.costPrice)}</td>
              <td class="text-center">${fmtInt(item.qty)}</td>
              ${isTransferIn ? `<td class="text-center">${fmtInt(item.free)}</td>` : ''}
              <td class="text-right">${fmtNum(item.totalAmount)}</td>
            </tr>
          `,
      )
      .join('');
    const totalRow = `<td colspan="5" class="text-right">ITEMS: ${totalItems}</td><td class="text-right"></td><td class="text-right"></td><td class="text-center">${fmtInt(totalQty)}</td>${isTransferIn ? `<td class="text-center">${fmtInt(totalFree)}</td>` : ''}<td class="text-right">₹${fmtNum(totalAmt)}</td>`;

    const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 22px; }
            .header p { margin: 2px 0; font-size: 12px; }
            .header .gst { font-weight: bold; font-size: 13px; margin-top: 5px; }
            .thick-divider { border-bottom: 2px solid #000; margin: 10px 0; }
            .thin-divider { border-bottom: 1px solid #000; margin: 8px 0; }
            .note-title { text-align: center; font-weight: bold; font-size: 14px; margin: 5px 0; }
            .meta-table { width: 100%; border-collapse: collapse; margin: 15px 0 20px 0; border: 1px solid #ddd; background: #F7F9FC; }
            .meta-table td { padding: 5px 8px; font-size: 11px; vertical-align: top; border: none; word-break: break-word; }
            .meta-table .meta-label { width: 14%; font-weight: bold; color: #555; }
            .meta-table .meta-colon { width: 2%; color: #555; }
            .meta-table .meta-value { width: 34%; color: #000; }
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .table th, .table td { border: 1px solid #ddd; padding: 6px; font-size: 11px; text-align: left; }
            .table th { background-color: #F5F5F5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals-row { background-color: #F9F9F9; font-weight: bold; }
            .footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; }
            .footer-right { text-align: right; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${companyName ? `<h1>${companyName.toUpperCase()}</h1>` : ''}
            ${fullAddress || userMobile
        ? `<p>${fullAddress || ''}${fullAddress && userMobile ? ' &nbsp;|&nbsp; ' : ''}${userMobile ? `Contact: ${userMobile}` : ''}</p>`
        : ''
      }
            ${gstNo ? `<p class="gst">GST.NO: ${gstNo}</p>` : ''}
          </div>
          <div class="thick-divider"></div>
          <div class="note-title">${noteTitle}</div>
          <div class="thin-divider"></div>

          ${metaTableHtml}

          <table class="table">
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>
              ${tableRows}
              <tr class="totals-row">${totalRow}</tr>
            </tbody>
          </table>

          <div class="footer">
            <div>
              ${remarksText ? `<p><b>REMARKS</b></p><p>${remarksText}</p>` : ''}
            </div>
            <div class="footer-right">
              ${companyName ? `<p>For: ${companyName}</p>` : ''}
              <br/><br/>
              <p>Authorized Signatory</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      await RNPrint.print({ html: htmlContent });
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert('Error', 'Could not generate Print view');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {loadingTransfer ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#264B79" />
          <Text style={styles.loaderText}>Loading Transfer Note...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <TransferNote
            data={transferData}
            noteType={noteType}
            profile={profile}
          />
        </ScrollView>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionButton, loadingTransfer && { opacity: 0.5 }]}
          onPress={handlePrint}
          disabled={loadingTransfer}>
          <Text style={styles.actionButtonText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, loadingTransfer && { opacity: 0.5 }]}
          onPress={handleExportPDF}
          disabled={loadingTransfer}>
          <Text style={styles.actionButtonText}>Export PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, loadingTransfer && { opacity: 0.5 }]}
          onPress={handleExportCSV}
          disabled={loadingTransfer}>
          <Text style={styles.actionButtonText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={() => {
            const type = String(noteType || '').trim().toUpperCase();

            let targetScreen = null;
            if (type === 'OUT') targetScreen = 'StockTransferOutScreen';
            else if (type === 'IN') targetScreen = 'StockTransferInScreen';
            else if (type === 'ADJUSTMENT') targetScreen = 'StockAdjustmentScreen';

            if (targetScreen) {
              navigation.popToTop();
              navigation.navigate('MainApp', { screen: targetScreen });
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default TransferNoteScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E5E5E5' },
  scrollContainer: {
    padding: rS(8),
    alignItems: 'center',
    paddingBottom: rV(60),
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: {
    marginTop: rV(10),
    color: '#264B79',
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: rV(42),
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: rS(14),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 5,
  },
  actionButton: {
    height: rV(26),
    paddingHorizontal: rS(10),
    borderRadius: rS(5),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: rS(6),
    backgroundColor: '#264B79',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: rMS(8),
    fontFamily: Fonts.FigtreeSemiBold,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#264B79',
  },
  secondaryButtonText: { color: '#264B79' },
});
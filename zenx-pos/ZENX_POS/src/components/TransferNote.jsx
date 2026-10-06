import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Fonts from '../constants/Fonts';
import { fmtNum, fmtInt } from '../utils/formatNumber';

const BASE_W = 595;
const BASE_H = 842;

const COLS_OUT = { sno: 5, code: 12, variant: 11, ean: 15, name: 22, cp: 11, mrp: 11, qty: 6, amt: 10 };
const COLS_IN = { sno: 5, code: 12, variant: 11, ean: 15, name: 20, cp: 10, mrp: 10, qty: 5, free: 5, amt: 10 };
// 🔥 ADJUSTMENT — same layout as OUT (matches API: qty, costPrice, mrp)
const COLS_ADJ = { sno: 5, code: 12, variant: 11, ean: 15, name: 22, cp: 11, mrp: 11, qty: 6, amt: 10 };

const dummyDataOUT = {
    transferOutNumber: 'OUT-001', date: '02/04/2026', sendTo: '002',
    remarks: 'Transferring stock to Main Branch', status: 1,
    products: [
        { itemCode: 'BR-21', variantCode: 'FR-43', eanCode: '9876543210123', itemName: 'Basmati Rice - 5 Kg', costPrice: 20000.98, mrp: 20000.98, qty: 10, totalAmount: 200009.80 },
    ],
};

const dummyDataIN = {
    transferOutNumber: 'IN-001', date: '02/04/2026', receivedFrom: '001',
    remarks: 'Received stock from Warehouse', status: 1,
    products: [
        { itemCode: 'BR-21', variantCode: 'FR-43', eanCode: '9876543210123', itemName: 'Basmati Rice - 5 Kg', costPrice: 20000.98, mrp: 20000.98, qty: 10, free: 1, totalAmount: 200009.80 },
    ],
};

const dummyDataADJ = {
    adjustmentNumber: 'ADJ-001', date: '02/04/2026', reason: 'Damaged / Expired',
    remarks: 'Stock adjustment for expired goods', status: 1,
    products: [
        { itemCode: 'BR-21', variantCode: 'FR-43', eanCode: '9876543210123', itemName: 'Basmati Rice - 5 Kg', costPrice: 20000.98, mrp: 20000.98, qty: 5, totalAmount: 100004.90 },
    ],
};

const TransferNote = ({ data, noteType = 'OUT', profile }) => {
    const user = useSelector((state) => state.auth.user);

    const isTransferIn = noteType === 'IN';
    const isAdjustment = noteType === 'ADJUSTMENT';

    const defaultData = isTransferIn ? dummyDataIN : isAdjustment ? dummyDataADJ : dummyDataOUT;
    const activeData = data || defaultData;

    const [pageW, setPageW] = useState(BASE_W);
    const k = pageW / BASE_W;
    const styles = useMemo(() => makeStyles(k), [k]);

    const w = isTransferIn ? COLS_IN : isAdjustment ? COLS_ADJ : COLS_OUT;
    const col = (key) => ({ width: `${w[key]}%` });

    const noteTitle = isTransferIn
        ? 'Transfer-IN NOTE'
        : isAdjustment
            ? 'STOCK ADJUSTMENT NOTE'
            : 'Transfer-OUT NOTE';
    const transferLabel = isTransferIn
        ? 'Recieved from'
        : isAdjustment
            ? 'Reason'
            : 'Transferred to';
    const locationLabel = isTransferIn
        ? 'In Location'
        : isAdjustment
            ? 'Location'
            : 'Out Location';

    const items = activeData?.products || [];
    const documentDate = activeData?.date || activeData?.transferOutDate || 'DD/MM/YYYY';
    const transferToValue = isTransferIn
        ? activeData?.receivedFrom || '001'
        : isAdjustment
            ? activeData?.reason || 'Damaged'
            : activeData?.sendTo || '002';
    const documentId =
        activeData?.transferOutNumber ||
        activeData?.adjustmentNumber ||
        activeData?.id ||
        '';
    const remarksText = activeData?.remarks;

    const statusValue = activeData?.status;
    const statusText =
        statusValue === 1 ? 'Completed' : statusValue === 0 ? 'Pending' : 'Pending';

    const totalItems = items.length;

    const totalQty = items.reduce(
        (sum, item) => sum + (Number(item.qty) || 0),
        0
    );

    const totalFree = items.reduce(
        (sum, item) => sum + (Number(item.free) || 0),
        0
    );

    // AMOUNT TOTAL
    const totalAmount = items
        .reduce((sum, item) => {
            const amount =
                Number(item.totalAmount) ||
                (Number(item.costPrice) || 0) * (Number(item.qty) || 0);

            return sum + amount;
        }, 0)
        .toFixed(2);

    const companyName = profile?.businessName || user?.businessName;
    const fullAddress = [profile?.address || user?.address, profile?.city || user?.city]
        .filter(Boolean)
        .join(', ');
    const userMobile = profile?.mobile || user?.mobile;
    const gstNo = profile?.gstNumber;

    const userId = user?.id || user?.userId || profile?.userId || '';

    const locationCode = profile?.pincode || profile?.locationCode || '';
    const locationName = profile?.city || profile?.locationName || '';
    const locationAddress = [
        profile?.address,
        profile?.city,
        profile?.pincode ? `${profile.pincode}` : null,
    ]
        .filter(Boolean)
        .join(', ');

    const MetaRow = ({ label, value, numberOfLines = 2 }) => (
        <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{label}</Text>
            <Text style={styles.metaColon}>:</Text>
            <Text style={styles.metaValue} numberOfLines={numberOfLines}>
                {value}
            </Text>
        </View>
    );

    return (
        <View
            style={[styles.page, { minHeight: pageW * (BASE_H / BASE_W) }]}
            onLayout={(e) => setPageW(e.nativeEvent.layout.width)}
        >
            {companyName || fullAddress || userMobile || gstNo ? (
                <View style={styles.header}>
                    {companyName ? (
                        <Text style={styles.companyName}>{companyName.toUpperCase()}</Text>
                    ) : null}

                    {fullAddress || userMobile ? (
                        <View style={styles.addressRow}>
                            {fullAddress ? <Text style={styles.subText}>{fullAddress}</Text> : null}
                            {fullAddress && userMobile ? <View style={styles.vBar} /> : null}
                            {userMobile ? <Text style={styles.subText}>Contact: {userMobile}</Text> : null}
                        </View>
                    ) : null}

                    {gstNo ? <Text style={styles.gstText}>GST.NO: {gstNo}</Text> : null}
                </View>
            ) : null}

            <View style={styles.line} />
            <Text style={styles.noteTitle}>{noteTitle}</Text>
            <View style={styles.line} />

            <View style={styles.meta}>
                <View style={styles.metaLeft}>
                    {documentId ? <MetaRow label="Note.No" value={documentId} /> : null}
                    <MetaRow label={`${locationLabel} Code`} value={locationCode} />
                    <MetaRow label={`${locationLabel} Name`} value={locationName} />
                    <MetaRow label="Address" value={locationAddress} numberOfLines={3} />
                </View>
                <View style={styles.metaRight}>
                    <MetaRow label="Date" value={documentDate} />
                    <MetaRow label={transferLabel} value={transferToValue} />
                    {userId ? <MetaRow label="User ID" value={userId} /> : null}
                    <MetaRow label="Status" value={statusText} />
                </View>
            </View>

            <View style={styles.tableHeader}>
                <Text style={[styles.th, col('sno')]}>S.No</Text>
                <Text style={[styles.th, col('code')]}>P Code</Text>
                <Text style={[styles.th, col('name')]}>Product Name</Text>
                <Text style={[styles.th, col('variant')]}>Variant Code</Text>
                <Text style={[styles.th, col('ean')]}>EAN Code</Text>
                <Text style={[styles.th, col('mrp')]}>MRP</Text>
                <Text style={[styles.th, col('cp')]}>Cost Price</Text>
                <Text style={[styles.th, col('qty')]}>Qty</Text>
                {isTransferIn && <Text style={[styles.th, col('free')]}>Free</Text>}
                <Text style={[styles.th, col('amt')]}>Amount</Text>
            </View>

            <View style={styles.tableBody}>
                {items.map((item, index) => (
                    <View key={index} style={styles.tr}>
                        <Text style={[styles.td, col('sno')]}>{index + 1}</Text>
                        <Text style={[styles.td, col('code')]} numberOfLines={1}>{item.itemCode || ''}</Text>
                        <Text style={[styles.td, col('name')]} numberOfLines={1}>{item.itemName || ''}</Text>
                        <Text style={[styles.td, col('variant')]} numberOfLines={1}>{item.variantCode || ''}</Text>
                        <Text style={[styles.td, col('ean')]} numberOfLines={1}>{item.eanCode || ''}</Text>
                        <Text style={[styles.td, col('mrp')]}>{fmtNum(item.mrp)}</Text>
                        <Text style={[styles.td, col('cp')]}>{fmtNum(item.costPrice)}</Text>
                        <Text style={[styles.td, col('qty')]}>{fmtInt(item.qty)}</Text>
                        {isTransferIn && <Text style={[styles.td, col('free')]}>{fmtInt(item.free)}</Text>}
                        <Text style={[styles.td, col('amt')]}>
                            {fmtNum(item.totalAmount ?? (Number(item.costPrice) || 0) * (Number(item.qty) || 0))}
                        </Text>
                    </View>
                ))}
                {items.length === 0 && <Text style={styles.emptyText}>No Items Found</Text>}
            </View>

            <View style={styles.dashWrap}><View style={styles.dashInner} /></View>

            <View style={styles.totalsRow}>
                <View style={{ width: `${w.sno + w.code + w.variant + w.ean}%` }} />
                <View style={[styles.totalCell, col('name')]}>
                    <Text style={styles.totalText}>ITEMS: {totalItems}</Text>
                </View>
                <View style={[styles.totalCell, col('mrp')]}>
                    <Text style={styles.totalText}></Text>
                </View>
                <View style={[styles.totalCell, col('cp')]}>
                    <Text style={styles.totalText}></Text>
                </View>
                <View style={[styles.totalCell, col('qty')]}>
                    <Text style={styles.totalText}>{fmtInt(totalQty)}</Text>
                </View>
                {isTransferIn && (
                    <View style={[styles.totalCell, col('free')]}>
                        <Text style={styles.totalText}>{fmtInt(totalFree)}</Text>
                    </View>
                )}
                <View style={[styles.totalCell, col('amt')]}>
                    <Text style={styles.totalText}>₹{fmtNum(totalAmount)}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <View style={styles.footerLeft}>
                    {remarksText ? (
                        <>
                            <Text style={styles.footerTitle}>REMARKS</Text>
                            <Text style={styles.footerText}>{remarksText}</Text>
                        </>
                    ) : null}
                </View>
                <View style={styles.footerRight}>
                    <View style={styles.forRow}>
                        <Text style={styles.footerText}>For :</Text>
                        {companyName ? (
                            <Text style={[styles.footerText_new, { marginLeft: 5 * k }]}>
                                {companyName}
                            </Text>
                        ) : null}
                    </View>
                    <Text style={[styles.footerText, { marginTop: 8 * k }]}>
                        Authorized Signatory
                    </Text>
                </View>
            </View>
        </View>
    );
};

const makeStyles = (k) => {
    const s = (n) => n * k;
    return StyleSheet.create({
        page: { width: '100%', maxWidth: 900, backgroundColor: '#FFFF', padding: s(12) },
        header: { alignItems: 'center', marginBottom: s(11) },
        companyName: {
            fontSize: 18, lineHeight: s(10), fontFamily: Fonts.FigtreeSemiBold,
            color: '#000', letterSpacing: s(0.6), fontWeight: '600',
        },
        addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: s(6) },
        subText: { fontSize: s(9), fontFamily: Fonts.FigtreeRegular, color: '#000', letterSpacing: s(0.5) },
        vBar: { width: 1, height: s(11), backgroundColor: '#B5B5B5', marginHorizontal: s(10) },
        gstText: { fontSize: s(9.5), fontFamily: Fonts.FigtreeSemiBold, color: '#000', marginTop: s(9), letterSpacing: s(0.5) },
        line: { height: 0.5, backgroundColor: '#000000' },
        noteTitle: {
            textAlign: 'center', fontSize: s(9.5), fontFamily: Fonts.FigtreeRegular,
            color: '#000', letterSpacing: s(0.4), paddingVertical: s(7),
        },
        meta: { flexDirection: 'row', marginTop: s(9), marginBottom: s(10) },
        metaLeft: { width: '61%' },
        metaRight: { width: '39%' },
        metaRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: s(5) },
        metaLabel: { width: s(90), fontSize: s(9), lineHeight: s(17), fontFamily: Fonts.FigtreeRegular, color: '#000', letterSpacing: s(0.2) },
        metaColon: { width: s(14), fontSize: s(9), lineHeight: s(17), fontFamily: Fonts.FigtreeRegular, color: '#000' },
        metaValue: { flex: 1, fontSize: s(9), lineHeight: s(17), fontFamily: Fonts.FigtreeRegular, color: '#000', letterSpacing: s(0.2) },
        tableHeader: { flexDirection: 'row', backgroundColor: '#EEEEEE', paddingVertical: s(7), alignItems: 'center' },
        th: { fontSize: s(8), fontFamily: Fonts.FigtreeMedium, color: '#2A2A2A', letterSpacing: 0.2, fontWeight: '500', paddingHorizontal: s(4) },
        tableBody: { paddingTop: s(6) },
        tr: { flexDirection: 'row', alignItems: 'center', height: s(20) },
        td: { fontSize: s(8), fontFamily: Fonts.FigtreeRegular, color: '#000', paddingHorizontal: s(4), textAlign: 'left', fontWeight: '400' },
        emptyText: { textAlign: 'center', paddingVertical: s(20), color: '#999', fontSize: s(10) },
        dashWrap: { height: 1, overflow: 'hidden', marginTop: s(6) },
        dashInner: { height: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: '#9A9A9A', borderRadius: 1 },
        totalsRow: { flexDirection: 'row', alignItems: 'center', height: s(26), marginTop: s(2) },
        footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: s(36) },
        footerLeft: { flex: 1 },
        footerRight: { flex: 1, alignItems: 'flex-end' },
        forRow: { flexDirection: 'row' },
        footerTitle: { fontSize: s(8), fontFamily: Fonts.FigtreeSemiBold, color: '#000', marginBottom: s(4), fontWeight: '600' },
        footerText: { fontSize: s(8), fontFamily: Fonts.FigtreeRegular, color: '#000000', fontWeight: '400' },
        footerText_new: { fontSize: s(8), fontFamily: Fonts.FigtreeRegular, color: '#000000', fontWeight: '400', textAlign: 'left' },
        totalCell: { justifyContent: 'center', height: '100%', alignItems: 'flex-start', paddingHorizontal: s(2) },
        totalText: { fontSize: s(8), fontFamily: Fonts.FigtreeRegular, color: '#000', textAlign: 'center' },
    });
};

export default TransferNote;
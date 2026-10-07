import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import Fonts from '../../constants/Fonts';
import { responsiveWidth } from 'react-native-responsive-dimensions';

const FIGMA_WIDTH = 576;
const FIGMA_HEIGHT = 651;

const KOTOrder = () => {
    const { width: screenWidth } = useWindowDimensions();
    const SCALE = Math.min(screenWidth / FIGMA_WIDTH, 1);

    const W = value => value * SCALE;
    const H = value => value * SCALE;
    const F = value => value * SCALE;


    const kotData = {
        restaurantName: 'DOLPHIN MULTI-CUISINE RESTAURANT',
        kotNo: 'KOT231',
        waiter: 'Mohan',
        date: '23-06-2026',
        time: '2:07 PM',
    };

    // =========================================================
    // ITEMS
    // =========================================================

    const items = [
        {
            name: 'Chicken Dum Biryani-Full',
            qty: 2,
            note: 'Less Spicy, do not use curd',
            price: 400,
        },
        {
            name: 'Chicken Dum Biryani-Full',
            qty: 1,
            note: 'Less Spicy, do not use curd',
            price: 200,
        },
        {
            name: 'Chicken Dum Biryani-Full',
            qty: 1,
            note: 'Less Spicy, do not use curd',
            price: 200,
        },
        {
            name: 'Chicken Dum Biryani-Full',
            qty: 1,
            note: 'Less Spicy, do not use curd',
            price: 200,
        },
    ];

    // =========================================================
    // TOTAL
    // =========================================================

    const totalQty = items.reduce(
        (total, item) => total + item.qty,
        0,
    );

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <View style={styles.screen}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingVertical: H(20),
                    },
                ]}
            >

                <View
                    style={[
                        styles.kotPaper,
                        {
                            width: W(FIGMA_WIDTH),
                            height: H(FIGMA_HEIGHT),
                            paddingTop: H(38),
                            paddingBottom: H(25),
                        },
                    ]}
                >
                    {/* =================================================
              RESTAURANT NAME
          ================================================= */}

                    <Text
                        style={[
                            styles.restaurantName,
                            {
                                width: W(496),
                                fontSize: F(21),
                                lineHeight: F(25),
                                marginBottom: H(23),
                            },
                        ]}
                    >
                        {kotData.restaurantName}
                    </Text>



                    <View
                        style={[
                            styles.infoBox,
                            {
                                width: W(516),
                                minHeight: H(72),
                                borderRadius: W(9),
                                paddingHorizontal: W(17),
                                paddingVertical: H(13),
                                marginBottom: H(36),
                            },
                        ]}
                    >
                        {/* LEFT SIDE */}

                        <View style={styles.infoLeft}>
                            <Text
                                style={[
                                    styles.infoText,
                                    styles.boldText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(21),
                                    },
                                ]}
                            >
                                KOT.No: {kotData.kotNo}
                            </Text>

                            <Text
                                style={[
                                    styles.infoText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(21),
                                    },
                                ]}
                            >
                                Waiter: {kotData.waiter}
                            </Text>
                        </View>

                        {/* RIGHT SIDE */}

                        <View
                            style={[
                                styles.infoRight,
                                {
                                    width: W(150),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.infoText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(21),
                                    },
                                ]}
                            >
                                Date: {kotData.date}
                            </Text>

                            <Text
                                style={[
                                    styles.infoText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(21),
                                    },
                                ]}
                            >
                                Time: {kotData.time}
                            </Text>
                        </View>
                    </View>

                    {/* =================================================
              TABLE HEADER
          ================================================= */}

                    <View
                        style={[
                            styles.tableHeader,
                            {
                                width: W(484),
                                height: H(75),
                                borderRadius: W(18),
                                paddingHorizontal: W(20),
                                paddingVertical: H(14),
                                marginBottom: H(8),
                            },
                        ]}
                    >
                        {/* LEFT */}

                        <View style={styles.headerLeft}>
                            <Text
                                style={[
                                    styles.headerText,
                                    {
                                        fontSize: F(16),
                                        lineHeight: F(20),
                                    },
                                ]}
                            >
                                Item Name
                            </Text>

                            <Text
                                style={[
                                    styles.headerText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(20),
                                    },
                                ]}
                            >
                                Note
                            </Text>
                        </View>

                        {/* RIGHT */}

                        <View
                            style={[
                                styles.headerRight,
                                {
                                    width: W(60),
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.headerText,
                                    {
                                        fontSize: F(16),
                                        lineHeight: F(20),
                                    },
                                ]}
                            >
                                Qty
                            </Text>

                            <Text
                                style={[
                                    styles.headerText,
                                    {
                                        fontSize: F(15),
                                        lineHeight: F(20),
                                    },
                                ]}
                            >
                                Price
                            </Text>
                        </View>
                    </View>

                    {/* =================================================
              ITEMS
          ================================================= */}

                    <View
                        style={[
                            styles.itemsContainer,
                            {
                                width: W(484),
                            },
                        ]}
                    >
                        {items.map((item, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.itemRow,
                                    {
                                        minHeight: H(70),
                                        paddingHorizontal: W(20),
                                        paddingTop: H(10),
                                        paddingBottom: H(9),
                                    },
                                    index !== items.length - 1 && {
                                        borderBottomWidth: W(0.7),
                                    },
                                ]}
                            >
                                {/* ITEM NAME + NOTE */}

                                <View
                                    style={[
                                        styles.itemDetails,
                                        {
                                            paddingRight: W(10),
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.itemName,
                                            {
                                                fontSize: F(15),
                                                lineHeight: F(20),
                                            },
                                        ]}
                                    >
                                        {item.name}
                                    </Text>

                                    <Text
                                        style={[
                                            styles.itemNote,
                                            {
                                                fontSize: F(13),
                                                lineHeight: F(18),
                                                marginTop: H(7),
                                            },
                                        ]}
                                    >
                                        {item.note}
                                    </Text>
                                </View>

                                {/* QTY */}

                                <View
                                    style={[
                                        styles.qtyContainer,
                                        {
                                            width: W(60),
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.qtyText,
                                            {
                                                fontSize: F(15),
                                                lineHeight: F(20),
                                            },
                                        ]}
                                    >
                                        {item.qty}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.price_,
                                            {
                                                fontSize: F(15),
                                                lineHeight: F(20),
                                            },
                                        ]}
                                    >
                                        {item.price}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* =================================================
              DASHED SEPARATOR
          ================================================= */}

                    <View
                        style={[
                            styles.dashedContainer,
                            {
                                width: W(484),
                                height: H(3),
                                paddingHorizontal: W(20),
                                marginTop: H(5),
                                marginBottom: H(13),
                            },
                        ]}
                    >
                        {Array.from({ length: 45 }).map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dash,
                                    {
                                        width: W(7),
                                        height: H(1),
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* =================================================
              TOTAL
          ================================================= */}

                    <View
                        style={[
                            styles.totalRow,
                            {
                                width: W(484),
                                paddingHorizontal: W(20),
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.totalText,
                                {
                                    fontSize: F(15),
                                    lineHeight: F(20),
                                },
                            ]}
                        >
                            Total Items/Qty:
                        </Text>

                        <Text
                            style={[
                                styles.totalValue,
                                {
                                    fontSize: F(15),
                                    lineHeight: F(20),
                                },
                            ]}
                        >
                            {items.length}/{totalQty}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default KOTOrder;

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
    // =========================================================
    // SCREEN
    // =========================================================

    screen: {
        flex: 1,
        backgroundColor: '#fff',
    },

    scrollContent: {
        alignItems: 'center',
    },

    // =========================================================
    // KOT PAPER
    // =========================================================

    kotPaper: {
        backgroundColor: '#FFFFFF',
        alignSelf: 'center',
    },

    // =========================================================
    // RESTAURANT NAME
    // =========================================================

    restaurantName: {
        alignSelf: 'center',
        textAlign: 'center',
        fontFamily: Fonts.FigtreeBold,
        color: '#00000',
        fontWeight: 'bold',
        letterSpacing: 0.4,
    },

    // =========================================================
    // INFO BOX
    // =========================================================

    infoBox: {
        alignSelf: 'center',
        backgroundColor: '#F5F4F4',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    // =========================================================
    // INFO LEFT
    // =========================================================

    infoLeft: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },

    // =========================================================
    // INFO RIGHT
    // =========================================================

    infoRight: {
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        fontFamily: Fonts.FigtreeRegular
    },

    // =========================================================
    // INFO TEXT
    // =========================================================

    infoText: {
        color: '#000000',
        fontWeight: '400',
        includeFontPadding: false,
        fontFamily: Fonts.FigtreeRegular
    },

    boldText: {
        fontWeight: '700',
        fontFamily: Fonts.FigtreeBold
    },

    // =========================================================
    // TABLE HEADER
    // =========================================================

    tableHeader: {
        alignSelf: 'center',
        backgroundColor: '#000000',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    // =========================================================
    // HEADER LEFT
    // =========================================================

    headerLeft: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },

    // =========================================================
    // HEADER RIGHT
    // =========================================================

    headerRight: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },

    // =========================================================
    // HEADER TEXT
    // =========================================================

    headerText: {
        color: '#FFFFFF',
        fontWeight: '400',
        includeFontPadding: false,
        fontFamily: Fonts.FigtreeRegular

    },

    // =========================================================
    // ITEMS
    // =========================================================

    itemsContainer: {
        alignSelf: 'center',
    },

    itemRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    // =========================================================
    // ITEM DETAILS
    // =========================================================

    itemDetails: {
        flex: 1,
    },

    // =========================================================
    // ITEM NAME
    // =========================================================

    itemName: {
        color: '#000000',
        fontWeight: '400',
        includeFontPadding: false,
        fontFamily: Fonts.FigtreeRegular
    },

    // =========================================================
    // ITEM NOTE
    // =========================================================

    itemNote: {
        color: '#000000',
        fontWeight: '400',
        fontFamily: Fonts.FigtreeRegular,
        includeFontPadding: false,
    },

    // =========================================================
    // QTY
    // =========================================================

    qtyContainer: {
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
    },

    qtyText: {
        color: '#000000',
        fontWeight: '400',
        includeFontPadding: false,
    },
    price_: {
        color: '#000000',
        fontWeight: '400',
        paddingLeft: responsiveWidth(2),
    },
    dashedContainer: {
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
    },

    dash: {
        backgroundColor: '#000000',
    },

    // =========================================================
    // TOTAL
    // =========================================================

    totalRow: {
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    totalText: {
        color: '#000000',
        fontWeight: '400',
        fontFamily: Fonts.FigtreeRegular,
        includeFontPadding: false,
        letterSpacing: 2,
    },

    totalValue: {
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: '400',
        includeFontPadding: false,
    },
});
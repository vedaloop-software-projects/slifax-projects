import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import { rS, rV, rMS } from '../constants/responsive';
import { responsiveHeight } from 'react-native-responsive-dimensions';
import LinearGradient from 'react-native-linear-gradient';
import PointOfSaleIcon from '../assets/Icons/PointOfSaleIcon';
import ProductManagementIcon from '../assets/Icons/ProductManagementIcon';
import CustomerManagementIcon from '../assets/Icons/CustomerManagementIcon'
import MultiBusinessIcon from '../assets/Icons/MultiBusinessIcon'
import ReportsAndInsertsIcon from '../assets/Icons/ReportsAndInsertsIcon'
import CloudAccessIcon from '../assets/Icons/CloudAccessIcon'
const AboutUsScreen = () => {
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 700;
    const features = [
        {
            title: `Point of Sale \n & Billing `,
            icon: <PointOfSaleIcon />,
            bg: '#FFF3FA',
            iconColor: '#E278B5',
        },
        {
            title: 'Product \n  Management',
            icon: <ProductManagementIcon />,
            bg: '#F6F6F6',
            iconColor: '#999999',
        },
        {
            title: 'Customer \n  Management',
            icon: <CustomerManagementIcon />,
            bg: '#EFFBED',
            iconColor: '#F4FFF0',
        },
        {
            title: 'Reports & Insights',
            subtitle: '',
            icon: <ReportsAndInsertsIcon />,
            bg: '#FFF6F0',
            iconColor: '#D99A6A',
        },
        {
            title: 'Multi-Business \n  Support',
            icon: <MultiBusinessIcon />,
            bg: '#F4F3FF',
            iconColor: '#8174D5',
        },
        {
            title: 'Cloud Access \n  Anytime, Anywhere',
            icon: <CloudAccessIcon />,
            bg: '#EFF8FF',
            iconColor: '#EEF9FF',
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >

                <View style={styles.pageHeader}>
                    <View style={styles.header_style}>
                        <Text style={styles.pageTitle}>
                            About
                        </Text><Image
                            source={require('../assets/Images/loginZenxpos.png')}
                            style={styles.pageTitleLogo}
                            resizeMode="contain"
                        />
                    </View>

                    <Text style={styles.breadcrumb}>
                        About us
                    </Text>
                </View>

                {/* MAIN CARD */}
                <View
                    style={[
                        styles.mainCard,
                        isSmallScreen && styles.mainCardSmall,
                    ]}
                >
                    {/* TOP CONTENT */}
                    <View
                        style={[
                            styles.topSection,
                            isSmallScreen && styles.topSectionSmall,
                        ]}
                    >
                        {/* LEFT CONTENT */}
                        <View
                            style={[
                                styles.contentSection,
                                !isSmallScreen && styles.contentSectionDesktop,
                            ]}
                        >
                            <Text style={styles.heading}>
                                <Text style={styles.headingDark}>
                                    One Platform, Multiple Business{'\n'}
                                </Text>

                                <Text style={styles.headingBlue}>
                                    Smarter Operations
                                </Text>
                            </Text>

                            <Text style={styles.description}>
                                ZenXPOS is a cloud-based POS and business management platform designed to simplify the way businesses handle their everyday operations. From billing and sales to inventory, products, customers and reports, everything you need is brought together in one simple and powerful platform. Whether you run a textile store, retail outlet, supermarket, restaurant, salon or other business, ZenXPOS helps you manage your operations efficiently while keeping your business connected and organized. With real-time access to business information, you can monitor performance, manage inventory and make smarter decisions from anywhere.
                            </Text>

                            <Text style={styles.description}>
                                ZenXPOS adapts to the unique needs of different businesses. Manage products and sales in textile and retail stores, keep supermarket inventory and billing under control, simplify restaurant orders and billing, or manage salon services and customer appointments — all from one integrated platform. With ZenXPOS, your business stays connected wherever you are. Access your sales, inventory, customers and reports through a secure cloud-based platform, giving you greater control and visibility over your business every day.
                            </Text>


                        </View>
                        {/* IMAGE SECTION */}
                        <View
                            style={[
                                styles.imageSection,
                                isSmallScreen && styles.imageSectionSmall,
                            ]}
                        >
                            <Image
                                source={require('../assets/Images/aboutUs.png')}
                                style={[
                                    styles.aboutImage,
                                    isSmallScreen && styles.aboutImageSmall,
                                ]}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                    <View
                        style={[
                            styles.featureContainer,
                            isSmallScreen && styles.featureContainerSmall,
                        ]}
                    >
                        {features.map((item, index) => (
                            <React.Fragment key={item.title}>
                                <View
                                    style={[
                                        styles.featureItem,
                                        isSmallScreen &&
                                        styles.featureItemSmall,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.featureIcon,
                                            {
                                                backgroundColor: item.bg,
                                            },
                                        ]}
                                    >
                                        {item.icon}
                                    </View>

                                    <View>
                                        <Text style={styles.featureTitle}>
                                            {item.title}
                                        </Text>
                                    </View>
                                </View>

                                {index !== features.length - 1 && (
                                    <View
                                        style={[
                                            styles.featureDivider,
                                            isSmallScreen && styles.featureDividerSmall,
                                        ]}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </View>

                    {/* FOOTER */}
                    <LinearGradient
                        colors={['#EEF6FF', '#FFFFFF']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={styles.cardFooter}
                    >
                        <Text style={styles.footerText}>
                            Built for Business, designed for growth
                        </Text>

                        <Image
                            source={require('../assets/Images/loginZenxpos.png')}
                            style={styles.imageoflog}
                            resizeMode="contain"
                        />
                    </LinearGradient>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AboutUsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },

    scrollContent: {
        paddingBottom: rV(20),
    },

    pageHeader: {
        paddingHorizontal: rS(16),
        paddingTop: rV(10),
        paddingBottom: rV(8),
    },
    header_style: {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
    },
    pageTitle: {
        fontFamily: Fonts.FigtreeMedium,
        fontSize: rMS(16),
        lineHeight: rMS(20),
        fontWeight: "500",
        color: '#000000',
    },

    pageTitleLogo: {
        width: rS(100),
        height: rMS(35),
        marginLeft: rS(4),
        resizeMode: 'contain',
    },

    breadcrumb: {
        // marginTop: rV(1),
        fontFamily: Fonts.FigtreeRegular,
        fontSize: rMS(10),
        color: '#919191',
    },

    // ---------------- MAIN CARD ----------------

    mainCard: {
        marginHorizontal: rS(6),
        backgroundColor: '#FFFFFF',
        borderRadius: rMS(12),
        overflow: 'hidden',

        // Shadow
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.02,
        shadowRadius: 2,

        elevation: 1,
    },

    mainCardSmall: {
        borderRadius: rMS(5),
    },

    // ---------------- TOP SECTION ----------------

    topSection: {
        flexDirection: 'row',
        paddingHorizontal: rS(12),
        paddingTop: rV(8),

        // paddingBottom: rV(22),
        // minHeight: rV(390),
    },

    topSectionSmall: {
        flexDirection: 'column',
        paddingHorizontal: rS(20),
        paddingTop: rV(22),
    },

    // ---------------- LEFT CONTENT ----------------

    contentSection: {
        flex: 1,
    },

    contentSectionDesktop: {
        paddingRight: rS(5),
    },

    heading: {
        marginBottom: rV(6),
    },

    headingDark: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeBold,
        fontSize: 42,
        lineHeight: rMS(30),
        fontWeight: "700",
        letterSpacing: 0.4,
    },

    headingBlue: {
        color: '#0582eb',
        fontFamily: Fonts.FigtreeBold,
        fontSize: 42,
        lineHeight: rMS(30),
        fontWeight: "700"
    },

    description: {
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontSize: 14,
        lineHeight: rMS(13),
        fontWeight: "400",
        marginBottom: rV(7),
    },

    // ---------------- IMAGE ----------------

    imageSection: {
        flex: 0.90,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        // backgroundColor: "red",
        // top: responsiveHeight(-5)
    },

    imageSectionSmall: {
        flex: undefined,
        width: '100%',
        minHeight: rV(240),
        paddingLeft: 0,
        marginTop: rV(8),
    },

    aboutImage: {
        width: '100%',
        height: rV(200),
    },

    aboutImageSmall: {
        height: rV(240),
    },

    // ---------------- FEATURES ----------------

    featureContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: rS(25),
        paddingVertical: rV(3),
    },

    featureContainerSmall: {
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: rS(15),
    },

    featureItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: rV(80),
    },

    featureItemSmall: {
        flex: 0,
        width: '30%',
        marginBottom: rV(18),
    },

    featureIcon: {
        width: rMS(40),
        height: rMS(40),
        borderRadius: rMS(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: rV(8),
    },

    featureIconText: {
        fontSize: rMS(20),
        fontFamily: Fonts.FigtreeBold,
    },

    featureTitle: {
        textAlign: 'center',
        color: '#264b79',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 17,
        fontWeight: "500",
        // lineHeight: rMS(6),
    },

    featureSubtitle: {
        textAlign: 'center',
        color: '#234D7E',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: rMS(14),
        lineHeight: rMS(18),
    },

    featureDivider: {
        width: 1,
        height: rV(40),
        backgroundColor: '#D7D7D7',
    },

    featureDividerSmall: {
        width: 0,
        height: 0,
    },

    // ---------------- FOOTER ----------------

    cardFooter: {
        minHeight: rV(32),

        backgroundColor: '#F1F8FF',

        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

        paddingHorizontal: rS(32),
    },
    footerText: {
        color: '#28568A',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 17,
        fontWeight: "500",
        letterSpacing: 0.1
    },
    imageoflog: {
        width: rV(70),
        height: rV(20),
        resizeMode: 'contain',
        marginLeft: rS(8),
    },

    zenxposLogo: {
        color: '#245181',
        fontFamily: Fonts.FigtreeBold,
        fontSize: rMS(25),
        letterSpacing: -1,
    },

    logoX: {
        color: '#38A9E8',
    },
});
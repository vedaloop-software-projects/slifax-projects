import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import MenuIcon from '../assets/Icons/menuIcon';
import PrinterIcon from '../assets/Icons/PrinterIcon';
import NewDownloadIcon from '../assets/Icons/NewDownloadIcon'
import Fonts from '../constants/Fonts';
import { useNavigation } from '@react-navigation/native';
import { rS, rV, rMS } from '../constants/responsive';
import { responsiveWidth } from 'react-native-responsive-dimensions';

export default function ReportHeader({
    title = 'SALES REPORT',
    showReportType = false,
    reportType = 'detailed',
    onReportTypeChange,
    onExport,
    onExportCSV,
    onExportPDF,
    reportTypeOptions = [
        {
            label: 'Summary Report',
            value: 'summary',
        },
        {
            label: 'Detailed Report',
            value: 'detailed',
        },
    ],
    onPrint,
}) {
    const navigation = useNavigation();
    const [showExportMenu, setShowExportMenu] = useState(false);

    const openDrawer = () => {
        navigation.openDrawer();
    };

    return (
        <View style={styles.headerRow}>

            <View style={styles.leftRow}>

                <TouchableOpacity
                    onPress={openDrawer}
                    style={styles.menuButton}
                    activeOpacity={0.7}>
                    <MenuIcon />
                </TouchableOpacity>

                <Text style={styles.title}>
                    {title}
                </Text>

            </View>
            {showReportType && (
                <View style={styles.reportTypeRow}>
                    {reportTypeOptions.map(option => (
                        <TouchableOpacity
                            key={option.value}
                            style={styles.reportTypeItem}
                            onPressIn={() =>
                                onReportTypeChange?.(option.value)
                            }
                            hitSlop={8}
                            activeOpacity={0.7}
                        >

                            <View style={styles.radioOuter}>
                                {reportType === option.value && (
                                    <View style={styles.radioInner} />
                                )}
                            </View>

                            <Text style={styles.reportTypeText}>
                                {option.label}
                            </Text>

                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.rightRow}>

                <View style={styles.exportWrap}>
                    <TouchableOpacity
                        style={styles.exportButton}
                        onPress={() => {
                            onExport?.();
                            setShowExportMenu(value => !value);
                        }}
                        activeOpacity={0.7}>

                        <View style={styles.exportContent}>
                            <Text style={styles.exportText}>
                                Export
                            </Text>
                        </View>

                    </TouchableOpacity>

                    {showExportMenu && (
                        <View style={styles.exportMenu}>
                            <TouchableOpacity
                                style={styles.exportMenuItem}
                                onPress={() => {
                                    setShowExportMenu(false);
                                    onExportCSV?.();
                                }}
                                activeOpacity={0.7}>
                                <NewDownloadIcon color="#264B79" />
                                <Text style={styles.exportMenuText}>
                                    CSV
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.exportMenuItem}
                                onPress={() => {
                                    setShowExportMenu(false);
                                    onExportPDF?.();
                                }}
                                activeOpacity={0.7}>
                                <NewDownloadIcon color="#264B79" />
                                <Text style={styles.exportMenuText}>
                                    PDF
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>


                <TouchableOpacity
                    style={styles.printButton}
                    onPress={onPrint}
                    activeOpacity={0.7}>

                    <PrinterIcon />

                    <Text style={styles.printText}>
                        Print Report
                    </Text>

                </TouchableOpacity>

            </View>

        </View>
    );
}


const styles = StyleSheet.create({
    headerRow: {
        position: 'relative',
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: rS(12),
        paddingVertical: rV(8),

    },
    leftRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    menuButton: {
        width: rMS(30),
        height: rMS(30),
        alignItems: 'center',

        justifyContent: 'center',

        marginRight: rS(8),
    },

    title: {
        color: '#264B79',
        fontSize: 18,
        fontFamily: Fonts.FigtreeSemiBold,
        fontWeight: "600",
        textTransform: 'uppercase',
    },
    reportTypeRow: {
        position: 'absolute',

        left: '50%',

        transform: [
            {
                translateX: -rMS(100),
            },
        ],

        flexDirection: 'row',

        alignItems: 'center',

        gap: rMS(10),
    },

    reportTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    reportTypeText: {
        fontSize: 16,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        fontWeight: "400"
    },
    radioOuter: {
        width: rMS(16),
        height: rMS(16),
        borderRadius: rMS(8),

        borderWidth: 1,

        borderColor: '#E1E1E1',

        alignItems: 'center',

        justifyContent: 'center',

        marginRight: rMS(5),

        backgroundColor: '#FFFFFF',
    },

    radioInner: {
        width: rMS(8),
        height: rMS(8),
        borderRadius: rMS(4),
        backgroundColor: '#264B79',
    },
    rightRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: rMS(6),
        marginLeft: 'auto',
    },

    exportWrap: {
        position: 'relative',
        zIndex: 20,
    },

    exportButton: {
        width: rMS(100),
        height: rV(22),
        borderWidth: 1,
        borderColor: '#264B79',
        borderRadius: rMS(5),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        // backgroundColor: 'red',
    },

    exportContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rS(4),
    },

    exportText: {
        color: '#264B79',
        fontSize: rMS(10),
        fontFamily: Fonts.FigtreeMedium,
        fontWeight: "500"
    },

    exportMenu: {
        position: 'absolute',
        top: rV(26),
        right: 0,
        width: rMS(100),
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#D9E2EC',
        borderRadius: rMS(5),
        elevation: 6,
        shadowColor: '#000000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },

    exportMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rS(6),
        paddingVertical: rV(7),
        paddingHorizontal: rS(8),
    },

    exportMenuText: {
        color: '#264B79',
        fontSize: rMS(8),
        fontFamily: Fonts.FigtreeMedium,
    },

    printButton: {
        width: rMS(100),
        height: rV(22),
        borderRadius: rMS(5),
        backgroundColor: '#264B79',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    printText: {
        color: '#FFFFFF',
        paddingLeft: responsiveWidth(0.4),
        fontSize: rMS(9),
        fontFamily: Fonts.FigtreeMedium,
    },

});
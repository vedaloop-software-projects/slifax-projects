import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    FlatList,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import {
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import SearchIcon from '../assets/Icons/SearchIcon'
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddReCallModal = ({ isVisible, onClose, onRecallItem }) => {
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [suspendedData, setSuspendedData] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const {postMethod}= HelperModule()

    useEffect(() => {
        if (isVisible) {
            fetchSuspendedItems('');
        } else {
            // Reset states when closing
            setSearchText('');
            setSelectedItem(null);
            setSuspendedData([]);
        }
    }, [isVisible]);

const fetchSuspendedItems = async (searchQuery) => {
        setLoading(true);
        try {
            // postMethod usually already returns the parsed JSON object
            const result = await postMethod(ApiServices.zenxposGetSuspendedItems, { searchStr: searchQuery });
            
            if (result && result.success) {
                setSuspendedData(result.data);
            } else {
                setSuspendedData([]);
            }
        } catch (error) {
            console.error("API Error:", error);
            Alert.alert("Error", "Something went wrong while fetching suspended items.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        fetchSuspendedItems(searchText);
    };

    const handleRecall = () => {
        if (!selectedItem) {
            Alert.alert("Selection Required", "Please select an item from the list to recall.");
            return;
        }
        onRecallItem(selectedItem);
        onClose();
    };

    const renderHeader = () => (
        <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { width: rS(40) }]}>S.No</Text>
            <Text style={[styles.headerText, { flex: 1.4 }]}>Suspended ID</Text>
            <Text style={[styles.headerText, { flex: 1.4 }]}>Mobile Number</Text>
            <Text style={[styles.headerText, { flex: 1.4 }]}>Customer Name</Text>
        </View>
    );

    const renderItem = ({ item, index }) => {
        const isSelected = selectedItem?.suspendedNumber === item.suspendedNumber;
        
        return (
            <TouchableOpacity 
                style={[styles.tableRow, isSelected && styles.selectedRow]} 
                onPress={() => setSelectedItem(item)}
            >
                <Text style={[styles.rowText, { width: rS(40) }]}>{index + 1}</Text>
                <Text style={[styles.rowText, { flex: 1.4 }]}>{item.suspendedNumber}</Text>
                <Text style={[styles.rowText, { flex: 1.4 }]}>{item.customerMobile || 'N/A'}</Text>
                <Text style={[styles.rowText, { flex: 1.4 }]}>{item.customerName || 'Guest'}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={isVisible}
            onRequestClose={onClose}
            statusBarTranslucent>
             <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.modalOverlay}
            >
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Suspended List
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by Customer name/ Mobile Number"
                            placeholderTextColor={'#919191'}
                            value={searchText}
                            onChangeText={text => setSearchText(text)}
                            onSubmitEditing={handleSearch}
                        />
                        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                            <SearchIcon />
                        </TouchableOpacity>
                    </View>

                    {/* Table */}
                    <View style={styles.listWrapper}>
                        {renderHeader()}
                        <View style={styles.flatListContainer}>
                        {loading ? (
                            <ActivityIndicator size="large" color="#264B79" style={{ marginTop: 20 }} />
                        ) : (
                             <FlatList
                                    data={suspendedData}
                                    keyExtractor={(item) => item.suspendedNumber}
                                    renderItem={renderItem}
                                    ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
                                    ListEmptyComponent={() => (
                                        <Text style={styles.emptyText}>No suspended items found.</Text>
                                    )}
                                    showsVerticalScrollIndicator={true}
                                />
                        )}
                    </View>
                    </View>

                    {/* Recall Button */}
                        <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleRecall}
                        disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.primaryText}>Recall</Text>
                        )}
                    </TouchableOpacity>
              
                </View>
           </KeyboardAvoidingView>
        </Modal>
    );
};

export default AddReCallModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: wp(45),
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingBottom: rV(18),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: rV(12),
        paddingHorizontal: rS(14),
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: Fonts.FigtreeMedium,
        color: '#080808',
    },
    divider: {
        borderBottomColor: '#EAEAEA',
        borderBottomWidth: 1,
    },
          scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: rV(18),
    },
    searchContainer: {
        flexDirection: 'row',
        marginTop: rV(16),
        paddingHorizontal: rS(14),
        alignItems: 'center',
    },
    searchInput: {
        height: rV(27),
        backgroundColor: '#FFFFFF',
        borderColor: '#EAEAEA',
        borderWidth: 1,
        flex: 1,
        borderRadius: 6,
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000000',
        paddingHorizontal: rS(10),
    },
    searchButton: {
        width: rS(28),
        height: rV(27),
        backgroundColor: '#264B79',
        borderRadius: 6,
        marginLeft: rS(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    listWrapper: {
        paddingHorizontal: rS(14),
        marginTop: rV(16),
        minHeight: rV(100),
    },
       flatListContainer: {
        height: rV(150), 
    },
    tableHeader: {
        flexDirection: 'row',
        paddingBottom: rV(10),
    },
    headerText: {
        fontSize: 13,
        fontFamily: Fonts.FigtreeRegular,
        color: '#7C7C7C',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: rV(10),
        alignItems: 'center',
        paddingHorizontal: rS(4)
    },
    selectedRow: {
        backgroundColor: '#F0F7FF', 
        borderRadius: 4
    },
    rowText: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#333333',
    },
    rowDivider: {
        height: 1,
        backgroundColor: '#F0F0F0',
    },
    primaryBtn: {
             backgroundColor: '#264B79',
        height: rV(25),
        width: wp(15),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop:rV(5)
    },
    primaryText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 15,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontFamily: Fonts.FigtreeRegular,
        color: '#919191'
    }
});


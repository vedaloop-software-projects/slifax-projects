// components/ProductSearchModal.js
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import NewSearchIcon from '../assets/Icons/NewSearchIcon';

const ProductSearchModal = ({
    visible,
    onClose,
    onSelect,
    searchFn,
    selectedProduct = { productId: null, variantId: null },
    minChars = 2,
    debounceMs = 350,
}) => {
    const [text, setText] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (visible) {
            setText('');
            setResults([]);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible) return;

        const str = text?.trim();
        if (!str || str.length < minChars) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                const data = await searchFn(str);
                setResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('ProductSearchModal search error:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [text, visible, minChars, debounceMs, searchFn]);

    const isTooShort = text.trim().length < minChars;
    const isEmpty = !loading && !isTooShort && results.length === 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlayCenter}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Search Product</Text>
                        <TouchableOpacity onPress={onClose} hitSlop={10}>
                            <Text style={styles.close}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputWrap}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            value={text}
                            onChangeText={setText}
                            placeholder="Search by Product code / name / EAN..."
                            placeholderTextColor="#919191"
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="search"
                            autoFocus={true}
                        />
                        <TouchableOpacity onPress={() => inputRef.current?.focus()} hitSlop={8}>
                            <NewSearchIcon />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.resultsWrap}>
                        {loading && (
                            <View style={styles.loaderWrap}>
                                <ActivityIndicator size="small" color="#264B79" />
                            </View>
                        )}

                        {isEmpty && <Text style={styles.empty}>No products found</Text>}

                        {!loading && isTooShort && (
                            <Text style={styles.empty}>
                                Type at least {minChars + 1} characters to search
                            </Text>
                        )}

                        {results.length > 0 && (
                            <FlatList
                                data={results}
                                keyExtractor={(item, idx) =>
                                    `${item.productId}-${item.variantId}-${idx}`
                                }
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingBottom: rV(10) }}
                                nestedScrollEnabled={true}
                                renderItem={({ item }) => {
                                    const isSelected =
                                        item.productId === selectedProduct.productId &&
                                        item.variantId === selectedProduct.variantId;
                                    return (
                                        <TouchableOpacity
                                            style={[
                                                styles.resultItem,
                                                isSelected && styles.resultItemSelected,
                                            ]}
                                            onPress={() => onSelect(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.resultRow}>
                                                <View style={styles.resultLeft}>
                                                    <Text
                                                        style={[
                                                            styles.resultTitle,
                                                            isSelected && { color: '#264B79' },
                                                        ]}
                                                        numberOfLines={1}
                                                    >
                                                        {item.productFullName} — {item.packSize}
                                                        {isSelected ? '  ✓' : ''}
                                                    </Text>
                                                    <Text style={styles.resultSub} numberOfLines={1}>
                                                        {item.productCode} • EAN: {item.eanCode}
                                                    </Text>
                                                </View>
                                                <View style={styles.priceWrap}>
                                                    <Text style={styles.priceText} numberOfLines={1}>
                                                        Cost: ₹{item.costPrice}
                                                    </Text>
                                                    <Text style={styles.priceText} numberOfLines={1}>
                                                        MRP: ₹{item.mrp}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default ProductSearchModal;

const styles = StyleSheet.create({
    overlayCenter: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: rS(20),
    },
    content: {
        width: '100%',
        maxWidth: rS(320),
        height: '90%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: rS(14),
        paddingVertical: rV(8),
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        backgroundColor: '#EEF9FF',
    },
    title: { fontSize: 16, color: '#264B79', fontFamily: Fonts.FigtreeSemiBold },
    close: {
        fontSize: 20,
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        paddingHorizontal: rS(4),
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: rS(5),
        paddingHorizontal: rS(10),
        height: rV(25),
        borderWidth: 1,
        borderColor: '#D9E2EC',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeRegular,
        padding: 0,
    },
    resultsWrap: { flex: 1, minHeight: rV(160) },
    loaderWrap: { paddingVertical: rV(16), alignItems: 'center' },
    empty: {
        textAlign: 'center',
        paddingVertical: rV(24),
        paddingHorizontal: rS(16),
        color: '#919191',
        fontSize: 13,
        fontFamily: Fonts.FigtreeRegular,
    },
    resultItem: {
        paddingVertical: rV(5),
        paddingHorizontal: rS(10),
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    resultItemSelected: { backgroundColor: '#E8F4FF' },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultLeft: { flex: 1, marginRight: rS(8) },
    resultTitle: {
        fontSize: 14,
        color: '#1B1B1B',
        fontFamily: Fonts.FigtreeSemiBold,
    },
    resultSub: {
        fontSize: 11,
        color: '#666',
        fontFamily: Fonts.FigtreeRegular,
        marginTop: 2,
    },
    priceWrap: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: rS(95),
    },
    priceText: {
        fontSize: 11,
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        marginTop: 2,
        textAlign: 'right',
    },
});
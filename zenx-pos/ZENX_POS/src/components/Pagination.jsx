import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import PageLeftIcon from '../assets/Icons/PageLeftIcon';
import PageBackIcon from '../assets/Icons/PageBackIcon';
import PageNextIcon from '../assets/Icons/PageNextIcon';
import PageRightIcon from '../assets/Icons/PageRightIcon';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';

/**
 * Reusable Pagination component
 *
 * @param {number}   currentPage        - active page (1-based)
 * @param {number}   lastPage           - total number of pages
 * @param {Function} onPageChange       - called with new page number
 * @param {number}   [siblingCount=1]   - neighbours shown around current page
 * @param {boolean}  [showFirstLast]    - show "First" / "Last" buttons (default true)
 * @param {boolean}  [showPrevNext]     - show "Back" / "Next" buttons (default true)
 * @param {object}   [style]            - wrapper style override
 */
const Pagination = ({
    currentPage = 1,
    lastPage = 1,
    onPageChange,
    siblingCount = 1,
    showFirstLast = true,
    showPrevNext = true,
    style,
}) => {
    // Hide entirely if only one page (or none)
    if (!lastPage || lastPage <= 1) return null;

    const goTo = page => {
        if (!onPageChange) return;
        if (page < 1 || page > lastPage) return;
        if (page === currentPage) return;
        onPageChange(page);
    };

    // ---------- Build page list with ellipsis ----------
    const DOTS = '...';

    const range = (start, end) =>
        Array.from({ length: end - start + 1 }, (_, i) => start + i);

    const getPageItems = () => {
        const totalSlots = siblingCount * 2 + 5;

        // Fits without dots — show all
        if (lastPage <= totalSlots) return range(1, lastPage);

        const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
        const rightSiblingIndex = Math.min(
            currentPage + siblingCount,
            lastPage,
        );

        const shouldShowLeftDots = leftSiblingIndex > 2;
        const shouldShowRightDots = rightSiblingIndex < lastPage - 1;

        // Only right dots
        if (!shouldShowLeftDots && shouldShowRightDots) {
            const leftItemCount = 3 + 2 * siblingCount;
            return [...range(1, leftItemCount), DOTS, lastPage];
        }

        // Only left dots
        if (shouldShowLeftDots && !shouldShowRightDots) {
            const rightItemCount = 3 + 2 * siblingCount;
            return [
                1,
                DOTS,
                ...range(lastPage - rightItemCount + 1, lastPage),
            ];
        }

        // Both sides
        if (shouldShowLeftDots && shouldShowRightDots) {
            return [
                1,
                DOTS,
                ...range(leftSiblingIndex, rightSiblingIndex),
                DOTS,
                lastPage,
            ];
        }

        return range(1, lastPage);
    };

    const pageItems = getPageItems();
    return (
        <View style={[styles.paginationWrapper, style]}>
            {showFirstLast && (
                <TouchableOpacity
                    style={styles.navButton}
                    disabled={currentPage === 1}
                    onPress={() => goTo(1)}>
                    <View style={styles.navInner}>
                        <PageLeftIcon />
                        <Text style={styles.navButtonText}> First</Text>
                    </View>
                </TouchableOpacity>
            )}

            {showPrevNext && (
                <TouchableOpacity
                    style={styles.navButton}
                    disabled={currentPage === 1}
                    onPress={() => goTo(currentPage - 1)}>
                    <View style={styles.navInner}>
                        <PageBackIcon />
                        <Text style={styles.navButtonText}> Back</Text>
                    </View>
                </TouchableOpacity>
            )}

            {pageItems.map((item, index) =>
                item === DOTS ? (
                    <View key={`dots-${index}`} style={styles.dotsWrapper}>
                        <Text style={styles.dotsText}>...</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        key={item}
                        style={[
                            styles.pageButton,
                            currentPage === item && styles.activePageButton,
                        ]}
                        onPress={() => goTo(item)}>
                        <Text
                            style={[
                                styles.pageButtonText,
                                currentPage === item &&
                                styles.activePageButtonText,
                            ]}>
                            {item}
                        </Text>
                    </TouchableOpacity>
                ),
            )}

            {showPrevNext && (
                <TouchableOpacity
                    style={styles.navButton}
                    disabled={currentPage === lastPage}
                    onPress={() => goTo(currentPage + 1)}>
                    <View style={styles.navInner}>
                        <Text style={styles.navButtonText}>Next </Text>
                        <PageNextIcon />
                    </View>
                </TouchableOpacity>
            )}

            {showFirstLast && (
                <TouchableOpacity
                    style={styles.navButton}
                    disabled={currentPage === lastPage}
                    onPress={() => goTo(lastPage)}>
                    <View style={styles.navInner}>
                        <Text style={styles.navButtonText}>Last </Text>
                        <PageRightIcon />
                    </View>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default Pagination;

const styles = StyleSheet.create({
    paginationWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    navInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    navButton: {
        paddingHorizontal: rS(10),
        paddingVertical: rV(5),
        borderWidth: 1,
        borderColor: '#E9E9E9',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        marginHorizontal: rS(1.5),
    },

    navButtonText: {
        fontSize: 13,
        color: '#333',
        fontFamily: Fonts.FigtreeMedium,
    },

    pageButton: {
        width: rS(28),
        height: rV(23),
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E9E9E9',
        backgroundColor: '#FFFFFF',
        borderRadius: 4,
        marginHorizontal: rS(1.5),
    },

    activePageButton: {
        backgroundColor: '#264B79',
    },

    pageButtonText: {
        fontSize: 13,
        color: '#333',
        fontFamily: Fonts.FigtreeRegular,
    },

    activePageButtonText: {
        color: '#FFF',
    },

    dotsWrapper: {
        width: rS(28),
        height: rV(23),
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: rS(1.5),
    },

    dotsText: {
        fontSize: 13,
        color: '#333',
        fontFamily: Fonts.FigtreeMedium,
    },
});
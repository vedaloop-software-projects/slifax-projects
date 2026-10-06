import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Fonts from '../constants/Fonts';


const SalesComparison = () => {
  const [viewType, setViewType] = useState('Weekly'); 

   const SCALE_FACTOR = 5;
  const scaleValue = (val) => val * SCALE_FACTOR;
  const unscaleValue = (val) => val / SCALE_FACTOR;

  const renderTopLabel = (value) => (
    <View style={{ marginBottom: 6, minWidth: 70, alignItems: 'center' }}>
       <Text
      style={styles.topLabelText}
      numberOfLines={1}
      adjustsFontSizeToFit
    >₹{value.toFixed(2)}</Text>
    </View>
  );
  // --- MOCK DATA ---
  const weeklyRaw = [
    { value: 3892.5, label: 'Sun' },
    { value: 2532.5, label: 'Mon' },
    { value: 4321.5, label: 'Tue' },
    { value: 15732.5, label: 'Wed' },
    { value: 5431.5, label: 'Thu' },
    { value: 732.5, label: 'Fri' },
    { value: 2732.5, label: 'Sat' },
  ];

  const monthlyRaw = [
    { value: 4000, label: 'Jan' },
    { value: 5000, label: 'Feb' },
    { value: 4500, label: 'Mar' },
    { value: 6000, label: 'Apr' },
  ];

  const yearlyRaw = [
    { value: 3200, label: '2023' },
    { value: 4500, label: '2024' },
    { value: 6200, label: '2025' },
    { value: 3000, label: '2026' },
  ];

  // Apply scaling + styles
  const formatData = (data) =>
    data.map((item, index) => ({
      value: scaleValue(item.value),
      label: item.label,
      frontColor: index % 2 === 0 ? '#EEF9FF' : '#5DC9FF',
      gradientColor: '#264B79',
      showGradient: index % 2 !== 0,
      topLabelComponent: () => renderTopLabel(item.value), 
    }));

  // Determine which data to show
  const getData = () => {
    if (viewType === 'Weekly') return formatData(weeklyRaw);
    if (viewType === 'Monthly') return formatData(monthlyRaw);
    return formatData(yearlyRaw);
  };

   return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Sales Comparison</Text>
        <View style={styles.toggleContainer}>
          {['Weekly', 'Monthly', 'Yearly'].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setViewType(item)}
              style={[
                styles.toggleBtn,
                viewType === item && styles.activeToggleBtn,
              ]}
            >
              <Text
                style={[
                  styles.toggleText,
                  viewType === item && styles.activeToggleText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {/* Chart */}
      <View style={styles.chartWrapper}>
        <Text style={styles.yAxisTitle}>Sales Amount</Text>
        {/* <BarChart
          key={viewType}
          data={getData()}
          barWidth={wp(3.5)}
          spacing={wp(4)}
          barBorderTopLeftRadius={5}
          barBorderTopRightRadius={5}
          hideRules
          xAxisThickness={1}
          xAxisColor={'#DDDDDD'}
          yAxisColor={'#DDDDDD'}
          yAxisThickness={1}
          yAxisLabelTexts={['0', '80K']}
          maxValue={80000}
          stepValue={80000}
           height={hp(10)}
          // noOfSections={1}
          initialSpacing={10}
          labelTextStyle={styles.xAxisLabel}
          isAnimated
        /> */}
        <BarChart
  key={viewType}
  data={getData()}
  height={hp(15)}                
  barWidth={wp(3.5)}
  spacing={wp(5)}
  barBorderTopLeftRadius={5}
  barBorderTopRightRadius={5}
  hideRules
  xAxisThickness={1}
  xAxisColor={'#DDDDDD'}
  yAxisColor={'#DDDDDD'}
  yAxisThickness={1}
  yAxisLabelTexts={['0', '40K', '80K', '120K']}  
  maxValue={120000}
  stepValue={40000}                                    
  noOfSections={4}                                    
  initialSpacing={30}
  labelTextStyle={styles.xAxisLabel}
  isAnimated
/>
      </View>
    </View>
  );
};

export default SalesComparison;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  toggleContainer: {
    flexDirection: 'row',
  },
  toggleBtn: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 18,
  },
  activeToggleBtn: {
    backgroundColor: '#264B79',
  },
  toggleText: {
    fontSize: 12,
    color: '#264B79',
    fontFamily: Fonts.FigtreeSemiBold,
  },
  activeToggleText: {
    color: '#FFF',
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  yAxisTitle: {
    position: 'absolute',
    left: -45,
    bottom: hp(10),
    transform: [{ rotate: '-90deg' }],
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },
  topLabelText: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  xAxisLabel: {
    color: '#7C8DB5',
    fontSize: 12,
    marginTop: 5,
  },
});
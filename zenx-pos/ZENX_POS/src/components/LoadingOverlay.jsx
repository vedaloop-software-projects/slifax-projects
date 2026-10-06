// components/LoadingOverlay.js
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';

const LoadingOverlay = ({
  visible,
  message = 'Loading...',
  subMessage = 'Please wait',
  color = '#264B79',
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <ActivityIndicator size="small" color={color} />
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.subText}>{subMessage}</Text>
      </View>
    </View>
  );
};

export default LoadingOverlay;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    zIndex: 9999,
  },
  card: {
    minWidth: rS(135),
    paddingHorizontal: rS(18),
    paddingVertical: rV(14),
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  text: {
    marginTop: rV(8),
    color: '#264B79',
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
    textAlign: 'center',
  },
  subText: {
    marginTop: rV(2),
    color: '#8A94A6',
    fontSize: 10,
    fontFamily: Fonts.FigtreeRegular,
    textAlign: 'center',
  },
});
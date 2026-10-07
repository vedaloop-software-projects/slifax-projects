import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import React from 'react';
import Fonts from '../constants/Fonts';

export default function DashboardActionCard({ title, Icon, onPress, title1 }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Icon />
      <Text style={styles.text}>{title}</Text>
      <Text style={styles.text1}>{title1}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
  width: '45%',             
  backgroundColor: '#46668D',
  borderRadius: 8,
  paddingVertical: 14,       
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,        
},
  text: {
    marginTop: 8,
    color: '#fff',
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 12,
    textAlign: 'center',
  },
   text1: {
    color: '#fff',
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 12,
    textAlign: 'center',
  },
});
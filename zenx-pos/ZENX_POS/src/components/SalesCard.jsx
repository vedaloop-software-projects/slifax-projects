// import { View, Text, StyleSheet } from 'react-native'
// import React from 'react'
// import {
//   widthPercentageToDP as wp,
//   heightPercentageToDP as hp,
// } from 'react-native-responsive-screen';
// import GraphIcon from '../assets/Icons/GraphIcon'
// import Fonts from '../constants/Fonts';

// export default function SalesCard() {
//   return (
//     <View style={styles.cardRow}>
//         <View style={{marginBottom:hp(2)}}>
//             <View style={{flexDirection:'row'}}>
//                 <View>
//       <View style={{marginTop:hp(1.5),marginLeft:wp(1.5), flexDirection:'row', alignItems:'center'}}>
//         <GraphIcon />
//         <Text style={{fontSize:10, fontFamily:Fonts.FigtreeSemiBold, color:'#55AC32', marginLeft:3}}>2%</Text>
//       </View>
//       <Text style={{marginLeft:wp(1.5),marginTop:1, fontSize:16, fontFamily:Fonts.FigtreeMedium, color:'#264B79'}}>Today Sales</Text>
//       <Text style={{marginLeft:wp(1.5),marginTop:3, fontSize:24, fontFamily:Fonts.FigtreeMedium, color:'#000000'}}>₹25,000</Text>
//       </View>
//       </View>
//       <View style={{flexDirection:'row'}}>
//         <Text>p</Text>
//       </View>
//       </View>
//     </View>
//   )
// }

// const styles=StyleSheet.create({
//     cardRow:{
//         // flexDirection:'row', 
//         backgroundColor:'#FFFFFF', 
//         width:wp(10), 
//         borderRadius:8,
        
//     }
// })

import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import GraphIcon from '../assets/Icons/GraphIcon';
import DashboardSaleIcon from '../assets/Icons/DashboardSaleIcon';
import Fonts from '../constants/Fonts';
import { rMS, rS, rV } from '../constants/responsive';

export default function SalesCard() {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <View style={styles.percentRow}>
          <GraphIcon />
          <Text style={styles.percentText}>2%</Text>
        </View>
        <Text style={styles.title}>Today Sales</Text>
        <Text style={styles.value}>₹25,000</Text>
      </View>
      <View style={styles.iconBox}>
        <DashboardSaleIcon />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:1, 
    backgroundColor: '#FFFFFF',
    borderRadius: rMS(8),
    // padding: 15,
    paddingHorizontal:rS(8),
    paddingVertical:rV(8),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: rS(8), 
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: hp(0.5),
    marginBottom:rV(2)
  },
  percentText: {
    fontSize: 10,
    marginLeft: rS(2),
    color: '#55AC32',
    fontFamily: Fonts.FigtreeSemiBold,
  },
  title: {
    fontSize: 16,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },
  value: {
    fontSize: 22,
    // marginTop: hp(1),
    marginTop:rV(5),
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },
  iconBox: {
    backgroundColor: '#FFF5EE',
    // padding: 12,
    paddingHorizontal:rS(6),
    paddingVertical:rV(6),
    borderRadius: rMS(7),
  },
});
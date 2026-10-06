// import NetInfo from '@react-native-community/netinfo';
// import { Alert } from 'react-native';
// import type { NavigationProp } from '@react-navigation/native';


// export const checkInternetConnection = async (
//     navigation?: NavigationProp<any>                  
// ): Promise<boolean> => {
//     try {
//         const netState = await NetInfo.fetch();
//         console.log("Internet State:", netState);

//         if (!netState.isConnected || !netState.isInternetReachable) {
//             Alert.alert('No Internet', 'Please check your internet connection and try again.', [
//                 {
//                     text: 'OK',
//                     onPress: () => {
//                         //Navigate only if navigation is passed
//                         if (navigation) {
//                             navigation.navigate('Root');
//                         }
//                     },
//                 },
//             ]);

//             return false;
//         }

//         return true;

//     } catch (error) {
//         console.error("NetInfo Error:", error);
//         Alert.alert('Error', 'Unable to check network status.');
//         return false;
//     }
// };

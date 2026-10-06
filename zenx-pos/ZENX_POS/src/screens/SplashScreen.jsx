import {
  View,
  StyleSheet,
  Image,
  StatusBar,
  Text,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import ImagePath from '../constants/ImagePath';
import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';
import { rS } from '../constants/responsive';
import { useDispatch } from 'react-redux';
import { setUser, updatePermissions, updateUser } from '../redux/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HelperModule } from '../helper/HelperModule';
import { refreshPermissions } from '../helper/PermissionService';

export default function SplashScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { getMethod } = HelperModule();

  useEffect(() => {
    checkLogin();
  }, []);

  const checkLogin = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (!token || !userData) {
        setTimeout(() => {
          navigation.replace('Login');
        }, 1500);

        return;
      }
      const savedUser = JSON.parse(userData);
      dispatch(
        setUser({
          user: savedUser,
          token,
          permissions: savedUser?.permissions || [],
        }),
      );

      // Get latest permissions from server
      const result = await refreshPermissions(getMethod);

      if (result?.success) {
        dispatch(updatePermissions(result.permissions));

        dispatch(
          updateUser({
            ...result.user,
            permissions: result.permissions,
          }),
        );
      }
      setTimeout(() => {
        navigation.replace('MainApp');
      }, 1500);
    } catch (error) {
      console.log('SPLASH CHECK LOGIN ERROR ===>', error?.message);

      setTimeout(() => {
        navigation.replace('Login');
      }, 1500);
    }
  };
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     navigation.replace('Login');
  //   }, 1500);

  //   return () => clearTimeout(timer);
  // }, []);
  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />

      <ImageBackground
        source={
          isLandscape
            ? ImagePath.zenxPosSplashBackground
            : ImagePath.landscapeZenxPosSplashBackground
        }
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <Image
          source={ImagePath.zenxPosLogo}
          style={[styles.logo, isLandscape && styles.logoLandscape]}
          resizeMode="contain"
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: rS(350),
  },
  logoLandscape: {
    width: rS(600),
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Image,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ImagePath from '../constants/ImagePath';
import Fonts from '../constants/Fonts';
import UserIcon from '../assets/Icons/userIcon';
import PasswordIcon from '../assets/Icons/PasswordIcon';
import ShowIcon from '../assets/Icons/ShowIcon';
import HideIcon from '../assets/Icons/HideIcon';
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';
import { useNavigation } from '@react-navigation/native';
import { rMS, rS, rV } from '../constants/responsive';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { HelperModule } from '../helper/HelperModule';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiServices from '../helper/ApiServices';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../redux/authSlice';

const screenHeight = Dimensions.get('window').height;
const calculatedExtraScroll = Math.min(screenHeight * 0.15, 120);

export default function LoginScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { postMethod } = HelperModule();
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailOrMobileError, setEmailOrMobileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // const validateEmailOrMobile = value => {
  //   if (!value || value.trim() === '') {
  //     return 'Mobile number or email is required';
  //   }

  //   // MOBILE VALIDATION
  //   const isMobile = /^\d+$/.test(value);

  //   if (isMobile) {
  //     // ONLY DIGITS

  //     if (value.length !== 10) {
  //       return 'Mobile number must be exactly 10 digits';
  //     }

  //     if (!/^[6-9]/.test(value)) {
  //       return 'Please enter a valid mobile number starting with 6, 7, 8, or 9';
  //     }
  //   } else {
  //     // EMAIL VALIDATION

  //     const emailRegex =
  //       /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  //     if (!emailRegex.test(value)) {
  //       return 'Please enter a valid email address';
  //     }
  //   }

  //   return '';
  // };

  const validateEmailOrMobile = value => {
    if (!value || value.trim() === '') {
      return 'Mobile number or email is required';
    }

    // MOBILE VALIDATION
    const isMobile = /^\d+$/.test(value);

    if (isMobile) {
      // ONLY DIGITS

      if (value.length !== 10) {
        return 'Mobile number must be exactly 10 digits';
      }

      if (!/^[6-9]/.test(value)) {
        return 'Please enter a valid mobile number starting with 6, 7, 8, or 9';
      }
    } else {
      // EMAIL VALIDATION

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    return '';
  };

  const validatePassword = pass => {
    if (!pass || pass.trim() === '') {
      return 'Password is required';
    }

    return '';
  };

  const handleEmailOrMobileChange = text => {
    // IF STARTS WITH NUMBER => MOBILE
    if (/^\d/.test(text)) {
      // REMOVE NON DIGITS
      const cleanedText = text.replace(/[^0-9]/g, '');

      // LIMIT TO 10 DIGITS
      if (cleanedText.length <= 10) {
        setEmailOrMobile(cleanedText);
      }
    } else {
      // EMAIL INPUT
      setEmailOrMobile(text);
    }

    // CLEAR ERROR
    if (emailOrMobileError) {
      setEmailOrMobileError('');
    }
  };

  const handleLogin = async () => {
    const emailMobileValidation = validateEmailOrMobile(emailOrMobile);

    const passwordValidation = validatePassword(password);

    setEmailOrMobileError(emailMobileValidation);

    setPasswordError(passwordValidation);

    if (emailMobileValidation || passwordValidation) {
      return;
    }

    if (!acceptTerms) {
      Toast.show({
        type: 'error',
        text1: 'Terms & Conditions',
        text2: 'Please accept Terms & Conditions',
      });

      return;
    }

    try {
      setLoading(true);

      const params = {
        mobileEmail: emailOrMobile,
        password: password,
      };

      console.log('LOGIN PARAMS ===>', params);

      const response = await postMethod(ApiServices.zenxposLogin, params);

      console.log('LOGIN RESPONSE ===>', response);

      if (response?.success) {
        const userData = response?.data?.user;
        const permissions = userData?.permissions || [];

        // SAVE TOKEN
        await AsyncStorage.setItem('userToken', userData?.token);

        // SAVE USER DATA
        await AsyncStorage.setItem(
          'userData',
          JSON.stringify({
            ...userData,
            permissions,
          }),
        );

        dispatch(
          setUser({
            user: {
              ...userData,
              permissions,
            },
            token: userData?.token,
            permissions,
          }),
        );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response?.message,
        });

        navigation.navigate('MainApp');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response?.errors || response?.message,
        });
      }
    } catch (error) {
      console.log(
        'LOGIN ERROR ===>',
        JSON.stringify(error?.response?.data, null, 2),
      );

      const apiError =
        error?.response?.data?.errors ||
        error?.response?.data?.message ||
        'Something went wrong';

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: apiError,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={calculatedExtraScroll}
        showsVerticalScrollIndicator={false}
      > */}
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
        style={styles.background}
      >
        <View
          style={[
            styles.cardContainer,
            {
              width: isLandscape ? rS(450) : rS(300),
            },
          ]}
        >
          {/* LEFT IMAGE */}
          {isLandscape && (
            <View style={styles.leftContainer}>
              <Image
                source={ImagePath.loginLogo}
                style={styles.leftImage}
                resizeMode="cover"
              />
            </View>
          )}

          {isLandscape ? (
            <KeyboardAwareScrollView
              style={styles.rightContainer}
              contentContainerStyle={styles.rightContainerContent}
              enableOnAndroid={true}
              extraScrollHeight={20}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.title}>Hi, Welcome</Text>

              <View style={{ marginBottom: rV(18) }}>
                <View style={styles.inputContainer}>
                  <UserIcon />

                  <TextInput
                    placeholder="Email/Mobile Number"
                    style={styles.textInput}
                    value={emailOrMobile}
                    onChangeText={handleEmailOrMobileChange}
                    placeholderTextColor="#848484"
                    autoCapitalize="none"
                    maxLength={/^\d/.test(emailOrMobile) ? 10 : 50}
                  />
                </View>

                {emailOrMobileError ? (
                  <Text style={styles.errorText}>{emailOrMobileError}</Text>
                ) : null}
              </View>

              <View style={{ marginBottom: rV(18) }}>
                <View style={styles.inputContainer}>
                  <PasswordIcon />

                  <TextInput
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);
                      if (passwordError) {
                        setPasswordError('');
                      }
                    }}
                    style={styles.textInput}
                    placeholderTextColor="#848484"
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconContainer}
                  >
                    {showPassword ? <ShowIcon /> : <HideIcon />}
                  </TouchableOpacity>
                </View>

                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>

              <View style={styles.row}>
                {/* <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe ? <CheckIcon /> : <UnCheckIcon />}
                  <Text style={styles.remember}> Remember me</Text>
                </TouchableOpacity> */}

                <Text style={styles.forgot}>Forgot Password?</Text>
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                {acceptTerms ? <CheckIcon /> : <UnCheckIcon />}

                <Text style={styles.terms}>
                  I Agree, to the Terms & Conditions
                </Text>
              </TouchableOpacity>

              <View style={styles.signInContainer}>
                <TouchableOpacity
                  style={styles.signInTouchable}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.signInText}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          ) : (
            <View style={styles.rightPortraitContainer}>
              <Image
                source={ImagePath.loginZenxpos}
                style={{
                  justifyContent: 'center',
                  alignSelf: 'center',
                  marginBottom: rV(30),
                }}
              />
              <Text style={styles.title}>Hi, Welcome</Text>
              <View style={{ marginBottom: rV(18) }}>
                <View style={styles.inputContainer}>
                  <UserIcon />

                  <TextInput
                    placeholder="Email/Mobile Number"
                    style={styles.textInput}
                    value={emailOrMobile}
                    onChangeText={handleEmailOrMobileChange}
                    placeholderTextColor="#848484"
                    // keyboardType={
                    //   /^\d/.test(emailOrMobile)
                    //     ? 'number-pad'
                    //     : 'email-address'
                    // }
                    autoCapitalize="none"
                    maxLength={/^\d/.test(emailOrMobile) ? 10 : 50}
                  />
                </View>
                {emailOrMobileError ? (
                  <Text style={styles.errorText}>{emailOrMobileError}</Text>
                ) : null}
              </View>
              <View style={{ marginBottom: rV(18) }}>
                <View style={styles.inputContainer}>
                  <PasswordIcon />

                  <TextInput
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={text => {
                      setPassword(text);

                      if (passwordError) {
                        setPasswordError('');
                      }
                    }}
                    style={styles.textInput}
                    placeholderTextColor="#848484"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIconContainer}
                  >
                    {showPassword ? <ShowIcon /> : <HideIcon />}
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : null}
              </View>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.rememberRow}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe ? <CheckIcon /> : <UnCheckIcon />}
                  <Text style={styles.remember}> Remember me</Text>
                </TouchableOpacity>
                <Text style={styles.forgot}>Forgot Password?</Text>
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAcceptTerms(!acceptTerms)}
              >
                {acceptTerms ? <CheckIcon /> : <UnCheckIcon />}
                <Text style={styles.terms}>
                  I Agree, to the Terms & Conditions
                </Text>
              </TouchableOpacity>
              <View style={styles.signInContainer}>
                <TouchableOpacity
                  style={styles.signInTouchable}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {/* {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.signInText}>
                      Sign in
                    </Text>
                  )} */}
                  <Text style={styles.signInText}>
                    {' '}
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* RIGHT FORM */}
          {/* <View style={styles.rightContainer}>
            <Text style={styles.title}>Hi, Welcome</Text>
            <View style={styles.inputContainer}>
              <UserIcon />

              <TextInput
                placeholder="Email/Mobile Number"
                style={styles.textInput}
                value={emailOrMobile}
                onChangeText={setEmailOrMobile}
                placeholderTextColor="#848484"
              />
            </View>

            <View style={styles.inputContainer}>
              <PasswordIcon />

              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword} 
                value={password}
                onChangeText={setPassword}
                style={styles.textInput}
                placeholderTextColor="#848484"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIconContainer}
              >
                {showPassword ? (
                  <ShowIcon />
                ) : (
                  <HideIcon />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
              >
                {rememberMe ? <CheckIcon /> : <UnCheckIcon />}
                <Text style={styles.remember}> Remember me</Text>
              </TouchableOpacity>
              <Text style={styles.forgot}>Forgot Password?</Text>
            </View>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptTerms(!acceptTerms)}
            >
              {acceptTerms ? <CheckIcon /> : <UnCheckIcon />}
              <Text style={styles.terms}>
                I Agree, to the Terms & Conditions
              </Text>
            </TouchableOpacity>
             <View style={styles.signInContainer}>
            <TouchableOpacity style={styles.signInTouchable} onPress={()=>navigation.navigate('Dashboard')}>
              <Text style={styles.signInText}>
                Sign in
              </Text>
            </TouchableOpacity>
          </View>
          </View> */}
        </View>
      </ImageBackground>
      {/* </KeyboardAwareScrollView> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  cardContainer: {
    height: rV(300),
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: rMS(20),
    overflow: 'hidden',
  },

  leftContainer: {
    width: rS(225),
  },

  leftImage: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: rV(4),
    // marginBottom: rV(5),
    fontFamily: Fonts.FigtreeRegular,
  },

  rightContainer: {
    width: rS(225),
    paddingLeft: rS(20),
    paddingRight: rS(30),
  },

  rightContainerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: rV(20),
  },
  rightPortraitContainer: {
    paddingHorizontal: rS(30),
    justifyContent: 'center',
  },

  title: {
    fontSize: 30,
    fontFamily: Fonts.FigtreeRegular,
    marginBottom: rV(20),
    textAlign: 'center',
  },

  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#C1C1C1',
    marginBottom: rV(20),
    paddingVertical: rV(8),
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#C1C1C1',
    // marginBottom: rV(20),
  },

  textInput: {
    flex: 1,
    marginLeft: rS(8),
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
    paddingVertical: rV(6),
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: rV(13),
  },

  remember: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
    marginLeft: rS(4),
  },

  forgot: {
    fontSize: 14,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },

  terms: {
    fontSize: 14,
    marginBottom: rV(20),
    fontFamily: Fonts.FigtreeRegular,
    color: '#000000',
    marginLeft: rS(4),
    marginBottom: rV(15),
  },

  // button: {
  //   backgroundColor: '#264B79',
  //   paddingVertical: 12,
  //   borderRadius: 8,
  //   alignItems: 'center',
  // },

  // buttonText: {
  //   color: '#FFFFFF',
  //   fontFamily: Fonts.FigtreeRegular,
  //   fontSize: 16
  // },
  eyeIconContainer: {},
  rememberRow: {
    flexDirection: 'row',
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: rV(8),
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInTouchable: {
    height: rV(30),
    width: '100%',
    justifyContent: 'center',
    borderRadius: rMS(7),
    backgroundColor: '#264B79',
  },
  signInText: {
    textAlign: 'center',
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

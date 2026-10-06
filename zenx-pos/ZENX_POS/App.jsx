import { View, Text, StatusBar, TextInput, StyleSheet } from 'react-native'
import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import AppNavigator from './src/Navigations/AppNavigator'
import Toast from 'react-native-toast-message'
import { Provider, useDispatch } from 'react-redux';
import {store} from './src/redux/store'

const styles = StyleSheet.create({
  root: { flex: 1 },
})

export default function App() {
  if (Text.defaultProps == null) {
    Text.defaultProps = {};
  }
  Text.defaultProps.allowFontScaling = false;

  if (TextInput.defaultProps == null) {
    TextInput.defaultProps = {};
  }
  TextInput.defaultProps.allowFontScaling = false;

  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
          <Toast />
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
   
  )
}
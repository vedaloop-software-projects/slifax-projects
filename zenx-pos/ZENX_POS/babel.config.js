module.exports = {
  presets: ['module:@react-native/babel-preset'],
  //nishitha
  // plugins: ['react-native-reanimated/plugin'],  //Previously This was the line, but now it is changed to below line as per the new version of react-native-reanimated
    plugins: ['react-native-worklets/plugin'],

};
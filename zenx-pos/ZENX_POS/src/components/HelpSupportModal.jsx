import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Keyboard,
} from 'react-native';

import Fonts from '../constants/Fonts';
import { rS, rV, rMS } from '../constants/responsive';
import HelpImageIcon from '../assets/Icons/HelpImageIcon';
const { width } = Dimensions.get('window');

const HelpSupportModal = ({ visible, onClose }) => {

  const [contactNumber, setContactNumber] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  // Detect keyboard
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardShowEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow';

    const keyboardHideEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide';

    const showListener = Keyboard.addListener(
      keyboardShowEvent,
      () => {
        setKeyboardVisible(true);
      },
    );

    const hideListener = Keyboard.addListener(
      keyboardHideEvent,
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleSave = () => {
    console.log({
      contactNumber,
      name,
      message,
    });
  };

  return (
    <Modal
      visible={Boolean(visible)}
      transparent
      animationType="fade"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >

        <View style={styles.modalContainer}>
          <View style={styles.header}>

            <Text style={styles.headerTitle}>
              Help & Support
            </Text>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeText}>
                ×
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.headerLine} />
          <View style={styles.body}>
            <View style={styles.leftSection}>

              {/* IMAGE */}
              <View style={styles.imageContainer}>

                {/* <Image
                  source={require('../assets/Images/helpSupport.png')}
                  style={styles.supportImage}
                  resizeMode="contain"
                /> */}
                <HelpImageIcon  width="350" height="300"  />
              </View>
              <View style={styles.contactSection}>

                <Text style={styles.reachTitle}>
                  REACH OUT TO US ON-
                </Text>

                <View style={styles.contactRow}>

                  <View style={styles.contactItem}>

                    <Text style={styles.contactLabel}>
                      Contact 1
                    </Text>

                    <Text style={styles.contactValue}>
                      +91 9876543210
                    </Text>

                  </View>

                  <View style={styles.contactItem}>

                    <Text style={styles.contactLabel}>
                      Contact 2
                    </Text>

                    <Text style={styles.contactValue}>
                      +91 9876543210
                    </Text>

                  </View>

                </View>

              </View>

            </View>
            <View style={styles.rightSection}>
              <ScrollView
                style={styles.rightScroll}
                contentContainerStyle={[
                  styles.rightScrollContent,
                  keyboardVisible && styles.keyboardScrollContent,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                nestedScrollEnabled
              >
                <View style={styles.inputRow}>
                  <View style={styles.inputGroup}>

                    <Text style={styles.label}>
                      Contact number
                    </Text>

                    <TextInput
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      style={styles.input}
                      keyboardType="phone-pad"
                      placeholder="Enter Contact Number"
                      placeholderTextColor="#999"
                    />

                  </View>

                  {/* NAME */}
                  <View style={styles.inputGroup}>

                    <Text style={styles.label}>
                      Name
                    </Text>

                    <TextInput
                      value={name}
                      onChangeText={setName}
                      style={styles.input}
                      placeholder="Enter Name"
                      placeholderTextColor="#999"
                    />

                  </View>

                </View>
                <View style={styles.messageGroup}>

                  <Text style={styles.label}>
                    Message
                  </Text>

                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    style={styles.messageInput}
                    placeholder="Enter Description"
                    placeholderTextColor="#A0A0A0"
                    multiline
                    textAlignVertical="top"
                    scrollEnabled
                  />

                </View>
                <View style={styles.buttonContainer}>

                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    activeOpacity={0.8}
                  >

                    <Text style={styles.saveText}>
                      Save
                    </Text>

                  </TouchableOpacity>

                </View>

              </ScrollView>

            </View>

          </View>

        </View>

      </KeyboardAvoidingView>
    </Modal>
  );
};

export default HelpSupportModal;

const styles = StyleSheet.create({

  /* ================= OVERLAY ================= */

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rS(10),
  },

  /* ================= MODAL ================= */

  modalContainer: {
    width: width > 900 ? '92%' : '96%',
    maxWidth: 1200,
    height: 620,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,
    borderColor: '#E7E7E7',

    borderRadius: 12,

    overflow: 'hidden',

    elevation: 5,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.08,
    shadowRadius: 10,
  },

  /* ================= HEADER ================= */

  header: {
    height: rV(25),
    paddingHorizontal: rS(14),
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  headerTitle: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: rMS(12),
    fontWeight: "500",
    color: '#171717',
  },

  closeButton: {
    width: rS(32),
    height: rS(32),

    alignItems: 'center',

    justifyContent: 'center',
  },

  closeText: {
    fontSize: rMS(27),

    lineHeight: rMS(28),

    fontWeight: '300',

    color: '#111111',
  },

  headerLine: {
    height: 1,

    backgroundColor: '#E5E5E5',
  },

  /* ================= BODY ================= */

  body: {
    flex: 1,

    flexDirection: 'row',

    paddingHorizontal: rS(10),

    paddingTop: rV(18),

    paddingBottom: rV(18),
  },

  leftSection: {
    width: '49%',
    // backgroundColor:"red",
    justifyContent: 'space-between',
    paddingRight: rS(18),

  },

  imageContainer: {
    width: '100%',
    height: '62%',
    minHeight: 170,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    overflow: 'hidden',
  },

  // supportImage: {
  //   width: '100%',

  //   height: '100%',
  // },

  contactSection: {
    marginTop: rV(12),
    paddingHorizontal: rS(10),
  },

  reachTitle: {
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: rMS(12),
    color: '#28527F',
    fontWeight: "600",
    marginBottom: rV(10),
    letterSpacing: 0.3,
  },

  contactRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',
  },

  contactItem: {
    width: '48%',
  },
  contactLabel: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: rMS(11),
    color: '#222222',
    fontWeight: "500",
    marginBottom: rV(5),
  },
  contactValue: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: rMS(11),
    color: '#222222',
    fontWeight: "500",
    lineHeight: rMS(18),
  },
  rightSection: {
    width: '55%',
    flex: 1,
    // backgroundColor: 'yellow',
    paddingTop: rV(10),
    paddingHorizontal: rS(5),
  },
  rightScroll: {
    flex: 1,
  },

  rightScrollContent: {
    flexGrow: 1,
  },
  keyboardScrollContent: {
    paddingBottom: rV(180),
  },
  inputRow: {
    flexDirection: 'row',
    gap: rS(10),
  },

  inputGroup: {
    flex: 1,
  },

  label: {
    fontFamily: Fonts.FigtreeRegular,
    fontSize: rMS(10),
    color: '#00000',
    fontWeight: '400',
    marginBottom: rV(7),
  },

  input: {
    height: rV(30),
    borderWidth: 1,
    borderColor: '#C0C0C0',

    borderRadius: 8,

    paddingHorizontal: rS(3),

    fontFamily: Fonts.FigtreeRegular,

    fontSize: rMS(9),

    color: '#222222',

    backgroundColor: '#FFFFFF',
  },
  messageGroup: {
    marginTop: rV(10),
    flexShrink: 0,
  },

  messageInput: {
    width: '100%',
    height: rV(120),
    minHeight: 170,
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 8,
    paddingHorizontal: rS(8),
    paddingTop: rV(10),
    fontFamily: Fonts.FigtreeRegular,
    fontSize: rMS(10),
    color: '#222222',
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
  },

  buttonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: rS(14)
  },

  saveButton: {
    width: rS(120),
    height: rV(30),
    backgroundColor: '#264B79',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveText: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: rMS(10),
    fontWeight: "500",
    color: '#FFFFFF',
  },
});

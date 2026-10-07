import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native'
import React from 'react'
import MenuIcon from '../assets/Icons/menuIcon'
import ImagePath from '../constants/ImagePath'
import Fonts from '../constants/Fonts'
import UpArrow from '../assets/Icons/UpArrow'
import PasswordIcon from '../assets/Icons/PasswordIcon'
import NewHelpIcon from '../assets/Icons/NewHelpIcon'
import HelpSupportModal from './HelpSupportModal'
import ChangePassword from './ChangePassword'
import { useNavigation } from '@react-navigation/native'
import { rS, rV, rMS } from '../constants/responsive'
import colors from '../constants/colors'
import { useDispatch, useSelector } from 'react-redux'
import { responsiveFontSize } from 'react-native-responsive-dimensions'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { clearUser } from '../redux/authSlice'
import BlackLogoutIcon from '../assets/Icons/BlackLogoutIcon'
import CustomToast from './CustomToast'
export default function CustomHeader({
  title,
  onChangePassword,
  onHelp,
}) {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [showHelpSupport, setShowHelpSupport] = React.useState(false);
  const [showChangePassword, setShowChangePassword] = React.useState(false);
  const [showToast, setShowToast] = React.useState(false);
  const openDrawer = () => {
    navigation.openDrawer();
  };

  const handleProfilePress = () => {
    setShowProfileMenu(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close profile popup
              setShowProfileMenu(false);

              // Clear stored login data
              await AsyncStorage.multiRemove([
                'userToken',
                'userData',
              ]);

              // Clear Redux user data
              dispatch(clearUser());

              // Navigate to Login and remove previous screens
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.log('LOGOUT ERROR ===>', error);
            }
          },
        },
      ],
    );
  };


  return (
    <View style={styles.headerRow}>

      <View style={styles.leftRow}>
        <TouchableOpacity onPress={openDrawer}>
          <MenuIcon />
        </TouchableOpacity>

        <Image
          source={
            user?.logo
              ? { uri: user.logo }
              : ImagePath.vijethaLogo
          }
          style={styles.profileImage1}
          resizeMode='cover'
        />
        <View style={styles.divider} />

        <View>
          <Text style={styles.businessName}>
            {user?.businessName}
          </Text>

          <Text style={styles.cityName}>
            {user?.city}, {user?.address}
          </Text>
        </View>
      </View>

      {/* Only shown when title is passed */}
      {title && (
        <View style={styles.middleRow}>
          <Text style={styles.dynamic_middle}>
            {title}
          </Text>
        </View>
      )}

      <View style={styles.profileArea}>
        <TouchableOpacity
          style={styles.rightRow}
          activeOpacity={0.8}
          accessibilityLabel="Open profile menu"
          onPress={() => setShowProfileMenu(value => !value)}
        >
          <Image
            source={ImagePath.profileLogo}
            style={styles.profileImage}
          />
          <Text style={styles.nameText}>
            {user?.name}
          </Text>
          <UpArrow />
        </TouchableOpacity>
        {showProfileMenu && (
          <View style={styles.profileMenu}>
            <TouchableOpacity
              style={styles.profileMenuItem}
              activeOpacity={0.75}
              onPress={() => {
                setShowProfileMenu(false);
                setShowChangePassword(true);
                onChangePassword?.();
              }}
            >
              <PasswordIcon color={colors.navyBlue} />
              <Text style={styles.profileMenuText}>Change Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMenuItem}
              activeOpacity={0.75}
              onPress={() => {
                setShowProfileMenu(false);
                setShowHelpSupport(true);
                onHelp?.();
              }}
            >
              <NewHelpIcon color={colors.navyBlue} />
              <Text style={styles.profileMenuText}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileMenuItem}
              activeOpacity={0.75}
              onPress={handleLogout}
            >
              <BlackLogoutIcon color={colors.navyBlue} />
              <Text style={styles.profileMenuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ChangePassword
        visible={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <HelpSupportModal
        visible={showHelpSupport}
        onClose={() => setShowHelpSupport(false)}
      />

    </View>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: rS(12),
    paddingVertical: rV(8),
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  middleRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dynamic_middle: {
    color: "#264B79",
    fontWeight: "600",
    fontSize: responsiveFontSize(1.2),
    fontFamily: Fonts.FigtreeSemiBold,
    textTransform: "uppercase"
  },

  rightRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileArea: {
    position: 'relative',
    zIndex: 10,
  },
  profileMenu: {
    position: 'absolute',
    top: rV(25),
    right: rV(-12),
    width: rMS(130),
    paddingVertical: rV(1),
    backgroundColor: '#FFFFFF',
    borderRadius: rS(4),
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  profileMenuItem: {
    minHeight: rV(30),
    paddingHorizontal: rMS(7),
    flexDirection: 'row',
    alignItems: 'center',
    gap: rMS(5),
  },
  profileMenuText: {
    color: '#1B1B1B',
    fontSize: rMS(8),
    fontFamily: Fonts.FigtreeRegular,
  },

  nameText: {
    color: '#000000',
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    marginRight: rS(5)
  },

  profileImage1: {
    width: rS(25),
    height: rV(25),
    // borderRadius: 20,
    // marginRight: rS(5),
  },

  profileImage: {
    marginRight: rS(5)
  },

  businessName: {
    fontSize: 15,
    fontFamily: Fonts.FigtreeBold,
    marginBottom: rV(2),
    color: '#1B1B1B'
  },

  cityName: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeMedium,
    color: '#717171'
  },

  divider: {
    width: 1,
    height: rV(14),
    backgroundColor: '#D1D1D1',
    marginHorizontal: rS(5),
  },
})
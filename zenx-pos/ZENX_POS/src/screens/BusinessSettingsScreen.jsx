import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CustomHeader from '../components/CustomHeader';
import { rS, rV } from '../constants/responsive';
import Fonts from '../constants/Fonts';
import ImageUploadIcon from '../assets/Icons/ImageUploadIcon';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Toast from 'react-native-toast-message';

export default function BusinessSettingsScreen() {
  const { getMethod, postMethod } = HelperModule();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [businessTypeId, setBusinessTypeId] = useState('');
  const [stateId, setStateId] = useState('');
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    mobile: '',
    email: '',
    businessName: '',
    businessType: '',
    contactPerson: '',
    alternateMobile: '',
    state: '',
    city: '',
    address: '',
    pincode: '',
    websiteUrl: '',
    gstNumber: '',
    gstCode: '',
    panNumber: '',
    fssaiNumber: '',
    upiId: '',
    tradeLicenseNumber: '',
    lastRewenalDate: '',
    expiryDate: '',
  });

  const [logo, setLogo] = useState('');
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const response = await getMethod(ApiServices.zenxposGetProfile);

      console.log('GET PROFILE RESPONSE:', response);

      if (response?.success) {
        const data = response?.data;

        setBusinessTypeId(data?.businessTypeId ?? '');
        setStateId(data?.stateId ?? '');

        setForm({
          mobile: String(data?.mobile ?? ''),
          email: String(data?.email ?? ''),
          businessName: String(data?.businessName ?? ''),
          businessType: String(data?.businessTypeTitle ?? ''),
          contactPerson: String(data?.contactPerson ?? ''),
          alternateMobile: String(data?.alternateMobile ?? ''),
          state: String(data?.stateName ?? ''),
          city: String(data?.city ?? ''),
          address: String(data?.address ?? ''),
          pincode: String(data?.pincode ?? ''),
          websiteUrl: String(data?.websiteUrl ?? ''),
          gstNumber: String(data?.gstNumber ?? ''),
          gstCode: String(data?.gstCode ?? ''),
          panNumber: String(data?.panNumber ?? ''),
          fssaiNumber: String(data?.fssaiNumber ?? ''),
          upiId: String(data?.upiId ?? ''),
          tradeLicenseNumber: String(data?.tradeLicenseNumber ?? ''),
          lastRewenalDate: String(data?.startDate ?? ''),
          expiryDate: String(data?.endDate ?? ''),
        });

        setLogo(data?.logo ?? '');
      } else {
        Alert.alert(
          'Error',
          response?.message || 'Failed to fetch business profile',
        );
      }
    } catch (error) {
      console.log('FETCH PROFILE ERROR:', error);

      Alert.alert(
        'Error',
        'Something went wrong while fetching business profile',
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    const email = String(form.email ?? '').trim();
    const address = String(form.address ?? '').trim();
    const gstCode = String(form.gstCode ?? '').trim();
    const state = String(form.state ?? '').trim();
    const city = String(form.city ?? '').trim();
    const pincode = String(form.pincode ?? '').trim();
    const contactPerson = String(form.contactPerson ?? '').trim();
    const mobile = String(form.mobile ?? '').trim();

    // Email
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }

    // Store Address
    if (!address) {
      newErrors.address = 'Store address is required';
    }

    // State Code
    if (!gstCode) {
      newErrors.gstCode = 'State code is required';
    } else if (!/^\d{2}$/.test(gstCode)) {
      newErrors.gstCode = 'Enter a valid 2 digit state code';
    }

    // State
    if (!state) {
      newErrors.state = 'State is required';
    }

    // City
    if (!city) {
      newErrors.city = 'City is required';
    }

    // Pincode
    if (!pincode) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode)) {
      newErrors.pincode = 'Enter a valid 6 digit pincode';
    }

    // Contact Person
    if (!contactPerson) {
      newErrors.contactPerson = 'Contact person name is required';
    }

    // Mobile
    if (!mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = 'Enter a valid 10 digit mobile number';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
  const handleUpdate = async () => {
    const isValid = validateForm();

    if (!isValid) {
      return;
    }
    try {
      setUpdating(true);

      const formData = new FormData();

      // All business data should be inside `data`
      const data = {
        mobile: form.mobile,
        email: form.email,
        businessName: form.businessName,
        businessTypeId: Number(businessTypeId),
        contactPerson: form.contactPerson,
        alternateMobile: form.alternateMobile,
        stateId: Number(stateId),
        city: form.city,
        address: form.address,
        pincode: form.pincode,
        websiteUrl: form.websiteUrl,
        gstNumber: form.gstNumber,
        gstCode: form.gstCode,
        panNumber: form.panNumber,
        fssaiNumber: form.fssaiNumber,
        upiId: form.upiId,
        tradeLicenseNumber: form.tradeLicenseNumber,
      };

      // IMPORTANT: append JSON as `data`
      formData.append('data', JSON.stringify(data));

      // Add logo only if a new image was selected
      if (logoFile?.uri) {
        formData.append('logo', {
          uri: logoFile.uri,
          type: logoFile.type || 'image/jpeg',
          name: logoFile.name || 'business_logo.jpg',
        });
      }

      console.log('UPDATE PROFILE DATA:', JSON.stringify(data, null, 2));
      console.log('LOGO FILE:', logoFile);

      const response = await postMethod(
        ApiServices.zenxposUpdateProfile,
        formData,
      );

      console.log('UPDATE PROFILE RESPONSE:', response);

      if (response?.success) {
        // Alert.alert(
        //   'Success',
        //   response?.message || 'Profile updated successfully.',
        // );
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response?.message,
        });

        await fetchProfile();
      } else {
        Alert.alert('Error', response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.log('UPDATE PROFILE ERROR:', error);
      console.log('UPDATE PROFILE ERROR RESPONSE:', error?.response?.data);

      Alert.alert(
        'Error',
        error?.response?.data?.message ||
          'Something went wrong while updating profile',
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleLogoUpload = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
      },
      response => {
        if (response.didCancel) {
          return;
        }

        if (response.errorCode) {
          console.log('IMAGE PICKER ERROR:', response.errorMessage);

          Alert.alert(
            'Error',
            response.errorMessage || 'Unable to select image',
          );
          return;
        }

        const asset = response.assets?.[0];

        if (!asset?.uri) {
          return;
        }

        console.log('SELECTED LOGO:', asset);

        setLogoFile({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'business_logo.jpg',
        });

        // Show selected image immediately
        setLogo(asset.uri);
      },
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CustomHeader />

        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#264B79" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        {/* PAGE TITLE */}
        <View style={styles.businessContainer}>
          <Text style={styles.businessText}>Business Settings</Text>
        </View>

        {/* MAIN CARD */}
        <View style={styles.mainContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* LEFT SIDE */}
            <View style={styles.leftContainer}>
              {/* BUSINESS LOGO */}
              <Text style={styles.sectionTitle}>BUSINESS LOGO</Text>

              <TouchableOpacity
                style={styles.logoUpload}
                onPress={handleLogoUpload}
              >
                {/* <View style={styles.imagePlaceholder}>
                  <Text style={styles.imageIcon}>▧</Text>
                </View> */}
                {logo ? (
                  <Image
                    source={{ uri: logo }}
                    style={styles.businessLogo}
                    resizeMode="contain"
                  />
                ) : (
                  <>
                    <ImageUploadIcon />

                    <Text style={styles.uploadText}>Upload Business Logo</Text>

                    <Text style={styles.uploadSize}>Max of 5 MB</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.imageSize}>512*512 px</Text>

              {/* BUSINESS DETAILS */}
              <Text style={[styles.sectionTitle, styles.businessDetailsTitle]}>
                BUSINESS DETAILS
              </Text>

              <Field
                label="Business Name"
                required
                value={form.businessName}
                placeholder="Enter business name"
                onChangeText={value => updateField('businessName', value)}
                editable={false}
              />

              <Field
                label="Business Type"
                required
                value={form.businessType}
                placeholder="Select business type"
                onChangeText={value => updateField('businessType', value)}
                editable={false}
              />

              <Field
                label="Email"
                required
                value={form.email}
                placeholder="Select business type"
                onChangeText={value => {
                  updateField('email', value);
                  if (errors.email) {
                    setErrors(prev => ({
                      ...prev,
                      email: '',
                    }));
                  }
                }}
                keyboardType="email-address"
                error={errors.email}
              />
            </View>

            {/* RIGHT SIDE */}
            <View style={styles.rightContainer}>
              {/* STORE DETAILS */}
              <Text style={styles.sectionTitle}>STORE DETAILS</Text>

              <View style={styles.row}>
                <View style={styles.flexLarge}>
                  <Field
                    label="Store Address"
                    required
                    value={form.address}
                    placeholder="Enter store address"
                    onChangeText={value => {
                      updateField('address', value);

                      if (errors.address) {
                        setErrors(prev => ({
                          ...prev,
                          address: '',
                        }));
                      }
                    }}
                    error={errors.address}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="State Code"
                    required
                    value={form.gstCode}
                    placeholder="Enter state code"
                    onChangeText={value => {
                      const stateCode = value.replace(/\D/g, '').slice(0, 2);

                      updateField('gstCode', stateCode);

                      if (errors.gstCode) {
                        setErrors(prev => ({
                          ...prev,
                          gstCode: '',
                        }));
                      }
                    }}
                    maxLength={2}
                    keyboardType="number-pad"
                    error={errors.gstCode}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="State"
                    required
                    value={form.state}
                    placeholder="Enter state"
                    onChangeText={value => {
                      updateField('state', value);

                      if (errors.state) {
                        setErrors(prev => ({
                          ...prev,
                          state: '',
                        }));
                      }
                    }}
                    error={errors.state}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexSmall}>
                  <Field
                    label="City"
                    required
                    value={form.city}
                    placeholder="Enter city"
                    onChangeText={value => {
                      updateField('city', value);

                      if (errors.city) {
                        setErrors(prev => ({
                          ...prev,
                          city: '',
                        }));
                      }
                    }}
                    error={errors.city}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="Pincode"
                    required
                    value={form.pincode}
                    placeholder="Enter pincode"
                    onChangeText={value => {
                      updateField('pincode', value);

                      if (errors.pincode) {
                        setErrors(prev => ({
                          ...prev,
                          pincode: '',
                        }));
                      }
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    error={errors.pincode}
                  />
                </View>

                <View style={styles.flexLarge}>
                  <Field
                    label="Contact Person Name"
                    required
                    value={form.contactPerson}
                    placeholder="Enter contact person name"
                    onChangeText={value => updateField('contactPerson', value)}
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexSmall}>
                  <Field
                    label="Mobile Number"
                    required
                    value={form.mobile}
                    placeholder="Enter mobile number"
                    onChangeText={value => {
                      updateField('mobile', value);

                      if (errors.mobile) {
                        setErrors(prev => ({
                          ...prev,
                          mobile: '',
                        }));
                      }
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                    error={errors.mobile}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="Alternate Mobile Number"
                    value={form.alternateMobile}
                    placeholder="Enter alternate mobile number"
                    onChangeText={value =>
                      updateField('alternateMobile', value)
                    }
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.flexLarge}>
                  <Field
                    label="UPI ID"
                    value={form.upiId}
                    placeholder="Enter UPI ID"
                    onChangeText={value => updateField('upiId', value)}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flexSmall}>
                  <Field
                    label="GST.No"
                    value={form.gstNumber}
                    placeholder="Enter GST number"
                    onChangeText={value => {
                      const gstValue = value.toUpperCase();

                      setForm(prev => {
                        const updatedForm = {
                          ...prev,
                          gstNumber: gstValue,
                        };

                        // GST first 2 digits
                        if (gstValue.length >= 2) {
                          const gstStateCode = gstValue.substring(0, 2);

                          if (/^\d{2}$/.test(gstStateCode)) {
                            // Replace State Code only when different
                            if (prev.gstCode !== gstStateCode) {
                              updatedForm.gstCode = gstStateCode;
                            }
                          }
                        }

                        return updatedForm;
                      });

                      if (errors.gstCode) {
                        setErrors(prev => ({
                          ...prev,
                          gstCode: '',
                        }));
                      }
                    }}
                    maxLength={15}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="PAN.No"
                    value={form.panNumber}
                    placeholder="Enter PAN number"
                    onChangeText={value => updateField('panNumber', value)}
                    maxLength={10}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="FSSAI.No"
                    value={form.fssaiNumber}
                    placeholder="Enter FSSAI number"
                    onChangeText={value => updateField('fssaiNumber', value)}
                    maxLength={14}
                    keyboardType={'number-pad'}
                  />
                </View>

                <View style={styles.flexSmall}>
                  <Field
                    label="Trade License.No"
                    value={form.tradeLicenseNumber}
                    placeholder="Enter trade license number"
                    onChangeText={value =>
                      updateField('tradeLicenseNumber', value)
                    }
                  />
                </View>
              </View>

              {/* DIVIDER */}
              <View style={styles.divider} />

              {/* LICENSE DETAILS */}
              <Text style={styles.sectionTitle}>LICENSE DETAILS</Text>

              <View style={styles.licenseRow}>
                <View style={styles.licenseField}>
                  <Field
                    label="Last Renewal Date"
                    value={form.lastRewenalDate}
                    editable={false}
                  />
                </View>

                <View style={styles.licenseField}>
                  <Field
                    label="Expiry Date"
                    value={form.expiryDate}
                    editable={false}
                  />
                </View>
              </View>

              {/* BUTTONS */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.renewButton}>
                  <Text style={styles.renewButtonText}>Renew Plan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.updateButton}
                  onPress={handleUpdate}
                  disabled={updating}
                >
                  <Text style={styles.updateButtonText}>Update Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------
   REUSABLE FIELD
------------------------------------------------------- */

const Field = ({
  label,
  required = false,
  value = '',
  placeholder = '',
  onChangeText,
  keyboardType,
  editable = true,
  maxLength,
  error,
}) => {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#999999"
        style={[
          styles.input,
          !value && styles.placeholderInput,
          !editable && styles.disabledInput,
        ]}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={editable}
        maxLength={maxLength}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  subContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingHorizontal: rS(12),
    paddingBottom: rV(10),
    borderTopColor: '#F4F4F4',
    borderTopWidth: 1,
  },

  businessContainer: {
    flexDirection: 'row',
    marginTop: rV(10),
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  businessText: {
    color: '#000000',
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 22,
  },

  mainContainer: {
    marginTop: rV(14),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    flex: 1,
  },

  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: rS(10),
    paddingVertical: rV(10),
    // backgroundColor:'red',
    // paddingRight:rS(10)
    // padding: rS(22),
    gap: rS(10),
  },

  /* LEFT */

  leftContainer: {
    width: rS(120),
    borderWidth: 1,
    borderColor: '#E7E7E7',
    borderRadius: 8,
    paddingHorizontal: rS(8),
    paddingVertical: rV(8),
    marginBottom: rV(10),
    // padding: rS(15),
  },

  sectionTitle: {
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 16,
    color: '#29538A',
    marginBottom: rV(10),
  },

  logoUpload: {
    height: rV(95),
    borderWidth: 1,
    borderColor: '#245B94',
    borderStyle: 'dashed',
    borderRadius: 7,
    backgroundColor: '#EEF9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  businessLogo: {
    // position: 'absolute',
    width: '100%',
    height: '100%',
  },

  uploadOverlay: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(238, 249, 255, 0.75)',
  },
  uploadText: {
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 13,
    color: '#A9BACE',
    marginTop: rV(8),
  },

  uploadSize: {
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 13,
    color: '#A9BACE',
    marginTop: rV(2),
  },

  imageSize: {
    textAlign: 'center',
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 14,
    color: '#919191',
    marginTop: rV(6),
  },

  businessDetailsTitle: {
    marginTop: rV(15),
  },

  /* RIGHT */

  rightContainer: {
    flex: 1,
    minWidth: 0,
  },

  row: {
    flexDirection: 'row',
    gap: rS(10),
  },

  flexSmall: {
    flex: 1,
  },

  flexLarge: {
    flex: 2.15,
  },

  fieldContainer: {
    marginBottom: rV(13),
  },

  label: {
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 14,
    color: '#111111',
    marginBottom: rV(6),
  },

  required: {
    color: '#E53935',
  },

  input: {
    height: rV(28),
    borderWidth: 1,
    borderColor: '#C0C0C0',
    borderRadius: 6,
    paddingHorizontal: rS(6),
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 14,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },

  placeholderInput: {
    color: '#919191',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#777777',
    // borderColor: '#D5D5D5',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: rV(4),
    marginBottom: rV(15),
  },

  /* LICENSE */

  licenseRow: {
    flexDirection: 'row',
    gap: rS(10),
  },

  licenseField: {
    flex: 1,
  },

  /* BUTTONS */

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: rS(12),
    marginTop: rV(8),
  },

  renewButton: {
    height: rV(28),
    paddingHorizontal: rS(10),
    borderWidth: 1,
    borderColor: '#264B79',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  renewButtonText: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 14,
    color: '#264B79',
  },

  updateButton: {
    height: rV(28),
    paddingHorizontal: rS(10),
    backgroundColor: '#264B79',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  updateButtonText: {
    fontFamily: Fonts.FigtreeMedium,
    fontSize: 14,
    color: '#FFFFFF',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#E53935',
    fontFamily: Fonts.FigtreeRegular,
    fontSize: 11,
    marginTop: rV(3),
  },
});

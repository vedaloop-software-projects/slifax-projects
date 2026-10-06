import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import Fonts from '../constants/Fonts';
import { Dropdown } from 'react-native-element-dropdown';
import { rS, rV } from '../constants/responsive';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import CheckIcon from '../assets/Icons/checkIcon';
import UnCheckIcon from '../assets/Icons/unCheckIcon';
import Toast from 'react-native-toast-message';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setBillingAccessRole } from '../redux/roleAccessSlice';

export default function RoleAccessScreen() {
  const { postMethod } = HelperModule()
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const dispatch = useDispatch();

  const [billingAccess, setBillingAccess] = useState({
    allowDiscount: false,
    allowPriceOverride: false,
    allowRefund: false,
  });
  const [features, setFeatures] = useState([]);
  useFocusEffect(
    useCallback(() => {
      fetchRoles();

      return () => {
        setSelectedRoleId(null);
        setFeatures([]);
        setRoles([]);
      };
    }, [])
  );

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await postMethod(ApiServices.zenxposGetRoles, {
        searchStr: '',
        status: '',
        page: '',
      });

      console.log(":::::::Get Roles::::::", response);

      if (response.success) {
        const roleData = response.data.roles
          .filter(role => role.status === 1)
          .map(role => ({
            label: role.roleTitle,
            value: role.id,
          }));

        setRoles(roleData);
        if (roleData.length > 0) {
          setSelectedRoleId(roleData[0].value);
          await fetchRoleAccess(roleData[0].value);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };
  const fetchRoleAccess = async (roleId) => {
    try {
      // setLoading(true);
      const response = await postMethod(ApiServices.zenxposGetRoleAccessLevels, {
        roleId: roleId,
      });
      console.log(":::: get role access:::::", response)
      if (response.success) {
        const data = response.data;
        const billingAccessData = {
        allowDiscount: !!data.billingAccess.allowDiscount,
        allowPriceOverride: !!data.billingAccess.allowPriceOverride,
        allowRefund: !!data.billingAccess.allowRefund,
      };

      setBillingAccess(billingAccessData);

          dispatch(setBillingAccessRole(billingAccessData));
        setFeatures(data.features);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch access levels');
    } 
  };

  // const toggleFeature = (featureId, isSubFeature = false, parentId = null) => {
  //   const updatedFeatures = features.map(f => {
  //     if (!isSubFeature && f.featureId === featureId) {
  //       return { ...f, status: f.status === 1 ? 0 : 1 };
  //     }
  //     if (isSubFeature && f.featureId === parentId) {
  //       const updatedSub = f.subFeatures.map(sf =>
  //         sf.subFeatureId === featureId ? { ...sf, status: sf.status === 1 ? 0 : 1 } : sf
  //       );
  //       return { ...f, subFeatures: updatedSub };
  //     }
  //     return f;
  //   });
  //   setFeatures(updatedFeatures);
  // };

  const validateFeatures = () => {
    for (const feature of features) {

      // Parent feature permissions validation
      if (
        feature.status === 0 &&
        (
          feature.isAdd === 1 ||
          feature.isEdit === 1 ||
          feature.isView === 1
        )
      ) {
        Toast.show({
          type: 'error',
          text1: 'Validation',
          text2: `Please select "${feature.featureName}" feature first`,
        });

        return false;
      }

      // Parent feature has sub-features
      if (
        feature.status === 1 &&
        feature.subFeatures &&
        feature.subFeatures.length > 0
      ) {
        const hasSelectedSubFeature = feature.subFeatures.some(
          sub => sub.status === 1,
        );

        if (!hasSelectedSubFeature) {
          Toast.show({
            type: 'error',
            text1: 'Validation',
            text2: `Please select at least one sub-feature for ${feature.featureName}`,
          });

          return false;
        }
      }

      // Sub-feature validations
      if (
        feature.subFeatures &&
        feature.subFeatures.length > 0
      ) {
        for (const sub of feature.subFeatures) {

          // Sub-feature selected while parent is not selected
          if (
            feature.status === 0 &&
            sub.status === 1
          ) {
            Toast.show({
              type: 'error',
              text1: 'Validation',
              text2: `Please select "${feature.featureName}" feature first`,
            });

            return false;
          }

          // Sub-feature permissions without selecting sub-feature
          if (
            sub.status === 0 &&
            (
              sub.isAdd === 1 ||
              sub.isEdit === 1 ||
              sub.isView === 1
            )
          ) {
            Toast.show({
              type: 'error',
              text1: 'Validation',
              text2: `Please select "${sub.subFeatureName}" sub-feature first`,
            });

            return false;
          }

          // Parent not selected but sub-feature permissions enabled
          if (
            feature.status === 0 &&
            (
              sub.isAdd === 1 ||
              sub.isEdit === 1 ||
              sub.isView === 1
            )
          ) {
            Toast.show({
              type: 'error',
              text1: 'Validation',
              text2: `Please select "${feature.featureName}" feature first`,
            });

            return false;
          }
        }
      }
    }

    return true;
  };
  // const validateFeatures = () => {
  //   for (const feature of features) {
  //     // Validate only selected parent features
  //     if (
  //       feature.status === 1 &&
  //       feature.subFeatures &&
  //       feature.subFeatures.length > 0
  //     ) {
  //       const hasSelectedSubFeature =
  //         feature.subFeatures.some(
  //           sub => sub.status === 1,
  //         );

  //       if (!hasSelectedSubFeature) {
  //         Toast.show({
  //           type: 'error',
  //           text1: 'Validation',
  //           text2: `Please select at least one sub-feature for ${feature.featureName}`,
  //         });

  //         return false;
  //       }
  //     }
  //   }

  //   return true;
  // };


  const handleSave = async () => {
    const isValid = validateFeatures();

    if (!isValid) {
      return;
    }
    try {
      setLoading(true);

      const formattedFeatures = features.map(feature => ({
        featureId: feature.featureId,
        status: feature.status,
        isAdd: feature.isAdd,
        isEdit: feature.isEdit,
        isView: feature.isView,
        subFeatures:
          feature.subFeatures?.map(sub => ({
            subFeatureId: sub.subFeatureId,
            status: sub.status,
            isAdd: sub.isAdd,
            isEdit: sub.isEdit,
            isView: sub.isView,
          })) || [],
      }));

      const payload = {
        roleId: selectedRoleId,
        billingAccess: {
          allowDiscount: billingAccess.allowDiscount ? 1 : 0,
          allowPriceOverride: billingAccess.allowPriceOverride ? 1 : 0,
          allowRefund: billingAccess.allowRefund ? 1 : 0,
        },
        features: formattedFeatures,
      };

      console.log(
        'SAVE PAYLOAD =>',
        JSON.stringify(payload, null, 2),
      );

      const response = await postMethod(
        ApiServices.zenxposSaveRoleAccessLevels,
        payload,
      );

      console.log('SAVE RESPONSE =>', response);

      if (response?.success) {
         dispatch(
    setBillingAccessRole({
      allowDiscount: !!billingAccess.allowDiscount,
      allowPriceOverride: !!billingAccess.allowPriceOverride,
      allowRefund: !!billingAccess.allowRefund,
    })
  );

        Toast.show({
          type: 'success',
          text1: 'Success',
          text2:
            response?.message ||
            'Access levels updated successfully',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2:
            response?.message ||
            'Failed to save access levels',
        });
      }
    } catch (error) {
      console.log('SAVE ERROR =>', error);

      Toast.show({
        type: 'error',
        text1: 'Error',
        text2:
          error?.response?.data?.message ||
          error?.message ||
          'Failed to save changes',
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (
    featureId,
    permission,
    isSubFeature = false,
    subFeatureId = null,
  ) => {
    // Parent Feature Permission Validation
    if (!isSubFeature) {
      const feature = features.find(
        item => item.featureId === featureId,
      );

      if (!feature || feature.status !== 1) {
        Toast.show({
          type: 'error',
          text1: 'Validation',
          text2: 'Please select the feature first',
        });
        return;
      }
    }

    // Sub Feature Permission Validation
    if (isSubFeature) {
      const parentFeature = features.find(
        item => item.featureId === featureId,
      );

      if (!parentFeature || parentFeature.status !== 1) {
        Toast.show({
          type: 'error',
          text1: 'Validation',
          text2: 'Please select the feature first',
        });
        return;
      }

      const subFeature = parentFeature.subFeatures?.find(
        item => item.subFeatureId === subFeatureId,
      );

      if (!subFeature || subFeature.status !== 1) {
        Toast.show({
          type: 'error',
          text1: 'Validation',
          text2: 'Please select the sub-feature first',
        });
        return;
      }
    }

    const updatedFeatures = features.map(feature => {
      // Parent Feature Permission
      if (!isSubFeature) {
        if (feature.featureId === featureId) {
          return {
            ...feature,
            [permission]:
              feature[permission] === 1 ? 0 : 1,
          };
        }
        return feature;
      }

      // Sub Feature Permission
      if (feature.featureId === featureId) {
        return {
          ...feature,
          subFeatures: feature.subFeatures.map(sub =>
            sub.subFeatureId === subFeatureId
              ? {
                ...sub,
                [permission]:
                  sub[permission] === 1 ? 0 : 1,
              }
              : sub,
          ),
        };
      }

      return feature;
    });

    setFeatures(updatedFeatures);
  };
  const toggleFeature = (
    featureId,
    isSubFeature = false,
    parentId = null,
  ) => {
    const updatedFeatures = features.map(feature => {

      // Parent Feature
      if (!isSubFeature && feature.featureId === featureId) {
        const newStatus = feature.status === 1 ? 0 : 1;

        return {
          ...feature,
          status: newStatus,

          // Reset permissions when parent unchecked
          isAdd: newStatus === 0 ? 0 : feature.isAdd,
          isEdit: newStatus === 0 ? 0 : feature.isEdit,
          isView: newStatus === 0 ? 0 : feature.isView,

          subFeatures:
            newStatus === 0
              ? feature.subFeatures.map(sub => ({
                ...sub,
                status: 0,
                isAdd: 0,
                isEdit: 0,
                isView: 0,
              }))
              : feature.subFeatures,
        };
      }

      // Sub Feature
      if (isSubFeature && feature.featureId === parentId) {
        return {
          ...feature,
          subFeatures: feature.subFeatures.map(sub => {
            if (sub.subFeatureId === featureId) {
              const newStatus =
                sub.status === 1 ? 0 : 1;

              return {
                ...sub,
                status: newStatus,

                // Reset permissions when sub-feature unchecked
                isAdd: newStatus === 0 ? 0 : sub.isAdd,
                isEdit: newStatus === 0 ? 0 : sub.isEdit,
                isView: newStatus === 0 ? 0 : sub.isView,
              };
            }

            return sub;
          }),
        };
      }

      return feature;
    });

    setFeatures(updatedFeatures);
  };
  // const toggleFeature = (
  //   featureId,
  //   isSubFeature = false,
  //   parentId = null,
  // ) => {
  //   const updatedFeatures = features.map(
  //     feature => {
  //       // Parent Feature 
  //       if (!isSubFeature && feature.featureId === featureId) {
  //         const newStatus = feature.status === 1 ? 0 : 1;
  //         return {
  //           ...feature, status: newStatus,
  //           // When parent unchecked, uncheck all children 
  //           subFeatures: newStatus === 0
  //             ? feature.subFeatures.map(
  //               sub => ({ ...sub, status: 0, }),)
  //             : feature.subFeatures,
  //         };
  //       }
  //       // Sub Feature 
  //       if (isSubFeature && feature.featureId === parentId) {
  //         return {
  //           ...feature, subFeatures: feature.subFeatures.map(sub =>
  //             sub.subFeatureId === featureId
  //               ? { ...sub, status: sub.status === 1 ? 0 : 1, }
  //               : sub,),
  //         };
  //       } return feature;
  //     },); setFeatures(updatedFeatures);
  // };
  // const togglePermission = (
  //   featureId,
  //   permission,
  //   isSubFeature = false,
  //   subFeatureId = null,
  // ) => {
  //   const updatedFeatures = features.map(feature => {
  //     // Parent Feature Permission
  //     if (!isSubFeature) {
  //       if (feature.featureId === featureId) {
  //         return {
  //           ...feature,
  //           [permission]:
  //             feature[permission] === 1 ? 0 : 1,
  //         };
  //       }
  //       return feature;
  //     }

  //     // Sub Feature Permission
  //     if (feature.featureId === featureId) {
  //       return {
  //         ...feature,
  //         subFeatures: feature.subFeatures.map(sub =>
  //           sub.subFeatureId === subFeatureId
  //             ? {
  //               ...sub,
  //               [permission]:
  //                 sub[permission] === 1 ? 0 : 1,
  //             }
  //             : sub,
  //         ),
  //       };
  //     }

  //     return feature;
  //   });

  //   setFeatures(updatedFeatures);
  // };
  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.heading}>Role Access Levels</Text>
          <Text style={styles.subHeading}>Create or Manage Roles</Text>
        </View>
        {loading ? <ActivityIndicator size="large" color="#264B79" style={styles.loader} />
          :
          <View style={styles.mainContainer}>
            <View style={styles.leftContainer}>
              <Text style={styles.label}>Role <Text style={styles.required}>*</Text></Text>
              <Dropdown
                style={styles.dropdown}
                data={roles}
                labelField="label"
                valueField="value"
                value={selectedRoleId}
                onChange={item => {
                  setSelectedRoleId(item.value);
                  fetchRoleAccess(item.value);
                }}
                placeholder="Select Role"
                selectedTextStyle={styles.selectedTextStyle}
                itemTextStyle={styles.itemTextStyle}
                placeholderStyle={styles.placeholderStyle}
              />

              <View style={styles.divider} />
              <Text style={styles.accessHeading}>ACCESS</Text>

              {[
                { label: 'Allow Discount', key: 'allowDiscount' },
                { label: 'Allow Price Override', key: 'allowPriceOverride' },
                { label: 'Allow Refund', key: 'allowRefund' }
              ].map((item, index) => (
                <View key={item.key}>
                  <View style={styles.accessRow}>
                    <Text style={styles.accessText}>{item.label}</Text>
                    <Switch
                      value={billingAccess[item.key]}
                      onValueChange={(val) => {
                        setBillingAccess(prev => ({
                          ...prev,
                          [item.key]: val,
                        }));
                      }}
                      trackColor={{
                        false: '#D9D9D9',
                        true: '#264B79',
                      }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                  {index < 2 && <View style={styles.line} />}
                </View>
              ))}

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rightContainer}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleHeaderText}>MODULE ACCESS</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollContainer} contentContainerStyle={{ paddingBottom: rV(10) }}>

                {features.map(feature => (
                  <View key={feature.featureId}>

                    {/* Parent Feature */}
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() =>
                        toggleFeature(feature.featureId)
                      }>
                      {feature.status === 1 ? (
                        <CheckIcon />
                      ) : (
                        <UnCheckIcon />
                      )}

                      <Text style={styles.checkboxText}>
                        {feature.featureName}
                      </Text>
                    </TouchableOpacity>

                    {/* If NO Sub Features */}
                    {feature.subFeatures?.length === 0 && (
                      <View style={styles.permissionContainer}>

                        {/* Add */}
                        <TouchableOpacity
                          style={styles.permissionRow}
                          onPress={() =>
                            togglePermission(
                              feature.featureId,
                              'isAdd',
                            )
                          }>
                          {feature.isAdd === 1 ? (
                            <CheckIcon />
                          ) : (
                            <UnCheckIcon />
                          )}
                          <Text style={styles.permissionText}>
                            Add
                          </Text>
                        </TouchableOpacity>

                        {/* Edit */}
                        <TouchableOpacity
                          style={styles.permissionRow}
                          onPress={() =>
                            togglePermission(
                              feature.featureId,
                              'isEdit',
                            )
                          }>
                          {feature.isEdit === 1 ? (
                            <CheckIcon />
                          ) : (
                            <UnCheckIcon />
                          )}
                          <Text style={styles.permissionText}>
                            Edit
                          </Text>
                        </TouchableOpacity>

                        {/* View */}
                        <TouchableOpacity
                          style={styles.permissionRow}
                          onPress={() =>
                            togglePermission(
                              feature.featureId,
                              'isView',
                            )
                          }>
                          {feature.isView === 1 ? (
                            <CheckIcon />
                          ) : (
                            <UnCheckIcon />
                          )}
                          <Text style={styles.permissionText}>
                            View
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Sub Features */}
                    {feature.subFeatures?.length > 0 &&
                      feature.subFeatures.map(sub => (
                        <View
                          key={sub.subFeatureId}
                          style={styles.subFeatureContainer}>

                          <TouchableOpacity
                            style={styles.checkboxRow}
                            onPress={() =>
                              toggleFeature(
                                sub.subFeatureId,
                                true,
                                feature.featureId,
                              )
                            }>
                            {sub.status === 1 ? (
                              <CheckIcon />
                            ) : (
                              <UnCheckIcon />
                            )}

                            <Text style={styles.checkboxText}>
                              {sub.subFeatureName}
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.permissionContainer}>

                            <TouchableOpacity
                              style={styles.permissionRow}
                              onPress={() =>
                                togglePermission(
                                  feature.featureId,
                                  'isAdd',
                                  true,
                                  sub.subFeatureId,
                                )
                              }>
                              {sub.isAdd === 1 ? (
                                <CheckIcon />
                              ) : (
                                <UnCheckIcon />
                              )}
                              <Text style={styles.permissionText}>
                                Add
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.permissionRow}
                              onPress={() =>
                                togglePermission(
                                  feature.featureId,
                                  'isEdit',
                                  true,
                                  sub.subFeatureId,
                                )
                              }>
                              {sub.isEdit === 1 ? (
                                <CheckIcon />
                              ) : (
                                <UnCheckIcon />
                              )}
                              <Text style={styles.permissionText}>
                                Edit
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.permissionRow}
                              onPress={() =>
                                togglePermission(
                                  feature.featureId,
                                  'isView',
                                  true,
                                  sub.subFeatureId,
                                )
                              }>
                              {sub.isView === 1 ? (
                                <CheckIcon />
                              ) : (
                                <UnCheckIcon />
                              )}
                              <Text style={styles.permissionText}>
                                View
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                  </View>
                ))}
              </ScrollView>

              {/* <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} >
                {features.map((feature) => (
                  <View key={feature.featureId}>
                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => toggleFeature(feature.featureId)}>
                      {feature.status === 1 ? <CheckIcon /> : <UnCheckIcon />}
                      <Text style={styles.checkboxText}>{feature.featureName}</Text>
                    </TouchableOpacity>

                    {feature.subFeatures && feature.subFeatures.map(sub => (
                      <TouchableOpacity
                        key={sub.subFeatureId}
                        style={[styles.checkboxRow, { marginLeft: rS(20), marginBottom: rV(15) }]}
                        onPress={() => toggleFeature(sub.subFeatureId, true, feature.featureId)}>
                        {sub.status === 1 ? <CheckIcon width={18} height={18} /> : <UnCheckIcon width={18} height={18} />}
                        <Text style={styles.checkboxText}>{sub.subFeatureName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView> */}
            </View>
          </View>
        }
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 10,
  },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  subContainer: { flex: 1, backgroundColor: '#F7F7F7', paddingHorizontal: rS(12), paddingTop: rV(10) },
  headerContainer: { marginBottom: rV(15) },
  heading: { fontSize: 24, color: '#000000', fontFamily: Fonts.FigtreeSemiBold },
  subHeading: { fontSize: 13, color: '#919191', marginTop: rV(2), fontFamily: Fonts.FigtreeRegular },
  mainContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: rV(80) },
  leftContainer: { width: '60%', backgroundColor: '#FFFFFF', borderRadius: 10, paddingTop: rV(14), paddingHorizontal: rS(12), paddingBottom: rV(15) },
  rightContainer: { width: '37%', backgroundColor: '#FFFFFF', borderRadius: 10, overflow: 'hidden' },
  label: { fontSize: 14, marginBottom: rV(5), color: '#000000', fontFamily: Fonts.FigtreeRegular },
  required: { color: '#E71414' },
  dropdown: {
    height: rV(27), borderWidth: 1, borderColor: '#C0C0C0', borderRadius: 8, paddingHorizontal: rS(12), backgroundColor: '#FFFFFF', width: '45%', fontSize: 16,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  placeholderStyle: {
    fontSize: 14,
    color: '#919191',
    fontFamily: Fonts.FigtreeRegular,
  },

  selectedTextStyle: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular,
  },
  itemTextStyle: {
    fontSize: 14,
    color: '#000',
    fontFamily: Fonts.FigtreeRegular,
  },

  divider: { borderBottomWidth: 0.5, borderBottomColor: '#DDDDDD', marginVertical: rV(20) },
  accessHeading: { fontSize: 18, color: '#264B79', marginBottom: rV(15), fontFamily: Fonts.FigtreeMedium },
  accessRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rV(10) },
  accessText: { fontSize: 15, color: '#080808', fontFamily: Fonts.FigtreeRegular },
  line: { borderBottomWidth: 0.5, borderBottomColor: '#DDDDDD', marginBottom: rV(12) },
  saveButton: { marginTop: rV(15), width: rS(90), paddingVertical: rV(7), backgroundColor: '#264B79', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontSize: 15, fontFamily: Fonts.FigtreeMedium },
  moduleHeader: { paddingVertical: rV(10), backgroundColor: '#264B79', paddingHorizontal: rS(16) },
  moduleHeaderText: { color: '#FFFFFF', fontSize: 16, fontFamily: Fonts.FigtreeMedium },
  scrollContainer: { paddingHorizontal: rS(16), paddingVertical: rV(12) },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: rV(10) },
  checkboxText: { fontSize: 14, color: '#000000', marginLeft: rS(10), fontFamily: Fonts.FigtreeRegular },
  permissionContainer: {
    flexDirection: 'row',
    marginLeft: rS(32),
    marginBottom: rV(10),
  },

  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: rS(15),
  },

  permissionText: {
    fontSize: 12,
    color: '#000000',
    marginLeft: rS(4),
    fontFamily: Fonts.FigtreeRegular,
  },

  subFeatureContainer: {
    marginLeft: rS(20),
    // marginBottom: rV(10),
  },
});


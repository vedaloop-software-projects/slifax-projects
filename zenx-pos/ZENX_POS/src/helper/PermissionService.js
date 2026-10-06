import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiServices from './ApiServices';

export const refreshPermissions = async getMethod => {
  try {
    console.log('REFRESH PERMISSION API CALL');

    const response = await getMethod(
      ApiServices.zenxposGetPermissions,
    );

    console.log(
      'REFRESH PERMISSION RESPONSE ===>',
      JSON.stringify(response, null, 2),
    );

    if (response?.success) {
      const latestUser = response?.data?.user;

      if (!latestUser) {
        return {
          success: false,
          user: null,
          permissions: [],
        };
      }

      const permissions = latestUser?.permissions || [];

      await AsyncStorage.setItem(
        'userData',
        JSON.stringify(latestUser),
      );

      return {
        success: true,
        user: latestUser,
        permissions,
      };
    }

    return {
      success: false,
      user: null,
      permissions: [],
    };
  } catch (error) {
    console.log(
      'REFRESH PERMISSION ERROR ===>',
      error,
    );

    console.log(
      'REFRESH PERMISSION ERROR MESSAGE ===>',
      error?.message,
    );

    return {
      success: false,
      user: null,
      permissions: [],
    };
  }
};


// ======================================================
// FEATURE PERMISSION
// ======================================================

export const hasFeaturePermission = (
  permissions,
  featureName,
) => {
  const feature = permissions?.find(
    item => item?.feature === featureName,
  );

  if (!feature) {
    return false;
  }

  const subFeatures = feature?.subFeatures || [];

  // Features like Dashboard, Sales/Billing,
  // Day Close, Business Profile etc.
  // have null subFeature.
  if (subFeatures.length === 0) {
    return false;
  }

  return subFeatures.some(
    sub => Number(sub?.view) === 1,
  );
};


// ======================================================
// SUB FEATURE PERMISSION
// ======================================================

export const hasSubFeaturePermission = (
  permissions,
  featureName,
  subFeatureName,
) => {
  const feature = permissions?.find(
    item => item?.feature === featureName,
  );

  if (!feature) {
    return false;
  }

  const subFeature = feature?.subFeatures?.find(
    item => item?.subFeature === subFeatureName,
  );

  return Number(subFeature?.view) === 1;
};


// ======================================================
// COMMON FUNCTION
// ======================================================

export const canView = (
  permissions,
  featureName,
  subFeatureName = null,
) => {
  if (subFeatureName) {
    return hasSubFeaturePermission(
      permissions,
      featureName,
      subFeatureName,
    );
  }

  return hasFeaturePermission(
    permissions,
    featureName,
  );
};
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CustomHeader from '../components/CustomHeader';
import { rS, rV } from '../constants/responsive';
import Fonts from '../constants/Fonts';
import PlusIcon from '../assets/Icons/PlusIcon';
import UploadIcon from '../assets/Icons/UploadIcon'
import DownloadIcon from '../assets/Icons/DownloadIcon'
import { useNavigation } from '@react-navigation/native';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule'
import {
  pick,
  types,
  isCancel,
  keepLocalCopy,
  saveDocuments,
} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Toast from 'react-native-toast-message';


export default function BulkUploadScreen() {
  const navigation = useNavigation()
  const { postMethod, getMethod } = HelperModule()
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fileError, setFileError] = useState('');
  const [uploadError, setUploadError] = useState('');


  const handleDownloadSampleFile = async () => {
    try {
      setIsDownloading(true);

      const response = await getMethod(
        ApiServices.zenxposGetProductSampleFile
      );

      const fileUrl = response.data?.fileUrl;

      const fileName =
        response.data?.fileName ||
        'sample_product_dataformat.csv';

      if (!fileUrl) {
        Toast.show({
          type: 'error',
          text1: 'Download Failed',
          text2: 'File URL not found',
        });
        return;
      }

      // 1. Download API file to temporary/cache location
      const tempPath =
        `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${fileName}`;

      const result = await ReactNativeBlobUtil.config({
        path: tempPath,
      }).fetch('GET', fileUrl);

      const localFileUri = `file://${result.path()}`;

      console.log('Temporary file:', localFileUri);

      // 2. Open Android/iOS Save As dialog
      const saveResult = await saveDocuments({
        sourceUris: [localFileUri],
        fileName: fileName,
        mimeType: 'text/csv',
        copy: true,
      });

      console.log('Save result:', saveResult);

      if (saveResult?.[0]?.uri) {
        Toast.show({
          type: 'success',
          text1: 'File Saved',
          text2: 'Sample file saved successfully',
        });
      }

    } catch (error) {
      if (isCancel(error)) {
        console.log('User cancelled save');
        return;
      }

      console.log('Download error:', error);

      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Unable to save file',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // const handleDownloadSampleFile = async () => {
  //   try {
  //     setIsDownloading(true);
  //     const response = await getMethod(ApiServices.zenxposGetProductSampleFile);
  //     console.log('Sample file response:', response.data);
  //      const fileUrl = response.data?.fileUrl;
  //       const fileName = response.data?.fileName;

  //       if (fileUrl) {
  //       console.log('Sample file URL:', fileUrl); 
  //       console.log('Sample file name:', fileName);
  //       Alert.alert( 'Sample File', `${fileName || 'Sample file'} is available.`, );
  //       } else {
  //     Alert.alert( 'Error', 'Sample file URL was not returned by the server.', );
  //     }
  //   } catch (error) {
  //     console.log( 'Sample file error:', error?.response?.data || error, );
  //     Alert.alert( 'Error', error?.response?.data?.message || error?.message || 'Unable to fetch sample file.', );
  //   } finally {
  //     setIsDownloading(false);
  //   }
  // };

  const handleSelectFile = async () => {
    try {
      const result = await pick({
        type: [types.csv],
        allowMultiSelection: false,
      });

      if (!result || result.length === 0) {
        return;
      }

      const file = result[0];

      console.log('Selected file:', file);

      const localCopy = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name || 'sample_product.csv',
          },
        ],
        destination: 'cachesDirectory',
      });

      console.log('Local copy:', localCopy);

      const copiedFile = localCopy[0];

      if (copiedFile.status !== 'success') {
        Alert.alert(
          'Error',
          'Unable to prepare the selected file for upload.',
        );
        return;
      }

      setSelectedFile({
        uri: copiedFile.localUri,
        name: file.name || 'sample_product.csv',
        type: 'text/csv',
      });

      setFileError('');
      setUploadError('');

      console.log('File ready for upload:', {
        uri: copiedFile.localUri,
        name: file.name,
        type: 'text/csv',
      });

    } catch (error) {
      if (isCancel(error)) {
        console.log('User cancelled file picker');
        return;
      }

      console.log('File picker error:', error);

      Alert.alert(
        'Error',
        'Unable to select the file. Please try again.',
      );
    }
  };

const handleUpload = async () => {
  if (!selectedFile) {
    setFileError('Please select a CSV file first.');
    return;
  }

  setFileError('');
  setUploadError('');
  setIsUploading(true);

  try {
    const formData = new FormData();

    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name || 'sample_product.csv',
      type: 'text/csv',
    });

    console.log('FormData file:', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: 'text/csv',
    });

    const response = await postMethod(
      ApiServices.zenxposProductsBulkUpload,
      formData,
    );

    console.log('Bulk upload response:', response);

    // Upload API success
    if (response) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Products imported successfully',
      });

      setSelectedFile(null);
      setUploadError('');
    }

  } catch (error) {
    console.log(
      'Bulk upload error:',
      error?.response?.data || error,
    );

    const apiError = error?.response?.data;

    const errorMessage =
      apiError?.errors ||
      apiError?.message ||
      apiError?.error ||
      error?.message ||
      'Something went wrong while uploading the file.';

    // Make sure object/array is not rendered directly
    setUploadError(
      typeof errorMessage === 'string'
        ? errorMessage
        : JSON.stringify(errorMessage)
    );

  } finally {
    setIsUploading(false);
  }
};

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />

      <View style={styles.subContainer}>
        {/* Header */}
        <View style={styles.productRowContainer}>
          <View>
            <Text style={styles.productText}>Product Bulk Upload</Text>

            <Text style={styles.productSubText}>
              Create or Manage Products
            </Text>
          </View>

          <View style={styles.buttonRow}>
            {/* Manage Products */}
            <TouchableOpacity
              style={styles.manageProductTouchable}
              onPress={() => navigation.navigate('ProductScreen')}>
              <Text style={styles.manageProductText}>
                Manage Products
              </Text>
            </TouchableOpacity>

            {/* Add New Product */}
            <TouchableOpacity
              style={styles.newProductTouchable}
              onPress={() => navigation.navigate('NewProductScreen')}>
              <PlusIcon />

              <Text style={styles.addNewProductText}>
                Add New Product
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={20}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={styles.formSubContainer}>

              {/* Title Row */}
              <View style={styles.bulkHeaderRow}>
                <Text style={styles.bulkUploadText}>
                  BULK UPLOAD
                </Text>

                <TouchableOpacity
                  style={styles.sampleFileContainer}
                  onPress={handleDownloadSampleFile} disabled={isDownloading}>

                  <Text style={styles.sampleFileText}>
                    sample_product.csv
                  </Text>
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#264B79" />
                  ) : (
                    <DownloadIcon />
                  )
                  }
                </TouchableOpacity>
              </View>

              {/* Upload Label */}
              <Text style={styles.uploadLabel}>
                Upload file <Text style={styles.required}>*</Text>
              </Text>

              {/* Upload Row */}
              <View style={styles.uploadRowContainer}>

                {/* File Input */}
                <View>
                  <TouchableOpacity
                    style={
                      styles.fileInput
                    }
                    onPress={handleSelectFile}>
                    <UploadIcon />

                    <Text style={[
                      styles.filePlaceholder,
                      selectedFile && styles.selectedFileText,
                    ]}>
                      {selectedFile ? selectedFile.name : 'select file'}
                    </Text>
                  </TouchableOpacity>

                  {fileError ? (
                    <Text style={styles.fileErrorText}>
                      {fileError}
                    </Text>
                  ) : null}
                </View>


                {/* Upload Button */}
                <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={isUploading}>
                  {isUploading ? (<ActivityIndicator size="small" color="#FFFFFF" />) : (<Text style={styles.uploadButtonText}> Upload </Text>)}
                </TouchableOpacity>

              </View>
                {uploadError ? (
    <Text style={styles.uploadErrorText}>
      {uploadError}
    </Text>
  ) : null}
            </View>
          </KeyboardAwareScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

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

  productRowContainer: {
    flexDirection: 'row',
    marginTop: rV(10),
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  productText: {
    color: '#000000',
    fontFamily: Fonts.FigtreeSemiBold,
    fontSize: 22,
  },

  productSubText: {
    color: '#919191',
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    marginTop: rV(2),
  },

  buttonRow: {
    flexDirection: 'row',
    gap: rS(8),
  },

  manageProductTouchable: {
    flexDirection: 'row',
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
    backgroundColor: '#264B79',
  },

  manageProductText: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#FFFFFF',
  },

  newProductTouchable: {
    flexDirection: 'row',
    borderColor: '#264B79',
    borderWidth: 1,
    borderRadius: 8,
    height: rV(27),
    alignItems: 'center',
    paddingHorizontal: rS(10),
    backgroundColor: '#FFFFFF',
  },

  addNewProductText: {
    marginLeft: rS(4),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#264B79',
  },

  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: rV(14),
    flex: 1,
  },

  formSubContainer: {
    marginHorizontal: rS(14),
    marginVertical: rV(16),
  },

  bulkHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  bulkUploadText: {
    fontSize: 18,
    fontFamily: Fonts.FigtreeSemiBold,
    color: '#264B79',
  },

  sampleFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sampleFileText: {
    color: '#848484',
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
    marginRight: rS(3)
  },

  uploadLabel: {
    marginTop: rV(10),
    marginBottom: rV(7),
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
    color: '#111111',
  },

  required: {
    color: '#E53935',
  },
  uploadErrorText: {
  color: '#E53935',
  fontSize: 12,
  fontFamily: Fonts.FigtreeRegular,
  marginTop: rV(4),
  maxWidth: rS(250),
},

  uploadRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // fileInputError: {
  //   borderColor: '#E53935',
  // },
  fileErrorText: {
    color: '#E53935',
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    marginTop: rV(4),
  },

  fileInput: {
    width: rS(170),
    height: rV(27),
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rS(14),
    backgroundColor: '#FFFFFF',
  },

  attachmentIcon: {
    fontSize: 22,
    color: '#264B79',
    marginRight: rS(14),
  },

  filePlaceholder: {
    color: '#9A9A9A',
    fontSize: 16,
    fontFamily: Fonts.FigtreeRegular,
    marginLeft: rS(3)
  },
  selectedFileText: { color: '#264B79', },

  uploadButton: {
    marginLeft: rS(12),
    width: rS(70),
    height: rV(27),
    borderRadius: 7,
    backgroundColor: '#264B79',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledUploadButton: { backgroundColor: '#A7B5C6', },

  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },
});
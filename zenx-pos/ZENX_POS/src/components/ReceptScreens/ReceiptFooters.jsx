import React from 'react';
import { View, Text, Image } from 'react-native';

const ReceiptFooter = ({
  bill,
  styles,
  scale,
}) => {
  return (
    <>
      {/* SAVED AMOUNT */}
      {Number(bill.amountSaved || 0) > 0 && (
          <>
            <View style={styles.line} />

            <View style={styles.savedRow}>
              <Text style={styles.savedText}>
                Total Amount Saved:
              </Text>
              <Text style={styles.savedText}>
                {Number(bill.amountSaved).toFixed(2)}
              </Text>
            </View>

            <View style={styles.line} />
          </>
        )}

      {/* QR CODE — only shows when showQr === true */}
      {bill.showQr && (
        <View style={styles.qrContainer}>
          <Text style={styles.qrText}>
            Scan here to pay your Bill
          </Text>
          {/* <Image
            source={require('../../assets/Images/qr_code.png')}
            style={styles.qrImage}
            resizeMode="contain"
          /> */}
        </View>
      )}
      {Array.isArray(bill?.footerText) &&
  bill.footerText.map((text, index) => (
    <Text key={index} style={styles.thankYou}>
      {text}
    </Text>
  ))}

      {/* BARCODE */}
      <View style={styles.barcodeContainer}>
        {/* <Image
          source={require('../../assets/Images/barcode_image.png')}
          style={styles.barcode}
          resizeMode="contain"
        /> */}
      </View>

      {/* DUPLICATE */}
      {bill.copyType === 'DUPLICATE' && (
        <View style={styles.duplicateContainer}>
          <View style={styles.duplicateLine} />
          <Text style={styles.duplicateText}>
            DUPLICATE
          </Text>
          <View style={styles.duplicateLine} />
        </View>
      )}
    </>
  );
};

export default ReceiptFooter;
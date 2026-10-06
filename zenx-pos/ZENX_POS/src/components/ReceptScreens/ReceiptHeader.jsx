import React from 'react';
import { View, Text, Image } from 'react-native';

const ReceiptHeader = ({ bill, styles }) => {
  return (
    <>
      {/* STORE HEADER */}

      <View style={styles.header}>
        {bill?.showLogo && bill?.store?.logo ? (
          <Image
            source={{ uri: bill.store.logo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : null}

        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{bill.store.name}</Text>

          <View style={styles.contactRow}>
            {bill?.store?.contact ? (
              <Text style={styles.contactText}>
                Contact: {bill.store.contact}
              </Text>
            ) : null}
            {bill?.store?.gstNo ? (
              <Text style={styles.gstText}>GST.No: {bill.store.gstNo}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ADDRESS */}

      <View style={styles.addressContainer}>
        {bill?.store?.address1 ? (
          <Text style={styles.address}>{bill.store.address1}</Text>
        ) : null}

        {bill?.store?.address2 ? (
          <Text style={styles.address}>{bill.store.address2}</Text>
        ) : null}
      </View>
    </>
  );
};

export default ReceiptHeader;

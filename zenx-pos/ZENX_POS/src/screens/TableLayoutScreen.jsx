import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';

import Fonts from '../constants/Fonts';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import TotalTablesIcon from '../assets/Icons/TotalTablesIcon';
import OccupiedIcon from '../assets/Icons/OccupiedIcon';
import AvailableIcon from '../assets/Icons/AvailableIcon';
import ReservedIcon from '../assets/Icons/ReservedIcon';
import MaintenanceIcon from '../assets/Icons/MaintenanceIcon';
import GroupIcon from '../assets/Icons/GroupIcon';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomHeader from '../components/CustomHeader';
import UpArrow from '../assets/Icons/UpArrow'
import ACIcon from '../assets//Icons/ACIcon'
import { Dropdown } from 'react-native-element-dropdown';
import AvailableModal from '../components/AvailableModal';
import OccupiedModal from '../components/OccupiedModal'
import ReserveTableModal from '../components/ReserveTableModal'
import ShiftTableModal from '../components/ShiftTableModal'

export default function TableLayoutScreen() {
  const [floor, setFloor] = useState(null);
  const [capacity, setCapacity] = useState(null);
  const [acType, setAcType] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedOccupiedTable, setSelectedOccupiedTable] = useState(null)
  const [modalVisible, setModalVisible] = useState(false);
  const [occupiedVisible, setOccupiedVisible] = useState(false)
  const [reserveVisible, setReserveVisible] = useState(false);
  const [shiftTableVisible, setShiftTableVisible] = useState(false)
  const stats = [
    { title: 'Total Tables', value: 20, color: '#FFFFFF', icon: TotalTablesIcon, backgroundColor: '#264B79', textColor: '#FFFFFF', },
    { title: 'Occupied', value: 8, color: '#F48B4A', icon: OccupiedIcon, backgroundColor: '#FFFFFF', textColor: '#3C3C3C' },
    { title: 'Available', value: 13, color: '#55AC32', icon: AvailableIcon, backgroundColor: '#FFFFFF', textColor: '#3C3C3C' },
    { title: 'Reserved', value: 2, color: '#E773B5', icon: ReservedIcon, backgroundColor: '#FFFFFF', textColor: '#3C3C3C' },
    { title: 'Maintenance', value: 1, color: '#E71414', icon: MaintenanceIcon, backgroundColor: '#FFFFFF', textColor: '#3C3C3C' },
  ];

  // ✅ Tables Data
  const tables = [
    { id: 1, status: 'Available', people: 3, icon: ACIcon, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 2, status: 'Occupied', people: 3, waiter: 'Manohar', icon: ACIcon, borderColor: '#FFC39A', backgroundColor: '#FAE7DA' },
    { id: 3, status: 'Reserved', people: 3, time: '12:30 PM', icon: ACIcon, borderColor: '#F7A8D5', backgroundColor: '#FFDDF0' },
    { id: 4, status: 'Available', people: 3, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 5, status: 'Available', people: 3, icon: ACIcon, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 6, status: 'Occupied', people: 3, waiter: 'Manohar', borderColor: '#FFC39A', backgroundColor: '#FAE7DA' },
    { id: 7, status: 'Occupied', people: 3, waiter: 'Manohar', icon: ACIcon, borderColor: '#FFC39A', backgroundColor: '#FAE7DA' },
    { id: 8, status: 'Available', people: 3, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 9, status: 'Occupied', people: 3, waiter: 'Manohar', icon: ACIcon, borderColor: '#FFC39A', backgroundColor: '#FAE7DA' },
    { id: 10, status: 'Available', people: 3, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 11, status: 'Ready to Bill', people: 3, waiter: 'Manohar', icon: ACIcon, borderColor: '#88BBFB', backgroundColor: '#D5F1FF' },
    { id: 12, status: 'Occupied', people: 3, waiter: 'Manohar', icon: ACIcon, borderColor: '#FFC39A', backgroundColor: '#FAE7DA' },
    { id: 13, status: 'Reserved', people: 3, time: '12:30 PM', icon: ACIcon, borderColor: '#F7A8D5', backgroundColor: '#FFDDF0' },
    { id: 14, status: 'Available', people: 3, icon: ACIcon, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 15, status: 'Maintenance', people: 3, borderColor: '#FD7171', backgroundColor: '#FFE4E4' },
    { id: 16, status: 'Reserved', people: 3, time: '12:30 PM', icon: ACIcon, borderColor: '#F7A8D5', backgroundColor: '#FFDDF0' },
    { id: 17, status: 'Available', people: 3, icon: ACIcon, borderColor: '#9CD188', backgroundColor: '#D9F7CE' },
    { id: 18, status: 'Maintenance', people: 3, borderColor: '#FD7171', backgroundColor: '#FFE4E4' },
    // { id: 19, status: 'Maintenance', people: 3, borderColor: '#FD7171', backgroundColor: '#FFE4E4' },
    // { id: 20, status: 'Maintenance', people: 3, borderColor: '#FD7171', backgroundColor: '#FFE4E4' },
  ];

  const floorData = [
    { label: '1st Floor', value: '1' },
    { label: '2nd Floor', value: '2' },
    { label: '3rd Floor', value: '3' },
    { label: '4th Floor', value: '4' },
    { label: '5th Floor', value: '5' },
  ];


  const capacityData = [
    { label: '2', value: '1' },
    { label: '3', value: '2' },
    { label: '5', value: '3' },
    { label: '4', value: '4' },
    { label: '6', value: '5' },
  ];

  const acData = [
    { label: 'AC', value: '1' },
    { label: 'Non-AC', value: '2' },
  ];

  const handleReserve = () => {
    setModalVisible(false); // Available modal close
    setReserveVisible(true); // Reserve modal open
  };

  const handleShiftTable = () => {
    setOccupiedVisible(false);
    setShiftTableVisible(true)
  }

  // ✅ Status Color
  const getColor = (status) => {
    switch (status) {
      case 'Available':
        return '#4FA430';
      case 'Occupied':
        return '#C58157';
      case 'Reserved':
        return '#E55CAA';
      case 'Maintenance':
        return '#B76060';
      case 'Ready to Bill':
        return '#7DAFED';
      default:
        return '#ccc';
    }
  };

  // ✅ Table Card
  const renderTable = ({ item }) => {
    const AcIconComponent = item.icon;

    return (
      <TouchableOpacity
        style={[styles.tableCard, { borderColor: getColor(item.status) }]}
        onPress={() => {
          if (item.status === 'Available') {
            setSelectedTable(item);
            setModalVisible(true);
          }
          if (item.status === 'Occupied') {
            setSelectedOccupiedTable(item);
            setOccupiedVisible(true)
          }
        }}
      >

        <View>
          <View style={styles.tableHeader}>
            <View style={{
              backgroundColor: item.backgroundColor,
              borderColor: item.borderColor,
              paddingHorizontal: wp(2),
              paddingVertical: hp(0.7),
              borderRadius: 20,
              borderWidth: 1
            }}>
              <Text style={[styles.tableName, { color: getColor(item.status) }]}>
                Table {item.id}
              </Text>
            </View>

            <Text style={styles.status}>{item.status}</Text>
          </View>

          <View style={styles.centerContent}>
            <GroupIcon />
            <Text style={styles.people}>{item.people}</Text>
          </View>

          {item.waiter && (
            <Text style={styles.subText}>Waiter: {item.waiter}</Text>
          )}

          {item.time && (
            <Text style={styles.subText}>Time: {item.time}</Text>
          )}
        </View>
        {item.icon && (
          <View style={{ alignItems: 'flex-end' }}>
            <AcIconComponent />
          </View>
        )}

      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader />
      <View style={styles.subContainer}>

        {/* Title */}
        <Text style={styles.title}>Table Layout</Text>
        <Text style={styles.subtitle}>View Table Layout</Text>

        {/* ✅ Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((item, index) => {
            const IconComponent = item.icon;

            return (
              <View
                key={index}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: item.backgroundColor,
                    marginRight: index !== stats.length - 1 ? wp(2) : 0,
                  },
                ]}
              >
                <View style={styles.statTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 16 }}>
                    <IconComponent />
                    <Text style={[styles.statTitle, { color: item.textColor }]}>
                      {item.title}
                    </Text>
                  </View>

                  <Text style={[styles.statValue, { color: item.color }]}>
                    {item.value.toString().padStart(2, '0')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.tableContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#000000', fontSize: 18, fontFamily: Fonts.FigtreeMedium }}>
                {floor ? `${floor.label}` : 'Floor Layout'}
              </Text>
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Dropdown
                    style={styles.dropdown}
                    data={floorData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Floor"
                    value={floor}
                    onChange={item => setFloor(item)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />
                </View>

                <View style={styles.halfField}>
                  <Dropdown
                    style={styles.dropdown}
                    data={capacityData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select Capacity"
                    value={capacity}
                    onChange={item => setCapacity(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    itemTextStyle={styles.itemTextStyle}
                    iconColor='#1B1B1B'
                  />
                </View>

                <View style={styles.halfField}>
                  <Dropdown
                    style={styles.dropdown}
                    data={acData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select AC"
                    value={acType}
                    itemTextStyle={styles.itemTextStyle}
                    onChange={item => setAcType(item.value)}
                    placeholderStyle={styles.placeholderStyle}
                    selectedTextStyle={styles.selectedTextStyle}
                    iconColor='#1B1B1B'
                  />
                </View>
              </View>
            </View>
            <FlatList
              data={tables}
              renderItem={renderTable}
              keyExtractor={(item) => item.id.toString()}
              numColumns={5}
              columnWrapperStyle={{ justifyContent: 'flex-start', gap: 15 }}
              contentContainerStyle={{ paddingTop: hp(2), paddingBottom: hp(20) }}
              showsVerticalScrollIndicator={false}

            />
          </ScrollView>
        </View>
      </View>
      {/* <AvailableModal /> */}
      {/* <Modal
  visible={modalVisible}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>

      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
          Table {selectedTable?.id}{' '}
          <Text style={{ color: '#4FA430' }}>• Available</Text>
        </Text>

        <TouchableOpacity onPress={() => setModalVisible(false)}>
          <Text style={{ fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center', marginVertical: 20 }}>
        <GroupIcon />
        <Text style={styles.modalPeople}>
          {selectedTable?.people}
        </Text>
        <Text style={styles.modalSubText}>
          Seats Available
        </Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn}>
        <Text style={styles.primaryText}>Start New Order</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>Reserve Table</Text>
      </TouchableOpacity>

    </View>
  </View>
</Modal> */}
      <AvailableModal
        isVisible={modalVisible}
        selectedTable={selectedTable}
        onClose={() => setModalVisible(false)}
        onReserve={handleReserve}
      />
      <OccupiedModal isVisible={occupiedVisible} selectedTable={selectedOccupiedTable} onClose={() => setOccupiedVisible(false)} onShiftTable={handleShiftTable} />
      <ReserveTableModal
        isVisible={reserveVisible}
        selectedTable={selectedTable}
        onClose={() => setReserveVisible(false)}
      />
      <ShiftTableModal
        isVisible={shiftTableVisible}
        selectedTable={selectedOccupiedTable}
        onClose={() => setShiftTableVisible(false)}
      />
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
    paddingHorizontal: 16,
    paddingBottom: hp(2)
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    paddingHorizontal: 12,
    marginTop: hp("2%")
  },

  title: {
    fontSize: 20,
    fontFamily: Fonts.FigtreeMedium,
    marginTop: hp(2),
    color: '#3C3C3C'
  },
  halfField: {
    marginRight: 10
  },
  row: {
    flexDirection: 'row',
  },

  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.FigtreeRegular,
    color: '#666',
    marginTop: 4,
    letterSpacing: 0.5
  },
  tableContainer: {

    backgroundColor: '#FFFFFF',
    marginTop: hp(2),
    paddingHorizontal: wp(2),
    // paddingTop: hp(2),
    borderRadius: 8

  },
  statsRow: {
    flexDirection: 'row',
    marginTop: hp(2),
  },

  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 20,
    borderRadius: 10,
  },
  dropdown: {
    height: 38,
    borderColor: '#EAEAEA',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    marginTop: hp('2%'),
    width: wp(12),
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

  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },

  statTitle: {
    fontSize: 16,
    marginLeft: wp(1),
    fontFamily: Fonts.FigtreeMedium,
  },

  statValue: {
    fontSize: 24,
    fontFamily: Fonts.FigtreeRegular,
    marginRight: 16
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(2),
  },

  floorText: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
  },

  filters: {
    flexDirection: 'row',
  },

  filterBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    fontSize: 12,
  },
  tableCard: {
    width: '19%',
    borderRadius: 12,
    paddingRight: 10,
    marginBottom: 13,
    borderWidth: 0.7,
    paddingVertical: 10,
    height: hp(18),
    justifyContent: 'space-between',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: wp(1),
    alignItems: 'center',
    marginBottom: hp(1.5)
  },

  tableName: {
    fontSize: 14,
    fontFamily: Fonts.FigtreeMedium,
  },

  status: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Fonts.FigtreeRegular
  },

  centerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    // marginBottom
  },

  people: {
    marginLeft: 6,
    fontSize: 18,
    fontFamily: Fonts.FigtreeRegular,
    marginTop: hp(0.7),
    textAlign: 'center',
    marginBottom: 6

  },

  subText: {
    fontSize: 14,
    marginTop: 6,
    fontFamily: Fonts.FigtreeRegular,
    color: '#1B1B1B',
    textAlign: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '50%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 16,
    fontFamily: Fonts.FigtreeMedium,
    color: '#000',
  },

  modalPeople: {
    fontSize: 22,
    fontFamily: Fonts.FigtreeMedium,
    marginTop: 10,
  },

  modalSubText: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },

  primaryBtn: {
    backgroundColor: '#2F4B7C',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  primaryText: {
    color: '#fff',
    fontFamily: Fonts.FigtreeMedium,
  },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2F4B7C',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  secondaryText: {
    color: '#2F4B7C',
    fontFamily: Fonts.FigtreeMedium,
  },
});
import { View, Text, ScrollView } from 'react-native';
import React from 'react';
import MenuTitle from '../../Components/MenuTitle';
import ReportChoice from '../../Components/ReportChoice';
import { useTheme } from '../DrawerNavigation/ThemeContect';

const ReportsScreen = ({ route }) => {
  const { pageTitle } = route.params;
  const { themeStyles } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View style={{ width: '100%', alignItems: 'center', height: 150, backgroundColor: themeStyles.headerColor }}>
        <View style={{ width: '92%', flex: 1 }}>
          <MenuTitle pageTitle={pageTitle} />
        </View>
      </View>

      <View style={{ width: '100%', alignItems: 'center', backgroundColor: themeStyles.backgroundColor }}>
        <ScrollView
          style={{ width: '92%', height: '100%' }}
          contentContainerStyle={{ paddingBottom: 220 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: '100%', backgroundColor: themeStyles.containerColor, marginTop: 10, borderRadius: 10, padding: 10 }}>
            <View style={{ width: '100%', height: '100%' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, color: themeStyles.textColor }}>Reports</Text>
              <ReportChoice
                reportTitle={'Activity Log'}
                description={'Track all inventory, sales, and user activities'}
                icon={'clipboard-text-clock'}
                iconColor={'D61414'}
              />
              <View style={{ borderTopWidth: 1, borderColor: '#888888' }} />
              <ReportChoice
                reportTitle={'Inventory & Sales Insights'}
                description={'AI-Generated Stock Trends, Sales Insights & Inventory Summary'}
                icon={'file-chart'}
                iconColor={'F58413'}
              />
              <View style={{ borderTopWidth: 1, borderColor: '#888888' }} />
              <ReportChoice
                reportTitle={'Live Inventory Tracking'}
                description={'Monitor inventory levels in real time'}
                icon={'chart-line'}
                iconColor={'47D614'}
              />
              <View style={{ borderTopWidth: 1, borderColor: '#888888' }} />
              <ReportChoice
                reportTitle={'Order Fulfillment Report'}
                description={'Monitor order processing times and delivery success rates'}
                icon={'clipboard-text-clock'}
                iconColor={'00CCF5'}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

export default ReportsScreen;
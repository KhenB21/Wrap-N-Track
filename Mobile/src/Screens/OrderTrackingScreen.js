import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import Header from "../Components/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { customerOrderAPI } from "../services/api";
import { useTheme } from "../Context/ThemeContext";

const STEP_ICONS = {
  'order-placed': 'clipboard-text-outline',
  'order-paid': 'credit-card-outline',
  'order-shipped': 'truck-outline',
  'order-received': 'home-outline',
};

export default function OrderTrackingScreen({ navigation, route }) {
  const { orderId } = route.params || {};
  const { darkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [tracking, setTracking] = useState(null);

  useEffect(() => {
    if (orderId) {
      loadTracking();
    }
  }, [orderId]);

  const loadTracking = async () => {
    try {
      const data = await customerOrderAPI.getOrderTracking(orderId);
      setTracking(data.tracking || data);
    } catch (error) {
      console.error("Error loading tracking:", error);
      Alert.alert("Error", "Failed to load order tracking");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadTracking();
    } catch (error) {
      console.error("Error refreshing tracking:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStepColor = (completed) => completed ? '#6B6593' : (darkMode ? '#393A3B' : '#EDECF3');
  const getStepIconColor = (completed) => completed ? '#fff' : (darkMode ? '#B0B3B8' : '#6B6593');

  const bg = darkMode ? "#18191A" : "#F5F4FA";
  const card = darkMode ? "#242526" : "#fff";
  const text = darkMode ? "#E4E6EB" : "#222";
  const sub = darkMode ? "#B0B3B8" : "#6B6593";

  if (!tracking) {
    return (
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Header showBack showCart logoType="image" onBackPress={() => navigation.goBack()} onCartPress={() => navigation.navigate("MyCart")} darkMode={darkMode} />
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={32} color={sub} />
          <Text style={[styles.loadingText, { color: sub }]}>Loading tracking...</Text>
        </View>
      </View>
    );
  }

  const steps = tracking.steps || [];
  const currentStage = tracking.currentStage;

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Header showBack showCart logoType="image" onBackPress={() => navigation.goBack()} onCartPress={() => navigation.navigate("MyCart")} darkMode={darkMode} />

      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Order Header */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <View style={styles.orderHeader}>
            <Text style={[styles.orderId, { color: text }]}>Order #{tracking.orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: '#6B6593' }]}>
              <Text style={styles.statusText}>{currentStage?.toUpperCase().replace(/-/g, ' ')}</Text>
            </View>
          </View>
          {tracking.expectedDelivery && (
            <Text style={[styles.orderDate, { color: sub }]}>
              Expected: {tracking.expectedDelivery}
            </Text>
          )}
          {tracking.shippingAddress && (
            <Text style={[styles.orderDate, { color: sub }]}>
              To: {tracking.shippingAddress}
            </Text>
          )}
        </View>

        {/* Status Timeline */}
        <View style={[styles.section, { backgroundColor: card }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Order Tracking</Text>
          <View style={styles.timeline}>
            {steps.map((step, index) => (
              <View key={step.id} style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: getStepColor(step.completed), borderColor: getStepColor(step.completed) }]}>
                  <MaterialCommunityIcons
                    name={STEP_ICONS[step.id] || 'circle-outline'}
                    size={16}
                    color={getStepIconColor(step.completed)}
                  />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStatus, { color: step.completed ? text : sub, fontWeight: step.status === 'current' ? 'bold' : 'normal' }]}>
                    {step.title}
                  </Text>
                  {step.description ? (
                    <Text style={[styles.timelineDescription, { color: sub }]}>{step.description}</Text>
                  ) : null}
                  {step.timestamp ? (
                    <Text style={[styles.timelineDescription, { color: sub }]}>
                      {new Date(step.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  ) : null}
                </View>
                {index < steps.length - 1 && (
                  <View style={[styles.timelineLine, { backgroundColor: step.completed ? '#6B6593' : (darkMode ? "#393A3B" : "#EDECF3") }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {tracking.totalCost != null && (
          <View style={[styles.section, { backgroundColor: card }]}>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={[styles.totalLabel, { color: text }]}>Order Total:</Text>
              <Text style={[styles.totalValue, { color: text }]}>₱{parseFloat(tracking.totalCost).toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'serif',
    marginTop: 16,
  },
  section: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  orderDate: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 16,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  timelineDescription: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDECF3',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  itemSku: {
    fontSize: 12,
    fontFamily: 'serif',
    marginTop: 2,
  },
  itemDetails: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 12,
    fontFamily: 'serif',
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDECF3',
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'serif',
    fontWeight: 'bold',
  },
  customerInfo: {
    marginTop: 8,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  customerDetail: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 14,
    fontFamily: 'serif',
    marginTop: 4,
    lineHeight: 20,
  },
});
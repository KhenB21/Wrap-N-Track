import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Full-screen, enlarged view of a single product photo.
// Double-tap the photo to zoom in (2x) / back out; tap the X or press Back to close.
export default function ImageViewerModal({ visible, uri, title, onClose }) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState("loading"); // loading | ok | failed
  const [zoomed, setZoomed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const lastTap = useRef(0);
  const { width, height } = Dimensions.get("window");

  useEffect(() => {
    if (visible) {
      setStatus("loading");
      setZoomed(false);
      scale.setValue(1);
    }
  }, [visible, uri, scale]);

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      const next = !zoomed;
      setZoomed(next);
      Animated.spring(scale, { toValue: next ? 2 : 1, friction: 6, useNativeDriver: true }).start();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.backdrop}>
        {/* Keep the close button well below the status bar: a tap near the top
            edge pulls down Android's notification shade instead. insets.top can
            read 0 inside a translucent Modal, so fall back to the bar height. */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 24) + 28 }]}>
          <Text style={styles.title} numberOfLines={1}>{title || ""}</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close image"
          >
            <MaterialCommunityIcons name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableWithoutFeedback onPress={handleTap}>
          <View style={styles.imageArea}>
            {uri && status !== "failed" ? (
              <Animated.Image
                source={{ uri }}
                style={{ width, height: height * 0.75, transform: [{ scale }] }}
                resizeMode="contain"
                onLoad={() => setStatus("ok")}
                onError={() => setStatus("failed")}
              />
            ) : (
              <View style={styles.center}>
                <MaterialCommunityIcons name="image-off-outline" size={56} color="#888" />
                <Text style={styles.noImage}>No image available</Text>
              </View>
            )}
            {status === "loading" && uri && (
              <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>

        {status === "ok" && (
          <Text style={[styles.hint, { marginBottom: insets.bottom + 16 }]}>
            {zoomed ? "Double-tap to zoom out" : "Double-tap to zoom in"}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.96)" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "600", marginRight: 12 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageArea: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  noImage: { color: "#aaa", marginTop: 8, fontSize: 14 },
  hint: { color: "rgba(255,255,255,0.6)", textAlign: "center", fontSize: 12 },
});

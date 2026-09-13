import React, { useEffect, useState } from "react";
import { View, Image, Text, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getProductImageUrl } from "../services/api";

// Product photo from /api/inventory/:sku/image — the endpoint the Website uses —
// with a drawn placeholder when the product has no photo (the endpoint 404s).
export default function ProductImage({ sku, version, style, colors, iconSize = 26, showLabel = true }) {
  const [status, setStatus] = useState("loading"); // loading | ok | failed

  // A different product in the same slot must start its own load.
  useEffect(() => {
    setStatus("loading");
  }, [sku, version]);

  const wash = colors?.wash || "#EDECF3";
  const mute = colors?.textMute || "#7C8087";
  const uri = getProductImageUrl(sku, version);

  if (!uri || status === "failed") {
    return (
      <View style={[styles.base, style, styles.center, { backgroundColor: wash }]}>
        <MaterialCommunityIcons name="image-off-outline" size={iconSize} color={mute} />
        {showLabel && <Text style={[styles.label, { color: mute }]}>No image available</Text>}
      </View>
    );
  }

  return (
    <View style={[styles.base, style, { backgroundColor: wash }]}>
      {status === "loading" && (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <ActivityIndicator size="small" color={mute} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("failed")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden" },
  center: { alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, marginTop: 4 },
});

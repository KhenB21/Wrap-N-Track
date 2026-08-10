import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Full-screen-ish overlay feedback for status-changing actions (e.g. Active/Inactive).
// phase: 'updating' | 'success' | 'error' | null (null/undefined hides it)
// Errors don't auto-dismiss — the user must tap to close, so a real failure
// (e.g. a validation rejection from the backend) can't be missed as a brief flash.
export default function StatusFeedback({ phase, message, onDismiss }) {
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase) {
      scaleAnim.setValue(0.6);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [phase]);

  if (!phase) return null;

  const config = {
    updating: { icon: null, color: '#2196F3', bg: '#E3F2FD' },
    success: { icon: 'check-circle', color: '#4CAF50', bg: '#E8F5E9' },
    error: { icon: 'close-circle', color: '#F44336', bg: '#FFEBEE' },
  }[phase];

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: config.bg, opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {phase === 'updating' ? (
          <ActivityIndicator size="large" color={config.color} />
        ) : (
          <MaterialCommunityIcons name={config.icon} size={48} color={config.color} />
        )}
        <Text style={[styles.message, { color: config.color }]}>{message}</Text>
        {phase === 'error' && (
          <TouchableOpacity style={[styles.dismissBtn, { borderColor: config.color }]} onPress={onDismiss}>
            <Text style={[styles.dismissText, { color: config.color }]}>OK</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 20,
  },
  card: {
    minWidth: 220,
    maxWidth: '80%',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  dismissBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

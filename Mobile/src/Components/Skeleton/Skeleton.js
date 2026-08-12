import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../../Context/ThemeContext';

/**
 * Base shimmering placeholder block. Pulses between the theme's
 * skeletonBase/skeletonHighlight colors — no external animation lib needed.
 */
export function Skeleton({ width = '100%', height = 16, radius = 6, style }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const backgroundColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeletonBase, colors.skeletonHighlight],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor },
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 48, style }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

export function SkeletonText({ width = '100%', height = 14, style }) {
  return <Skeleton width={width} height={height} radius={4} style={style} />;
}

/** Generic card skeleton: optional thumbnail + a few text lines. */
export function SkeletonCard({ withImage = true, lines = 2, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {withImage && <Skeleton width={56} height={56} radius={10} style={{ marginRight: 12 }} />}
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <SkeletonText width="70%" height={16} style={{ marginBottom: 8 }} />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText key={i} width={i === lines - 1 ? '40%' : '90%'} height={12} style={{ marginBottom: 6 }} />
        ))}
      </View>
    </View>
  );
}

/** Single-line row skeleton, e.g. for tables/lists. */
export function SkeletonRow({ columns = 3, style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonText key={i} width={i === 0 ? '30%' : `${Math.max(15, 70 / columns)}%`} height={12} />
      ))}
    </View>
  );
}

/** A vertical list of row skeletons. */
export function SkeletonList({ rows = 6, columns = 3, style }) {
  return (
    <View style={style}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} columns={columns} style={{ marginBottom: 8 }} />
      ))}
    </View>
  );
}

/** Stat/summary tile skeleton (dashboards, reports). */
export function SkeletonStatCard({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <SkeletonCircle size={36} style={{ marginBottom: 10 }} />
      <SkeletonText width="60%" height={20} style={{ marginBottom: 6 }} />
      <SkeletonText width="80%" height={12} />
    </View>
  );
}

/** Row of stat card skeletons. */
export function SkeletonStatRow({ count = 3, style }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 10 }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} style={{ flex: 1 }} />
      ))}
    </View>
  );
}

/** Profile header skeleton: avatar + name/subtitle lines. */
export function SkeletonProfile({ style }) {
  return (
    <View style={[styles.profile, style]}>
      <SkeletonCircle size={80} style={{ marginBottom: 14 }} />
      <SkeletonText width={140} height={18} style={{ marginBottom: 8 }} />
      <SkeletonText width={100} height={13} />
    </View>
  );
}

/** Product/inventory card skeleton (image-forward, grid-friendly). */
export function SkeletonProductCard({ style }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <Skeleton width="100%" height={100} radius={10} style={{ marginBottom: 10 }} />
      <SkeletonText width="85%" height={14} style={{ marginBottom: 6 }} />
      <SkeletonText width="50%" height={12} style={{ marginBottom: 6 }} />
      <SkeletonText width="35%" height={14} />
    </View>
  );
}

/** Grid of product card skeletons. */
export function SkeletonProductGrid({ count = 6, numColumns = 2, style }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProductCard key={i} style={{ width: `${100 / numColumns - 2}%`, marginBottom: 12 }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  profile: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  productCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});

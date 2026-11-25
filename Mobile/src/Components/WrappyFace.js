import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';

// Wrappy — the Wrap N' Track assistant's mascot: a little gift box with a bow
// and a face. Drawn with plain Views (no SVG dependency).
//
// Props:
//   size     — overall width in px (the bow sits above the box, inside this size)
//   animated — blink + gentle float
//   talking  — mouth opens/closes (e.g. while the greeting is "spoken")
export default function WrappyFace({ size = 40, animated = true, talking = false }) {
  const blink = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const mouth = useRef(new Animated.Value(0)).current;

  // Blink every ~3s (double-blink now and then so it feels alive).
  useEffect(() => {
    if (!animated) return undefined;
    const close = (d = 70) => Animated.timing(blink, { toValue: 0.1, duration: d, useNativeDriver: true });
    const open = (d = 90) => Animated.timing(blink, { toValue: 1, duration: d, useNativeDriver: true });
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        close(), open(),
        Animated.delay(2400),
        close(), open(), Animated.delay(120), close(), open(),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, blink]);

  // Gentle up/down float.
  useEffect(() => {
    if (!animated) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, float]);

  // Talking mouth.
  useEffect(() => {
    if (!talking) {
      Animated.timing(mouth, { toValue: 0, duration: 120, useNativeDriver: true }).start();
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mouth, { toValue: 1, duration: 110, useNativeDriver: true }),
        Animated.timing(mouth, { toValue: 0.2, duration: 110, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [talking, mouth]);

  const s = size;
  const box = s * 0.84;
  const eye = s * 0.15;
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -s * 0.06] });
  const mouthScale = mouth.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <Animated.View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end', transform: [{ translateY }] }}>
      {/* Bow */}
      <View style={[styles.bowRow, { top: 0, height: s * 0.24 }]}>
        <View style={[styles.loop, { width: s * 0.26, height: s * 0.18, borderRadius: s * 0.09, transform: [{ rotate: '-25deg' }], marginRight: -s * 0.03 }]} />
        <View style={[styles.knot, { width: s * 0.11, height: s * 0.11, borderRadius: s * 0.055 }]} />
        <View style={[styles.loop, { width: s * 0.26, height: s * 0.18, borderRadius: s * 0.09, transform: [{ rotate: '25deg' }], marginLeft: -s * 0.03 }]} />
      </View>

      {/* Box / face */}
      <View style={[styles.box, { width: box, height: box * 0.86, borderRadius: s * 0.2 }]}>
        {/* Ribbon band across the top of the lid */}
        <View style={[styles.lid, { height: box * 0.12, borderTopLeftRadius: s * 0.2, borderTopRightRadius: s * 0.2 }]} />

        <View style={[styles.eyesRow, { marginTop: box * 0.2, gap: box * 0.22 }]}>
          {[0, 1].map((i) => (
            <Animated.View
              key={i}
              style={[styles.eye, { width: eye, height: eye * 1.15, borderRadius: eye / 2, transform: [{ scaleY: blink }] }]}
            >
              <View style={[styles.glint, { width: eye * 0.35, height: eye * 0.35, borderRadius: eye }]} />
            </Animated.View>
          ))}
        </View>

        <View style={[styles.cheeksRow, { width: box * 0.78, marginTop: -s * 0.01 }]}>
          <View style={[styles.cheek, { width: s * 0.11, height: s * 0.06, borderRadius: s * 0.03 }]} />
          <View style={[styles.cheek, { width: s * 0.11, height: s * 0.06, borderRadius: s * 0.03 }]} />
        </View>

        {/* Smile — a half-ellipse that "opens" while talking */}
        <Animated.View
          style={[
            styles.mouth,
            {
              width: box * 0.3,
              height: box * 0.16,
              borderBottomLeftRadius: box * 0.16,
              borderBottomRightRadius: box * 0.16,
              transform: [{ scaleY: mouthScale }],
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bowRow: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  loop: { backgroundColor: '#F7A8B8', borderWidth: 1.5, borderColor: '#E07A93' },
  knot: { backgroundColor: '#E07A93', zIndex: 3 },
  box: { backgroundColor: '#8A84B8', alignItems: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: '#5E5890' },
  lid: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#F7A8B8' },
  eyesRow: { flexDirection: 'row' },
  eye: { backgroundColor: '#2B2844', alignItems: 'flex-end' },
  glint: { backgroundColor: '#fff', margin: 1 },
  cheeksRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cheek: { backgroundColor: 'rgba(247,168,184,0.85)' },
  mouth: { backgroundColor: '#2B2844', marginTop: 1 },
});

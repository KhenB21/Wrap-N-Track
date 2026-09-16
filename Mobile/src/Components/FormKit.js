import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PH_MOBILE_LENGTH, sanitizePhMobileInput } from '../constants/phone';

/* Small building blocks for the employee form screens (customers, orders).
   Every piece takes the ThemeContext `colors` object so light and dark mode match the rest of the app. */

const DANGER = '#E53935';

export function ScreenHeader({ title, subtitle, onBack, colors, right }) {
  return (
    <View style={[kit.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {!!onBack && (
        <TouchableOpacity onPress={onBack} style={kit.headerBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel="Go back">
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
      )}
      <View style={kit.flex1}>
        <Text style={[kit.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[kit.headerSub, { color: colors.subText }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function FormSection({ title, icon, description, children, colors, right }) {
  return (
    <View style={[kit.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {!!title && (
        <View style={kit.sectionHead}>
          {!!icon && (
            <View style={[kit.sectionIcon, { backgroundColor: colors.primaryContainer }]}>
              <MaterialCommunityIcons name={icon} size={16} color={colors.primary} />
            </View>
          )}
          <View style={kit.flex1}>
            <Text style={[kit.sectionTitle, { color: colors.text }]}>{title}</Text>
            {!!description && <Text style={[kit.sectionDesc, { color: colors.subText }]}>{description}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

export function FieldLabel({ label, required, colors }) {
  return (
    <Text style={[kit.label, { color: colors.subText }]}>
      {label}
      {required ? <Text style={{ color: DANGER }}> *</Text> : null}
    </Text>
  );
}

export function FormField({ label, required, icon, error, helper, colors, right, multiline, containerStyle, ...inputProps }) {
  return (
    <View style={[kit.field, containerStyle]}>
      {!!label && <FieldLabel label={label} required={required} colors={colors} />}
      <View
        style={[
          kit.inputWrap,
          { borderColor: error ? DANGER : colors.border, backgroundColor: colors.inputBackground },
          multiline && kit.inputWrapMulti,
          inputProps.editable === false && { opacity: 0.6 },
        ]}
      >
        {!!icon && <MaterialCommunityIcons name={icon} size={18} color={error ? DANGER : colors.subText} style={kit.inputIcon} />}
        <TextInput
          style={[kit.input, { color: colors.text }, multiline && kit.inputMulti]}
          placeholderTextColor={colors.placeholder}
          multiline={multiline}
          {...inputProps}
        />
        {right}
      </View>
      {error ? (
        <Text style={kit.error}>{error}</Text>
      ) : helper ? (
        <Text style={[kit.helper, { color: colors.subText }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

// 11-digit PH mobile input: digits only, hard-capped at 11, with a live counter.
export function PhoneField({ value, onChangeText, error, colors, label = 'Mobile Number', required, helper, ...rest }) {
  const digits = String(value || '');
  const complete = digits.length === PH_MOBILE_LENGTH;
  return (
    <FormField
      label={label}
      required={required}
      colors={colors}
      error={error}
      helper={helper || 'PH mobile number, 11 digits, e.g. 09171234567'}
      icon="cellphone"
      value={digits}
      onChangeText={(text) => onChangeText(sanitizePhMobileInput(text))}
      keyboardType="number-pad"
      maxLength={PH_MOBILE_LENGTH}
      placeholder="09XXXXXXXXX"
      right={
        <Text style={[kit.counter, { color: error ? DANGER : complete ? '#2E7D32' : colors.subText }]}>
          {digits.length}/{PH_MOBILE_LENGTH}
        </Text>
      }
      {...rest}
    />
  );
}

const toOption = (opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt);

export function ChipGroup({ options, value, onChange, colors, accent, disabled }) {
  const tint = accent || colors.primary;
  return (
    <View style={kit.chips}>
      {options.map((raw) => {
        const opt = toOption(raw);
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={[kit.chip, { borderColor: active ? tint : colors.border, backgroundColor: active ? tint : colors.card }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            {!!opt.icon && <MaterialCommunityIcons name={opt.icon} size={15} color={active ? '#fff' : colors.subText} />}
            <Text style={[kit.chipText, { color: active ? '#fff' : colors.text }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Segmented({ options, value, onChange, colors }) {
  return (
    <View style={[kit.segmented, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
      {options.map((raw) => {
        const opt = toOption(raw);
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[kit.segment, active && { backgroundColor: opt.tone || colors.primary }]}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            {!!opt.icon && <MaterialCommunityIcons name={opt.icon} size={16} color={active ? '#fff' : colors.subText} />}
            <Text style={[kit.segmentText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 9999, colors }) {
  const n = Number(value) || 0;
  return (
    <View style={[kit.stepper, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <TouchableOpacity onPress={() => onChange(Math.max(min, n - 1))} disabled={n <= min} style={kit.stepBtn} accessibilityLabel="Decrease">
        <MaterialCommunityIcons name="minus" size={18} color={n <= min ? colors.border : colors.primary} />
      </TouchableOpacity>
      <TextInput
        value={value === '' ? '' : String(n)}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, String(max).length);
          onChange(digits === '' ? '' : Math.min(max, Number(digits)));
        }}
        keyboardType="number-pad"
        style={[kit.stepValue, { color: colors.text }]}
        selectTextOnFocus
      />
      <TouchableOpacity onPress={() => onChange(Math.min(max, n + 1))} disabled={n >= max} style={kit.stepBtn} accessibilityLabel="Increase">
        <MaterialCommunityIcons name="plus" size={18} color={n >= max ? colors.border : colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export function BottomActions({ colors, children }) {
  return <View style={[kit.bottom, { backgroundColor: colors.card, borderTopColor: colors.border }]}>{children}</View>;
}

export function ActionButton({ label, onPress, colors, variant = 'primary', tone, icon, loading, disabled, style }) {
  const tint = tone || colors.primary;
  const filled = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        kit.action,
        filled ? { backgroundColor: tint } : { borderWidth: 1.5, borderColor: tint === colors.primary && !tone ? colors.border : tint },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? '#fff' : tint} />
      ) : (
        <>
          {!!icon && <MaterialCommunityIcons name={icon} size={18} color={filled ? '#fff' : tint === colors.primary && !tone ? colors.text : tint} />}
          <Text style={[kit.actionText, { color: filled ? '#fff' : tint === colors.primary && !tone ? colors.text : tint }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const kit = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerBack: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  section: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionDesc: { fontSize: 12, marginTop: 2 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputWrapMulti: { alignItems: 'flex-start', paddingTop: 10 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  inputMulti: { minHeight: 72, textAlignVertical: 'top', paddingTop: 0 },
  counter: { fontSize: 12, fontWeight: '700', marginLeft: 8 },
  error: { color: DANGER, fontSize: 12, marginTop: 5 },
  helper: { fontSize: 12, marginTop: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  segmented: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 6,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, alignSelf: 'flex-start' },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  stepValue: { minWidth: 48, textAlign: 'center', fontSize: 16, fontWeight: '700', paddingVertical: 6 },
  bottom: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  actionText: { fontSize: 15, fontWeight: '700' },
});

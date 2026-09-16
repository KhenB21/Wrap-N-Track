import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { STOCK_REASONS } from '../constants/stockReasons';

/* Required reason for a stock movement: one preset chip plus notes.
   Notes become required when "Other" is picked (see validateStockReason). */
export default function StockReasonPicker({ action, reason, notes, onChangeReason, onChangeNotes, error, colors }) {
  const options = STOCK_REASONS[action] || STOCK_REASONS.STOCK_IN;
  const accent = action === 'STOCK_OUT' ? '#D32F2F' : '#2E7D32';
  const text = colors?.text || '#111';
  const sub = colors?.subText || '#666';
  const border = colors?.border || '#E0E0E0';
  const inputBg = colors?.inputBackground || '#F5F5F5';

  return (
    <View>
      <Text style={[styles.label, { color: sub }]}>Reason *</Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const active = reason === option;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChangeReason(option)}
              style={[styles.chip, { borderColor: active ? accent : border, backgroundColor: active ? accent : inputBg }]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : text }]}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.label, { color: sub, marginTop: 12 }]}>
        {reason === 'Other' ? 'Describe the reason *' : 'Notes (optional)'}
      </Text>
      <TextInput
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="PO number, order ID, count details, etc."
        placeholderTextColor={colors?.placeholder || '#999'}
        style={[styles.notes, { color: text, borderColor: error ? '#EF4444' : border, backgroundColor: inputBg }]}
        multiline
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notes: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
  },
});

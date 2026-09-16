import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { invoiceAPI } from '../../services/api';
import { ActionButton } from '../FormKit';

/* Mobile version of Website/client/src/Pages/Invoices/EmailInvoiceModal.js "Automatic Send":
   the same typed confirmation phrase guards against accidental duplicate emails. */

const CONFIRM_PHRASE = 'Send it';

export default function EmailInvoiceModal({ invoice, recipientEmail, colors, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);

  if (!invoice) return null;

  const confirmed = confirmText.trim().toLowerCase() === CONFIRM_PHRASE.toLowerCase();
  const recipient = recipientEmail || invoice.customer_email || 'the client';

  const send = async () => {
    if (!confirmed) return;
    setSending(true);
    try {
      const result = await invoiceAPI.emailInvoice(invoice.id);
      Alert.alert('Invoice sent', result?.message || `Invoice emailed to ${recipient}.`);
      onClose();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send invoice email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !sending && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.head}>
            <MaterialCommunityIcons name="email-fast-outline" size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>Email Invoice</Text>
            <TouchableOpacity onPress={onClose} disabled={sending} accessibilityLabel="Close">
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.body, { color: colors.subText }]}>
            This immediately sends <Text style={[styles.bold, { color: colors.text }]}>{invoice.invoice_number}</Text> as a PDF to{' '}
            <Text style={[styles.bold, { color: colors.text }]}>{recipient}</Text>.
          </Text>
          <Text style={[styles.body, { color: colors.text, marginTop: 12 }]}>
            Type <Text style={styles.bold}>{CONFIRM_PHRASE}</Text> to confirm.
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder={CONFIRM_PHRASE}
            placeholderTextColor={colors.placeholder}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />
          <View style={styles.actions}>
            <ActionButton label="Cancel" variant="outline" onPress={onClose} disabled={sending} colors={colors} />
            <ActionButton label="Send" icon="send" onPress={send} loading={sending} disabled={!confirmed} colors={colors} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontSize: 19, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  bold: { fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, marginTop: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});

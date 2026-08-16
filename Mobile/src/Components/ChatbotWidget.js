import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Same Zapier chatbot used on the web app (see Website/client/src/Components/ZapierChatbotEmbed.js).
// Loaded via injected HTML + the official embed script, same as the web app does.
// Crucially, `baseUrl` below tells the WebView to treat this content as if it were served from
// wrapntrack.xyz (an approved origin for this chatbot) WITHOUT actually requesting anything from
// that URL — this satisfies Zapier's origin check that otherwise rejects an about:blank/opaque
// origin ("access is disabled"), while staying fully self-contained on-device (no deploy needed).
const CHATBOT_ID = 'cmsw6ivzl00437q29npj4ylh3';
const BASE_URL = 'https://wrapntrack.xyz';

const chatbotHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #ffffff; }
      zapier-interfaces-chatbot-embed {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
  </head>
  <body>
    <script async type="module" src="https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js"></script>
    <zapier-interfaces-chatbot-embed chatbot-id="${CHATBOT_ID}" style="width: 100%; height: 100%;"></zapier-interfaces-chatbot-embed>
  </body>
</html>
`;

// Floating chatbot bubble + full-screen modal, mounted globally for the customer POV.
export default function ChatbotWidget() {
  const [visible, setVisible] = React.useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.bubble}
        activeOpacity={0.85}
        onPress={() => setVisible(true)}
      >
        <MaterialCommunityIcons name="chat-processing" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <WebView
            originWhitelist={['*']}
            source={{ html: chatbotHtml, baseUrl: BASE_URL }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6B6593',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 999,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 6,
  },
  webview: {
    flex: 1,
  },
});

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface Props { message: string }

export function MissingConfigScreen({ message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuration Error</Text>
      <ScrollView>
        <Text style={styles.message}>{message}</Text>
      </ScrollView>
      <Text style={styles.hint}>
        This screen only appears when a required environment variable is missing.
        Check your .env file or eas.json build profile.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0000', padding: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', color: '#ff6b6b', marginBottom: 16 },
  message: { fontSize: 14, color: '#ffcccc', lineHeight: 22, fontFamily: 'monospace' },
  hint: { fontSize: 12, color: '#ff999988', marginTop: 24, lineHeight: 18 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { login, checkSavedAuth, token, biometricsEnabled, phoneNumber } = useAuthStore();
  
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [enableBio, setEnableBio] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasBiometricHardware, setHasBiometricHardware] = useState(false);

  // Check biometric support on mount
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setHasBiometricHardware(compatible && enrolled);

      // Trigger automatic biometric login if enrolled
      if (compatible && enrolled && biometricsEnabled && token) {
        handleBiometricBypass();
      }
    })();
  }, [biometricsEnabled, token]);

  const handleLoginSubmit = async () => {
    if (!phone || pin.length !== 4) {
      Alert.alert("Input Error", "Please provide a valid phone number and 4-digit PIN.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(phone, pin, enableBio);
    setIsSubmitting(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      if (result.message.includes("Too many attempts") || result.message.includes("429")) {
        Alert.alert("Too Many Requests", "Too many attempts. Please wait 60 seconds before trying again.");
      } else {
        Alert.alert("Authentication Failed", result.message);
      }
    }
  };

  const handleBiometricBypass = async () => {
    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authorize Demoz Login',
      fallbackLabel: 'Enter PIN instead',
    });

    if (authResult.success) {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Brand Header */}
        <Text style={styles.brandTitle}>Demoz Mobile</Text>
        <Text style={styles.brandSubtitle}>Brutally Simple Worker Portal</Text>

        {/* Inputs */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="0911000000"
            placeholderTextColor="#64748b"
          />
        </View>

        <Text style={styles.hint}>
          Use the phone number and 4-digit PIN from HR (not your email password).
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>4-DIGIT PIN</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Biometrics Switch */}
        {hasBiometricHardware && (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Enable Face / Touch ID</Text>
            <Switch
              value={enableBio}
              onValueChange={setEnableBio}
              trackColor={{ false: "#334155", true: "#059669" }}
              thumbColor={enableBio ? "#34d399" : "#94a3b8"}
            />
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity 
          style={styles.button}
          onPress={handleLoginSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.buttonText}>LOG IN</Text>
          )}
        </TouchableOpacity>

        {/* One Tap Biometrics Bypass Button */}
        {hasBiometricHardware && biometricsEnabled && token && (
          <TouchableOpacity 
            style={styles.bioButton}
            onPress={handleBiometricBypass}
          >
            <Text style={styles.bioButtonText}>⚡ One-Tap Biometric Login</Text>
          </TouchableOpacity>
        )}

        {/* Footer info */}
        <Text style={styles.footerText}>Biometric GPS Verification Compliant</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090e1a', // Slate navy background matching dashboard theme
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(13, 20, 38, 0.75)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10b981',
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 14,
  },
  switchLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bioButton: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  bioButtonText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 24,
  }
});

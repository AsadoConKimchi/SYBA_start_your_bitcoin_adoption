import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';

export default function SetupScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { setupPassword, biometricAvailable } = useAuthStore();

  const handleSetup = async () => {
    if (password.length < 12) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('auth.passwordMismatch'));
      return;
    }

    setIsLoading(true);
    try {
      await setupPassword(password);

      if (biometricAvailable) {
        router.replace('/(auth)/biometric-setup');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.setupFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🔐</Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: theme.text }}>
            SYBA
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>
            Start Your Bitcoin Adoption
          </Text>
        </View>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 16, color: theme.text, marginBottom: 8 }}>
            {t('auth.setupPassword')}
          </Text>

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: theme.inputBorder,
              borderRadius: 8,
              padding: 16,
              fontSize: 16,
              marginBottom: 12,
              color: theme.inputText,
              backgroundColor: theme.inputBackground,
            }}
            placeholder={t('auth.passwordMin12')}
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />

          <TextInput
            style={{
              borderWidth: 1,
              borderColor: theme.inputBorder,
              borderRadius: 8,
              padding: 16,
              fontSize: 16,
              color: theme.inputText,
              backgroundColor: theme.inputBackground,
            }}
            placeholder={t('auth.passwordConfirm')}
            placeholderTextColor={theme.placeholder}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: theme.primary,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            opacity: isLoading ? 0.7 : 1,
          }}
          onPress={handleSetup}
          disabled={isLoading}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
            {isLoading ? t('auth.settingUp') : t('common.next')}
          </Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24, padding: 16, backgroundColor: theme.warningBanner, borderRadius: 8 }}>
          <Text style={{ fontSize: 14, color: theme.warningBannerText, textAlign: 'center' }}>
            {t('auth.passwordWarning')}
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

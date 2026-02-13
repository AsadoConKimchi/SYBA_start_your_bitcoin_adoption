import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { changePassword } = useAuthStore();

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert(t('common.error'), t('changePassword.currentRequired'));
      return;
    }

    if (!newPassword) {
      Alert.alert(t('common.error'), t('changePassword.newRequired'));
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert(t('common.error'), t('changePassword.tooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('changePassword.confirmMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert(t('common.error'), t('changePassword.samePassword'));
      return;
    }

    setIsLoading(true);

    try {
      const success = await changePassword(currentPassword, newPassword);
      if (success) {
        Alert.alert(t('common.done'), t('changePassword.success'), [
          { text: t('common.confirm'), onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(t('common.error'), t('changePassword.wrongCurrent'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('changePassword.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* 헤더 */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>
            {t('changePassword.title')}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, padding: 20 }}>
          {/* 현재 비밀번호 */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
              {t('changePassword.currentPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 16, paddingVertical: 14, color: theme.inputText }}
                placeholder={t('changePassword.currentPasswordPlaceholder')}
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showCurrentPassword}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 새 비밀번호 */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
              {t('changePassword.newPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 16, paddingVertical: 14, color: theme.inputText }}
                placeholder={t('changePassword.newPasswordPlaceholder')}
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 새 비밀번호 확인 */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 8 }}>
              {t('changePassword.confirmNewPassword')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.inputBorder,
                borderRadius: 8,
                paddingHorizontal: 16,
              }}
            >
              <TextInput
                style={{ flex: 1, fontSize: 16, paddingVertical: 14, color: theme.inputText }}
                placeholder={t('changePassword.confirmPasswordPlaceholder')}
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showNewPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            {confirmPassword && newPassword !== confirmPassword && (
              <Text style={{ fontSize: 12, color: theme.error, marginTop: 4 }}>
                {t('changePassword.passwordMismatch')}
              </Text>
            )}
          </View>
        </View>

        {/* 변경 버튼 */}
        <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: theme.border }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
              opacity: isLoading ? 0.7 : 1,
            }}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {isLoading ? t('changePassword.changing') : t('changePassword.change')}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

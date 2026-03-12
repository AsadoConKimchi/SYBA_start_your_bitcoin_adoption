import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../src/hooks/useTheme';
import { useSubscriptionStore } from '../../src/stores/subscriptionStore';
import { getTicketMessages, addTicketMessage } from '../../src/services/supportService';
import type { TicketMessage } from '../../src/types/support';

export default function TicketDetailScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useSubscriptionStore();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadMessages = async () => {
    if (!user || !ticketId) return;
    setIsLoading(true);
    const result = await getTicketMessages(user.id, ticketId);
    setMessages(result);
    setIsLoading(false);
    // 스크롤 하단으로
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  };

  useEffect(() => {
    loadMessages();
  }, [user, ticketId]);

  const handleSend = async () => {
    if (!user || !ticketId || !newMessage.trim()) return;

    setIsSending(true);
    const msg = await addTicketMessage(user.id, ticketId, newMessage.trim());
    setIsSending(false);

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* 헤더 */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
          {t('support.ticketDetail')}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* 메시지 목록 */}
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          >
            {messages.map((msg) => {
              const isUser = msg.sender_type === 'user';
              return (
                <View
                  key={msg.id}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4, textAlign: isUser ? 'right' : 'left' }}>
                    {isUser ? t('support.you') : t('support.admin')} · {formatTime(msg.created_at)}
                  </Text>
                  <View style={{
                    backgroundColor: isUser ? theme.primary + '20' : theme.cardBackground,
                    borderRadius: 12,
                    borderTopRightRadius: isUser ? 4 : 12,
                    borderTopLeftRadius: isUser ? 12 : 4,
                    padding: 12,
                  }}>
                    <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>
                      {msg.message}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* 입력창 */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.background,
          }}>
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={t('support.replyPlaceholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={2000}
              style={{
                flex: 1,
                backgroundColor: theme.cardBackground,
                color: theme.text,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                maxHeight: 100,
                marginRight: 8,
              }}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isSending || !newMessage.trim()}
              style={{
                backgroundColor: !newMessage.trim() ? theme.textMuted : theme.primary,
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useBudget } from '@/contexts/BudgetContext';
import { answerAssistantQuestion } from '@/lib/budgetAssistant';
import { useSubscription } from '@/lib/revenuecat';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
}

export default function AssistantScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useBudget();
  const {
    hasAIAssistant,
    showAIAssistantPaywall,
    isLoading: subscriptionLoading,
  } = useSubscription();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me about your spending, savings, or income. I only use the transactions stored on this device.',
    },
  ]);
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (!subscriptionLoading && !hasAIAssistant) {
      showAIAssistantPaywall();
    }
  }, [subscriptionLoading, hasAIAssistant, showAIAssistantPaywall]);

  const send = () => {
    const question = input.trim();
    if (!question || !hasAIAssistant) return;
    const answer = answerAssistantQuestion(transactions, question);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', text: question },
      { id: `${Date.now()}-assistant`, role: 'assistant', text: answer },
    ]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.botIcon, { backgroundColor: colors.accent + '18' }]}>
            <Feather name="message-circle" size={18} color={colors.accent} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Budget Assistant</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Rule-based insights from your data
            </Text>
          </View>
        </View>
        <View style={{ width: 22 }} />
      </View>

      {!hasAIAssistant ? (
        <View style={styles.locked}>
          <View style={[styles.lockedIcon, { backgroundColor: colors.accent + '18' }]}>
            <Feather name="lock" size={28} color={colors.accent} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.foreground }]}>AI Assistant is locked</Text>
          <Text style={[styles.lockedCopy, { color: colors.mutedForeground }]}>
            Unlock the AI Assistant subscription to get spending breakdowns, savings tips, and income ideas.
          </Text>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: colors.primary }]}
            onPress={showAIAssistantPaywall}
          >
            <Feather name="zap" size={16} color="#fff" />
            <Text style={styles.unlockButtonText}>Unlock AI Assistant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            renderItem={({ item }) => (
              <View style={[
                styles.bubble,
                item.role === 'user' ? styles.userBubble : styles.assistantBubble,
                { backgroundColor: item.role === 'user' ? colors.primary : colors.card, borderColor: colors.border },
              ]}>
                <Text style={[styles.bubbleText, { color: item.role === 'user' ? '#fff' : colors.foreground }]}>
                  {item.text}
                </Text>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          />
          <View style={[styles.composer, { paddingBottom: Math.max(bottomPad, 12), borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about spending or savings…"
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={500}
              onSubmitEditing={send}
            />
            <TouchableOpacity
              style={[styles.send, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
              onPress={send}
              disabled={!input.trim()}
            >
              <Feather name="arrow-up" size={18} color={input.trim() ? '#fff' : colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  botIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  headerSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  messages: { padding: 16, gap: 10, paddingBottom: 20 },
  bubble: { maxWidth: '86%', padding: 13, borderRadius: 16, borderWidth: 1 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 5 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: 'Inter_400Regular' },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  locked: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  lockedIcon: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  lockedTitle: { fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  lockedCopy: { fontSize: 14, lineHeight: 21, textAlign: 'center', fontFamily: 'Inter_400Regular', maxWidth: 320 },
  unlockButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14, marginTop: 6 },
  unlockButtonText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
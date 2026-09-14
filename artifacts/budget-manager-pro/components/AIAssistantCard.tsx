import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AssistantTip } from '@/lib/budgetAssistant';

interface Props {
  tips: AssistantTip[];
  locked: boolean;
  onPress: () => void;
}

export function AIAssistantCard({ tips, locked, onPress }: Props) {
  const colors = useColors();
  const visibleTips = tips.length > 0 ? tips : [{
    id: 'empty',
    title: 'Your money, explained',
    body: 'Add a few transactions and I’ll surface useful patterns from your own budget.',
    kind: 'education' as const,
  }];

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.86}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '18' }]}>
          <Feather name="message-circle" size={18} color={colors.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>AI Budget Insights</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Based on your transaction history
          </Text>
        </View>
        {locked ? (
          <View style={[styles.unlockPill, { backgroundColor: colors.accent }]}>
            <Feather name="lock" size={12} color="#fff" />
            <Text style={styles.unlockText}>Unlock</Text>
          </View>
        ) : (
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        )}
      </View>

      <View style={[styles.tipArea, locked && styles.lockedArea]}>
        {visibleTips.slice(0, 2).map((tip) => (
          <View key={tip.id} style={styles.tipRow}>
            <View style={[
              styles.tipDot,
              { backgroundColor: tip.kind === 'success' ? colors.success : tip.kind === 'warning' ? '#F59E0B' : colors.accent },
            ]} />
            <Text style={[styles.tipText, { color: colors.foreground }]} numberOfLines={2}>
              {tip.body}
            </Text>
          </View>
        ))}
        {locked && (
          <View style={styles.lockOverlay}>
            <Feather name="lock" size={18} color={colors.accent} />
            <Text style={[styles.lockText, { color: colors.accent }]}>Unlock AI Insights</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  unlockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  unlockText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  tipArea: { gap: 10 },
  lockedArea: { opacity: 0.25 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  tipDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  lockText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
});
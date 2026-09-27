import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { MoneyPatternAnalysis } from '@/lib/moneyPersona';

interface Props {
  analysis: MoneyPatternAnalysis;
  locked: boolean;
  onUnlock: () => void;
}

export function MoneyPatternCard({ analysis, locked, onUnlock }: Props) {
  const colors = useColors();
  const persona = analysis.persona;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.accent + '14' }]}>
          <Feather name="compass" size={18} color={colors.accent} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>Your Money Pattern</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Transparent, on-device pattern detection
          </Text>
        </View>
        {locked && <Feather name="lock" size={16} color={colors.accent} />}
      </View>

      {locked ? (
        <View style={[styles.lockedBox, { backgroundColor: colors.muted }]}>
          <Text style={[styles.lockedTitle, { color: colors.foreground }]}>
            Unlock your private money pattern
          </Text>
          <Text style={[styles.lockedCopy, { color: colors.mutedForeground }]}>
            See a clear pattern from your own transactions, with no external data.
          </Text>
          <TouchableOpacity
            style={[styles.unlockButton, { backgroundColor: colors.accent }]}
            onPress={onUnlock}
            activeOpacity={0.85}
          >
            <Feather name="lock" size={13} color="#fff" />
            <Text style={styles.unlockText}>Unlock pattern</Text>
          </TouchableOpacity>
        </View>
      ) : analysis.status === 'building' || !persona ? (
        <View style={[styles.buildingBox, { backgroundColor: colors.muted }]}>
          <Feather name="bar-chart-2" size={17} color={colors.accent} />
          <View style={styles.buildingCopy}>
            <Text style={[styles.buildingTitle, { color: colors.foreground }]}>
              Building your money pattern
            </Text>
            <Text style={[styles.buildingText, { color: colors.mutedForeground }]}>
              {analysis.reason}
            </Text>
          </View>
        </View>
      ) : (
        <>
          <View style={[styles.personaIntro, { backgroundColor: colors.accent + '10' }]}>
            <Text style={[styles.personaName, { color: colors.accent }]}>{persona.name}</Text>
            <Text style={[styles.personaDescription, { color: colors.foreground }]}>
              {persona.description}
            </Text>
          </View>
          <View style={styles.stats}>
            {persona.supportingStats.map((stat) => (
              <View key={stat} style={styles.statRow}>
                <View style={[styles.statDot, { backgroundColor: colors.accent }]} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>{stat}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.actionBox, { borderTopColor: colors.border }]}>
            <Feather name="arrow-right-circle" size={16} color={colors.primary} />
            <View style={styles.actionCopy}>
              <Text style={[styles.actionLabel, { color: colors.primary }]}>Try this</Text>
              <Text style={[styles.actionText, { color: colors.foreground }]}>
                {persona.suggestedAction}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 13,
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
  title: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  lockedBox: { padding: 13, borderRadius: 13, gap: 6 },
  lockedTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  lockedCopy: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  unlockButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 11,
    marginTop: 4,
  },
  unlockText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  buildingBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    padding: 13,
    borderRadius: 13,
  },
  buildingCopy: { flex: 1, gap: 4 },
  buildingTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  buildingText: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  personaIntro: { padding: 13, borderRadius: 13, gap: 4 },
  personaName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  personaDescription: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  stats: { gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  statDot: { width: 6, height: 6, borderRadius: 3, marginTop: 5 },
  statText: { flex: 1, fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 11,
  },
  actionCopy: { flex: 1, gap: 3 },
  actionLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  actionText: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_600SemiBold' },
});
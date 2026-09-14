import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSubscription } from '@/lib/revenuecat';

const PREMIUM_FEATURES = [
  { icon: 'target', text: 'Unlimited budgets' },
  { icon: 'bar-chart-2', text: 'Advanced spending analytics' },
  { icon: 'trending-up', text: 'Monthly trend reports' },
  { icon: 'download', text: 'CSV & PDF export' },
  { icon: 'headphones', text: 'Priority support' },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    isSubscribed,
    isLoading,
    customerInfo,
    priceString,
    showPaywall,
    showCustomerCenter,
    restore,
    isRestoring,
    isPurchasing,
  } = useSubscription();

  const topPad = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === 'web' ? 84 + 34 : 84;

  const handleRestore = async () => {
    try {
      await restore();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Purchases Restored', 'Your purchases have been restored successfully.');
    } catch (e: any) {
      Alert.alert('Restore Failed', e?.message ?? 'Could not restore purchases.');
    }
  };

  const handleUpgrade = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const purchased = await showPaywall();
    if (purchased) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleCustomerCenter = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await showCustomerCenter();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 8, paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Settings</Text>

        {/* Premium status */}
        {isLoading ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isSubscribed ? (
          /* ─── Subscribed ─── */
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.premiumBadge, { backgroundColor: colors.primary + '18' }]}>
              <Feather name="star" size={20} color={colors.primary} />
              <Text style={[styles.premiumBadgeLabel, { color: colors.primary }]}>
                Premium Active
              </Text>
            </View>
            <Text style={[styles.premiumActiveText, { color: colors.mutedForeground }]}>
              You have full access to all Budget Manager Pro features.
            </Text>
            {customerInfo?.originalPurchaseDate && (
              <Text style={[styles.purchaseDate, { color: colors.mutedForeground }]}>
                Member since{' '}
                {new Date(customerInfo.originalPurchaseDate).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            )}

            {/* Customer Center */}
            <TouchableOpacity
              style={[styles.menuRow, { borderTopColor: colors.border }]}
              onPress={handleCustomerCenter}
              activeOpacity={0.7}
            >
              <Feather name="help-circle" size={18} color={colors.mutedForeground} />
              <Text style={[styles.menuLabel, { color: colors.foreground }]}>
                Manage Subscription
              </Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          /* ─── Free tier ─── */
          <View style={[styles.premiumCard, { backgroundColor: '#1A3A6E' }]}>
            <View style={styles.premiumCardHeader}>
              <View style={styles.premiumCardLeft}>
                <Text style={styles.premiumCardTitle}>Budget Manager Pro</Text>
                <Text style={styles.premiumCardSub}>Unlock everything</Text>
              </View>
              <View style={[styles.pricePill]}>
                <Text style={styles.pricePillText}>{priceString}</Text>
                <Text style={styles.pricePillSub}>one-time</Text>
              </View>
            </View>

            {PREMIUM_FEATURES.map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Feather name={f.icon as any} size={14} color="#60A5FA" />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.upgradeBtn, { opacity: isPurchasing ? 0.7 : 1 }]}
              onPress={handleUpgrade}
              disabled={isPurchasing}
              activeOpacity={0.85}
            >
              {isPurchasing ? (
                <ActivityIndicator color="#1A3A6E" size="small" />
              ) : (
                <>
                  <Feather name="zap" size={18} color="#1A3A6E" />
                  <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Restore Purchases */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleRestore}
            disabled={isRestoring}
            activeOpacity={0.7}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={18} color={colors.mutedForeground} />
            )}
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>
              Restore Purchases
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.menuRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Feather name="info" size={18} color={colors.mutedForeground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Version</Text>
            <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>1.0.0</Text>
          </View>
          <View style={styles.menuRow}>
            <Feather name="shield" size={18} color={colors.mutedForeground} />
            <Text style={[styles.menuLabel, { color: colors.foreground }]}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.mutedForeground }]}>
          Budget Manager Pro · Powered by RevenueCat
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    padding: 16,
    gap: 12,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumBadgeLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  premiumActiveText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  purchaseDate: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  premiumCard: {
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  premiumCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  premiumCardLeft: {
    gap: 2,
  },
  premiumCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  premiumCardSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  pricePill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  pricePillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  pricePillSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 13,
    marginTop: 6,
  },
  upgradeBtnText: {
    color: '#1A3A6E',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  menuValue: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
});

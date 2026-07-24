import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, ActivityIndicator, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSubscription } from '@/lib/revenuecat';
import * as Haptics from 'expo-haptics';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const FEATURES = [
  { icon: 'bar-chart-2', text: 'Spending charts & category breakdowns' },
  { icon: 'trending-up', text: 'Monthly trend comparisons' },
  { icon: 'tag', text: 'Unlimited custom categories' },
  { icon: 'download', text: 'Export to CSV & PDF' },
];

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const colors = useColors();
  const { offerings, purchase, restore, isPurchasing, isRestoring, isConfigured } = useSubscription();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 28, stiffness: 300 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const currentPackage = offerings?.current?.availablePackages[0];
  const priceString = currentPackage?.product?.priceString ?? '$1.99';

  const handlePurchase = async () => {
    if (!currentPackage) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await purchase(currentPackage);
      onClose();
    } catch (e: any) {
      if (e?.code !== 'PURCHASE_CANCELLED') {
        console.error('Purchase failed', e);
      }
    }
  };

  const handleRestore = async () => {
    try {
      await restore();
      onClose();
    } catch (e) {
      console.error('Restore failed', e);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.card, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Close */}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Feather name="star" size={14} color="#fff" />
          <Text style={styles.badgeText}>PREMIUM</Text>
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Unlock Everything
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          One-time purchase — no subscriptions, ever.
        </Text>

        {/* Features */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Feather name={f.icon as any} size={16} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        {!isConfigured ? (
          <View style={[styles.unconfiguredBox, { backgroundColor: colors.muted, borderRadius: colors.radius }]}>
            <Text style={[styles.unconfiguredText, { color: colors.mutedForeground }]}>
              In-app purchases not yet configured. Run the RevenueCat seed script to enable purchases.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.purchaseBtn, { backgroundColor: colors.primary, borderRadius: 14 }]}
            onPress={handlePurchase}
            disabled={isPurchasing || !currentPackage}
            activeOpacity={0.85}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.purchaseBtnText}>Get Premium · {priceString}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleRestore} disabled={isRestoring} style={styles.restoreBtn}>
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.legal, { color: colors.mutedForeground }]}>
          One-time purchase. No recurring charges.
        </Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  featureList: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  purchaseBtn: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  purchaseBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
  restoreBtn: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  legal: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  unconfiguredBox: {
    width: '100%',
    padding: 16,
    marginBottom: 16,
  },
  unconfiguredText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});

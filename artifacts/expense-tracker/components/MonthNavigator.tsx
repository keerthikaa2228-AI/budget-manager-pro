import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

interface MonthNavigatorProps {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
}

export function MonthNavigator({ currentMonth, onPrev, onNext }: MonthNavigatorProps) {
  const colors = useColors();
  const now = new Date();
  const isCurrentMonth =
    currentMonth.getFullYear() === now.getFullYear() &&
    currentMonth.getMonth() === now.getMonth();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPrev} style={styles.btn} hitSlop={12}>
        <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>

      <View style={styles.labelWrap}>
        <Text style={[styles.month, { color: colors.foreground }]}>
          {MONTHS[currentMonth.getMonth()]}
        </Text>
        <Text style={[styles.year, { color: colors.mutedForeground }]}>
          {currentMonth.getFullYear()}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onNext}
        style={styles.btn}
        hitSlop={12}
        disabled={isCurrentMonth}
      >
        <Feather
          name="chevron-right"
          size={20}
          color={isCurrentMonth ? colors.border : colors.mutedForeground}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  btn: {
    padding: 4,
  },
  labelWrap: {
    alignItems: 'center',
    minWidth: 130,
  },
  month: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  year: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
});

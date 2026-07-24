import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface Segment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: Segment[];
  total: number;
  size?: number;
}

export function DonutChart({ segments, total, size = 200 }: DonutChartProps) {
  const colors = useColors();
  const radius = size * 0.35;
  const strokeWidth = size * 0.14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeRotation = -90;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.border}
            strokeWidth={strokeWidth}
          />
          {total === 0
            ? null
            : segments.map((segment, index) => {
                if (segment.value <= 0) return null;
                const percentage = segment.value / total;
                const segmentLength = percentage * circumference;
                const rotation = cumulativeRotation;
                cumulativeRotation += percentage * 360;

                return (
                  <G key={index} transform={`rotate(${rotation}, ${center}, ${center})`}>
                    <Circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={segment.color}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${segmentLength} ${circumference}`}
                      strokeLinecap="butt"
                    />
                  </G>
                );
              })}
        </Svg>

        {/* Center label */}
        <View style={[StyleSheet.absoluteFill, styles.centerLabel]}>
          <Text style={[styles.totalAmount, { color: colors.foreground }]}>
            ${total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
          </Text>
          <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
});

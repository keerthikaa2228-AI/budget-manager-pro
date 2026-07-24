import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface TrendChartProps {
  data: Array<{ label: string; total: number }>;
  width?: number;
  height?: number;
}

export function TrendChart({ data, width = 320, height = 180 }: TrendChartProps) {
  const colors = useColors();
  const paddingTop = 24;
  const paddingBottom = 32;
  const paddingLeft = 8;
  const paddingRight = 8;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(...data.map(d => d.total), 1);
  const barCount = data.length;
  const barWidth = (chartWidth / barCount) * 0.55;
  const barSpacing = chartWidth / barCount;
  const currentMonthIndex = data.length - 1;

  return (
    <Svg width={width} height={height}>
      {/* Baseline */}
      <Line
        x1={paddingLeft}
        y1={paddingTop + chartHeight}
        x2={paddingLeft + chartWidth}
        y2={paddingTop + chartHeight}
        stroke={colors.border}
        strokeWidth={1}
      />

      {data.map((item, index) => {
        const barH = item.total > 0 ? Math.max((item.total / maxValue) * chartHeight, 4) : 4;
        const x = paddingLeft + index * barSpacing + (barSpacing - barWidth) / 2;
        const y = paddingTop + chartHeight - barH;
        const isCurrentMonth = index === currentMonthIndex;
        const barColor = isCurrentMonth ? colors.primary : colors.border;
        const labelColor = isCurrentMonth ? colors.primary : colors.mutedForeground;

        return (
          <React.Fragment key={index}>
            <Rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              fill={barColor}
              rx={5}
            />
            {/* Month label */}
            <SvgText
              x={x + barWidth / 2}
              y={height - 8}
              textAnchor="middle"
              fill={labelColor}
              fontSize={11}
              fontWeight={isCurrentMonth ? '700' : '400'}
            >
              {item.label}
            </SvgText>
            {/* Amount label for current month */}
            {isCurrentMonth && item.total > 0 && (
              <SvgText
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fill={colors.primary}
                fontSize={10}
                fontWeight="700"
              >
                ${item.total >= 1000 ? `${(item.total / 1000).toFixed(1)}k` : Math.round(item.total)}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

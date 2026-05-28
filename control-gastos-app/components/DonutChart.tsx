import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface DonutData {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutData[];
  size?: number;
  strokeWidth?: number;
}

export default function DonutChart({ data, size = 200, strokeWidth = 40 }: DonutChartProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0) {
    return (
      <View style={styles.wrapper}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        </Svg>
        <Text style={[styles.emptyText, { color: colors.muted }]}>Sin datos</Text>
      </View>
    );
  }

  let cumulativePercent = 0;

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {data.map((item, i) => {
            const percent = item.value / total;
            const offset = -cumulativePercent * circumference;
            cumulativePercent += percent;
            return (
              <Circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={`${percent * circumference} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </G>
        <SvgText
          x={center}
          y={center}
          textAnchor="middle"
          fontSize={size * 0.11}
          fontWeight="bold"
          fill={colors.text}
          dy={size * 0.04}
        >
          ${total.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
        </SvgText>
      </Svg>
      <View style={styles.legend}>
        {data.map((item, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={styles.legendLeft}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
            </View>
            <Text style={[styles.legendValue, { color: colors.text }]}>
              ${item.value.toLocaleString('es-ES', { minimumFractionDigits: 0 })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  emptyText: { marginTop: 8, fontSize: 14 },
  legend: { marginTop: 16, width: '100%' },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 4,
  },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 14 },
  legendValue: { fontSize: 14, fontWeight: '600' },
});

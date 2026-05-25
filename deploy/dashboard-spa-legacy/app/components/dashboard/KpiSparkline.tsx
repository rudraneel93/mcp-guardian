'use client';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { CHART_SERIES } from '@/lib/chartTheme';

type Props = {
  data: number[];
  color?: string;
  ariaLabel?: string;
};

export function KpiSparkline({ data, color = CHART_SERIES.accent, ariaLabel }: Props) {
  if (!data.length) return null;
  const chartData = data.map((value, i) => ({ i, value }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={chartData} aria-label={ariaLabel}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

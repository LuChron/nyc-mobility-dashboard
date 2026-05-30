import type { EChartsOption } from 'echarts';
import type { MonthlyPoint, SourceKey } from '../types/dashboard';
import { EChart } from './EChart';
import { axisStyle, colors } from './chartTheme';

interface MonthlyTrendChartProps {
  data: MonthlyPoint[];
  source: SourceKey;
}

export function MonthlyTrendChart({ data, source }: MonthlyTrendChartProps) {
  const series =
    source === 'all'
      ? [
          { name: 'All', type: 'line' as const, smooth: true, symbolSize: 5, data: data.map((d) => d.all) },
          { name: 'Yellow Taxi', type: 'line' as const, smooth: true, symbolSize: 5, data: data.map((d) => d.yellow) },
          { name: 'Green Taxi', type: 'line' as const, smooth: true, symbolSize: 5, data: data.map((d) => d.green) },
          { name: 'HVFHV', type: 'line' as const, smooth: true, symbolSize: 5, data: data.map((d) => d.hvfhv) },
        ]
      : [{ name: source.toUpperCase(), type: 'line' as const, smooth: true, symbolSize: 5, areaStyle: { opacity: 0.12 }, data: data.map((d) => d[source]) }];
  const option: EChartsOption = {
    color: [colors.blue, colors.yellow, colors.green, colors.purple],
    tooltip: { trigger: 'axis', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    grid: { left: 42, right: 16, top: 18, bottom: 30 },
    legend: { top: 0, left: 0, textStyle: { color: colors.text, fontSize: 11 }, itemWidth: 9, itemHeight: 9 },
    xAxis: { type: 'category', data: data.map((d) => d.month), ...axisStyle },
    yAxis: { type: 'value', axisLabel: { color: colors.muted, formatter: '{value}M', fontSize: 10 }, splitLine: axisStyle.splitLine },
    series,
  };

  return <EChart option={option} className="chart fill" />;
}

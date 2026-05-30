import type { EChartsOption } from 'echarts';
import { monthlyTrend } from '../data/mockData';
import { EChart } from './EChart';
import { axisStyle, colors } from './chartTheme';

export function MonthlyTrendChart() {
  const option: EChartsOption = {
    color: [colors.blue, colors.yellow, colors.green, colors.purple],
    tooltip: { trigger: 'axis', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    grid: { left: 42, right: 16, top: 18, bottom: 30 },
    legend: { top: 0, left: 0, textStyle: { color: colors.text, fontSize: 11 }, itemWidth: 9, itemHeight: 9 },
    xAxis: { type: 'category', data: monthlyTrend.map((d) => d.month), ...axisStyle },
    yAxis: { type: 'value', axisLabel: { color: colors.muted, formatter: '{value}M', fontSize: 10 }, splitLine: axisStyle.splitLine },
    series: [
      { name: 'All', type: 'line', smooth: true, symbolSize: 5, data: monthlyTrend.map((d) => d.all) },
      { name: 'Yellow Taxi', type: 'line', smooth: true, symbolSize: 5, data: monthlyTrend.map((d) => d.yellow) },
      { name: 'Green Taxi', type: 'line', smooth: true, symbolSize: 5, data: monthlyTrend.map((d) => d.green) },
      { name: 'HVFHV', type: 'line', smooth: true, symbolSize: 5, data: monthlyTrend.map((d) => d.hvfhv) },
    ],
  };

  return <EChart option={option} className="chart fill" />;
}


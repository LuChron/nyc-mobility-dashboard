import type { EChartsOption } from 'echarts';
import { fareDistanceDistribution } from '../data/mockData';
import { EChart } from './EChart';
import { axisStyle, colors } from './chartTheme';

export function DistributionChart() {
  const option: EChartsOption = {
    color: [colors.yellow, colors.green, colors.purple],
    tooltip: { trigger: 'axis', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    legend: { top: 0, left: 0, textStyle: { color: colors.text, fontSize: 10 }, itemWidth: 9, itemHeight: 9 },
    grid: { left: 44, right: 18, top: 32, bottom: 28 },
    xAxis: { type: 'category', data: fareDistanceDistribution.map((d) => d.bucket), ...axisStyle },
    yAxis: { type: 'value', name: 'Density', nameTextStyle: { color: colors.muted, fontSize: 10 }, axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: axisStyle.splitLine },
    series: [
      { name: 'Yellow Taxi', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.12 }, data: fareDistanceDistribution.map((d) => d.yellow) },
      { name: 'Green Taxi', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.12 }, data: fareDistanceDistribution.map((d) => d.green) },
      { name: 'HVFHV', type: 'line', smooth: true, showSymbol: false, areaStyle: { opacity: 0.12 }, data: fareDistanceDistribution.map((d) => d.hvfhv) },
    ],
  };

  return <EChart option={option} className="chart fill" />;
}


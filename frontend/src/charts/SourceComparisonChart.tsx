import type { EChartsOption } from 'echarts';
import { sourceComparison } from '../data/mockData';
import { EChart } from './EChart';
import { axisStyle, colors } from './chartTheme';

export function SourceComparisonChart() {
  const option: EChartsOption = {
    color: [colors.yellow, colors.green, colors.purple],
    tooltip: { trigger: 'axis', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    legend: { top: 0, left: 0, textStyle: { color: colors.text, fontSize: 10 }, itemWidth: 9, itemHeight: 9 },
    grid: { left: 44, right: 12, top: 32, bottom: 28 },
    xAxis: { type: 'category', data: sourceComparison.map((d) => d.metric), ...axisStyle },
    yAxis: { type: 'value', axisLabel: { color: colors.muted, fontSize: 10 }, splitLine: axisStyle.splitLine },
    series: [
      { name: 'Yellow Taxi', type: 'bar', barMaxWidth: 20, data: sourceComparison.map((d) => d.yellow) },
      { name: 'Green Taxi', type: 'bar', barMaxWidth: 20, data: sourceComparison.map((d) => d.green) },
      { name: 'HVFHV', type: 'bar', barMaxWidth: 20, data: sourceComparison.map((d) => d.hvfhv) },
    ],
  };

  return <EChart option={option} className="chart fill" />;
}


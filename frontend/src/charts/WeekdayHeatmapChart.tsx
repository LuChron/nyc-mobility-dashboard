import type { EChartsOption } from 'echarts';
import { weekdayHourHeatmap } from '../data/mockData';
import { EChart } from './EChart';
import { colors } from './chartTheme';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'];

export function WeekdayHeatmapChart() {
  const option: EChartsOption = {
    tooltip: { position: 'top', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    grid: { left: 36, right: 10, top: 18, bottom: 32 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: colors.muted, fontSize: 10 }, splitArea: { show: true } },
    yAxis: { type: 'category', data: weekdays, axisLabel: { color: colors.text, fontSize: 10 }, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: 90,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      text: ['High', 'Low'],
      textStyle: { color: colors.muted, fontSize: 10 },
      calculable: false,
      inRange: { color: ['#07172a', '#33278b', '#a73c92', '#ff7132', '#ffe436'] },
    },
    series: [
      {
        type: 'heatmap',
        data: weekdayHourHeatmap.map((d) => [hours.indexOf(d.hour), weekdays.indexOf(d.weekday), d.value]),
        emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
      },
    ],
  };

  return <EChart option={option} className="chart fill" />;
}


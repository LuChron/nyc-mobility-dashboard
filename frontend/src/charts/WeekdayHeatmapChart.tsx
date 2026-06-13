import type { EChartsOption } from 'echarts';
import type { HeatmapPoint } from '../types/dashboard';
import { EChart } from './EChart';
import { colors } from './chartTheme';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'];

interface WeekdayHeatmapChartProps {
  data: HeatmapPoint[];
}

export function WeekdayHeatmapChart({ data }: WeekdayHeatmapChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 90);
  const visibleWeekdays = weekdays.filter((weekday) => data.some((item) => item.weekday === weekday));
  const option: EChartsOption = {
    tooltip: { position: 'top', backgroundColor: '#061321', borderColor: '#1d5b92', textStyle: { color: colors.text } },
    grid: { left: 36, right: 10, top: 12, bottom: 48 },
    xAxis: { type: 'category', data: hours, axisLabel: { color: colors.muted, fontSize: 10 }, splitArea: { show: true } },
    yAxis: { type: 'category', data: visibleWeekdays, axisLabel: { color: colors.text, fontSize: 10 }, splitArea: { show: true } },
    visualMap: {
      min: 0,
      max: maxValue,
      show: false,
      calculable: false,
      inRange: { color: ['#07172a', '#33278b', '#a73c92', '#ff7132', '#ffe436'] },
    },
    series: [
      {
        type: 'heatmap',
        data: data.map((d) => [hours.indexOf(d.hour), visibleWeekdays.indexOf(d.weekday), d.value]),
        emphasis: { itemStyle: { borderColor: '#fff', borderWidth: 1 } },
      },
    ],
  };

  return (
    <div className="heatmap-chart-wrap">
      <EChart option={option} className="chart fill" />
      <div className="heatmap-scale" aria-hidden="true">
        <span>Low</span>
        <i />
        <span>High</span>
      </div>
    </div>
  );
}

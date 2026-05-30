import type { EChartsOption } from 'echarts';
import { useEChart } from './useEChart';

interface EChartProps {
  option: EChartsOption;
  className?: string;
}

export function EChart({ option, className }: EChartProps) {
  const ref = useEChart(option);
  return <div ref={ref} className={className ?? 'chart'} />;
}


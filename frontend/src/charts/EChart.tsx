import type { EChartsOption } from 'echarts';
import type { ECElementEvent } from 'echarts';
import { useEChart } from './useEChart';

interface EChartProps {
  option: EChartsOption;
  className?: string;
  onClick?: (event: ECElementEvent) => void;
}

export function EChart({ option, className, onClick }: EChartProps) {
  const ref = useEChart(option, onClick);
  return <div ref={ref} className={className ?? 'chart'} />;
}

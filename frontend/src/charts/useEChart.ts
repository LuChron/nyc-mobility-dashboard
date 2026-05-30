import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECElementEvent } from 'echarts';

export function useEChart(option: EChartsOption, onClick?: (event: ECElementEvent) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    chart.setOption(option, true);

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);

    // Use ref-based click handler to avoid re-registration
    const handleClick = (event: ECElementEvent) => {
      onClickRef.current?.(event);
    };
    chart.on('click', handleClick);

    return () => {
      chart.off('click', handleClick);
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []); // Only run once on mount

  // Update option without destroying chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);

  return containerRef;
}

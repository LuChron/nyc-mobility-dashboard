import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECElementEvent } from 'echarts';

export function useEChart(option: EChartsOption, onClick?: (event: ECElementEvent) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const previousOptionRef = useRef<EChartsOption | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    chart.setOption(option, true);
    previousOptionRef.current = option;

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
      const currentOption = chartRef.current.getOption() as { geo?: Array<{ center?: unknown; zoom?: number }> };
      const previousOption = previousOptionRef.current as { geo?: { center?: unknown; zoom?: number } } | null;
      const nextOption = option as EChartsOption & { geo?: { center?: unknown; zoom?: number } };
      const currentGeo = currentOption.geo?.[0];
      const previousGeo = previousOption?.geo;
      const nextGeo = nextOption.geo;
      const viewWasExplicitlyChanged =
        nextGeo && previousGeo
          ? nextGeo.zoom !== previousGeo.zoom || JSON.stringify(nextGeo.center) !== JSON.stringify(previousGeo.center)
          : true;

      if (currentGeo && nextGeo && !viewWasExplicitlyChanged) {
        chartRef.current.setOption({
          ...nextOption,
          geo: {
            ...nextGeo,
            center: currentGeo.center ?? nextGeo.center,
            zoom: currentGeo.zoom ?? nextGeo.zoom,
          },
        });
      } else {
        chartRef.current.setOption(option);
      }
      previousOptionRef.current = option;
    }
  }, [option]);

  return containerRef;
}

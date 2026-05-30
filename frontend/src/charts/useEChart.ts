import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption, ECElementEvent } from 'echarts';

export function useEChart(option: EChartsOption, onClick?: (event: ECElementEvent) => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const chart = echarts.init(containerRef.current);
    chart.setOption(option, true);
    if (onClick) {
      chart.on('click', onClick);
    }

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      if (onClick) {
        chart.off('click', onClick);
      }
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [option, onClick]);

  return containerRef;
}

import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { cityLabels, mapNodes, mapRoutes } from '../data/mockData';
import { EChart } from './EChart';
import { colors } from './chartTheme';

const nodeByName = new Map(mapNodes.map((node) => [node.name, node]));

export function MobilityMapChart() {
  const option = useMemo(() => {
    const routes = mapRoutes
      .flatMap((route) => {
        const from = nodeByName.get(route.from);
        const to = nodeByName.get(route.to);
        if (!from || !to) {
          return [];
        }
        return [{
          coords: [from.coord, to.coord],
          lineStyle: { color: route.color, width: Math.max(1, route.value / 4200), opacity: 0.85 },
        }];
      });

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#061321',
        borderColor: '#1d5b92',
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const data = (params as { data?: { name?: string; value?: number[]; zone?: string } }).data;
          if (!data?.name || !data.value) {
            return 'OD Flow';
          }
          return `${data.name}<br/>Zone ID: ${data.zone}<br/>Pickup Trips: ${Math.round(data.value[2]).toLocaleString()}`;
        },
      },
      grid: { left: 0, right: 0, top: 0, bottom: 0 },
      xAxis: { min: 0, max: 100, show: false },
      yAxis: { min: 0, max: 100, show: false },
      series: [
        {
          type: 'lines',
          coordinateSystem: 'cartesian2d',
          zlevel: 2,
          effect: { show: true, symbol: 'arrow', symbolSize: 7, trailLength: 0.18 },
          lineStyle: { curveness: 0.24 },
          data: routes,
        },
        {
          type: 'effectScatter',
          coordinateSystem: 'cartesian2d',
          zlevel: 3,
          rippleEffect: { brushType: 'stroke', scale: 4 },
          symbolSize: (value: unknown) => {
            const typedValue = value as number[];
            return Math.max(10, Math.min(28, typedValue[2] / 5200));
          },
          label: {
            show: true,
            formatter: (params: { data?: { name?: string } }) => params.data?.name ?? '',
            position: 'right',
            color: colors.text,
            fontSize: 10,
            backgroundColor: 'rgba(4, 15, 28, 0.82)',
            borderColor: 'rgba(115, 196, 255, 0.42)',
            borderWidth: 1,
            padding: [4, 6],
            borderRadius: 3,
          },
          itemStyle: { color: (params: { data?: { color?: string } }) => params.data?.color ?? colors.blue },
          data: mapNodes.map((node) => ({
            name: node.name,
            zone: node.zone,
            value: [...node.coord, node.value],
            color: node.color,
          })),
        },
        {
          type: 'scatter',
          coordinateSystem: 'cartesian2d',
          zlevel: 1,
          symbolSize: 1,
          label: {
            show: true,
            formatter: (params: { data?: { name?: string } }) => params.data?.name ?? '',
            color: 'rgba(232, 244, 255, 0.9)',
            fontSize: 16,
            fontWeight: 700,
          },
          data: cityLabels.map((label) => ({ name: label.name, value: [label.x, label.y] })),
        },
      ],
    } as EChartsOption;
  }, []);

  return (
    <div className="map-stage">
      <div className="map-grid" />
      <div className="borough borough-manhattan" />
      <div className="borough borough-queens" />
      <div className="borough borough-brooklyn" />
      <div className="borough borough-staten" />
      <div className="river-label river-one">HUDSON RIVER</div>
      <div className="river-label river-two">EAST RIVER</div>
      <EChart option={option} className="chart map-chart" />
      <div className="map-tools">
        <button type="button">+</button>
        <button type="button">-</button>
        <button type="button">◎</button>
      </div>
      <div className="map-legend">
        <span>Pickup Intensity (Trips)</span>
        <div className="legend-ramp" />
        <div className="legend-scale">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

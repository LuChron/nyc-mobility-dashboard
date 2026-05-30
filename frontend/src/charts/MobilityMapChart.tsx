import { useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import type { ECElementEvent, EChartsOption } from 'echarts';
import type { MapNode, MapRoute } from '../types/dashboard';
import { EChart } from './EChart';
import { colors } from './chartTheme';

interface MapZoneDatum {
  locationId: string;
  name: string;
  value: number;
  borough: string;
  selected: boolean;
}

interface MobilityMapChartProps {
  zones: MapZoneDatum[];
  nodes: MapNode[];
  routes: MapRoute[];
  selectedZone: string;
  selectableZoneIds: string[];
  onZoneSelect: (zoneId: string) => void;
}

type TaxiZoneProperties = {
  locationid?: string;
  zone?: string;
  borough?: string;
  name?: string;
};

type TaxiZoneFeature = {
  type: string;
  properties: TaxiZoneProperties;
  geometry: unknown;
};

type TaxiZoneGeoJson = {
  type: 'FeatureCollection';
  features: TaxiZoneFeature[];
};

const MAP_NAME = 'nycTaxiZones';

export function MobilityMapChart({ zones, nodes, routes, selectedZone, selectableZoneIds, onZoneSelect }: MobilityMapChartProps) {
  const [ready, setReady] = useState(false);
  const [zoneLookup, setZoneLookup] = useState<Record<string, { zone: string; borough: string }>>({});
  const [mapZoom, setMapZoom] = useState(1.12);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/taxi_zones.geojson`)
      .then((response) => response.json() as Promise<TaxiZoneGeoJson>)
      .then((geoJson) => {
        if (cancelled) return;
        const lookup: Record<string, { zone: string; borough: string }> = {};
        geoJson.features.forEach((feature) => {
          const id = feature.properties.locationid ?? '';
          feature.properties.name = id;
          lookup[id] = {
            zone: feature.properties.zone ?? id,
            borough: feature.properties.borough ?? 'Unknown',
          };
        });
        echarts.registerMap(MAP_NAME, geoJson as never);
        setZoneLookup(lookup);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const zoneValues = useMemo(() => {
    const values = new Map(zones.map((zone) => [zone.locationId, zone]));
    return values;
  }, [zones]);

  const nodeByName = useMemo(() => new Map(nodes.map((node) => [node.name, node])), [nodes]);
  const selectableZones = useMemo(() => new Set(selectableZoneIds), [selectableZoneIds]);

  const option = useMemo(() => {
    if (!ready) {
      return {} as EChartsOption;
    }

    const maxValue = Math.max(...zones.map((zone) => zone.value), 1);
    const routeLines = [...routes]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .flatMap((route) => {
        const from = nodeByName.get(route.from);
        const to = nodeByName.get(route.to);
        if (!from || !to) return [];
        return [{
          coords: [from.coord, to.coord],
          value: route.value,
          lineStyle: {
            color: route.color,
            width: Math.max(1.2, Math.min(5, route.value / 2600)),
            opacity: 0.82,
          },
        }];
      });

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#061321',
        borderColor: '#1d5b92',
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const typed = params as { name?: string; data?: { locationId?: string; value?: number; name?: string; borough?: string } };
          const id = typed.data?.locationId ?? typed.name ?? '';
          const lookup = zoneLookup[id];
          const value = typed.data?.value ?? zoneValues.get(id)?.value;
          if (!lookup && typed.data?.name) {
            return `${typed.data.name}<br/>Trips: ${Math.round(value ?? 0).toLocaleString()}`;
          }
          return `${lookup?.zone ?? id}<br/>Borough: ${lookup?.borough ?? typed.data?.borough ?? '-'}<br/>Value: ${Math.round(value ?? 0).toLocaleString()}`;
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxValue,
        right: 16,
        bottom: 18,
        itemWidth: 130,
        itemHeight: 10,
        orient: 'horizontal',
        text: ['High', 'Low'],
        textStyle: { color: colors.muted, fontSize: 10 },
        inRange: { color: ['#0a1c34', '#153b8a', '#7049c9', '#ff6c42', '#ffe436'] },
        calculable: false,
      },
      geo: {
        map: MAP_NAME,
        roam: true,
        zoom: mapZoom,
        center: [-73.945, 40.72],
        nameProperty: 'name',
        itemStyle: {
          areaColor: '#0b2340',
          borderColor: 'rgba(115, 196, 255, 0.38)',
          borderWidth: 0.55,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#2f82ff',
            borderColor: '#dff1ff',
            borderWidth: 1,
          },
          label: { show: false },
        },
      },
      series: [
        {
          name: 'Taxi Zone Metric',
          type: 'map',
          geoIndex: 0,
          nameProperty: 'name',
          data: zones.map((zone) => ({
            name: zone.locationId,
            locationId: zone.locationId,
            value: zone.value,
            borough: zone.borough,
            itemStyle: zone.selected
              ? {
                  areaColor: '#fff071',
                  borderColor: '#ffffff',
                  borderWidth: 2,
                }
              : undefined,
          })),
        },
        {
          name: 'OD Flow',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 4,
          effect: { show: true, symbol: 'arrow', symbolSize: 7, trailLength: 0.18 },
          lineStyle: { curveness: 0.18 },
          data: routeLines,
        },
        {
          name: 'Top Zones',
          type: 'effectScatter',
          coordinateSystem: 'geo',
          zlevel: 5,
          rippleEffect: { brushType: 'stroke', scale: 4 },
          symbolSize: (value: unknown) => {
            const typed = value as number[];
            return Math.max(9, Math.min(28, typed[2] / 4800));
          },
          label: {
            show: true,
            formatter: (params: { data?: { name?: string } }) => params.data?.name ?? '',
            position: 'right',
            color: colors.text,
            fontSize: 10,
            hideOverlap: true,
            backgroundColor: 'rgba(4, 15, 28, 0.82)',
            borderColor: 'rgba(115, 196, 255, 0.42)',
            borderWidth: 1,
            padding: [4, 6],
            borderRadius: 3,
          },
          itemStyle: { color: (params: { data?: { color?: string } }) => params.data?.color ?? colors.blue },
          data: nodes
            .slice(0, 6)
            .map((node) => ({
            name: node.name,
            locationId: node.zone,
            value: [...node.coord, node.value],
            color: node.color,
          })),
        },
      ],
    } as EChartsOption;
  }, [mapZoom, nodeByName, nodes, ready, routes, selectedZone, zoneLookup, zoneValues, zones]);

  const handleClick = (event: ECElementEvent) => {
    const data = event.data as { locationId?: string } | undefined;
    const zoneId = data?.locationId ?? (typeof event.name === 'string' ? event.name : '');
    if (zoneId && zoneLookup[zoneId] && selectableZones.has(zoneId)) {
      onZoneSelect(zoneId);
    }
  };

  return (
    <div className="map-stage real-map-stage">
      {!ready && <div className="map-loading">Loading NYC taxi zones...</div>}
      <EChart option={option} className="chart map-chart" onClick={handleClick} />
      <div className="map-tools">
        <button type="button" aria-label="Zoom in" onClick={() => setMapZoom((zoom) => Math.min(2.2, Number((zoom + 0.14).toFixed(2))))}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setMapZoom((zoom) => Math.max(0.82, Number((zoom - 0.14).toFixed(2))))}>-</button>
        <button type="button" aria-label="Reset map" onClick={() => {
          setMapZoom(1.12);
          onZoneSelect('all');
        }}>◎</button>
      </div>
      <div className="map-status">
        <span>{selectedZone === 'all' ? 'All Taxi Zones' : zoneLookup[selectedZone]?.zone}</span>
        <strong>{Object.keys(zoneLookup).length} boundaries / {zones.length} metric zones</strong>
      </div>
      <div className="map-legend">
        <span>Metric Intensity</span>
        <div className="legend-ramp" />
        <div className="legend-scale">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

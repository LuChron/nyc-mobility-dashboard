import type { ReactNode } from 'react';

export type SourceKey = 'all' | 'yellow' | 'green' | 'hvfhv';

export type KpiTone = 'blue' | 'green' | 'purple' | 'amber';

export type DayType = 'all' | 'weekday' | 'weekend';

export type MetricKey = 'pickup' | 'dropoff' | 'tripCount' | 'avgFare' | 'avgDistance';

export type DistributionMode = 'fare' | 'distance';

export interface FilterState {
  source: SourceKey;
  year: '2025-2026' | '2025' | '2026';
  month: 'all' | 'q1' | 'q2' | 'h2';
  dayType: DayType;
  borough: string;
  zone: string;
  metric: MetricKey;
}

export interface HeaderMetric {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}

export interface KpiMetric {
  label: string;
  value: string;
  change: string;
  direction: 'up' | 'down';
  sparkline: number[];
  tone: KpiTone;
}

export interface RankingItem {
  label: string;
  value: string;
  score: number;
  color?: string;
  zoneId?: string;
}

export interface MonthlyPoint {
  month: string;
  all: number;
  yellow: number;
  green: number;
  hvfhv: number;
}

export interface HeatmapPoint {
  weekday: string;
  hour: string;
  value: number;
}

export interface ComparisonMetric {
  metric: string;
  yellow: number;
  green: number;
  hvfhv: number;
}

export interface DistributionPoint {
  bucket: string;
  yellow: number;
  green: number;
  hvfhv: number;
}

export interface MapNode {
  name: string;
  zone: string;
  borough: string;
  coord: [number, number];
  value: number;
  color: string;
}

export interface MapRoute {
  from: string;
  to: string;
  fromCoord: [number, number];
  toCoord: [number, number];
  value: number;
  color: string;
}

export interface OdRouteRecord {
  source: SourceKey;
  month: string;
  day_type: DayType;
  from_location_id: number;
  to_location_id: number;
  from_zone: string;
  to_zone: string;
  from_borough: string;
  to_borough: string;
  from_centroid: [number, number];
  to_centroid: [number, number];
  trip_count: number;
  avg_fare: number;
  avg_distance: number;
}

export interface ZoneMetric {
  locationId: string;
  zone: string;
  borough: string;
  coord: [number, number];
  pickup: Record<SourceKey, number>;
  dropoff: Record<SourceKey, number>;
  avgFare: Record<SourceKey, number>;
  avgDistance: Record<SourceKey, number>;
}

export interface DashboardViewModel {
  kpis: KpiMetric[];
  mapZones: Array<{
    locationId: string;
    name: string;
    value: number;
    borough: string;
    selected: boolean;
  }>;
  mapNodes: MapNode[];
  mapRoutes: MapRoute[];
  topPickupZones: RankingItem[];
  topRoutes: RankingItem[];
  monthlyTrend: MonthlyPoint[];
  weekdayHourHeatmap: HeatmapPoint[];
  sourceComparison: ComparisonMetric[];
  distribution: DistributionPoint[];
  availableZones: Array<{ id: string; zone: string; borough: string }>;
}

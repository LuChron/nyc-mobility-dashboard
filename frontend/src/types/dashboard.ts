import type { ReactNode } from 'react';

export type SourceKey = 'all' | 'yellow' | 'green' | 'hvfhv';

export type KpiTone = 'blue' | 'green' | 'purple' | 'amber';

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
  value: number;
  color: string;
}


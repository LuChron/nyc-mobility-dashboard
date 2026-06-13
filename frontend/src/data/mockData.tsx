import { Activity, BarChart3, CalendarDays, Clock3 } from 'lucide-react';
import type {
  ComparisonMetric,
  DistributionPoint,
  HeaderMetric,
  HeatmapPoint,
  KpiMetric,
  MapNode,
  MonthlyPoint,
  RankingItem,
  SourceKey,
} from '../types/dashboard';

export const sourceOptions: Array<{ key: SourceKey; label: string; color: string }> = [
  { key: 'all', label: 'All services', color: '#51b7e8' },
  { key: 'yellow', label: 'Yellow taxi', color: '#f6c84c' },
  { key: 'green', label: 'Green taxi', color: '#5bd18b' },
  { key: 'hvfhv', label: 'HVFHV', color: '#8b5cff' },
];

export const headerMetrics: HeaderMetric[] = [
  {
    label: 'Data Updated',
    value: 'May 12, 2026 08:30 AM',
    detail: 'Live',
    icon: <Clock3 size={22} />,
  },
  {
    label: 'Covered Months',
    value: 'Jan 2025 - Apr 2026',
    detail: '16 Months',
    icon: <CalendarDays size={22} />,
  },
  {
    label: 'Total Trips',
    value: '318,742,891',
    detail: '+8.6% vs Prev 16 Months',
    icon: <BarChart3 size={22} />,
  },
];

export const kpis: KpiMetric[] = [
  {
    label: 'Total Trips',
    value: '318.74M',
    change: '+8.6%',
    direction: 'up',
    tone: 'blue',
    sparkline: [19, 22, 21, 24, 22, 28, 31, 29, 35, 38, 32, 31, 36, 39, 41, 43],
  },
  {
    label: 'Avg Fare',
    value: '$17.62',
    change: '+6.3%',
    direction: 'up',
    tone: 'green',
    sparkline: [15, 16, 17, 16, 18, 17, 18, 19, 20, 21, 22, 21, 23, 24, 24, 25],
  },
  {
    label: 'Avg Distance',
    value: '3.72 mi',
    change: '-2.1%',
    direction: 'down',
    tone: 'purple',
    sparkline: [22, 23, 21, 20, 19, 19, 18, 17, 18, 18, 19, 20, 20, 21, 20, 21],
  },
  {
    label: 'Peak Hour',
    value: '5 PM - 6 PM',
    change: '24.7%',
    direction: 'up',
    tone: 'amber',
    sparkline: [8, 9, 12, 15, 17, 18, 19, 22, 24, 24, 23, 21, 19, 17, 15, 12],
  },
];

export const mapNodes: MapNode[] = [
  { name: 'Midtown Center', zone: '230', borough: 'Manhattan', coord: [48, 63], value: 128540, color: '#ffd21f' },
  { name: 'Financial District', zone: '7', borough: 'Manhattan', coord: [42, 43], value: 97621, color: '#ffd21f' },
  { name: 'JFK Airport', zone: '132', borough: 'Queens', coord: [18, 47], value: 63441, color: '#8b5cff' },
  { name: 'LaGuardia Airport', zone: '31', borough: 'Queens', coord: [75, 72], value: 55290, color: '#5ad85a' },
  { name: 'Long Island City', zone: '40', borough: 'Queens', coord: [66, 52], value: 73120, color: '#5ad85a' },
  { name: 'Williamsburg', zone: '79', borough: 'Brooklyn', coord: [58, 36], value: 68840, color: '#8b5cff' },
  { name: 'Downtown Brooklyn', zone: '61', borough: 'Brooklyn', coord: [48, 27], value: 60314, color: '#8b5cff' },
  { name: 'Lincoln Center', zone: '163', borough: 'Manhattan', coord: [45, 56], value: 76884, color: '#ffd21f' },
];

export const mapRoutes = [
  { from: 'Midtown Center', to: 'JFK Airport', value: 12840, color: '#8b5cff' },
  { from: 'JFK Airport', to: 'Midtown Center', value: 11760, color: '#ffd21f' },
  { from: 'Midtown Center', to: 'LaGuardia Airport', value: 7920, color: '#5ad85a' },
  { from: 'Financial District', to: 'JFK Airport', value: 6310, color: '#ffd21f' },
  { from: 'LaGuardia Airport', to: 'Midtown Center', value: 5780, color: '#5ad85a' },
  { from: 'Financial District', to: 'Long Island City', value: 4840, color: '#ffd21f' },
];

export const topPickupZones: RankingItem[] = [
  { label: 'Midtown Center (230)', value: '128,540', score: 100, color: '#ffd21f' },
  { label: 'Financial District (7)', value: '97,621', score: 76, color: '#ffd21f' },
  { label: 'Times Sq/Theatre Dist (244)', value: '89,332', score: 70, color: '#ffd21f' },
  { label: 'Penn Station/Madison Sq (234)', value: '76,884', score: 60, color: '#ffd21f' },
  { label: 'Airport (JFK) (132)', value: '63,441', score: 49, color: '#ffd21f' },
];

export const topRoutes: RankingItem[] = [
  { label: 'Midtown Center -> JFK Airport', value: '12.84M', score: 100, color: '#8b5cff' },
  { label: 'JFK Airport -> Midtown Center', value: '11.76M', score: 92, color: '#8b5cff' },
  { label: 'Midtown Center -> LGA Airport', value: '7.92M', score: 62, color: '#8b5cff' },
  { label: 'Financial District -> JFK Airport', value: '6.31M', score: 49, color: '#8b5cff' },
  { label: 'LGA Airport -> Midtown Center', value: '5.78M', score: 45, color: '#8b5cff' },
];

export const monthlyTrend: MonthlyPoint[] = [
  { month: "Jan '25", all: 28, yellow: 11, green: 2.4, hvfhv: 19 },
  { month: "Feb '25", all: 29, yellow: 12, green: 2.7, hvfhv: 21 },
  { month: "Mar '25", all: 31, yellow: 13, green: 3.1, hvfhv: 22 },
  { month: "Apr '25", all: 29, yellow: 12, green: 2.8, hvfhv: 20 },
  { month: "May '25", all: 32, yellow: 14, green: 3.4, hvfhv: 23 },
  { month: "Jun '25", all: 35, yellow: 15, green: 3.6, hvfhv: 25 },
  { month: "Jul '25", all: 37, yellow: 16, green: 3.9, hvfhv: 26 },
  { month: "Aug '25", all: 35, yellow: 15, green: 3.7, hvfhv: 24 },
  { month: "Sep '25", all: 34, yellow: 15, green: 3.8, hvfhv: 24 },
  { month: "Oct '25", all: 37, yellow: 16, green: 4.0, hvfhv: 26 },
  { month: "Nov '25", all: 36, yellow: 15, green: 3.7, hvfhv: 25 },
  { month: "Dec '25", all: 32, yellow: 13, green: 3.0, hvfhv: 22 },
  { month: "Jan '26", all: 31, yellow: 12, green: 2.7, hvfhv: 23 },
  { month: "Feb '26", all: 35, yellow: 15, green: 3.5, hvfhv: 25 },
  { month: "Mar '26", all: 36, yellow: 15, green: 4.7, hvfhv: 26 },
  { month: "Apr '26", all: 40, yellow: 18, green: 7.6, hvfhv: 31 },
];

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'];

export const weekdayHourHeatmap: HeatmapPoint[] = weekdays.flatMap((weekday, row) =>
  hours.flatMap((hour, col) => ({
    weekday,
    hour,
    value: Math.round(18 + Math.sin((row + 1) * 0.9) * 12 + Math.cos((col - 3) * 0.8) * 28 + col * 8),
  })),
);

export const sourceComparison: ComparisonMetric[] = [
  { metric: 'Trip Count', yellow: 96.52, green: 34.18, hvfhv: 188.04 },
  { metric: 'Avg Fare', yellow: 13.92, green: 17.85, hvfhv: 19.36 },
  { metric: 'Avg Distance', yellow: 2.94, green: 3.21, hvfhv: 4.12 },
];

export const fareDistanceDistribution: DistributionPoint[] = [
  { bucket: '$0', yellow: 0.0, green: 0.0, hvfhv: 0.0 },
  { bucket: '$10', yellow: 0.03, green: 0.06, hvfhv: 0.01 },
  { bucket: '$20', yellow: 0.07, green: 0.08, hvfhv: 0.04 },
  { bucket: '$30', yellow: 0.05, green: 0.04, hvfhv: 0.06 },
  { bucket: '$40', yellow: 0.03, green: 0.03, hvfhv: 0.04 },
  { bucket: '$50', yellow: 0.015, green: 0.014, hvfhv: 0.028 },
  { bucket: '$60', yellow: 0.007, green: 0.006, hvfhv: 0.018 },
  { bucket: '$70', yellow: 0.004, green: 0.003, hvfhv: 0.01 },
  { bucket: '$80+', yellow: 0.002, green: 0.001, hvfhv: 0.006 },
];

export const cityLabels = [
  { name: 'MANHATTAN', x: 48, y: 50 },
  { name: 'QUEENS', x: 73, y: 58 },
  { name: 'BROOKLYN', x: 57, y: 31 },
  { name: 'THE BRONX', x: 62, y: 78 },
  { name: 'STATEN ISLAND', x: 21, y: 33 },
];

export const activityIcon = <Activity size={26} />;

import { sourceOptions } from './mockData';
import { taxiZoneSeed } from './taxiZoneSeed';
import type {
  ComparisonMetric,
  DashboardViewModel,
  DistributionMode,
  DistributionPoint,
  FilterState,
  HeatmapPoint,
  KpiMetric,
  MapRoute,
  MonthlyPoint,
  RankingItem,
  SourceKey,
  ZoneMetric,
} from '../types/dashboard';

const priorityZoneOverrides: ZoneMetric[] = [
  {
    locationId: '161',
    zone: 'Midtown Center',
    borough: 'Manhattan',
    coord: [-73.9792, 40.7589],
    pickup: { all: 128540, yellow: 69412, green: 7020, hvfhv: 52108 },
    dropoff: { all: 116820, yellow: 62300, green: 6100, hvfhv: 48420 },
    avgFare: { all: 18.74, yellow: 15.2, green: 18.1, hvfhv: 22.4 },
    avgDistance: { all: 3.86, yellow: 2.8, green: 3.1, hvfhv: 4.7 },
  },
  {
    locationId: '132',
    zone: 'JFK Airport',
    borough: 'Queens',
    coord: [-73.7781, 40.6413],
    pickup: { all: 63441, yellow: 26440, green: 3900, hvfhv: 33091 },
    dropoff: { all: 69800, yellow: 28100, green: 4100, hvfhv: 37600 },
    avgFare: { all: 54.1, yellow: 48.6, green: 52.2, hvfhv: 60.8 },
    avgDistance: { all: 16.4, yellow: 15.1, green: 15.8, hvfhv: 17.8 },
  },
  {
    locationId: '138',
    zone: 'LaGuardia Airport',
    borough: 'Queens',
    coord: [-73.874, 40.7769],
    pickup: { all: 55290, yellow: 23110, green: 5280, hvfhv: 26900 },
    dropoff: { all: 61430, yellow: 25130, green: 5800, hvfhv: 30500 },
    avgFare: { all: 37.9, yellow: 31.5, green: 35.1, hvfhv: 42.2 },
    avgDistance: { all: 9.7, yellow: 8.1, green: 8.8, hvfhv: 10.9 },
  },
  {
    locationId: '87',
    zone: 'Financial District North',
    borough: 'Manhattan',
    coord: [-74.0075, 40.7075],
    pickup: { all: 97621, yellow: 53140, green: 6540, hvfhv: 37941 },
    dropoff: { all: 88420, yellow: 48600, green: 5900, hvfhv: 33920 },
    avgFare: { all: 17.82, yellow: 14.7, green: 17.6, hvfhv: 21.2 },
    avgDistance: { all: 3.42, yellow: 2.5, green: 3.0, hvfhv: 4.1 },
  },
  {
    locationId: '145',
    zone: 'Long Island City/Hunters Point',
    borough: 'Queens',
    coord: [-73.9496, 40.7447],
    pickup: { all: 73120, yellow: 23210, green: 17260, hvfhv: 32650 },
    dropoff: { all: 75550, yellow: 24680, green: 18410, hvfhv: 32460 },
    avgFare: { all: 19.5, yellow: 16.2, green: 18.4, hvfhv: 22.1 },
    avgDistance: { all: 4.2, yellow: 3.3, green: 3.7, hvfhv: 4.9 },
  },
  {
    locationId: '255',
    zone: 'Williamsburg (North Side)',
    borough: 'Brooklyn',
    coord: [-73.9586, 40.717],
    pickup: { all: 68840, yellow: 15120, green: 19880, hvfhv: 33840 },
    dropoff: { all: 70430, yellow: 16500, green: 20710, hvfhv: 33220 },
    avgFare: { all: 20.1, yellow: 17.2, green: 19.3, hvfhv: 22.8 },
    avgDistance: { all: 4.5, yellow: 3.9, green: 4.1, hvfhv: 5.0 },
  },
  {
    locationId: '65',
    zone: 'Downtown Brooklyn/MetroTech',
    borough: 'Brooklyn',
    coord: [-73.9851, 40.6928],
    pickup: { all: 60314, yellow: 18310, green: 16400, hvfhv: 25604 },
    dropoff: { all: 64120, yellow: 19600, green: 17880, hvfhv: 26640 },
    avgFare: { all: 18.9, yellow: 15.8, green: 18.2, hvfhv: 21.5 },
    avgDistance: { all: 3.9, yellow: 3.2, green: 3.6, hvfhv: 4.4 },
  },
  {
    locationId: '142',
    zone: 'Lincoln Square East',
    borough: 'Manhattan',
    coord: [-73.9837, 40.7739],
    pickup: { all: 76884, yellow: 43100, green: 5200, hvfhv: 28584 },
    dropoff: { all: 74120, yellow: 40700, green: 4980, hvfhv: 28440 },
    avgFare: { all: 17.6, yellow: 14.2, green: 17.1, hvfhv: 20.6 },
    avgDistance: { all: 3.2, yellow: 2.4, green: 2.9, hvfhv: 3.9 },
  },
  {
    locationId: '230',
    zone: 'Times Sq/Theatre District',
    borough: 'Manhattan',
    coord: [-73.9867, 40.759],
    pickup: { all: 89332, yellow: 51500, green: 4380, hvfhv: 33452 },
    dropoff: { all: 90220, yellow: 50100, green: 4760, hvfhv: 35360 },
    avgFare: { all: 18.3, yellow: 14.9, green: 17.8, hvfhv: 21.9 },
    avgDistance: { all: 3.65, yellow: 2.75, green: 3.12, hvfhv: 4.38 },
  },
  {
    locationId: '236',
    zone: 'Upper East Side North',
    borough: 'Manhattan',
    coord: [-73.9577, 40.7809],
    pickup: { all: 54630, yellow: 30800, green: 4020, hvfhv: 19810 },
    dropoff: { all: 58920, yellow: 33100, green: 4240, hvfhv: 21580 },
    avgFare: { all: 15.8, yellow: 13.4, green: 15.1, hvfhv: 18.5 },
    avgDistance: { all: 2.85, yellow: 2.1, green: 2.7, hvfhv: 3.5 },
  },
  {
    locationId: '181',
    zone: 'Park Slope',
    borough: 'Brooklyn',
    coord: [-73.981, 40.671],
    pickup: { all: 39200, yellow: 8420, green: 13200, hvfhv: 17580 },
    dropoff: { all: 41880, yellow: 9140, green: 14200, hvfhv: 18540 },
    avgFare: { all: 19.8, yellow: 16.6, green: 18.9, hvfhv: 22.7 },
    avgDistance: { all: 4.7, yellow: 4.0, green: 4.4, hvfhv: 5.3 },
  },
  {
    locationId: '79',
    zone: 'East Village',
    borough: 'Manhattan',
    coord: [-73.985, 40.728],
    pickup: { all: 61280, yellow: 34100, green: 7200, hvfhv: 19980 },
    dropoff: { all: 64800, yellow: 35800, green: 7480, hvfhv: 21520 },
    avgFare: { all: 16.7, yellow: 13.9, green: 16.2, hvfhv: 19.4 },
    avgDistance: { all: 3.05, yellow: 2.4, green: 2.9, hvfhv: 3.7 },
  },
];

const priorityZoneById = new Map(priorityZoneOverrides.map((zone) => [zone.locationId, zone]));

function hashZone(locationId: string) {
  let hash = 0;
  for (const char of locationId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  }
  return hash;
}

function boroughWeight(borough: string) {
  return {
    Manhattan: 1.65,
    Queens: 1.05,
    Brooklyn: 1.18,
    Bronx: 0.72,
    'Staten Island': 0.42,
    EWR: 0.86,
  }[borough] ?? 0.65;
}

function makeZoneMetric(seed: (typeof taxiZoneSeed)[number]): ZoneMetric {
  const override = priorityZoneById.get(seed.locationId);
  if (override) {
    return override;
  }

  const hash = hashZone(seed.locationId);
  const weight = boroughWeight(seed.borough);
  const airportBoost = /Airport|Newark/.test(seed.zone) ? 1.8 : 1;
  const base = Math.round((2200 + (hash % 9000)) * weight * airportBoost);
  const yellow = Math.round(base * (seed.borough === 'Manhattan' ? 0.48 : 0.2 + (hash % 12) / 100));
  const green = Math.round(base * (seed.borough === 'Manhattan' ? 0.08 : 0.18 + (hash % 10) / 100));
  const hvfhv = Math.max(420, base - yellow - green);
  const all = yellow + green + hvfhv;
  const distanceBase = seed.borough === 'Manhattan' ? 2.2 : seed.borough === 'Staten Island' ? 6.1 : seed.borough === 'EWR' ? 15.4 : 3.5;
  const distance = distanceBase + (hash % 45) / 10;
  const fare = 9 + distance * 2.8 + (hash % 18) / 2;

  return {
    locationId: seed.locationId,
    zone: seed.zone,
    borough: seed.borough,
    coord: seed.coord,
    pickup: { all, yellow, green, hvfhv },
    dropoff: {
      all: Math.round(all * (0.9 + (hash % 18) / 100)),
      yellow: Math.round(yellow * 0.96),
      green: Math.round(green * 1.03),
      hvfhv: Math.round(hvfhv * 0.94),
    },
    avgFare: {
      all: fare,
      yellow: fare * 0.86,
      green: fare * 0.94,
      hvfhv: fare * 1.12,
    },
    avgDistance: {
      all: distance,
      yellow: distance * 0.86,
      green: distance * 0.95,
      hvfhv: distance * 1.14,
    },
  };
}

const baseZones: ZoneMetric[] = taxiZoneSeed.map(makeZoneMetric);

const routes = [
  { from: '161', to: '132', all: 12840, yellow: 5320, green: 820, hvfhv: 6700 },
  { from: '132', to: '161', all: 11760, yellow: 4920, green: 790, hvfhv: 6050 },
  { from: '161', to: '138', all: 7920, yellow: 3300, green: 620, hvfhv: 4000 },
  { from: '87', to: '132', all: 6310, yellow: 2770, green: 420, hvfhv: 3120 },
  { from: '138', to: '161', all: 5780, yellow: 2510, green: 510, hvfhv: 2760 },
  { from: '87', to: '145', all: 4840, yellow: 1860, green: 830, hvfhv: 2150 },
  { from: '255', to: '161', all: 4620, yellow: 980, green: 1300, hvfhv: 2340 },
  { from: '65', to: '87', all: 3980, yellow: 1040, green: 1260, hvfhv: 1680 },
];

const sourceColors = Object.fromEntries(sourceOptions.map((source) => [source.key, source.color])) as Record<SourceKey, string>;

function sourceValue(values: Record<SourceKey, number>, source: SourceKey) {
  return source === 'all' ? values.all : values[source];
}

function filteredZones(filters: FilterState) {
  return baseZones.filter((zone) => {
    const boroughMatch = filters.borough === 'all' || zone.borough === filters.borough;
    const zoneMatch = filters.zone === 'all' || zone.locationId === filters.zone;
    return boroughMatch && zoneMatch;
  });
}

function dayMultiplier(dayType: FilterState['dayType']) {
  return dayType === 'weekday' ? 1 : 0.74;
}

function monthMultiplier(month: FilterState['month']) {
  return { all: 1, q1: 0.93, q2: 1.04, h2: 1.09 }[month];
}

function yearMultiplier(year: FilterState['year']) {
  return { '2025-2026': 1, '2025': 0.96, '2026': 1.08 }[year];
}

function overallMultiplier(filters: FilterState) {
  return dayMultiplier(filters.dayType) * monthMultiplier(filters.month) * yearMultiplier(filters.year);
}

function metricValue(zone: ZoneMetric, filters: FilterState) {
  const source = filters.source;
  const mult = overallMultiplier(filters);
  if (filters.metric === 'dropoff') return sourceValue(zone.dropoff, source) * mult;
  if (filters.metric === 'avgFare') return sourceValue(zone.avgFare, source);
  if (filters.metric === 'avgDistance') return sourceValue(zone.avgDistance, source);
  return sourceValue(zone.pickup, source) * mult;
}

function formatCompact(value: number, decimals = 2) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  return value.toFixed(decimals);
}

function buildKpis(filters: FilterState, zones: ZoneMetric[]): KpiMetric[] {
  const mult = overallMultiplier(filters);
  const totalTrips = zones.reduce((sum, zone) => sum + sourceValue(zone.pickup, filters.source) * mult, 0);
  const weightedFare = zones.reduce((sum, zone) => sum + sourceValue(zone.pickup, filters.source) * sourceValue(zone.avgFare, filters.source), 0);
  const weightedDistance = zones.reduce((sum, zone) => sum + sourceValue(zone.pickup, filters.source) * sourceValue(zone.avgDistance, filters.source), 0);
  const pickupBase = zones.reduce((sum, zone) => sum + sourceValue(zone.pickup, filters.source), 0) || 1;
  const weekendDelta = filters.dayType === 'weekend' ? -12.4 : 8.6;
  return [
    {
      label: 'Total Trips',
      value: formatCompact(totalTrips, 2),
      change: `${weekendDelta > 0 ? '+' : ''}${weekendDelta}%`,
      direction: weekendDelta > 0 ? 'up' : 'down',
      tone: 'blue',
      sparkline: [19, 22, 21, 24, 22, 28, 31, 29, 35, 38, 32, 31, 36, 39, 41, 43].map((v) => v * mult),
    },
    {
      label: 'Avg Fare',
      value: `$${(weightedFare / pickupBase).toFixed(2)}`,
      change: filters.source === 'green' ? '+3.4%' : '+6.3%',
      direction: 'up',
      tone: 'green',
      sparkline: [15, 16, 17, 16, 18, 17, 18, 19, 20, 21, 22, 21, 23, 24, 24, 25],
    },
    {
      label: 'Avg Distance',
      value: `${(weightedDistance / pickupBase).toFixed(2)} mi`,
      change: filters.source === 'hvfhv' ? '+1.8%' : '-2.1%',
      direction: filters.source === 'hvfhv' ? 'up' : 'down',
      tone: 'purple',
      sparkline: [22, 23, 21, 20, 19, 19, 18, 17, 18, 18, 19, 20, 20, 21, 20, 21],
    },
    {
      label: 'Peak Hour',
      value: filters.dayType === 'weekend' ? '8 PM - 9 PM' : '5 PM - 6 PM',
      change: filters.dayType === 'weekend' ? '18.2%' : '24.7%',
      direction: 'up',
      tone: 'amber',
      sparkline: [8, 9, 12, 15, 17, 18, 19, 22, 24, 24, 23, 21, 19, 17, 15, 12],
    },
  ];
}

function buildMonthlyTrend(filters: FilterState): MonthlyPoint[] {
  const sourceScale = { all: 1, yellow: 0.42, green: 0.15, hvfhv: 0.62 }[filters.source];
  const regionScale = filters.borough === 'all' ? 1 : filters.borough === 'Manhattan' ? 0.58 : filters.borough === 'Queens' ? 0.24 : 0.18;
  const values = [28, 29, 31, 29, 32, 35, 37, 35, 34, 37, 36, 32, 31, 35, 36, 40];
  return values.map((value, index) => ({
    month: ["Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26"][index],
    all: value * sourceScale * regionScale,
    yellow: value * 0.39 * regionScale,
    green: value * 0.11 * regionScale,
    hvfhv: value * 0.55 * regionScale,
  }));
}

function buildHeatmap(filters: FilterState): HeatmapPoint[] {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '12 AM'];
  const weekendBoost = filters.dayType === 'weekend' ? 1.2 : 1;
  return weekdays.flatMap((weekday, row) =>
    hours.flatMap((hour, col) => ({
      weekday,
      hour,
      value: Math.max(1, Math.round((18 + Math.sin((row + 1) * 0.9) * 12 + Math.cos((col - 3) * 0.8) * 28 + col * 8) * overallMultiplier(filters) * weekendBoost)),
    })),
  );
}

function buildComparison(filters: FilterState, zones: ZoneMetric[]): ComparisonMetric[] {
  const mult = overallMultiplier(filters);
  const bySource = (source: SourceKey) => zones.reduce((sum, zone) => sum + zone.pickup[source] * mult, 0) / 1000;
  const avg = (source: SourceKey, key: 'avgFare' | 'avgDistance') => {
    const total = zones.reduce((sum, zone) => sum + zone.pickup[source], 0) || 1;
    return zones.reduce((sum, zone) => sum + zone.pickup[source] * zone[key][source], 0) / total;
  };
  return [
    { metric: 'Trip Count', yellow: bySource('yellow'), green: bySource('green'), hvfhv: bySource('hvfhv') },
    { metric: 'Avg Fare', yellow: avg('yellow', 'avgFare'), green: avg('green', 'avgFare'), hvfhv: avg('hvfhv', 'avgFare') },
    { metric: 'Avg Distance', yellow: avg('yellow', 'avgDistance'), green: avg('green', 'avgDistance'), hvfhv: avg('hvfhv', 'avgDistance') },
  ];
}

function buildDistribution(mode: DistributionMode, filters: FilterState): DistributionPoint[] {
  const fareBuckets = ['$0', '$10', '$20', '$30', '$40', '$50', '$60', '$70', '$80+'];
  const distanceBuckets = ['0', '1', '2', '3', '5', '8', '12', '16', '20+'];
  const buckets = mode === 'fare' ? fareBuckets : distanceBuckets;
  const scale = filters.dayType === 'weekend' ? 0.92 : 1;
  return buckets.map((bucket, index) => ({
    bucket,
    yellow: Math.max(0, [0, 0.03, 0.07, 0.05, 0.03, 0.015, 0.007, 0.004, 0.002][index] * scale),
    green: Math.max(0, [0, 0.06, 0.08, 0.04, 0.03, 0.014, 0.006, 0.003, 0.001][index] * (scale + 0.04)),
    hvfhv: Math.max(0, [0, 0.01, 0.04, 0.06, 0.04, 0.028, 0.018, 0.01, 0.006][index] * (scale + 0.08)),
  }));
}

function buildRankings(filters: FilterState, zones: ZoneMetric[]): RankingItem[] {
  const sorted = [...zones].sort((a, b) => metricValue(b, filters) - metricValue(a, filters));
  const max = Math.max(...sorted.map((zone) => metricValue(zone, filters)), 1);
  return sorted.slice(0, 5).map((zone) => ({
    label: `${zone.zone} (${zone.locationId})`,
    value: filters.metric === 'avgFare' ? `$${metricValue(zone, filters).toFixed(2)}` : filters.metric === 'avgDistance' ? `${metricValue(zone, filters).toFixed(2)} mi` : Math.round(metricValue(zone, filters)).toLocaleString(),
    score: (metricValue(zone, filters) / max) * 100,
    color: sourceColors[filters.source],
    zoneId: zone.locationId,
  }));
}

function buildRoutes(filters: FilterState): RankingItem[] {
  const visibleIds = new Set(filteredZones(filters).map((zone) => zone.locationId));
  const source = filters.source;
  const rows = routes
    .filter((route) => filters.borough === 'all' || visibleIds.has(route.from) || visibleIds.has(route.to))
    .filter((route) => filters.zone === 'all' || route.from === filters.zone || route.to === filters.zone)
    .map((route) => {
      const from = baseZones.find((zone) => zone.locationId === route.from);
      const to = baseZones.find((zone) => zone.locationId === route.to);
      return {
        label: `${from?.zone ?? route.from} -> ${to?.zone ?? route.to}`,
        value: route[source] * overallMultiplier(filters),
        score: 0,
        color: sourceColors[source],
      };
    })
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map((route) => route.value), 1);
  return rows.slice(0, 5).map((route) => ({
    ...route,
    value: `${(route.value / 1000).toFixed(2)}K`,
    score: (Number.parseFloat(String(route.value)) / max) * 100,
  }));
}

function mapRoutesForFilters(filters: FilterState): MapRoute[] {
  const visibleIds = new Set(filteredZones(filters).map((zone) => zone.locationId));
  return routes
    .filter((route) => filters.borough === 'all' || visibleIds.has(route.from) || visibleIds.has(route.to))
    .filter((route) => filters.zone === 'all' || route.from === filters.zone || route.to === filters.zone)
    .flatMap((route) => {
      const from = baseZones.find((zone) => zone.locationId === route.from);
      const to = baseZones.find((zone) => zone.locationId === route.to);
      if (!from || !to) {
        return [];
      }
    return {
      from: from.zone,
      to: to.zone,
      fromCoord: from.coord,
      toCoord: to.coord,
      value: route[filters.source] * overallMultiplier(filters),
      color: sourceColors[filters.source],
    };
  });
}

export function buildDashboardViewModel(filters: FilterState, distributionMode: DistributionMode): DashboardViewModel {
  const zones = filteredZones(filters);
  const mapSourceZones = filters.borough === 'all' && filters.zone === 'all' ? baseZones : zones;
  const maxMap = Math.max(...baseZones.map((zone) => metricValue(zone, filters)), 1);
  return {
    kpis: buildKpis(filters, zones),
    mapZones: mapSourceZones.map((zone) => ({
      locationId: zone.locationId,
      name: zone.zone,
      borough: zone.borough,
      value: metricValue(zone, filters),
      selected: filters.zone === zone.locationId,
    })),
    mapNodes: [...mapSourceZones].sort((a, b) => metricValue(b, filters) - metricValue(a, filters)).slice(0, 6).map((zone) => ({
      name: zone.zone,
      zone: zone.locationId,
      borough: zone.borough,
      coord: zone.coord,
      value: metricValue(zone, filters),
      color: metricValue(zone, filters) > maxMap * 0.75 ? '#ffd21f' : sourceColors[filters.source],
    })),
    mapRoutes: mapRoutesForFilters(filters),
    topPickupZones: buildRankings(filters, zones),
    topRoutes: buildRoutes(filters),
    monthlyTrend: buildMonthlyTrend(filters),
    weekdayHourHeatmap: buildHeatmap(filters),
    sourceComparison: buildComparison(filters, zones),
    distribution: buildDistribution(distributionMode, filters),
    availableZones: baseZones
      .filter((zone) => filters.borough === 'all' || zone.borough === filters.borough)
      .map((zone) => ({ id: zone.locationId, zone: zone.zone, borough: zone.borough })),
  };
}

export const initialFilters: FilterState = {
  source: 'all',
  year: '2025-2026',
  month: 'all',
  dayType: 'weekday',
  borough: 'all',
  zone: 'all',
  metric: 'pickup',
};

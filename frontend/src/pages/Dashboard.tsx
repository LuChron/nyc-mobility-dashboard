import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { DistributionChart } from '../charts/DistributionChart';
import { MobilityMapChart } from '../charts/MobilityMapChart';
import { MonthlyTrendChart } from '../charts/MonthlyTrendChart';
import { SourceComparisonChart } from '../charts/SourceComparisonChart';
import { WeekdayHeatmapChart } from '../charts/WeekdayHeatmapChart';
import { DashboardHeader } from '../components/DashboardHeader';
import { KpiCard } from '../components/KpiCard';
import { Panel } from '../components/Panel';
import { RankingList } from '../components/RankingList';
import { SidebarFilters } from '../components/SidebarFilters';
import { buildDashboardViewModel, initialFilters } from '../data/dashboardModel';
import type { DistributionMode, FilterState, OdRouteRecord } from '../types/dashboard';

const sourceLabels: Record<FilterState['source'], string> = {
  all: 'All services',
  yellow: 'Yellow taxi',
  green: 'Green taxi',
  hvfhv: 'FHV / ride-hail',
};

const dayLabels: Record<FilterState['dayType'], string> = {
  all: 'All days',
  weekday: 'Weekdays',
  weekend: 'Weekends',
};

const monthLabels: Record<FilterState['month'], string> = {
  all: 'All months',
  q1: 'Q1',
  q2: 'Q2',
  h2: 'H2',
};

const metricMeta: Record<FilterState['metric'], { label: string; unit: string; rankingTitle: string }> = {
  pickup: { label: 'Pickup intensity', unit: 'pickups', rankingTitle: 'Top Pickup Zones' },
  dropoff: { label: 'Dropoff intensity', unit: 'dropoffs', rankingTitle: 'Top Dropoff Zones' },
  tripCount: { label: 'Trip volume', unit: 'trips', rankingTitle: 'Top Trip Zones' },
  avgFare: { label: 'Average fare', unit: 'USD', rankingTitle: 'Highest Fare Zones' },
  avgDistance: { label: 'Average distance', unit: 'mi', rankingTitle: 'Longest Trip Zones' },
};

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('fare');
  const [odRoutes, setOdRoutes] = useState<OdRouteRecord[] | null>(null);
  const [odRouteStatus, setOdRouteStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const viewModel = useMemo(() => buildDashboardViewModel(filters, distributionMode, odRoutes), [distributionMode, filters, odRoutes]);
  const metric = metricMeta[filters.metric];

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/od_top_routes.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<OdRouteRecord[]>;
      })
      .then((records) => {
        if (cancelled) return;
        setOdRoutes(records);
        setOdRouteStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setOdRoutes([]);
        setOdRouteStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleZoneSelect = (zoneId: string) => {
    setFilters((current) => ({ ...current, zone: current.zone === zoneId ? 'all' : zoneId }));
  };

  const resetView = () => {
    setFilters(initialFilters);
    setDistributionMode('fare');
  };

  const selectedZoneName = filters.zone === 'all'
    ? 'All zones'
    : viewModel.availableZones.find((zone) => zone.id === filters.zone)?.zone ?? filters.zone;

  const activeContext = [
    sourceLabels[filters.source],
    filters.year,
    monthLabels[filters.month],
    dayLabels[filters.dayType],
    filters.borough === 'all' ? 'All Boroughs' : filters.borough,
    selectedZoneName,
  ].join(' / ');

  const clearZone = () => setFilters((current) => ({ ...current, zone: 'all' }));

  return (
    <main className="dashboard-shell">
      <DashboardHeader />

      <div className="dashboard-grid">
        <SidebarFilters
          filters={filters}
          zones={viewModel.availableZones}
          onChange={setFilters}
          onReset={resetView}
        />

        <Panel title={`Taxi Zone Map - ${metric.label}`} subtitle={activeContext} className="map-panel">
          <MobilityMapChart
            zones={viewModel.mapZones}
            routes={viewModel.mapRoutes}
            selectedZone={filters.zone}
            selectableZoneIds={viewModel.availableZones.map((zone) => zone.id)}
            metricLabel={metric.label}
            metricUnit={metric.unit}
            odRouteStatus={odRouteStatus}
            onZoneSelect={handleZoneSelect}
            onClearZone={clearZone}
          />
        </Panel>

        <div className="right-column">
          <div className="kpi-grid">
            {viewModel.kpis.map((metric) => (
              <KpiCard metric={metric} key={metric.label} />
            ))}
          </div>
          <div className="rank-grid">
            <RankingList
              title={metric.rankingTitle}
              unit={metric.unit}
              items={viewModel.topPickupZones}
              actionLabel={filters.zone === 'all' ? undefined : 'Clear zone filter'}
              onAction={clearZone}
              onSelect={handleZoneSelect}
            />
            <RankingList
              title="Top OD Routes"
              unit={odRouteStatus === 'loading' ? 'loading' : 'trips'}
              items={viewModel.topRoutes}
              actionLabel={filters.zone === 'all' ? undefined : 'Clear zone filter'}
              onAction={clearZone}
              emptyLabel={odRouteStatus === 'loading' ? 'Loading OD route records...' : 'No OD route records match this filter.'}
            />
          </div>
        </div>

        <Panel title="Monthly Trend - Trip Count" subtitle={`${sourceLabels[filters.source]} / ${filters.year}`} className="bottom-card trend-card">
          <MonthlyTrendChart data={viewModel.monthlyTrend} source={filters.source} />
        </Panel>
        <Panel title="Day x Hour Heatmap - Trip Count" subtitle={dayLabels[filters.dayType]} className="bottom-card heatmap-card">
          <WeekdayHeatmapChart data={viewModel.weekdayHourHeatmap} />
        </Panel>
        <Panel title="Source Comparison - Trip Count" className="bottom-card comparison-card">
          <SourceComparisonChart data={viewModel.sourceComparison} />
        </Panel>
        <Panel
          title="Fare / Distance Distribution"
          className="bottom-card distribution-card"
          action={
            <div className="tab-switch">
              <button type="button" className={distributionMode === 'fare' ? 'active' : ''} onClick={() => setDistributionMode('fare')}>Fare (USD)</button>
              <button type="button" className={distributionMode === 'distance' ? 'active' : ''} onClick={() => setDistributionMode('distance')}>Distance (mi)</button>
            </div>
          }
        >
          <DistributionChart data={viewModel.distribution} />
        </Panel>
      </div>

      <footer className="dashboard-footer">
        <span>Source: NYC TLC Trip Record Data</span>
        <span>Map Data: NYC Open Data Taxi Zones</span>
        <span>Current Source: {sourceLabels[filters.source]}</span>
        <span>Metric: {metric.label}</span>
        <BarChart3 size={13} />
      </footer>
    </main>
  );
}

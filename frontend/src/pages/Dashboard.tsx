import { useMemo, useState } from 'react';
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
import type { DistributionMode, FilterState } from '../types/dashboard';

export function Dashboard() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('fare');
  const viewModel = useMemo(() => buildDashboardViewModel(filters, distributionMode), [distributionMode, filters]);

  const handleZoneSelect = (zoneId: string) => {
    setFilters((current) => ({ ...current, zone: current.zone === zoneId ? 'all' : zoneId }));
  };

  return (
    <main className="dashboard-shell">
      <DashboardHeader />

      <div className="dashboard-grid">
        <SidebarFilters
          filters={filters}
          zones={viewModel.availableZones}
          onChange={setFilters}
          onReset={() => setFilters(initialFilters)}
        />

        <Panel title="NYC Taxi Zone Map - Pickup Intensity & OD Flows" className="map-panel">
          <MobilityMapChart
            zones={viewModel.mapZones}
            nodes={viewModel.mapNodes}
            routes={viewModel.mapRoutes}
            selectedZone={filters.zone}
            onZoneSelect={handleZoneSelect}
          />
        </Panel>

        <div className="right-column">
          <div className="kpi-grid">
            {viewModel.kpis.map((metric) => (
              <KpiCard metric={metric} key={metric.label} />
            ))}
          </div>
          <div className="rank-grid">
            <RankingList title="Top Pickup Zones" unit="Trips" items={viewModel.topPickupZones} actionLabel="View All Zones" onSelect={handleZoneSelect} />
            <RankingList title="Top OD Routes" unit="Trips" items={viewModel.topRoutes} actionLabel="View All Routes" />
          </div>
        </div>

        <Panel title="Monthly Trend - Trip Count" className="bottom-card trend-card">
          <MonthlyTrendChart data={viewModel.monthlyTrend} source={filters.source} />
        </Panel>
        <Panel title="Weekday x Hour Heatmap - Trip Count" className="bottom-card heatmap-card">
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
        <span>Current Source: {filters.source.toUpperCase()}</span>
        <span>Metric: {filters.metric}</span>
        <BarChart3 size={13} />
      </footer>
    </main>
  );
}

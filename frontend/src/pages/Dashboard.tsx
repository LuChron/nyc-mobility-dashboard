import { useState } from 'react';
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
import { kpis, topPickupZones, topRoutes } from '../data/mockData';
import type { SourceKey } from '../types/dashboard';

export function Dashboard() {
  const [source, setSource] = useState<SourceKey>('all');

  return (
    <main className="dashboard-shell">
      <DashboardHeader />

      <div className="dashboard-grid">
        <SidebarFilters source={source} onSourceChange={setSource} />

        <Panel title="NYC Taxi Zone Map - Pickup Intensity & OD Flows" className="map-panel">
          <MobilityMapChart />
        </Panel>

        <div className="right-column">
          <div className="kpi-grid">
            {kpis.map((metric) => (
              <KpiCard metric={metric} key={metric.label} />
            ))}
          </div>
          <div className="rank-grid">
            <RankingList title="Top Pickup Zones" unit="Trips" items={topPickupZones} actionLabel="View All Zones" />
            <RankingList title="Top OD Routes" unit="Trips" items={topRoutes} actionLabel="View All Routes" />
          </div>
        </div>

        <Panel title="Monthly Trend - Trip Count" className="bottom-card trend-card">
          <MonthlyTrendChart />
        </Panel>
        <Panel title="Weekday x Hour Heatmap - Trip Count" className="bottom-card heatmap-card">
          <WeekdayHeatmapChart />
        </Panel>
        <Panel title="Source Comparison - Trip Count" className="bottom-card comparison-card">
          <SourceComparisonChart />
        </Panel>
        <Panel
          title="Fare / Distance Distribution"
          className="bottom-card distribution-card"
          action={
            <div className="tab-switch">
              <button type="button" className="active">Fare (USD)</button>
              <button type="button">Distance (mi)</button>
            </div>
          }
        >
          <DistributionChart />
        </Panel>
      </div>

      <footer className="dashboard-footer">
        <span>Source: NYC TLC Trip Record Data</span>
        <span>Map Data: Taxi Zone Mock Geometry</span>
        <span>Current Source: {source.toUpperCase()}</span>
        <BarChart3 size={13} />
      </footer>
    </main>
  );
}

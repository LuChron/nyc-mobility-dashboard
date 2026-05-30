import type { ReactNode } from 'react';
import { CircleDollarSign, LocateFixed, MapPin, Navigation, Route, RotateCcw } from 'lucide-react';
import type { FilterState, MetricKey, SourceKey } from '../types/dashboard';
import { sourceOptions } from '../data/mockData';
import { Panel } from './Panel';

interface SidebarFiltersProps {
  filters: FilterState;
  zones: Array<{ id: string; zone: string; borough: string }>;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
}

const metrics: Array<{ key: MetricKey; label: string; icon: ReactNode; wide?: boolean }> = [
  { key: 'pickup', label: 'Pickup', icon: <MapPin size={15} /> },
  { key: 'dropoff', label: 'Dropoff', icon: <LocateFixed size={15} /> },
  { key: 'tripCount', label: 'Trip Count', icon: <Route size={15} /> },
  { key: 'avgFare', label: 'Average Fare', icon: <CircleDollarSign size={15} /> },
  { key: 'avgDistance', label: 'Average Distance', icon: <Navigation size={15} />, wide: true },
];

export function SidebarFilters({ filters, zones, onChange, onReset }: SidebarFiltersProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({
      ...filters,
      [key]: value,
      ...(key === 'borough' ? { zone: 'all' } : null),
    });
  };

  return (
    <Panel title="Filters" className="filter-panel">
      <div className="filter-section">
        <h3>1. Data Source</h3>
        <div className="segmented-grid">
          {sourceOptions.map((option) => (
            <button
              type="button"
              className={filters.source === option.key ? 'active' : ''}
              key={option.key}
              onClick={() => update('source', option.key)}
            >
              <span className="dot" style={{ backgroundColor: option.color }} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>2. Time Selection</h3>
        <label>
          <span>Year</span>
          <select value={filters.year} onChange={(event) => update('year', event.target.value as FilterState['year'])}>
            <option value="2025-2026">2025 - 2026</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </label>
        <label>
          <span>Month</span>
          <select value={filters.month} onChange={(event) => update('month', event.target.value as FilterState['month'])}>
            <option value="all">All Months (16)</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="h2">H2</option>
          </select>
        </label>
        <div className="segmented-control">
          <button type="button" className={filters.dayType === 'weekday' ? 'active' : ''} onClick={() => update('dayType', 'weekday')}>Weekday</button>
          <button type="button" className={filters.dayType === 'weekend' ? 'active' : ''} onClick={() => update('dayType', 'weekend')}>Weekend</button>
        </div>
      </div>

      <div className="filter-section">
        <h3>3. Region Selection</h3>
        <label>
          <span>Borough</span>
          <select value={filters.borough} onChange={(event) => update('borough', event.target.value)}>
            <option value="all">All Boroughs</option>
            <option value="Manhattan">Manhattan</option>
            <option value="Queens">Queens</option>
            <option value="Brooklyn">Brooklyn</option>
          </select>
        </label>
        <label>
          <span>Taxi Zone</span>
          <select value={filters.zone} onChange={(event) => update('zone', event.target.value)}>
            <option value="all">All Zones</option>
            {zones.map((zone) => (
              <option value={zone.id} key={zone.id}>{zone.zone}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-section">
        <h3>4. Metric Selection</h3>
        <div className="metric-grid">
          {metrics.map((metric) => (
            <button
              type="button"
              className={`${filters.metric === metric.key ? 'active' : ''} ${metric.wide ? 'wide' : ''}`}
              key={metric.key}
              onClick={() => update('metric', metric.key)}
            >
              {metric.icon}
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <button className="reset-button" type="button" onClick={onReset}>
        <RotateCcw size={15} />
        Reset Filters
      </button>
    </Panel>
  );
}

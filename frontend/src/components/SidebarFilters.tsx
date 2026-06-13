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
  { key: 'pickup', label: 'Pickup volume', icon: <MapPin size={15} /> },
  { key: 'dropoff', label: 'Dropoff volume', icon: <LocateFixed size={15} /> },
  { key: 'tripCount', label: 'Trip volume', icon: <Route size={15} /> },
  { key: 'avgFare', label: 'Avg fare', icon: <CircleDollarSign size={15} /> },
  { key: 'avgDistance', label: 'Avg distance', icon: <Navigation size={15} />, wide: true },
];

const dayOptions: Array<{ key: FilterState['dayType']; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'weekday', label: 'Weekday' },
  { key: 'weekend', label: 'Weekend' },
];

const monthOptions: Array<{ key: FilterState['month']; label: string }> = [
  { key: 'all', label: 'All months' },
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'h2', label: 'H2' },
];

export function SidebarFilters({ filters, zones, onChange, onReset }: SidebarFiltersProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    onChange({
      ...filters,
      [key]: value,
      ...(key === 'borough' ? { zone: 'all' } : null),
      ...(key === 'year' && value === '2026' && filters.month === 'h2' ? { month: 'all' } : null),
    });
  };

  const selectedZone = filters.zone === 'all' ? 'All zones' : zones.find((zone) => zone.id === filters.zone)?.zone ?? filters.zone;
  const selectedSource = sourceOptions.find((option) => option.key === filters.source)?.label ?? filters.source;
  const selectedMetric = metrics.find((metric) => metric.key === filters.metric)?.label ?? filters.metric;

  return (
    <Panel title="Filters" className="filter-panel">
      <div className="filter-context">
        <span>Current view</span>
        <strong>{selectedMetric}</strong>
        <p>{selectedSource} / {filters.year} / {selectedZone}</p>
      </div>

      <div className="filter-section">
        <h3>Data source</h3>
        <div className="segmented-grid">
          {sourceOptions.map((option) => (
            <button
              type="button"
              className={filters.source === option.key ? 'active' : ''}
              key={option.key}
              onClick={() => update('source', option.key)}
              aria-pressed={filters.source === option.key}
            >
              <span className="dot" style={{ backgroundColor: option.color }} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Time window</h3>
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
            {monthOptions.map((option) => (
              <option value={option.key} key={option.key} disabled={filters.year === '2026' && option.key === 'h2'}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented-control">
          {dayOptions.map((option) => (
            <button
              type="button"
              className={filters.dayType === option.key ? 'active' : ''}
              onClick={() => update('dayType', option.key)}
              aria-pressed={filters.dayType === option.key}
              key={option.key}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Region</h3>
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
        <h3>Map metric</h3>
        <div className="metric-grid">
          {metrics.map((metric) => (
            <button
              type="button"
              className={`${filters.metric === metric.key ? 'active' : ''} ${metric.wide ? 'wide' : ''}`}
              key={metric.key}
              onClick={() => update('metric', metric.key)}
              aria-pressed={filters.metric === metric.key}
            >
              {metric.icon}
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <button className="reset-button" type="button" onClick={onReset}>
        <RotateCcw size={15} />
        Reset view
      </button>
    </Panel>
  );
}

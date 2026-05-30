import { CircleDollarSign, LocateFixed, MapPin, Navigation, Route, RotateCcw } from 'lucide-react';
import type { SourceKey } from '../types/dashboard';
import { sourceOptions } from '../data/mockData';
import { Panel } from './Panel';

interface SidebarFiltersProps {
  source: SourceKey;
  onSourceChange: (source: SourceKey) => void;
}

export function SidebarFilters({ source, onSourceChange }: SidebarFiltersProps) {
  return (
    <Panel title="Filters" className="filter-panel">
      <div className="filter-section">
        <h3>1. Data Source</h3>
        <div className="segmented-grid">
          {sourceOptions.map((option) => (
            <button
              type="button"
              className={source === option.key ? 'active' : ''}
              key={option.key}
              onClick={() => onSourceChange(option.key)}
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
          <select defaultValue="2025-2026">
            <option value="2025-2026">2025 - 2026</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </label>
        <label>
          <span>Month</span>
          <select defaultValue="all">
            <option value="all">All Months (16)</option>
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
          </select>
        </label>
        <div className="segmented-control">
          <button type="button" className="active">Weekday</button>
          <button type="button">Weekend</button>
        </div>
      </div>

      <div className="filter-section">
        <h3>3. Region Selection</h3>
        <label>
          <span>Borough</span>
          <select defaultValue="all">
            <option value="all">All Boroughs</option>
            <option value="manhattan">Manhattan</option>
            <option value="queens">Queens</option>
            <option value="brooklyn">Brooklyn</option>
          </select>
        </label>
        <label>
          <span>Taxi Zone</span>
          <select defaultValue="all">
            <option value="all">All Zones</option>
            <option value="230">Midtown Center</option>
            <option value="132">JFK Airport</option>
          </select>
        </label>
      </div>

      <div className="filter-section">
        <h3>4. Metric Selection</h3>
        <div className="metric-grid">
          <button type="button" className="active"><MapPin size={15} />Pickup</button>
          <button type="button"><LocateFixed size={15} />Dropoff</button>
          <button type="button"><Route size={15} />Trip Count</button>
          <button type="button"><CircleDollarSign size={15} />Average Fare</button>
          <button type="button" className="wide"><Navigation size={15} />Average Distance</button>
        </div>
      </div>

      <button className="reset-button" type="button" onClick={() => onSourceChange('all')}>
        <RotateCcw size={15} />
        Reset Filters
      </button>
    </Panel>
  );
}


import { Building2 } from 'lucide-react';
import { headerMetrics } from '../data/mockData';

export function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div className="brand-mark" aria-hidden="true">
        <Building2 size={72} strokeWidth={1.25} />
      </div>
      <div className="title-block">
        <h1>NYC Urban Mobility Dashboard</h1>
        <p>Taxi & For-Hire Vehicle Trip Analytics</p>
      </div>
      <div className="header-metrics">
        {headerMetrics.map((metric) => (
          <article className="header-metric" key={metric.label}>
            <div className="metric-icon">{metric.icon}</div>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <em>{metric.detail}</em>
            </div>
          </article>
        ))}
      </div>
    </header>
  );
}


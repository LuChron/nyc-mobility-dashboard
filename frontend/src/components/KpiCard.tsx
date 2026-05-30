import { ArrowDown, ArrowUp, Car, CircleDollarSign, Gauge, Timer } from 'lucide-react';
import type { KpiMetric } from '../types/dashboard';

const toneIcons = {
  blue: <Car size={28} />,
  green: <CircleDollarSign size={28} />,
  purple: <Gauge size={28} />,
  amber: <Timer size={28} />,
};

interface KpiCardProps {
  metric: KpiMetric;
}

export function KpiCard({ metric }: KpiCardProps) {
  const max = Math.max(...metric.sparkline);
  const min = Math.min(...metric.sparkline);
  const points = metric.sparkline
    .map((value, index) => {
      const x = (index / (metric.sparkline.length - 1)) * 100;
      const y = 42 - ((value - min) / (max - min || 1)) * 34;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <article className={`kpi-card tone-${metric.tone}`}>
      <div className="kpi-top">
        <div className="kpi-icon">{toneIcons[metric.tone]}</div>
        <div>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </div>
      </div>
      <div className={`kpi-change ${metric.direction}`}>
        {metric.direction === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        <b>{metric.change}</b>
        <span>vs Prev 16 Months</span>
      </div>
      <svg className="sparkline" viewBox="0 0 100 45" preserveAspectRatio="none" aria-hidden="true">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.4" />
      </svg>
    </article>
  );
}


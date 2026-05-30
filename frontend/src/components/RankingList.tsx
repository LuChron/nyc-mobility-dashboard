import { ArrowRight } from 'lucide-react';
import type { RankingItem } from '../types/dashboard';
import { Panel } from './Panel';

interface RankingListProps {
  title: string;
  unit: string;
  items: RankingItem[];
  actionLabel: string;
  onSelect?: (zoneId: string) => void;
}

export function RankingList({ title, unit, items, actionLabel, onSelect }: RankingListProps) {
  return (
    <Panel
      title={title}
      action={<span className="rank-unit">{unit}</span>}
      className="ranking-panel"
    >
      <ol className="ranking-list">
        {items.map((item, index) => (
          <li key={item.label}>
            <span className="rank-index">{index + 1}</span>
            <button
              type="button"
              className="rank-label"
              onClick={() => item.zoneId && onSelect?.(item.zoneId)}
              disabled={!item.zoneId || !onSelect}
            >
              {item.label}
            </button>
            <span className="rank-bar">
              <i style={{ width: `${item.score}%`, backgroundColor: item.color }} />
            </span>
            <strong>{item.value}</strong>
          </li>
        ))}
      </ol>
      <button className="link-button" type="button">
        {actionLabel}
        <ArrowRight size={15} />
      </button>
    </Panel>
  );
}

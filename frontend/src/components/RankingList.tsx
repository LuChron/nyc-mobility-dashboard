import { ArrowRight } from 'lucide-react';
import type { RankingItem } from '../types/dashboard';
import { Panel } from './Panel';

interface RankingListProps {
  title: string;
  unit: string;
  items: RankingItem[];
  actionLabel: string;
}

export function RankingList({ title, unit, items, actionLabel }: RankingListProps) {
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
            <span className="rank-label">{item.label}</span>
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


import { ArrowRight } from 'lucide-react';
import type { RankingItem } from '../types/dashboard';
import { Panel } from './Panel';

interface RankingListProps {
  title: string;
  unit: string;
  items: RankingItem[];
  actionLabel?: string;
  onAction?: () => void;
  onSelect?: (zoneId: string) => void;
  emptyLabel?: string;
}

export function RankingList({ title, unit, items, actionLabel, onAction, onSelect, emptyLabel = 'No routes match the current filters.' }: RankingListProps) {
  return (
    <Panel
      title={title}
      action={<span className="rank-unit">{unit}</span>}
      className="ranking-panel"
    >
      <ol className="ranking-list">
        {items.length > 0 ? (
          items.map((item, index) => (
            <li key={item.label}>
              <span className="rank-index">{index + 1}</span>
              <button
                type="button"
                className="rank-label"
                onClick={() => item.zoneId && onSelect?.(item.zoneId)}
                disabled={!item.zoneId || !onSelect}
                aria-label={item.zoneId ? `Filter to ${item.label}` : item.label}
              >
                {item.label}
              </button>
              <span className="rank-bar">
                <i style={{ width: `${item.score}%`, backgroundColor: item.color }} />
              </span>
              <strong>{item.value}</strong>
            </li>
          ))
        ) : (
          <li className="ranking-empty">{emptyLabel}</li>
        )}
      </ol>
      {actionLabel && (
        <button className="link-button" type="button" onClick={onAction}>
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      )}
    </Panel>
  );
}

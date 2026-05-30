import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, subtitle, action, children, className }: PanelProps) {
  return (
    <section className={`panel ${className ?? ''}`}>
      {(title || action) && (
        <header className="panel-header">
          <div className="panel-title-wrap">
            {title && (
              <h2>
                {title}
                <Info size={13} />
              </h2>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}


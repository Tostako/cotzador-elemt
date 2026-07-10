import { safeParseQuoteData } from '../../../shared/utils/parseQuoteData';
import type { Quote } from '../../../shared/types';

interface QuoteListProps {
  quotes: Quote[];
  expandedParents: Set<number | string>;
  onToggleParent: (id: number | string) => void;
  onDelete: (id: number | string, e: React.MouseEvent) => void;
  onSelectQuote: (quote: Quote) => void;
}

const statusColors: Record<string, string> = {
  draft: '#999999',
  completed: '#34c759',
  paid: '#34c759',
  sent: '#ff9500',
};

const statusLabels: Record<string, string> = {
  draft: 'Borrador',
  completed: 'Finalizada',
  paid: 'Pagada',
  sent: 'Enviada',
};

export function QuoteList({ quotes, expandedParents, onToggleParent, onDelete, onSelectQuote }: QuoteListProps) {
  const parentQuotes: Quote[] = [];
  const childQuotes: Quote[] = [];
  quotes.forEach((q) => {
    const d = safeParseQuoteData(q.data);
    if (d?.parentQuoteId) {
      childQuotes.push(q);
    } else {
      parentQuotes.push(q);
    }
  });

  return (
    <>
      {parentQuotes.map((parent) => {
        const status = parent.status === 'paid' || parent.status === 'completed' ? 'completed' : 'draft';
        const children = childQuotes.filter((c) => {
          const d = safeParseQuoteData(c.data);
          return String(d?.parentQuoteId) === String(parent.id);
        });
        const hasChildren = children.length > 0;
        const isExpanded = expandedParents.has(parent.id);

        return (
          <div key={parent.id}>
            <div
              className="history-item"
              style={{ position: 'relative' }}
            >
              {hasChildren && (
                <button
                  type="button"
                  className="btn-small btn-secondary"
                  onClick={(e) => { e.stopPropagation(); onToggleParent(parent.id); }}
                  style={{
                    position: 'absolute',
                    right: 40,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '4px 8px',
                    fontSize: 12,
                  }}
                >
                  {isExpanded ? '▲' : '▼'} {children.length}
                </button>
              )}
              <div className="flex-between mb-1">
                <button
                  type="button"
                  onClick={() => onSelectQuote(parent)}
                  style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
                >
                  <h3 style={{ fontSize: 18, fontWeight: 600 }}>{parent.client}</h3>
                </button>
                <button
                  type="button"
                  className="btn-small btn-danger"
                  onClick={(e) => onDelete(parent.id, e)}
                >
                  ×
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSelectQuote(parent)}
                style={{ border: 'none', background: 'transparent', padding: 0, font: 'inherit', color: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <p className="small">{parent.project}</p>
                <div className="flex-between" style={{ marginTop: 8 }}>
                  <span className="small" style={{ color: statusColors[status], fontWeight: 600 }}>
                    ● {statusLabels[status]}
                  </span>
                  <span className="small">
                    {Number(parent.area).toFixed(0)}m² - ${Number(parent.price).toLocaleString('es-CO')}
                  </span>
                </div>
                <p className="small mt-1">{parent.date}</p>
              </button>
            </div>

            {isExpanded && hasChildren && (
              <div style={{ marginLeft: 20, marginTop: 4, marginBottom: 4 }}>
                {children.map((child) => {
                  const childStatus = child.status === 'paid' || child.status === 'completed' ? 'completed' : 'draft';
                  return (
                  <button
                    type="button"
                    key={child.id}
                    className="history-item"
                    onClick={() => onSelectQuote(child)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '14px', font: 'inherit', color: 'inherit' }}
                  >
                    <div className="flex-between mb-1">
                      <h3 style={{ fontSize: 16, fontWeight: 600 }}>{child.client}</h3>
                      <span className="small" style={{ color: '#b69462', fontWeight: 600 }}>${Number(child.price).toLocaleString('es-CO')}</span>
                    </div>
                    <p className="small">{child.project}</p>
                    <div className="flex-between" style={{ marginTop: 8 }}>
                      <span className="small" style={{ color: statusColors[childStatus], fontWeight: 600 }}>
                        ● {statusLabels[childStatus]}
                      </span>
                      <span className="small">
                        {Number(child.area).toFixed(0)}m² - ${Number(child.price).toLocaleString('es-CO')}
                      </span>
                    </div>
                    <p className="small mt-1">{child.date}</p>
                  </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

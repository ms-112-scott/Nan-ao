import React from 'react';

const LABELS = {
  spatial: '空間', social: '人際', causal: '因果',
  creative: '創作', documentary: '紀錄', 其他: '其他',
};

export default function RelationFilter({ metaRelations, active, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {metaRelations.map((r) => {
        const on = active.has(r.id);
        return (
          <button
            key={r.id}
            className="btn"
            onClick={() => onToggle(r.id)}
            style={{
              padding: '2px 8px', fontSize: 11,
              opacity: on ? 1 : 0.4,
            }}
            title={`${LABELS[r.id] || r.id}（${r.count}）`}
          >
            <span
              style={{
                display: 'inline-block', width: 14, height: 2,
                background: `var(--rel-${r.id})`, marginRight: 4,
              }}
            />
            {LABELS[r.id] || r.id}
            <span className="tiny num" style={{ marginLeft: 2, opacity: 0.7 }}>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

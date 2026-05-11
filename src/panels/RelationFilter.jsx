import React from 'react';

const LABELS = {
  spatial: '空間', social: '人際', causal: '因果',
  creative: '創作', documentary: '紀錄', 其他: '其他',
};

export default function RelationFilter({ metaRelations, active, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {metaRelations.map((r) => {
        const on = active.has(r.id);
        return (
          <button
            key={r.id}
            className={'btn' + (on ? ' active' : '')}
            onClick={() => onToggle(r.id)}
            style={{ padding: '4px 10px', fontSize: 12 }}
          >
            <span
              style={{
                display: 'inline-block', width: 16, height: 2,
                background: `var(--rel-${r.id})`, marginRight: 4,
              }}
            />
            {LABELS[r.id] || r.id}
            <span className="tiny num" style={{ marginLeft: 4, opacity: 0.7 }}>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

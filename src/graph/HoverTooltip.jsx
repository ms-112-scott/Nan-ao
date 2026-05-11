import React from 'react';

export default function HoverTooltip({ node, x, y }) {
  if (!node) return null;
  return (
    <div
      className="paper-card fade-in"
      style={{
        position: 'absolute', zIndex: 50, pointerEvents: 'none',
        transform: `translate(${x + 12}px, ${y + 12}px)`,
        padding: '8px 12px', maxWidth: 280,
      }}
    >
      <div className="serif" style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-primary)' }}>
        {node.id}
      </div>
      <div className="tiny" style={{ marginTop: 2 }}>
        {node.meta_group} · {node.node_Group}
        {node.start_year ? ` · ${node.start_year}` : ''}
      </div>
      {node.info && (
        <div className="caption" style={{
          marginTop: 6, color: 'var(--ink-secondary)',
          maxHeight: 60, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        }}>
          {node.info}
        </div>
      )}
    </div>
  );
}

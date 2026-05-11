// Phase 0 預留 — 主應用入口；後續 phase 會擴充。
import React from 'react';

export default function App() {
  return (
    <div className="paper-bg fixed inset-0 flex items-center justify-center">
      <div className="text-center">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 32, color: 'var(--ink-primary)' }}>
          南澳知識圖譜
        </h1>
        <p style={{ color: 'var(--ink-secondary)', marginTop: 12 }}>
          Phase 0 — 專案骨架已建立
        </p>
      </div>
    </div>
  );
}

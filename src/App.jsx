import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';
import InfoCard from './panels/InfoCard.jsx';
import Search from './panels/Search.jsx';
import Legend from './panels/Legend.jsx';
import RelationFilter from './panels/RelationFilter.jsx';
import GroupSidebar from './panels/GroupSidebar.jsx';

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  // 篩選 state（Phase 6 會接 URL）
  const [activeGroups, setActiveGroups] = useState(null);    // null = 尚未初始化
  const [activeRelations, setActiveRelations] = useState(null);
  const [onlyBreakthrough, setOnlyBreakthrough] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  useEffect(() => {
    if (!data) return;
    if (activeGroups === null) {
      setActiveGroups(new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id)));
    }
    if (activeRelations === null) {
      setActiveRelations(new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id)));
    }
  }, [data, activeGroups, activeRelations]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 過濾後的節點與邊（Phase 6 會抽到 useFilters）
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = activeGroups || new Set(data.meta_groups.map((g) => g.id));
    const ar = activeRelations || new Set(data.meta_relations.map((r) => r.id));
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (onlyBreakthrough && !n.breakthrough_note) return false;
      return true;
    });
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => {
      if (!ar.has(l.meta_relation)) return false;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    return { nodes, links };
  }, [data, activeGroups, activeRelations, onlyBreakthrough]);

  // 將篩選結果灌進 graph
  useEffect(() => {
    if (!filtered || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setSelected(n));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
    }
    graphRef.current.setData(filtered.nodes, filtered.links);
  }, [filtered]);

  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setSelected(selected?.id ?? null);
    if (!selected) {
      g.setHighlight(null, null);
      return;
    }
    const r = computeNeighbors(selected.id, g.links);
    g.setHighlight(r?.nodeIds, r?.linkKeys);
  }, [selected]);

  const alwaysShowIds = useMemo(() => {
    if (!selected || !graphRef.current) return null;
    const r = computeNeighbors(selected.id, graphRef.current.links);
    return r ? r.nodeIds : null;
  }, [selected, filtered]);

  const allNodesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  // helpers
  const toggleGroup = (id) => {
    const ns = new Set(activeGroups);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setActiveGroups(ns);
  };
  const toggleRelation = (id) => {
    const ns = new Set(activeRelations);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    setActiveRelations(ns);
  };
  const reset = () => {
    if (!data) return;
    setActiveGroups(new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id)));
    setActiveRelations(new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id)));
    setOnlyBreakthrough(false);
    setSelected(null);
    setCollapsedGroups(new Set());
  };
  const focusNodeGroup = (mg) => {
    setActiveGroups(new Set([mg]));
  };
  const handleNodeClick = (node) => {
    setSelected(node);
    graphRef.current?.zoomToNode(node.id, 1.4);
  };

  return (
    <div className="paper-bg fixed inset-0">
      {/* 主圖 Canvas 容器 */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* DOM Label 圖層 */}
      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        alwaysShowIds={alwaysShowIds}
      />

      {/* Hover tooltip */}
      <HoverTooltip node={hover.node} x={hover.x} y={hover.y} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center fade-in" style={{ zIndex: 100 }}>
          <div className="caption">載入南澳資料中...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="paper-card body" style={{ padding: 24, color: 'var(--cat-事件)' }}>
            錯誤：{error.message}
          </div>
        </div>
      )}

      {/* TopBar */}
      {data && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
            zIndex: 30,
          }}
        >
          <div className="title-2">南澳知識圖譜</div>
          <div className="caption" style={{ borderRight: '1px solid var(--ink-line)', paddingRight: 16 }}>
            — Klesan 群人文地景數位典藏
          </div>
          <Search
            nodes={data.nodes}
            links={data.links}
            onSelectNode={handleNodeClick}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="tiny">
              節點 {filtered?.nodes.length ?? 0}/{data.stats.nodes} ・
              關係 {filtered?.links.length ?? 0}/{data.stats.links}
            </span>
            <button className="btn" onClick={() => graphRef.current?.zoomToFit()} title="全覽">⛶</button>
            <button className="btn" onClick={reset} title="重置篩選">↺</button>
          </div>
        </div>
      )}

      {/* 左側 GroupSidebar */}
      {data && (
        <GroupSidebar
          nodes={filtered?.nodes ?? data.nodes}
          onPickNodeGroup={focusNodeGroup}
          onPickNode={handleNodeClick}
          collapsed={collapsedGroups}
          setCollapsed={setCollapsedGroups}
        />
      )}

      {/* 右側 Legend */}
      {data && activeGroups && (
        <Legend
          metaGroups={data.meta_groups.filter((g) => g.count > 0)}
          activeGroups={activeGroups}
          onToggleGroup={toggleGroup}
          onlyBreakthrough={onlyBreakthrough}
          onToggleBreakthrough={() => setOnlyBreakthrough((v) => !v)}
          breakthroughCount={data.stats.breakthroughs}
        />
      )}

      {/* BottomBar：關係類型 toggle */}
      {data && activeRelations && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', bottom: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16,
            zIndex: 25,
          }}
        >
          <div className="caption" style={{ color: 'var(--ink-faint)' }}>關係類型</div>
          <RelationFilter
            metaRelations={data.meta_relations.filter((r) => r.count > 0)}
            active={activeRelations}
            onToggle={toggleRelation}
          />
          <div style={{ marginLeft: 'auto' }} className="tiny">
            年份範圍 {data.stats.year_range[0]}–{data.stats.year_range[1]}（時間軸 Phase 6 加）
          </div>
        </div>
      )}

      {/* InfoCard */}
      {selected && (
        <InfoCard
          node={selected}
          onClose={() => setSelected(null)}
          onNodeClick={handleNodeClick}
          allLinks={data?.links ?? []}
          allNodesById={allNodesById}
        />
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { useUrlState, codecs } from './state/useUrlState.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';
import InfoCard from './panels/InfoCard.jsx';
import Search from './panels/Search.jsx';
import Legend from './panels/Legend.jsx';
import RelationFilter from './panels/RelationFilter.jsx';
import GroupSidebar from './panels/GroupSidebar.jsx';
import TimelineSlider from './panels/TimelineSlider.jsx';
import Minimap from './panels/Minimap.jsx';

const URL_PARAMS = {
  node:   { default: '', ...codecs.string },
  mg:     { default: new Set(), ...codecs.setOfStrings },
  mr:     { default: new Set(), ...codecs.setOfStrings },
  bt:     { default: false, ...codecs.bool },
  years:  { default: null, parse: codecs.intRange.parse, serialize: (v) => v ? codecs.intRange.serialize(v) : '' },
};

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [urlState, setUrlState] = useUrlState(URL_PARAMS);

  // 初始化 URL state（資料載入後）
  useEffect(() => {
    if (!data) return;
    setUrlState((s) => {
      const next = { ...s };
      if (s.mg.size === 0) next.mg = new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id));
      if (s.mr.size === 0) next.mr = new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id));
      if (!s.years) next.years = data.stats.year_range.slice();
      return next;
    });
  }, [data, setUrlState]);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 過濾
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = urlState.mg.size ? urlState.mg : new Set(data.meta_groups.map((g) => g.id));
    const ar = urlState.mr.size ? urlState.mr : new Set(data.meta_relations.map((r) => r.id));
    const [yMin, yMax] = urlState.years || data.stats.year_range;
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (urlState.bt && !n.breakthrough_note) return false;
      if (n.start_year != null) {
        const ns = n.start_year;
        const ne = n.end_year ?? ns;
        if (ne < yMin || ns > yMax) return false;
      }
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
  }, [data, urlState]);

  useEffect(() => {
    if (!filtered || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setUrlState((s) => ({ ...s, node: n?.id ?? '' })));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
    }
    graphRef.current.setData(filtered.nodes, filtered.links);
  }, [filtered, setUrlState]);

  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  const allNodesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const selected = urlState.node ? allNodesById.get(urlState.node) : null;

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

  // helpers
  const toggleSetIn = (key, id) => setUrlState((s) => {
    const ns = new Set(s[key]);
    if (ns.has(id)) ns.delete(id); else ns.add(id);
    return { ...s, [key]: ns };
  });
  const reset = () => {
    if (!data) return;
    setUrlState({
      node: '',
      mg: new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id)),
      mr: new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id)),
      bt: false,
      years: data.stats.year_range.slice(),
    });
    setCollapsedGroups(new Set());
  };
  const focusNodeGroup = (mg) => setUrlState((s) => ({ ...s, mg: new Set([mg]) }));
  const handleNodeClick = (node) => {
    setUrlState((s) => ({ ...s, node: node.id }));
    graphRef.current?.zoomToNode(node.id, 1.4);
  };
  const onClose = () => setUrlState((s) => ({ ...s, node: '' }));

  return (
    <div className="paper-bg fixed inset-0">
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        alwaysShowIds={alwaysShowIds}
      />

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

      {data && (
        <GroupSidebar
          nodes={filtered?.nodes ?? data.nodes}
          onPickNodeGroup={focusNodeGroup}
          onPickNode={handleNodeClick}
          collapsed={collapsedGroups}
          setCollapsed={setCollapsedGroups}
        />
      )}

      {data && (
        <Legend
          metaGroups={data.meta_groups.filter((g) => g.count > 0)}
          activeGroups={urlState.mg}
          onToggleGroup={(id) => toggleSetIn('mg', id)}
          onlyBreakthrough={urlState.bt}
          onToggleBreakthrough={() => setUrlState((s) => ({ ...s, bt: !s.bt }))}
          breakthroughCount={data.stats.breakthroughs}
        />
      )}

      {/* Minimap */}
      {data && <Minimap graph={graphRef.current} />}

      {/* BottomBar：時間軸 + 關係類型 */}
      {data && urlState.years && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', bottom: 12, left: 12, right: 12, padding: '12px 20px',
            display: 'flex', alignItems: 'center', gap: 20, zIndex: 25,
          }}
        >
          <TimelineSlider
            min={data.stats.year_range[0]}
            max={data.stats.year_range[1]}
            value={urlState.years}
            nodes={data.nodes}
            onChange={(yrs) => setUrlState((s) => ({ ...s, years: yrs }))}
          />
          <div style={{ height: 36, width: 1, background: 'var(--ink-line)' }} />
          <RelationFilter
            metaRelations={data.meta_relations.filter((r) => r.count > 0)}
            active={urlState.mr}
            onToggle={(id) => toggleSetIn('mr', id)}
          />
        </div>
      )}

      {selected && (
        <InfoCard
          node={selected}
          onClose={onClose}
          onNodeClick={handleNodeClick}
          allLinks={data?.links ?? []}
          allNodesById={allNodesById}
        />
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { useUrlState, codecs } from './state/useUrlState.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';
import { setNodeSizeScale } from './graph/Renderer.js';
import { getNodeLonLat } from './graph/ForceGraph.js';
import InfoCard from './panels/InfoCard.jsx';
import Search from './panels/Search.jsx';
import Legend from './panels/Legend.jsx';
import RelationFilter from './panels/RelationFilter.jsx';
import GroupSidebar from './panels/GroupSidebar.jsx';
import TimelineSlider from './panels/TimelineSlider.jsx';
import Minimap from './panels/Minimap.jsx';
import GraphControl from './panels/GraphControl.jsx';

const URL_PARAMS = {
  node:   { default: '', ...codecs.string },
  mg:     { default: new Set(), ...codecs.setOfStrings },
  mr:     { default: new Set(), ...codecs.setOfStrings },
  bt:     { default: false, ...codecs.bool },
  od:     { default: false, ...codecs.bool },
  years:  { default: null, parse: codecs.intRange.parse, serialize: (v) => v ? codecs.intRange.serialize(v) : '' },
};

const BP_MOBILE = 768;
const DEFAULTS = { fontSize: 12, nodeScale: 1.0, charge: -360 };

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const bottomRef = useRef(null);
  const ctrlRef = useRef(null);

  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [groupHighlight, setGroupHighlight] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= BP_MOBILE);
  const [ctrlOpen, setCtrlOpen] = useState(window.innerWidth >= BP_MOBILE);
  const [bottomBarH, setBottomBarH] = useState(150);
  const [ctrlH, setCtrlH] = useState(40);

  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize);
  const [nodeScale, setNodeScale] = useState(DEFAULTS.nodeScale);
  const [charge, setCharge] = useState(DEFAULTS.charge);
  const [spatialMode, setSpatialMode] = useState(true);

  const [urlState, setUrlState] = useUrlState(URL_PARAMS);
  const isMobile = vp.w < BP_MOBILE;

  // 初始化 URL state
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

  // 視窗縮放
  useEffect(() => {
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (window.innerWidth < BP_MOBILE) {
        setSidebarOpen(false);
        setCtrlOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 量測底部 bar / 控制面板高度
  useEffect(() => {
    if (!bottomRef.current) return;
    const ro = new ResizeObserver((es) => setBottomBarH(es[0].contentRect.height));
    ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!ctrlRef.current) { setCtrlH(40); return; }
    const ro = new ResizeObserver((es) => setCtrlH(es[0].contentRect.height));
    ro.observe(ctrlRef.current);
    return () => ro.disconnect();
  }, [ctrlOpen]);

  // 計算 lat/lon bounds（自動修正 swap）— 必須在用到它的 effect 之前宣告
  const spatialInfo = useMemo(() => {
    if (!data) return { bounds: null, count: 0 };
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    let count = 0;
    for (const n of data.nodes) {
      const ll = getNodeLonLat(n);
      if (!ll) continue;
      if (ll.lon < minLon) minLon = ll.lon;
      if (ll.lon > maxLon) maxLon = ll.lon;
      if (ll.lat < minLat) minLat = ll.lat;
      if (ll.lat > maxLat) maxLat = ll.lat;
      count++;
    }
    if (!count) return { bounds: null, count: 0 };
    const padLon = (maxLon - minLon) * 0.05 || 0.001;
    const padLat = (maxLat - minLat) * 0.05 || 0.001;
    return {
      bounds: {
        minLon: minLon - padLon, maxLon: maxLon + padLon,
        minLat: minLat - padLat, maxLat: maxLat + padLat,
      },
      count,
    };
  }, [data]);

  // 過濾
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = urlState.mg.size ? urlState.mg : new Set(data.meta_groups.map((g) => g.id));
    const ar = urlState.mr.size ? urlState.mr : new Set(data.meta_relations.map((r) => r.id));
    const [yMin, yMax] = urlState.years || data.stats.year_range;
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (urlState.bt && !n.breakthrough_note) return false;
      if (urlState.od && n.start_year == null && n.end_year == null) return false;
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
  }, [data, urlState.mg, urlState.mr, urlState.bt, urlState.od, urlState.years]);

  useEffect(() => {
    if (!filtered || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setUrlState((s) => ({ ...s, node: n?.id ?? '' })));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
      // 在第一次 setData 之前先告訴 graph 目前 spatial 模式，避免初始化雙重重啟
      graphRef.current._spatialMode = spatialMode && spatialInfo.count > 0;
      graphRef.current._spatialBounds = spatialInfo.bounds;
    }
    graphRef.current.setData(filtered.nodes, filtered.links);
  }, [filtered, setUrlState, spatialMode, spatialInfo]);

  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  // ── GraphControl 連動 ────────────────────────────
  useEffect(() => {
    setNodeSizeScale(nodeScale);
    if (graphRef.current) {
      graphRef.current.requestRedraw();
      graphRef.current.reapplyCollide();
    }
  }, [nodeScale]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.setChargeStrength(charge);
  }, [charge]);

  // 同步 spatial 狀態到 ForceGraph
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.setSpatialMode(spatialMode && spatialInfo.count > 0, spatialInfo.bounds);
  }, [spatialMode, spatialInfo]);

  const allNodesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const selected = urlState.node ? allNodesById.get(urlState.node) : null;

  const applyGroupHighlight = (idSet) => {
    const g = graphRef.current;
    if (!g) return;
    const linkKeys = new Set();
    for (const l of g.links) {
      const s = l.source.id || l.source;
      const t = l.target.id || l.target;
      if (idSet.has(s) && idSet.has(t)) linkKeys.add(s + '|' + t + '|' + l.label);
    }
    g.setHighlight(idSet, linkKeys);
  };

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setSelected(selected?.id ?? null);
    if (selected) {
      const r = computeNeighbors(selected.id, g.links);
      g.setHighlight(r?.nodeIds, r?.linkKeys);
      setGroupHighlight(null);
    } else if (groupHighlight) {
      applyGroupHighlight(groupHighlight.ids);
    } else {
      g.setHighlight(null, null);
    }
  }, [selected]);

  const handleHighlightIds = (ids, key) => {
    if (groupHighlight?.key === key) {
      setGroupHighlight(null);
      const g = graphRef.current;
      if (g) g.setHighlight(null, null);
      return;
    }
    setGroupHighlight({ ids, key });
    if (urlState.node) setUrlState((s) => ({ ...s, node: '' }));
    applyGroupHighlight(ids);
  };

  const highlightIds = useMemo(() => {
    if (selected && graphRef.current) {
      const r = computeNeighbors(selected.id, graphRef.current.links);
      return r?.nodeIds ?? new Set([selected.id]);
    }
    if (groupHighlight) return groupHighlight.ids;
    return null;
  }, [selected, groupHighlight, filtered]);

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
      od: false,
      years: data.stats.year_range.slice(),
    });
    setCollapsedGroups(new Set());
    setGroupHighlight(null);
    if (graphRef.current) graphRef.current.setHighlight(null, null);
  };
  const resetGraphControl = () => {
    setFontSize(DEFAULTS.fontSize);
    setNodeScale(DEFAULTS.nodeScale);
    setCharge(DEFAULTS.charge);
  };
  const focusNodeGroup = (mg) => setUrlState((s) => ({ ...s, mg: new Set([mg]) }));
  const handleNodeClick = (node) => {
    setUrlState((s) => ({ ...s, node: node.id }));
    graphRef.current?.zoomToNode(node.id, 1.4);
  };
  const onClose = () => setUrlState((s) => ({ ...s, node: '' }));

  // ── Layout ──────────────────────────────────────
  // 底部時間軸永遠左右撐滿
  // 側邊面板停在 bottom bar 上方
  const sidePanelBottom = bottomBarH + 24; // gap above bottom bar
  const minimapBottom = bottomBarH + 16;
  const ctrlTop = 80;
  const infoCardTop = ctrlTop + (ctrlOpen ? ctrlH : 40) + 8;
  const infoCardWidth = isMobile ? 'calc(100vw - 24px)' : 360;

  return (
    <div className="paper-bg fixed inset-0">
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        highlightIds={highlightIds}
        fontSize={fontSize}
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

      {/* Top bar */}
      {data && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            zIndex: 30,
          }}
        >
          <div className="title-2" style={{ whiteSpace: 'nowrap' }}>南澳知識圖譜</div>
          {!isMobile && (
            <div className="caption" style={{ borderRight: '1px solid var(--ink-line)', paddingRight: 12, whiteSpace: 'nowrap' }}>
              — Klesan 群人文地景數位典藏
            </div>
          )}
          <Search nodes={data.nodes} links={data.links} onSelectNode={handleNodeClick} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isMobile && (
              <span className="tiny" style={{ whiteSpace: 'nowrap' }}>
                節點 {filtered?.nodes.length ?? 0}/{data.stats.nodes} ・
                關係 {filtered?.links.length ?? 0}/{data.stats.links}
              </span>
            )}
            <button className="btn" onClick={() => graphRef.current?.zoomToFit()} title="全覽">⛶</button>
            <button className="btn" onClick={reset} title="重置篩選">↺</button>
          </div>
        </div>
      )}

      {/* Left sidebar */}
      {data && (
        <GroupSidebar
          nodes={filtered?.nodes ?? data.nodes}
          onPickNodeGroup={focusNodeGroup}
          onPickNode={handleNodeClick}
          onHighlightIds={handleHighlightIds}
          activeHighlightKey={groupHighlight?.key ?? null}
          collapsed={collapsedGroups}
          setCollapsed={setCollapsedGroups}
          open={sidebarOpen}
          setOpen={setSidebarOpen}
          bottomOffset={sidePanelBottom}
        />
      )}

      {/* Right: GraphControl */}
      {data && (
        <div
          ref={ctrlRef}
          style={{
            position: 'absolute', top: ctrlTop, right: 12, zIndex: 25,
            width: ctrlOpen ? (isMobile ? 'calc(100vw - 24px)' : 240) : 'auto',
          }}
        >
          <GraphControl
            open={ctrlOpen}
            onToggleOpen={() => setCtrlOpen((v) => !v)}
            fontSize={fontSize} onFontSize={setFontSize}
            nodeScale={nodeScale} onNodeScale={setNodeScale}
            charge={charge} onCharge={setCharge}
            spatialMode={spatialMode} onSpatialMode={setSpatialMode}
            geoCount={spatialInfo.count}
            onReset={resetGraphControl}
          />
        </div>
      )}

      {/* Minimap */}
      {data && !isMobile && <Minimap graph={graphRef.current} bottomOffset={minimapBottom} />}

      {/* InfoCard */}
      {selected && (
        <InfoCard
          node={selected}
          onClose={onClose}
          onNodeClick={handleNodeClick}
          allLinks={data?.links ?? []}
          allNodesById={allNodesById}
          width={infoCardWidth}
          top={infoCardTop}
          maxHeight={`calc(100vh - ${infoCardTop}px - ${sidePanelBottom}px)`}
        />
      )}

      {/* BottomBar：永遠 left:12 / right:12 */}
      {data && urlState.years && (
        <div
          ref={bottomRef}
          className="paper-card"
          style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            padding: '10px 16px 6px',
            display: 'flex', flexDirection: 'column', gap: 8,
            zIndex: 25,
          }}
        >
          {/* Row 1: Timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <TimelineSlider
              min={data.stats.year_range[0]}
              max={data.stats.year_range[1]}
              value={urlState.years}
              nodes={data.nodes}
              onChange={(yrs) => setUrlState((s) => ({ ...s, years: yrs }))}
              onlyDated={urlState.od}
              onToggleOnlyDated={() => setUrlState((s) => ({ ...s, od: !s.od }))}
            />
          </div>

          <hr className="divider" style={{ margin: '2px 0' }} />

          {/* Row 2: Legend (groups) | Relations */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className="tiny" style={{ color: 'var(--ink-faint)' }}>分類</span>
            <Legend
              metaGroups={data.meta_groups.filter((g) => g.count > 0)}
              activeGroups={urlState.mg}
              onToggleGroup={(id) => toggleSetIn('mg', id)}
              onlyBreakthrough={urlState.bt}
              onToggleBreakthrough={() => setUrlState((s) => ({ ...s, bt: !s.bt }))}
              breakthroughCount={data.stats.breakthroughs}
            />
            {!isMobile && <div style={{ height: 22, width: 1, background: 'var(--ink-line)' }} />}
            <span className="tiny" style={{ color: 'var(--ink-faint)' }}>關係</span>
            <RelationFilter
              metaRelations={data.meta_relations.filter((r) => r.count > 0)}
              active={urlState.mr}
              onToggle={(id) => toggleSetIn('mr', id)}
            />
          </div>

          {/* Row 3: 版權（置中）*/}
          <div
            className="tiny"
            style={{
              borderTop: '1px solid var(--ink-line)',
              paddingTop: 4, marginTop: 2,
              textAlign: 'center',
              color: 'var(--ink-faint)', fontSize: 10,
              lineHeight: 1.5,
            }}
          >
            © 國立陽明交通大學跨領域設計科學研究中心 (TDIS) ・ 曾聖凱 助理教授・
            <a href="mailto:sky@arch.nycu.edu.tw" style={{ color: 'inherit', textDecoration: 'none' }}>
              sky@arch.nycu.edu.tw
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * 主圖譜類 — Canvas + d3-force + 群聚佈局。
 * 不直接吃 React state；對外提供 setData / setHighlight / setSelected / on('click'/'hover').
 */
import * as d3 from 'd3';
import { computeGroupCenters, getGroupCenter } from './ClusterLayout.js';
import { drawNode, drawEdge, assignCurveOffsets, nodeRadius } from './Renderer.js';
import { buildQuadtree, findNodeAt } from './Quadtree.js';
import { resolveColor } from './EdgeStyles.js';

/**
 * 取得節點的標準 lon/lat（修正部分資料 lon/lat 對調）。
 * 台灣 lon ~ 119–123，lat ~ 21–26。若 lon 落在 lat 範圍而 lat 落在 lon 範圍 → swap。
 */
function getNodeLonLat(n) {
  if (n == null || n.lon == null || n.lat == null) return null;
  let lon = n.lon, lat = n.lat;
  if (lon < 30 && lat > 100) { const t = lon; lon = lat; lat = t; }
  if (!isFinite(lon) || !isFinite(lat)) return null;
  return { lon, lat };
}

/** 將 lon/lat 線性投影到畫面座標（小區域近似，無 mercator 變形）。*/
function projectLatLon(lon, lat, bounds, width, height, margin = 80) {
  const { minLon, maxLon, minLat, maxLat } = bounds;
  const x = margin + ((lon - minLon) / (maxLon - minLon || 1)) * (width - margin * 2);
  const y = margin + ((maxLat - lat) / (maxLat - minLat || 1)) * (height - margin * 2);
  return { x, y };
}

export { getNodeLonLat };

export class ForceGraph {
  constructor(container) {
    this.container = container;
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 600;
    this.dpr = window.devicePixelRatio || 1;

    // 視窗 transform
    this.transform = d3.zoomIdentity;

    // 狀態
    this.nodes = [];
    this.links = [];
    this.simulation = null;
    this.quadtree = null;
    this.selectedId = null;
    this.hoverId = null;
    this.highlightedIds = null;   // Set | null
    this.highlightedLinks = null; // Set "src|tgt|label"
    this._spatialMode = false;
    this._spatialBounds = null;

    // 事件
    this._listeners = { click: [], hover: [], transform: [], tick: [] };

    this._resize();
    this._bindZoom();
    this._bindMouse();
    window.addEventListener('resize', this._resize);

    this._raf = null;
    this._needsDraw = true;
    this._tick = this._tick.bind(this);
    requestAnimationFrame(this._tick);
  }

  on(evt, fn) {
    if (this._listeners[evt]) this._listeners[evt].push(fn);
  }
  _emit(evt, ...args) {
    (this._listeners[evt] || []).forEach((f) => f(...args));
  }

  _resize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.width = w;
    this.height = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.simulation) this._restartLayout();
    this._needsDraw = true;
  };

  _bindZoom() {
    this.zoom = d3.zoom()
      .scaleExtent([0.15, 6])
      .on('zoom', (event) => {
        this.transform = event.transform;
        this._needsDraw = true;
        this._emit('transform', event.transform);
      });
    d3.select(this.canvas).call(this.zoom);
  }

  _bindMouse() {
    this.canvas.addEventListener('click', (e) => {
      const n = this._pick(e);
      this._emit('click', n);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const n = this._pick(e);
      const id = n ? n.id : null;
      if (id !== this.hoverId) {
        this.hoverId = id;
        this._needsDraw = true;
        this._emit('hover', n, e);
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      if (this.hoverId !== null) {
        this.hoverId = null;
        this._needsDraw = true;
        this._emit('hover', null, null);
      }
    });
  }

  _pick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const wx = (px - this.transform.x) / this.transform.k;
    const wy = (py - this.transform.y) / this.transform.k;
    return findNodeAt(this.quadtree, wx, wy);
  }

  setData(nodes, links) {
    // 若節點 / 邊組合與目前完全相同，避免重啟模擬（會造成節點微跳）
    const nextNodeIds = nodes.map((n) => n.id).sort().join('|');
    const nextLinkKeys = links
      .map((l) => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return s + '>' + t + '#' + (l.label ?? '');
      })
      .sort()
      .join('|');
    if (nextNodeIds === this._lastNodeIds && nextLinkKeys === this._lastLinkKeys) {
      return; // 無實質變化
    }
    this._lastNodeIds = nextNodeIds;
    this._lastLinkKeys = nextLinkKeys;

    // 保留既有節點位置（只對既有 id 沿用 x/y/vx/vy）
    const prev = new Map((this.nodes || []).map((n) => [n.id, n]));
    this.nodes = nodes.map((n) => {
      const old = prev.get(n.id);
      return old
        ? { ...n, x: old.x, y: old.y, vx: old.vx, vy: old.vy }
        : { ...n };
    });
    const idMap = new Map(this.nodes.map((n) => [n.id, n]));
    // d3-force 會把 source/target 替換成 node ref
    this.links = links
      .map((l) => ({
        ...l,
        source: idMap.get(typeof l.source === 'object' ? l.source.id : l.source),
        target: idMap.get(typeof l.target === 'object' ? l.target.id : l.target),
      }))
      .filter((l) => l.source && l.target);
    assignCurveOffsets(this.links);

    // 計算 degree (連結數)，給 Renderer 決定節點大小
    const degree = new Map();
    for (const l of this.links) {
      const s = l.source.id; const t = l.target.id;
      degree.set(s, (degree.get(s) || 0) + 1);
      degree.set(t, (degree.get(t) || 0) + 1);
    }
    for (const n of this.nodes) n._degree = degree.get(n.id) || 0;

    this._restartLayout();
  }

  _restartLayout() {
    const centers = computeGroupCenters(this.width, this.height);
    const bounds = this._spatialBounds;
    const useSpatial = !!(this._spatialMode && bounds);

    // 計算每個節點的「目標 x/y」(geo 投影或群中心)
    const targetX = (d) => {
      const ll = useSpatial ? getNodeLonLat(d) : null;
      if (ll) return projectLatLon(ll.lon, ll.lat, bounds, this.width, this.height).x;
      return getGroupCenter(centers, d.meta_group).x;
    };
    const targetY = (d) => {
      const ll = useSpatial ? getNodeLonLat(d) : null;
      if (ll) return projectLatLon(ll.lon, ll.lat, bounds, this.width, this.height).y;
      return getGroupCenter(centers, d.meta_group).y;
    };
    const targetStrength = (d) => {
      const ll = useSpatial ? getNodeLonLat(d) : null;
      if (ll) return 1.0;          // geo 節點：強錨定到投影位置
      if (useSpatial) return 0.04; // spatial 開啟、無 geo：弱化群聚拉力
      return 0.14;
    };

    // 重置 geo 節點到投影位置；非 geo 節點若無位置則給初始
    for (const n of this.nodes) {
      const ll = useSpatial ? getNodeLonLat(n) : null;
      if (ll) {
        const p = projectLatLon(ll.lon, ll.lat, bounds, this.width, this.height);
        n.x = p.x; n.y = p.y;
        n.vx = 0; n.vy = 0;
      } else if (n.x === undefined) {
        const c = getGroupCenter(centers, n.meta_group);
        n.x = c.x + (Math.random() - 0.5) * 100;
        n.y = c.y + (Math.random() - 0.5) * 100;
      }
    }

    if (this.simulation) this.simulation.stop();
    this.simulation = d3.forceSimulation(this.nodes)
      .force('x', d3.forceX(targetX).strength(targetStrength))
      .force('y', d3.forceY(targetY).strength(targetStrength))
      .force('charge', d3.forceManyBody().strength(-360).distanceMax(700))
      .force(
        'link',
        d3.forceLink(this.links).id((d) => d.id)
          .distance((d) => (d.meta_relation === 'spatial' ? 95 : 170))
          .strength(useSpatial ? 0.18 : 0.35),
      )
      .force('collide', d3.forceCollide().radius((d) => nodeRadius(d) + 14).strength(0.9))
      .alpha(0.9)
      .alphaDecay(0.03)
      .on('tick', () => {
        this.quadtree = buildQuadtree(this.nodes);
        this._needsDraw = true;
        this._emit('tick');
      })
      .on('end', () => {
        this.quadtree = buildQuadtree(this.nodes);
        this._needsDraw = true;
      });
  }

  setSelected(id) {
    this.selectedId = id;
    this._needsDraw = true;
  }

  setHighlight(nodeIds, linkKeys) {
    this.highlightedIds = nodeIds;     // Set | null
    this.highlightedLinks = linkKeys;  // Set | null
    this._needsDraw = true;
  }

  // 觸發一次重畫（不改變模擬狀態）
  requestRedraw() { this._needsDraw = true; }

  // 切換空間定位模式（geo 節點以 lat/lon 投影位置錨定）
  setSpatialMode(on, bounds) {
    this._spatialMode = !!on;
    this._spatialBounds = bounds || null;
    if (this.nodes.length) this._restartLayout();
  }

  // 動態調整節點斥力（charge.strength），輕量重啟讓變化生效
  setChargeStrength(s) {
    if (!this.simulation) return;
    const f = this.simulation.force('charge');
    if (!f) return;
    f.strength(s);
    this.simulation.alpha(0.3).restart();
  }

  // 重新套用 collide 半徑（節點大小變動後呼叫，避免重疊）
  reapplyCollide() {
    if (!this.simulation) return;
    const f = this.simulation.force('collide');
    if (!f) return;
    f.initialize?.(this.simulation.nodes());
    this.simulation.alpha(0.15).restart();
  }

  zoomToNode(id, scale = 1.5) {
    const n = this.nodes.find((x) => x.id === id);
    if (!n) return;
    const t = d3.zoomIdentity
      .translate(this.width / 2 - n.x * scale, this.height / 2 - n.y * scale)
      .scale(scale);
    d3.select(this.canvas).transition().duration(700).call(this.zoom.transform, t);
  }

  zoomToFit() {
    if (!this.nodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of this.nodes) {
      if (n.x < minX) minX = n.x; if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y;
    }
    const w = maxX - minX, h = maxY - minY;
    const scale = Math.min(this.width / (w + 80), this.height / (h + 80), 1.5);
    const tx = this.width / 2 - ((minX + maxX) / 2) * scale;
    const ty = this.height / 2 - ((minY + maxY) / 2) * scale;
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);
    d3.select(this.canvas).transition().duration(700).call(this.zoom.transform, t);
  }

  _tick() {
    if (this._needsDraw) {
      this._draw();
      this._needsDraw = false;
    }
    this._raf = requestAnimationFrame(this._tick);
  }

  _draw() {
    const { ctx, width, height, transform } = this;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // 邊（zoom < 0.4 暫不畫，效能優化）
    if (transform.k >= 0.4) {
      for (const l of this.links) {
        const key = (l.source.id || l.source) + '|' + (l.target.id || l.target) + '|' + l.label;
        const dimmed = !!this.highlightedIds && !this.highlightedLinks?.has(key);
        const highlighted = this.highlightedLinks?.has(key);
        drawEdge(ctx, l, { dimmed, highlighted });
      }
    }

    // 節點
    for (const n of this.nodes) {
      const dimmed = !!this.highlightedIds && !this.highlightedIds.has(n.id);
      drawNode(ctx, n, {
        selected: n.id === this.selectedId,
        hover: n.id === this.hoverId,
        dimmed,
      });
    }

    ctx.restore();
  }

  destroy() {
    if (this.simulation) this.simulation.stop();
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resize);
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}

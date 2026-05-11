/*
 * 依 meta_relation 取得邊的視覺樣式。
 * 顏色取自 CSS 變數，這樣可隨 token 變更。
 */

const STYLES = {
  spatial:     { color: '--rel-spatial',     width: 1.4, dash: null,        arrow: false },
  social:      { color: '--rel-social',      width: 1.0, dash: null,        arrow: false },
  causal:      { color: '--rel-causal',      width: 1.2, dash: [6, 4],      arrow: true  },
  creative:    { color: '--rel-creative',    width: 1.0, dash: [2, 3],      arrow: false },
  documentary: { color: '--rel-documentary', width: 0.8, dash: [1, 3],      arrow: false },
  '其他':      { color: '--rel-其他',        width: 0.7, dash: [1, 4],      arrow: false },
};

export function getEdgeStyle(metaRelation) {
  return STYLES[metaRelation] || STYLES['其他'];
}

// 取 CSS 變數的實際 hex 值，cache 一份
let _cssCache = null;
export function resolveColor(varName, alpha = 1) {
  if (!_cssCache) _cssCache = new Map();
  let hex = _cssCache.get(varName);
  if (!hex) {
    hex = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    _cssCache.set(varName, hex);
  }
  if (alpha === 1) return hex;
  // hex -> rgba
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function clearColorCache() {
  _cssCache = null;
}

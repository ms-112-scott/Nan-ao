/*
 * Canvas 繪製器：節點（依 meta_group 用不同形狀）、邊（依 meta_relation 樣式）。
 * 全部用 device-pixel 繪製；座標已是 simulation 給的世界座標，由呼叫端套 transform。
 */
import { getEdgeStyle, resolveColor } from './EdgeStyles.js';

// ─── 節點半徑 ──────────────────────────────────
// 依 degree（連結數）給予大小差異；無 degree 時退回 importance 或預設
let _nodeSizeScale = 1;
export function setNodeSizeScale(s) { _nodeSizeScale = Math.max(0.3, Math.min(3, s || 1)); }
export function getNodeSizeScale() { return _nodeSizeScale; }

export function nodeRadius(node) {
  let base;
  if (node._degree != null) {
    base = 6 + Math.sqrt(node._degree) * 2.4;
  } else {
    const imp = node.importance ?? 3;
    base = 7 + imp * 1.6;
  }
  return base * _nodeSizeScale;
}

// ─── 節點形狀（依 meta_group）─────────────────
export function drawNode(ctx, node, opts = {}) {
  const r = nodeRadius(node);
  const x = node.x, y = node.y;
  const color = resolveColor(`--cat-${node.meta_group}`);
  const isSelected = opts.selected;
  const isHover = opts.hover;
  const isDimmed = opts.dimmed;
  const hasBreakthrough = !!node.breakthrough_note;

  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.18;

  // 突破點光暈
  if (hasBreakthrough) {
    const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.2);
    grad.addColorStop(0, resolveColor('--breakthrough', 0.5));
    grad.addColorStop(1, resolveColor('--breakthrough', 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 主形狀
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected
    ? resolveColor('--breakthrough')
    : resolveColor('--ink-primary', 0.75);
  ctx.lineWidth = isSelected ? 2.5 : (isHover ? 1.8 : 1.0);

  drawShape(ctx, node.meta_group, x, y, r);
  ctx.fill();
  ctx.stroke();

  // 突破點 ★
  if (hasBreakthrough) {
    drawStar(ctx, x + r * 0.7, y - r * 0.7, 4, resolveColor('--breakthrough'));
  }

  ctx.restore();
}

function drawShape(ctx, metaGroup, x, y, r) {
  ctx.beginPath();
  switch (metaGroup) {
    case '人物':
      // 實心圓
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case '組織':
      // 圓 + 方框 (這裡用圓角矩形)
      roundRect(ctx, x - r, y - r, r * 2, r * 2, 3);
      break;
    case '地景與聚落':
      // 圓角矩形（橫向）
      roundRect(ctx, x - r * 1.1, y - r * 0.8, r * 2.2, r * 1.6, 3);
      break;
    case '事件':
      // 六邊形
      hexagon(ctx, x, y, r);
      break;
    case '物質文化':
      // 菱形
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    case '文獻':
      // 書頁形（直立矩形 + 折角）
      ctx.moveTo(x - r * 0.7, y - r);
      ctx.lineTo(x + r * 0.5, y - r);
      ctx.lineTo(x + r * 0.7, y - r * 0.7);
      ctx.lineTo(x + r * 0.7, y + r);
      ctx.lineTo(x - r * 0.7, y + r);
      ctx.closePath();
      break;
    case '計畫與行動':
      // 圓 + 虛線外圈（這裡用實心圓即可，外圈在 stroke 時處理）
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexagon(ctx, cx, cy, r) {
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + rr * Math.cos(a);
    const y = cy + rr * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── 邊 ───────────────────────────────────────
export function drawEdge(ctx, link, opts = {}) {
  const s = link.source, t = link.target;
  if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') return;

  const style = getEdgeStyle(link.meta_relation);
  const isHighlighted = opts.highlighted;
  const isDimmed = opts.dimmed;

  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.08;
  else if (isHighlighted) ctx.globalAlpha = 0.95;
  else ctx.globalAlpha = 0.5;

  ctx.strokeStyle = resolveColor(style.color);
  ctx.lineWidth = isHighlighted ? style.width * 1.8 : style.width;

  if (style.dash) ctx.setLineDash(style.dash);
  else ctx.setLineDash([]);

  ctx.beginPath();
  // 輕微貝茲曲線：避免大量直線交織
  const mx = (s.x + t.x) / 2;
  const my = (s.y + t.y) / 2;
  const dx = t.x - s.x, dy = t.y - s.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // 法線方向偏移 (跟 link 雜湊有關，避免每次重新計算抖動)
  const offset = (link._curveOffset ?? 0) * Math.min(len * 0.15, 30);
  const nx = -dy / (len || 1);
  const ny = dx / (len || 1);
  const cx = mx + nx * offset;
  const cy = my + ny * offset;

  ctx.moveTo(s.x, s.y);
  ctx.quadraticCurveTo(cx, cy, t.x, t.y);
  ctx.stroke();

  // 箭頭
  if (style.arrow) {
    const tr = nodeRadius(t);
    drawArrowHead(ctx, cx, cy, t.x, t.y, tr);
  }
  ctx.restore();
}

function drawArrowHead(ctx, cx, cy, tx, ty, targetRadius) {
  const dx = tx - cx, dy = ty - cy;
  const a = Math.atan2(dy, dx);
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < targetRadius) return;
  // 退到節點邊緣
  const ex = tx - Math.cos(a) * targetRadius;
  const ey = ty - Math.sin(a) * targetRadius;
  const sz = 6;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - sz * Math.cos(a - 0.4), ey - sz * Math.sin(a - 0.4));
  ctx.lineTo(ex - sz * Math.cos(a + 0.4), ey - sz * Math.sin(a + 0.4));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

// 給每條 link 隨機曲度（同次刷新固定）
export function assignCurveOffsets(links) {
  for (const l of links) {
    if (l._curveOffset === undefined) {
      // 用 source/target id 雜湊，穩定不抖動
      const a = (l.source.id || l.source) + '|' + (l.target.id || l.target);
      let h = 0;
      for (let i = 0; i < a.length; i++) h = ((h << 5) - h + a.charCodeAt(i)) | 0;
      l._curveOffset = ((h % 200) / 100) - 1; // -1..1
    }
  }
}

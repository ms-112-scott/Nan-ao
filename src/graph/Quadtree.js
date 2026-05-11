/*
 * 命中測試包裝。每次 simulation tick 後重建一次 quadtree。
 */
import * as d3 from 'd3';
import { nodeRadius } from './Renderer.js';

export function buildQuadtree(nodes) {
  return d3.quadtree(nodes, (d) => d.x, (d) => d.y);
}

export function findNodeAt(quadtree, wx, wy) {
  if (!quadtree) return null;
  // 查詢附近最大可能半徑（importance 5 → 19.5px + 2px 容差）
  const maxR = 22;
  let best = null;
  let bestDist = Infinity;
  quadtree.visit((node, x0, y0, x1, y1) => {
    if (!node.length) {
      do {
        const d = node.data;
        const r = nodeRadius(d);
        const dx = wx - d.x, dy = wy - d.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= r + 2 && dist < bestDist) {
          best = d;
          bestDist = dist;
        }
      } while ((node = node.next));
    }
    return x0 > wx + maxR || x1 < wx - maxR || y0 > wy + maxR || y1 < wy - maxR;
  });
  return best;
}

/**
 * 算與選中節點相關的鄰居 + 鄰邊（用於 setHighlight）。
 */
export function computeNeighbors(nodeId, links) {
  if (!nodeId) return null;
  const nodeIds = new Set([nodeId]);
  const linkKeys = new Set();
  for (const l of links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === nodeId || t === nodeId) {
      nodeIds.add(s);
      nodeIds.add(t);
      linkKeys.add(s + '|' + t + '|' + l.label);
    }
  }
  return { nodeIds, linkKeys };
}

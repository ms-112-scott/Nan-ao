/*
 * 群聚佈局 — 7 個 meta_group 各自一個引力中心，呈花瓣狀環繞畫面中心。
 * 不在前端跑 d3-hierarchy；資料無 parent_id，改用 meta_group 視覺分群。
 */

const ORDER = ['人物', '組織', '地景與聚落', '事件', '物質文化', '文獻', '計畫與行動', '其他'];

/**
 * 依容器尺寸計算每個 meta_group 的中心位置。
 * 排成順時針 7 邊形；「其他」放中心。
 */
export function computeGroupCenters(width, height) {
  const cx = width / 2;
  const cy = height / 2;
  // 半徑取較短邊的 30%
  const R = Math.min(width, height) * 0.3;
  const centers = {};
  const ringGroups = ORDER.filter((g) => g !== '其他');
  const N = ringGroups.length; // 7
  for (let i = 0; i < N; i++) {
    // -π/2 起 (12 點鐘方向)，順時針
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    centers[ringGroups[i]] = {
      x: cx + R * Math.cos(angle),
      y: cy + R * Math.sin(angle),
    };
  }
  centers['其他'] = { x: cx, y: cy };
  return centers;
}

export function getGroupCenter(centers, metaGroup) {
  return centers[metaGroup] || centers['其他'];
}

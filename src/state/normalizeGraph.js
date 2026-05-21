/*
 * 遠端 graph.json 正規化轉接層。
 *
 * 遠端資料來源（Apps Script 推送）格式較舊：
 *   - 頂層只有 { nodes, links, legend }
 *   - node: { id, group, col, info, start_year, end_year, lon, lat, ... }
 *   - link: { source, target, group, label, info, color }
 *   - 含 group="自動增加" 的圖例定義節點（id 為關係名或色碼），非真實節點
 *
 * App 與各面板期望的內部 schema：
 *   - 頂層 { nodes, links, meta_groups, meta_relations, stats }
 *   - node: { id, node_Group, meta_group, breakthrough_note, start_year, end_year, lon, lat, ... }
 *   - link: { source, target, label, meta_relation, info, year }
 *
 * 此模組把遠端格式轉成內部 schema；若資料已是新格式則原樣回傳。
 * meta_group / meta_relation 顏色與形狀沿用 tokens.css 中的標準分類。
 */

// 標準 meta_group（對應 tokens.css 的 --cat-* 與 Renderer 的形狀）
const META_GROUPS = ['人物', '組織', '地景與聚落', '事件', '物質文化', '文獻', '計畫與行動', '其他'];
const META_GROUP_COLORS = {
  人物: '#4a6b5b', 組織: '#6b5b7b', 地景與聚落: '#8b5a2b', 事件: '#a8412b',
  物質文化: '#9b7b3f', 文獻: '#7b6b5b', 計畫與行動: '#5e7b8c', 其他: '#9c9180',
};

// 遠端 node.group → 標準 meta_group
const NODE_GROUP_TO_META = {
  人物: '人物', 核心人物: '人物', 歷史人物: '人物', 族群: '人物', 民族: '人物', 群體: '人物',
  政府機關: '組織', 政府機構: '組織', 非營利組織: '組織', '非營利組織（NPO）': '組織',
  私人企業: '組織', 企業: '組織', 大學: '組織', 學校: '組織', 教會: '組織',
  合作社: '組織', 工作室: '組織', 團隊: '組織', 機構: '組織', 組織: '組織', 公司: '組織',
  部落: '地景與聚落', 地理位置: '地景與聚落', 聚落: '地景與聚落', 古道: '地景與聚落',
  山系: '地景與聚落', 河流: '地景與聚落', 地名: '地景與聚落', 地點: '地景與聚落',
  地區: '地景與聚落', 地景: '地景與聚落', 建築: '地景與聚落', 區域: '地景與聚落', 空間: '地景與聚落',
  大事件: '事件', 事件: '事件', 歷史事件: '事件', 政策: '事件', 戰役: '事件', 活動: '事件',
  災害: '事件', 健康問題: '事件', 健康議題: '事件', 疾病: '事件', 問題: '事件',
  物件: '物質文化', 食物: '物質文化', 工藝: '物質文化', 工具: '物質文化', 農作物: '物質文化',
  產業: '物質文化', 儀式: '物質文化', 口傳: '物質文化', 語言: '物質文化', 觀念: '物質文化',
  知識: '物質文化', 技術: '物質文化', 信仰: '物質文化',
  文獻: '文獻', 論文: '文獻', 報告: '文獻', 書籍: '文獻', 紀錄片: '文獻', 影片: '文獻',
  媒體: '文獻', 資料: '文獻', 歌曲: '文獻', 出版品: '文獻',
  計畫: '計畫與行動', 課程: '計畫與行動', 教案: '計畫與行動', 尋根活動: '計畫與行動',
  工作坊: '計畫與行動', USR: '計畫與行動', 方案: '計畫與行動', 行動: '計畫與行動',
  活動方案: '計畫與行動', '行動/活動': '計畫與行動',
};

const META_RELATIONS = ['spatial', 'social', 'causal', 'creative', 'documentary', '其他'];
const META_RELATION_COLORS = {
  spatial: '#8b5a2b', social: '#4a6b5b', causal: '#a8412b',
  creative: '#6b5b7b', documentary: '#7b6b5b', 其他: '#9c9180',
};

// 遠端 link.group（關係分類）→ 標準 meta_relation
const LINK_GROUP_TO_META = {
  空間關係: 'spatial', 人地關係: 'spatial', 事地關係: 'spatial',
  人際關係: 'social', 社會關聯: 'social', 組織關聯: 'social', 產業關聯: 'social',
  參與: 'social', '活動/行動參與': 'social', '活動/行動 參與': 'social',
  政策推動: 'causal', 健康議題關係: 'causal',
  物件關聯: 'creative', 推出商品: 'creative',
};

function mapNodeGroup(group) {
  if (!group) return '其他';
  return NODE_GROUP_TO_META[String(group).trim()] || '其他';
}

function mapLinkGroup(group) {
  if (!group) return '其他';
  return LINK_GROUP_TO_META[String(group).trim()] || '其他';
}

// 遠端圖例定義節點：group 為「自動增加」者（id 為關係名或色碼），非真實節點
function isJunkNode(n) {
  return n.group === '自動增加';
}

function computeYearRange(nodes) {
  let min = Infinity, max = -Infinity;
  for (const n of nodes) {
    for (const y of [n.start_year, n.end_year]) {
      if (typeof y === 'number' && Number.isFinite(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [1868, 2026];
  return [min, max];
}

/**
 * 把遠端（舊版）graph.json 正規化為內部 schema。
 * @param {object} raw 解析後的 JSON
 * @returns {object} 內部 schema 物件（含 meta_groups / meta_relations / stats）
 */
export function normalizeGraph(raw) {
  // 已是新格式 → 直接回傳
  if (raw && raw.meta_groups && raw.meta_relations && raw.stats) return raw;

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawLinks = Array.isArray(raw.links) ? raw.links : [];

  // 1) 過濾圖例定義 / 自動增加節點
  const nodes = rawNodes
    .filter((n) => !isJunkNode(n))
    .map((n) => {
      const meta_group = mapNodeGroup(n.group);
      return {
        ...n,
        node_Group: n.group || '其他',
        meta_group,
        breakthrough_note: n.breakthrough_note || '',
        sources: n.sources || [],
        start_year: typeof n.start_year === 'number' ? n.start_year : null,
        end_year: typeof n.end_year === 'number' ? n.end_year : null,
      };
    });

  const idSet = new Set(nodes.map((n) => n.id));

  // 2) 只保留兩端都存在的連結（丟棄指向圖例節點的定義性連結）
  const links = rawLinks
    .filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return idSet.has(s) && idSet.has(t);
    })
    .map((l) => ({
      ...l,
      label: l.label || l.group || '',
      meta_relation: mapLinkGroup(l.group),
      info: l.info || '',
      year: typeof l.year === 'number' ? l.year : null,
    }));

  // 3) 統計
  const groupCount = {};
  for (const n of nodes) groupCount[n.meta_group] = (groupCount[n.meta_group] || 0) + 1;
  const relCount = {};
  for (const l of links) relCount[l.meta_relation] = (relCount[l.meta_relation] || 0) + 1;

  const meta_groups = META_GROUPS.map((id) => ({
    id, color: META_GROUP_COLORS[id], count: groupCount[id] || 0,
  })).filter((g) => g.count > 0);

  const meta_relations = META_RELATIONS.map((id) => ({
    id, color: META_RELATION_COLORS[id], count: relCount[id] || 0,
  })).filter((r) => r.count > 0);

  const stats = {
    nodes: nodes.length,
    links: links.length,
    breakthroughs: nodes.filter((n) => n.breakthrough_note).length,
    by_meta_group: groupCount,
    by_meta_relation: relCount,
    year_range: computeYearRange(nodes),
  };

  return {
    ...raw,
    nodes,
    links,
    meta_groups,
    meta_relations,
    node_groups: [...new Set(nodes.map((n) => n.node_Group))].sort(),
    stats,
  };
}

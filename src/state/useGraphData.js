import { useEffect, useState } from 'react';

// 資料來源切換：Apps Script 自動推送到 data/graph.json (repo 根目錄)
// 在 dev 與 build 環境下，data/ 資料夾透過 vite.config.js 的 staticDataPlugin 提供
const DATA_URL = './data/graph.json';

export function useGraphData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!alive) return;
        // 用 id 建立 lookup map (給 link source/target 解析用)
        j._byId = new Map(j.nodes.map((n) => [n.id, n]));
        setData(j);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, error, loading };
}

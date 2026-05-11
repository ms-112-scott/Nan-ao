# 南澳知識圖譜

> Klesan 群人文地景數位典藏 — 單頁知識圖譜應用
>
> 詳細規劃見 [`南澳知識圖譜_詳細規劃_v2.md`](./南澳知識圖譜_詳細規劃_v2.md)
>
> 參考自 [ms-112-scott/Zhudong](https://github.com/ms-112-scott/Zhudong)

## 開發

```bash
# 1. 安裝依賴
npm install

# 2. 從 source.xlsx 重建 data.json (需 python3 + openpyxl)
pip install openpyxl
npm run data

# 3. 啟動開發伺服器
npm run dev   # http://localhost:5173

# 4. 建置正式版
npm run build
npm run preview
```

## 技術選型

| 層 | 選擇 |
|---|---|
| 前端 | React 19 + Vite + Tailwind CSS v4 |
| 圖譜 | D3 v7 + Canvas + d3-quadtree |
| Label | DOM overlay (襯線字 Canvas 不漂亮) |
| 資料管線 (本地版) | `scripts/excel_to_json.py` 讀 `data/source.xlsx` → 產出 `data/data.json` 與 `public/data.json` |
| 未來管線 (上線時) | Google Sheets → Apps Script → GitHub commit → 前端讀（見規劃 v2 §12） |
| 視覺基調 | 紙質感（米色底 + 襯線字 + 手繪線條） |

## 功能（單頁集中）

- **Canvas 力導向圖** — 1500 級節點不卡，群聚 force（meta_group 引力中心呈花瓣狀）
- **三層摺疊樹側欄** — meta_group → node_Group → 節點
- **InfoCard** — 右側 slide-in，相關節點分 5 類顯示，可跳轉
- **即時搜尋** — id / info / node_Group 模糊匹配，⌘K 快捷
- **時間滑桿** — 雙端點，下方 30 段密度長條
- **關係類型 toggle** — 5 類 meta_relation 多選
- **圖例** — 7 類 meta_group 可點即篩
- **突破點視覺** — 金色光暈 + ★ 角標 + 「只看突破點」toggle
- **Minimap** — 右下縮圖 + 視窗方框
- **URL 狀態同步** — `?node=x&mg=人物&years=1900-2000` 完整可分享
- **Hover tooltip** — 滑鼠停留節點顯紙卡摘要

## 資料 schema

### nodes (`source.xlsx`：`nodes_*` / `node_*` 工作表)
| 欄位 | 必填 | 說明 |
|---|---|---|
| `id` | ✓ | 全域唯一（中文短名即可） |
| `node_Group` | ✓ | 自由文字（如「人物」「部落」「物件」） |
| `info` | ✓ | 節點說明 |
| `start_year` |  | 起始年（西元） |
| `end_year` |  | 結束年 |
| `Lon`, `Lat` |  | 經緯度（地圖視圖預留） |
| `breakthrough_note` |  | **突破點** — 非空時前端會加金色光暈 + ★ |

### links (`link_*` / `links_*` 工作表)
| 欄位 | 必填 | 說明 |
|---|---|---|
| `Node_A`, `Node_B` | ✓ | 起點 / 終點節點 id |
| `label` | ✓ | 關係類型（如「空間關係」「合作」） |
| `info` |  | 關係說明 |
| `Date` |  | 關係發生年份 |

### meta 對照 (`scripts/meta_mapping.py`)
- `node_Group → meta_group`：8 類（人物 / 組織 / 地景與聚落 / 事件 / 物質文化 / 文獻 / 計畫與行動 / 其他）
- `link.label → meta_relation`：5 類（spatial / social / causal / creative / documentary）

未對照的值會 fallback 到「其他」並在 console 警告 + 寫入 `data/_build_report.json`。

## 目錄結構

```
src/
├── App.jsx              # 唯一頁面入口
├── main.jsx             # React 掛載
├── graph/
│   ├── ForceGraph.js    # Canvas 力導向核心類
│   ├── ClusterLayout.js # 7 個 meta_group 引力中心
│   ├── Renderer.js      # 節點 (7 形狀) + 邊 + 突破點繪製
│   ├── EdgeStyles.js    # 5 種 meta_relation 樣式
│   ├── Quadtree.js      # 命中測試
│   ├── LabelLayer.jsx   # DOM 文字 overlay
│   └── HoverTooltip.jsx
├── panels/
│   ├── InfoCard.jsx
│   ├── Search.jsx
│   ├── Legend.jsx
│   ├── RelationFilter.jsx
│   ├── GroupSidebar.jsx
│   ├── TimelineSlider.jsx
│   └── Minimap.jsx
├── state/
│   ├── useGraphData.js  # fetch ./data.json
│   └── useUrlState.js   # URL <-> state 雙向同步
├── utils/
│   └── highlight.js     # 鄰居計算
└── styles/
    ├── tokens.css       # 紙質感色票 / 字體 / 間距
    └── paper.css        # 紙紋背景 / 元件 / 動畫
data/
├── source.xlsx          # 文史工作者編輯的 Excel
├── data.json            # 自動產出
└── _build_report.json   # 衝突 / 缺漏報告
public/
└── data.json            # 同上 (vite dev serve 用)
scripts/
├── excel_to_json.py     # 主轉換腳本
└── meta_mapping.py      # 對照表
```

## URL 參數

| 參數 | 範例 | 說明 |
|---|---|---|
| `node` | `?node=武塔` | 當前選中節點 |
| `mg` | `&mg=人物,事件` | meta_group 篩選 |
| `mr` | `&mr=spatial,causal` | meta_relation 篩選 |
| `years` | `&years=1900-2000` | 時間範圍 |
| `bt` | `&bt=1` | 只看突破點 |

## 開發階段（git history）

- **Phase 0**: 專案 skeleton (vite + react + tailwind v4 + d3)
- **Phase 1**: 本地資料管線 (Excel → JSON, meta 對照表)
- **Phase 2**: 紙質感 design tokens + paper.css
- **Phase 3**: Canvas 力導向圖 + 群聚佈局
- **Phase 4**: 互動 + Label 圖層 + 鄰居高亮
- **Phase 5**: UI 面板 (InfoCard / Search / Legend / RelationFilter / GroupSidebar)
- **Phase 6**: 時間軸 + URL 狀態 + Minimap
- **Phase 7**: 收尾與驗證

## 規模與效能

目前資料：349 節點 / 391 邊 / 0 突破點（沒研究者填）。
規劃可撐 1500–2000 節點。超過再考慮：
- LOD（zoom 小時聚合成群泡泡）
- WebGL 渲染（Pixi.js / regl）
- 分主題子圖

## 上線到 GitHub Pages

當 GAS 管線打通後（規劃 v2 §12）：
1. 修 `vite.config.js`：`base: '/Nanao/'`
2. `npm run build && npm run deploy` (需先安裝 gh-pages)
3. data.json 由 GAS commit，前端 fetch GitHub raw URL（或 jsDelivr）

## License

MIT

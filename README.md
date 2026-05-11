# 南澳知識圖譜

Klesan 群人文地景數位典藏 — 單頁知識圖譜應用。

> 詳細規劃見 `南澳知識圖譜_詳細規劃_v2.md`

## 開發

```bash
# 安裝依賴
npm install

# 從 Excel 重建 data.json（需 python3 + openpyxl）
npm run data

# 啟動開發伺服器
npm run dev

# 建置正式版
npm run build
```

## 技術選型

- 前端：React 19 + Vite + Tailwind CSS v4
- 圖譜：D3 v7 + Canvas + d3-quadtree
- 資料管線（本地版）：`scripts/excel_to_json.py` 讀 `data/source.xlsx` → 產出 `data/data.json`
- 之後升級為：Google Sheets → Apps Script → GitHub commit → 前端讀

## 目錄結構

```
src/
├── graph/        # 圖譜核心（Canvas、力導向、繪製、互動）
├── panels/       # UI 面板（sidebar、search、infocard、toolbar、legend）
├── state/        # state hooks（URL、graph data、filters）
├── timeline/     # 時間軸視圖（Phase 2）
├── utils/        # 工具
└── styles/       # tokens、紙質感樣式
data/             # source.xlsx + data.json
scripts/          # excel_to_json.py
apps_script/      # GAS 程式碼版控（部署到 Sheets）
public/           # 字體、紙紋理
```

## 開發階段（git 分階段 commit）

- Phase 0：專案 skeleton
- Phase 1：本地資料管線
- Phase 2：紙質感 design tokens
- Phase 3：Canvas 力導向圖
- Phase 4：互動
- Phase 5：UI 面板
- Phase 6：篩選 + URL 狀態
- Phase 7：驗證與最終 commit

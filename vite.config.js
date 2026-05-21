import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';

// 讓 repo 根目錄的 data/ 資料夾在 dev / build 環境中都能被瀏覽器存取
//   - dev:   middleware 直接從 disk 讀取
//   - build: 把整個 data/ 資料夾複製到 dist/data/
// 這樣 Apps Script 推送到 repo 根的 data/graph.json 就會自動同步上線
function staticDataPlugin() {
  const DATA_DIR = path.resolve(__dirname, 'data');
  return {
    name: 'serve-static-data',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next();
        const url = req.url.split('?')[0];
        if (!url.startsWith('/data/')) return next();
        const filePath = path.join(DATA_DIR, url.replace(/^\/data\//, ''));
        if (!filePath.startsWith(DATA_DIR)) return next();
        fs.stat(filePath, (err, stat) => {
          if (err || !stat.isFile()) return next();
          if (url.endsWith('.json')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          fs.createReadStream(filePath).pipe(res);
        });
      });
    },
    closeBundle() {
      if (!fs.existsSync(DATA_DIR)) return;
      const outDir = path.resolve(__dirname, 'dist', 'data');
      fs.mkdirSync(outDir, { recursive: true });
      for (const f of fs.readdirSync(DATA_DIR)) {
        const src = path.join(DATA_DIR, f);
        const dst = path.join(outDir, f);
        if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
      }
    },
  };
}

// 本地開發；之後若要 deploy 到 GitHub Pages，把 base 改成 '/Nanao/'
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), staticDataPlugin()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

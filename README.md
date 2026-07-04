# Team PekingHSC 2026 Wiki

Official iGEM React template + cinematic Home (Three.js narrative).

## Quick start

```bash
npm install
cp .env.local.example .env.local   # 本地开发：从 public/ 读资源
npm run dev
```

浏览器打开：**http://localhost:5173/pekinghsc/**（必须是 `/pekinghsc/` 结尾，不是根路径 `/`）

### 本地看不到图片？

1. 确认有 `.env.local`，且里面是 `VITE_IGEM_STATIC_BASE=`（留空）
2. 确认 `public/images/`、`public/models/` 里有文件（已在 git 里，若缺失运行 `git checkout HEAD -- public/`）
3. 改完 `.env.local` 后 **Ctrl+C 停掉 dev，再 `npm run dev` 重启**

上线/iGEM 部署时用 `.env` 里的 CDN 地址（上传到 static.igem.wiki 之后）。

## Structure

- `src/containers/App/` — routing shell (Home skips template chrome)
- `src/contents/` — standard wiki pages (`home.tsx`, `engineering.tsx`, …)
- `src/components/narrative/` — cinematic Home sections
- `src/main.ts` — Three.js hero pipeline
- `src/content/igemAssets.ts` — CDN URLs for `static.igem.wiki`

## Assets

Images, models, and fonts must be on [iGEM Uploads](https://teams.igem.org/go/deliverables/wiki/uploads):

```bash
npm run prepare:fonts   # → uploads/fonts/*.woff2
```

See `docs/asset-attribution.md` and `docs/compliance-checklist.md`.

## Build

```bash
npm run build   # output in dist/ (HTML/JS/CSS only — no bundled images)
```

Deployed via `.gitlab-ci.yml` on GitLab push.

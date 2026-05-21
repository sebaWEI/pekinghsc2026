# iGEM Wiki Compliance Checklist

Use this checklist before each major release and before Wiki Freeze.

## 1) Required Footer Presence
- [ ] Every HTML page includes `compliance-footer.js` and `compliance-footer.css`.
- [ ] Footer includes visible GitLab repository link.
- [ ] Footer includes CC BY 4.0 statement.

## 2) Standard URL Pages
- [ ] `/attributions`
- [ ] `/contribution`
- [ ] `/engineering`
- [ ] `/human-practices`
- [ ] Special-prize standard pages used by your team are present and populated.

## 3) Hosting Rules
- [ ] All runtime assets load from `igem.org` / `igem.wiki` domains only.
- [ ] Videos load from `video.igem.org`.
- [ ] No external CDN/font/image/video requests in browser network tab.

## 4) Source And CI
- [ ] `.gitlab-ci.yml` exists and pipeline passes.
- [ ] No pre-generated `dist` committed as source of truth.
- [ ] Wiki can be rebuilt from repository source.

## 5) Attribution And Licenses
- [ ] `LICENSE` present in repository root.
- [ ] `docs/asset-attribution.md` updated.
- [ ] All third-party content cited on corresponding pages.

## 6) Quick Local Scan Commands
- Search external links in source:
  - `rg "https?://" src index.html`
- Check standard pages exist:
  - `ls attributions contribution engineering human-practices`
- Validate build:
  - `npm run build`

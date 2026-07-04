# Asset Attribution And Licensing Register

This file tracks third-party assets used in the Wiki and the license status required by iGEM Wiki rules.

## Team-Created Assets (CC BY 4.0)
- `images/214b5722d42d86e64d169524cfb674f0.jpg` (team logo, white background)
- `images/508989d781d93b0fa889ed53287ee8c9.png` (team logo, transparent background)
- `models/rna_model_final.glb`
- `models/rna_colored.glb`
- `models/adenosine.glb`
- `models/cytidine.glb`
- `models/guanosine.glb`
- `models/uridine.glb`

## Referenced Scientific Figures / Media (must include explicit source citation on page)
- `images/sineb2-secondary-structure.png`
- `images/smrtnet-binding-energy-plot.svg`
- `images/emsa-gel-results.jpg`
- `videos/cryo-em-rna-protein-complex.mp4`

## Web Fonts (SIL Open Font License 1.1)
Hosted on iGEM CDN (`static.igem.wiki/teams/2026/pekinghsc/assets/fonts/`).
Referenced from `src/styles/fonts.css` via `@font-face` (no Google Fonts at runtime).
Prepare upload bundle: `npm run prepare:fonts` → upload `uploads/fonts/*.woff2` via [iGEM Uploads](https://teams.igem.org/go/deliverables/wiki/uploads).

| Font | License | Source |
|------|---------|--------|
| DM Serif Display | SIL OFL 1.1 | https://fonts.google.com/specimen/DM+Serif+Display |
| Inter | SIL OFL 1.1 | https://rsms.me/inter/ |
| Orbitron | SIL OFL 1.1 | https://fonts.google.com/specimen/Orbitron |
| Outfit | SIL OFL 1.1 | https://fonts.google.com/specimen/Outfit |

## Open-Source Dependencies (NPM)
- `three` (MIT) — https://github.com/mrdoob/three.js
- `vite` (MIT) — https://github.com/vitejs/vite
- `typescript` (Apache-2.0) — https://github.com/microsoft/TypeScript

## Release Checklist
1. Confirm every non-team asset has a license that allows reuse/redistribution/modification.
2. Confirm each non-team figure/video has visible citation on the relevant Wiki page.
3. Confirm all runtime-loaded URLs point to `igem.org` or `igem.wiki` domains.

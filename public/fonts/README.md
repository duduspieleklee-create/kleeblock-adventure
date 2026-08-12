# Fonts

## GameFont

Logical family name used in code: **`GameFont`** (see `src/ui/UIConstants.ts`).

### Current setup

- `@font-face` in `style.css` tries `/fonts/GameFont.woff2` first, then a jsDelivr CDN copy of **Press Start 2P** (OFL).
- `index.html` preloads the CDN woff2 so layout can wait with `font-display: block`.

### Vendor a local file (recommended for production)

1. Download the Latin 400 woff2, e.g. from [Fontsource Press Start 2P](https://fontsource.org/fonts/press-start-2p).
2. Save as:

```text
public/fonts/GameFont.woff2
```

Vite serves `public/` at the site root, so the path `/fonts/GameFont.woff2` resolves correctly.

3. Optionally switch the preload in `index.html` to:

```html
<link rel="preload" href="/fonts/GameFont.woff2" as="font" type="font/woff2" crossorigin />
```

### License

Press Start 2P is licensed under the [SIL Open Font License](https://scripts.sil.org/OFL).

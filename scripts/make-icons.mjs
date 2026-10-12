// アイコンを生成する: npm run icons
// 緑の角丸に、白いシャトル。SVG を書き出し、Playwright の Chromium で PNG にする。
// 色・形はここを書き換えて再実行する（PNG を直接編集しない）。
// maskable は端末が円や角丸に切り抜くため、図柄を縮めて、背景を全面に塗る。
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = new URL('../public/icons/', import.meta.url);
mkdirSync(out, { recursive: true });

// 図柄（512 x 512 の座標。中心に置く）
const shuttle = `
  <g transform="translate(256 262) rotate(-40) translate(-256 -256)">
    <path d="M186 128 L326 128 L292 322 L220 322 Z" fill="#ffffff"/>
    <path d="M221 128 L241 322 M256 128 L256 322 M291 128 L271 322" stroke="#10b981" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M186 128 L326 128" stroke="#a7f3d0" stroke-width="12" stroke-linecap="round"/>
    <circle cx="256" cy="362" r="46" fill="#fef3c7"/>
    <path d="M222 340 Q256 322 290 340" stroke="#f59e0b" stroke-width="7" fill="none" stroke-linecap="round"/>
  </g>`;
const gradient = `<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#059669"/><stop offset="100%" stop-color="#047857"/></linearGradient></defs>`;

/** @param {{rounded: boolean, scale: number}} o */
const svg = ({ rounded, scale }) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${gradient}
  <rect width="512" height="512" ${rounded ? 'rx="112"' : ''} fill="url(#bg)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${shuttle}</g>
</svg>
`;

writeFileSync(new URL('icon.svg', out), svg({ rounded: true, scale: 1 }));

const browser = await chromium.launch();
const page = await browser.newPage();
async function png(name, size, opts) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${svg(opts).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: new URL(name, out).pathname, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}
await png('icon-192.png', 192, { rounded: true, scale: 1 });
await png('icon-512.png', 512, { rounded: true, scale: 1 });
await png('icon-maskable-512.png', 512, { rounded: false, scale: 0.72 });
await png('apple-touch-icon.png', 180, { rounded: false, scale: 0.9 });
await browser.close();
console.log('icons generated: icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png');

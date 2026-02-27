/**
 * generate-games.js — chạy LOCAL, commit kết quả lên repo
 *
 * Dùng: node generate-games.js
 *
 * Cấu trúc repo:
 *   data/
 *   ├── thumbs/          ← ảnh thumbnail (slug.jpg/png)
 *   └── games/           ← game files
 *       ├── slope/
 *       │   └── index.html
 *       └── retro-bowl/
 *           └── index.html
 *
 * Script tạo ra:
 *   slope/index.html     ← SEO page + redirect → play.html
 *   retro-bowl/index.html
 *   sitemap.xml
 *   robots.txt
 *
 * Sau đó: git add . && git commit -m "update" && git push
 */

const fs   = require('fs');
const path = require('path');

const SITE_BASE = 'https://classrom-gg.github.io';

const RESERVED = new Set([
  'index.html','play.html','games.json','sitemap.xml','robots.txt',
  'data','assets','.github','generate-games.js','node_modules','favicon.ico'
]);

// ─── Đọc games.json ──────────────────────────────────
if (!fs.existsSync('games.json')) {
  console.error('❌ Không tìm thấy games.json');
  process.exit(1);
}
const { games = [] } = JSON.parse(fs.readFileSync('games.json', 'utf-8'));
console.log(`📄 ${games.length} games\n`);

// ─── Helpers ─────────────────────────────────────────
const toSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

function buildPlayUrl(game) {
  const p = new URLSearchParams({
    name:   game.name,
    slug:   game.slug,
    type:   game.type,
    source: game.source
  });
  if (game.source === 'iframe') {
    p.set('iframeUrl', game.iframeUrl);
  } else {
    p.set('path', game.path); // vd: data/games/slope/index.html
  }
  return `/play.html?${p.toString()}`;
}

function makeSlugPage(game) {
  const thumb    = game.thumb || '';
  const desc     = (game.description || `Play ${game.name} free online!`)
                    .replace(/[<>"&]/g, c=>({'<':'&lt;','>':'&gt;','"':'&quot;','&':'&amp;'}[c]));
  const tags     = (game.tags||[]).join(', ');
  const tagsJson = (game.tags||[]).map(t=>`"${t}"`).join(', ');
  const playUrl  = buildPlayUrl(game);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${game.name} - Play Free Online | Classrom.GG</title>
<meta name="description" content="${desc} Play free, no download!">
<meta name="keywords" content="${game.name}, ${tags}, free online games, unblocked games">
<link rel="canonical" href="${SITE_BASE}/${game.slug}">
<meta name="robots" content="index, follow">
<meta property="og:type"        content="website">
<meta property="og:title"       content="${game.name} — Classrom.GG">
<meta property="og:description" content="${desc}">
<meta property="og:url"         content="${SITE_BASE}/${game.slug}">
${thumb?`<meta property="og:image" content="${SITE_BASE}${thumb}">
<meta name="twitter:card"  content="summary_large_image">
<meta name="twitter:image" content="${SITE_BASE}${thumb}">`:''}
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"VideoGame","name":"${game.name}","description":"${desc}","url":"${SITE_BASE}/${game.slug}","genre":[${tagsJson}],"playMode":"SinglePlayer","applicationCategory":"Game","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}
</script>
<style>
  body{margin:0;background:#07070f;color:#dde4f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:14px;}
  .sp{width:36px;height:36px;border:3px solid #1a1a32;border-top-color:#00ffaa;border-radius:50%;animation:s .7s linear infinite;}
  @keyframes s{to{transform:rotate(360deg);}}
  p{font-size:14px;color:#60607a;margin:0;} strong{color:#dde4f0;}
</style>
</head>
<body>
  <div class="sp"></div>
  <p>Loading <strong>${game.name}</strong>...</p>
<script>location.replace(${JSON.stringify(playUrl)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${playUrl}"></noscript>
</body>
</html>`;
}

// ─── MAIN ────────────────────────────────────────────
let created = 0;

for (const game of games) {
  if (!game.slug) game.slug = toSlug(game.name);

  if (RESERVED.has(game.slug)) {
    console.warn(`⚠️  Bỏ qua "${game.slug}" — trùng reserved`);
    continue;
  }

  fs.mkdirSync(game.slug, { recursive: true });
  fs.writeFileSync(`${game.slug}/index.html`, makeSlugPage(game));

  const src = game.source === 'iframe'
    ? `iframe → ${game.iframeUrl}`
    : `local  → /${game.path}`;
  console.log(`  ✓ ${game.slug}/   (${src})`);
  created++;
}

// ─── sitemap.xml ─────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
fs.writeFileSync('sitemap.xml',
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
${games.map(g=>`  <url><loc>${SITE_BASE}/${g.slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>`);

// ─── robots.txt ──────────────────────────────────────
fs.writeFileSync('robots.txt',
  `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE}/sitemap.xml\n`);

console.log(`
📁 ${created} slug pages tạo xong
🗺  sitemap.xml
🤖 robots.txt

Giờ chạy:
  git add .
  git commit -m "update games"
  git push
`);
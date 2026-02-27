/**
 * generate-games.js
 * Đọc games.json → tạo:
 *   1. slope/index.html, retro-bowl/index.html... (slug pages tại root)
 *   2. sitemap.xml
 *   3. robots.txt
 *   4. cdn-links.json
 *
 * Dùng: node generate-games.js
 */

const fs   = require('fs');
const path = require('path');

const OUT_DIR   = process.env.OUT_DIR || '.';
const SITE_BASE = 'https://classrom-gg.github.io';
const CDN_BASE  = 'https://cdn.jsdelivr.net/gh/classrom-gg/classrom-gg@main';

// ─── Reserved names — không được tạo folder trùng ───
const RESERVED = new Set([
  'index.html','play.html','games.json','404.html',
  'cdn-links.json','sitemap.xml','robots.txt',
  'data','assets','favicon.ico','.github',
  'generate-games.js','node_modules'
]);

// ─── Đọc games.json ──────────────────────────────────
const jsonPath = path.join(OUT_DIR, 'games.json');
if (!fs.existsSync(jsonPath)) {
  console.error('❌ Không tìm thấy games.json!');
  process.exit(1);
}
const { games = [] } = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
console.log(`📄 Đọc games.json — ${games.length} games`);

// ─── Helpers ─────────────────────────────────────────
const toSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

// Resolve URL đúng cho từng source
// source=cdn    → /data/pages/slope/index.html  (local GitHub Pages)
// source=iframe → https://somesite.com/slope/   (external)
function resolvePlayUrl(game) {
  const p = new URLSearchParams({
    name:   game.name,
    slug:   game.slug || toSlug(game.name),
    type:   game.type,
    source: game.source || 'cdn'
  });
  if (game.source === 'iframe') {
    p.set('iframeUrl', game.iframeUrl || '');
  } else {
    // source=cdn: path thẳng, play.html sẽ prefix '/'
    p.set('path', game.path || '');
  }
  return `/play.html?${p.toString()}`;
}

// ─── Tạo slug page HTML ──────────────────────────────
function makeSlugPage(game) {
  const slug    = game.slug || toSlug(game.name);
  const thumb   = game.thumb || '/data/thumbs/default.jpg';
  const desc    = (game.description || `Play ${game.name} free online!`).replace(/[<>"]/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tags    = (game.tags || []).join(', ');
  const tagsJson= (game.tags || []).map(t => `"${t}"`).join(', ');
  const playUrl = resolvePlayUrl(game);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${game.name} - Play Free Online | Classrom.GG</title>
<meta name="description" content="${desc} Play ${game.name} free — no download required!">
<meta name="keywords" content="${game.name}, ${tags}, free online games, unblocked games">
<link rel="canonical" href="${SITE_BASE}/${slug}">
<meta name="robots" content="index, follow">
<meta property="og:type"        content="website">
<meta property="og:title"       content="${game.name} — Play Free | Classrom.GG">
<meta property="og:description" content="${desc}">
<meta property="og:url"         content="${SITE_BASE}/${slug}">
<meta property="og:image"       content="${SITE_BASE}${thumb}">
<meta property="og:site_name"   content="Classrom.GG">
<meta name="twitter:card"       content="summary_large_image">
<meta name="twitter:title"      content="${game.name} — Classrom.GG">
<meta name="twitter:description"content="${desc}">
<meta name="twitter:image"      content="${SITE_BASE}${thumb}">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"VideoGame","name":"${game.name}","description":"${desc}","url":"${SITE_BASE}/${slug}","image":"${SITE_BASE}${thumb}","genre":[${tagsJson}],"playMode":"SinglePlayer","applicationCategory":"Game","operatingSystem":"Web Browser","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"Classrom.GG","url":"${SITE_BASE}"}}
</script>
<style>
  body{margin:0;background:#07070f;color:#dde4f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:14px;}
  .sp{width:36px;height:36px;border:3px solid #1a1a32;border-top-color:#00ffaa;border-radius:50%;animation:s .7s linear infinite;}
  @keyframes s{to{transform:rotate(360deg);}}
  p{font-size:14px;color:#60607a;margin:0;}strong{color:#dde4f0;}
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
let created = 0, skipped = 0;

for (const game of games) {
  const slug = game.slug || toSlug(game.name);

  if (RESERVED.has(slug)) {
    console.warn(`⚠️  Bỏ qua "${slug}" — trùng tên reserved`);
    skipped++;
    continue;
  }

  // Tạo folder slug/ ở root
  const dir = path.join(OUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), makeSlugPage(game));
  console.log(`  ✓ ${slug}/index.html → ${resolvePlayUrl(game).slice(0,60)}...`);
  created++;
}

console.log(`\n📁 Slug pages: ${created} tạo${skipped ? `, ${skipped} bỏ qua` : ''}`);

// ─── sitemap.xml ─────────────────────────────────────
const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [
  `  <url><loc>${SITE_BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
  ...games.map(g => {
    const s = g.slug || toSlug(g.name);
    return `  <url><loc>${SITE_BASE}/${s}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  })
].join('\n');

fs.writeFileSync(
  path.join(OUT_DIR, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>`
);
console.log(`🗺  sitemap.xml`);

// ─── robots.txt ──────────────────────────────────────
fs.writeFileSync(
  path.join(OUT_DIR, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE}/sitemap.xml\n`
);
console.log(`🤖 robots.txt`);

// ─── cdn-links.json ──────────────────────────────────
// File này dùng để lấy URL nhúng vào site khác
const cdnLinks = games.map(g => {
  const s = g.slug || toSlug(g.name);
  const entry = {
    name:   g.name,
    slug:   s,
    type:   g.type,
    source: g.source || 'cdn'
  };

  if (g.source === 'iframe') {
    // Game từ site khác — iframeUrl dùng được luôn
    entry.iframeUrl = g.iframeUrl;
  } else {
    // Game từ repo — tạo CDN URL để dùng ở site khác
    entry.localUrl = '/' + g.path;                 // dùng trong site chính
    entry.cdnUrl   = CDN_BASE + '/' + g.path;      // dùng ở site khác
  }

  if (g.thumb) {
    entry.thumb    = g.thumb;
    entry.thumbCdn = CDN_BASE + g.thumb;
  }

  return entry;
});

fs.writeFileSync(
  path.join(OUT_DIR, 'cdn-links.json'),
  JSON.stringify({
    meta: {
      note: "localUrl dùng trong classrom-gg.github.io | cdnUrl dùng ở site khác",
      cdnBase: CDN_BASE,
      generatedAt: new Date().toISOString(),
      total: cdnLinks.length
    },
    games: cdnLinks
  }, null, 2)
);
console.log(`🔗 cdn-links.json`);

// ─── Tổng kết ─────────────────────────────────────────
console.log(`\n✅ Xong! URL mẫu:`);
games.slice(0, 3).forEach(g => {
  const s = g.slug || toSlug(g.name);
  console.log(`   ${SITE_BASE}/${s}`);
});
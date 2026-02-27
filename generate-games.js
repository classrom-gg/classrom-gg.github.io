/**
 * generate-games.js
 *
 * Đọc games.json → tạo slug pages thẳng vào root:
 *   classrom-gg.github.io/2048
 *   classrom-gg.github.io/angry-birds
 *
 * Cấu trúc output:
 *   root/
 *   ├── index.html
 *   ├── play.html
 *   ├── games.json       ← viết tay hoặc --fetch tự tạo
 *   ├── sitemap.xml      ← tự tạo
 *   ├── robots.txt       ← tự tạo
 *   ├── 2048/index.html
 *   ├── angry-birds/index.html
 *   └── data/thumbs/
 *
 * Dùng:
 *   node generate-games.js              ← đọc games.json có sẵn
 *   node generate-games.js --fetch      ← quét repo GitHub, tạo games.json
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OWNER   = process.env.GITHUB_OWNER  || 'classrom-gg';
const REPO    = process.env.GITHUB_REPO   || 'classrom-gg';
const BRANCH  = process.env.GITHUB_BRANCH || 'main';
const TOKEN   = process.env.GITHUB_TOKEN  || '';
const OUT_DIR = process.env.OUT_DIR       || '.';
const FETCH   = process.argv.includes('--fetch');

const CDN_BASE  = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}`;
const SITE_BASE = 'https://classrom-gg.github.io';
const THUMBS_DIR = path.join(OUT_DIR, 'data', 'thumbs');

// ─── GitHub API ────────────────────────────────
function api(endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: endpoint,
      headers: {
        'User-Agent': 'classrom-gg-generator',
        Accept: 'application/vnd.github.v3+json',
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {})
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => res.statusCode === 200
        ? resolve(JSON.parse(d))
        : reject(new Error(`GitHub ${res.statusCode}: ${d.slice(0,200)}`))
      );
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Helpers ───────────────────────────────────
const toName = p => {
  const parts = p.split('/');
  const raw = parts.length > 1 ? parts[parts.length-2] : parts[parts.length-1].replace(/\.[^.]+$/,'');
  return raw.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
};
const toSlug = n => n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const findThumb = slug => {
  for (const ext of ['jpg','jpeg','png','webp','gif'])
    if (fs.existsSync(path.join(THUMBS_DIR,`${slug}.${ext}`)))
      return `/data/thumbs/${slug}.${ext}`;
  return '/data/thumbs/default.jpg';
};

// ─── Fetch games from GitHub repo ──────────────
async function fetchFromRepo() {
  if (!TOKEN) throw new Error('Cần GITHUB_TOKEN. Chạy: GITHUB_TOKEN=ghp_xxx node generate-games.js --fetch');
  console.log(`📡 Quét ${OWNER}/${REPO}@${BRANCH}...`);
  const branch  = await api(`/repos/${OWNER}/${REPO}/branches/${BRANCH}`);
  const treeSha = branch.commit.commit.tree.sha;
  const tree    = await api(`/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`);
  if (tree.truncated) console.warn('⚠️  Tree truncated!');
  const files = tree.tree.filter(f => f.type === 'blob');
  return [
    ...files.filter(f=>f.path.endsWith('.html')).map(f=>({
      name: toName(f.path), slug: toSlug(toName(f.path)),
      type:'html', source:'cdn', path:f.path,
      description:`Play ${toName(f.path)} free online — no download required.`,
      tags:['html5','browser game','free']
    })),
    ...files.filter(f=>f.path.endsWith('.swf')).map(f=>({
      name: toName(f.path), slug: toSlug(toName(f.path)),
      type:'swf', source:'cdn', path:f.path,
      description:`Play ${toName(f.path)} free — Flash emulator included, no plugin needed.`,
      tags:['flash','classic','free']
    }))
  ].sort((a,b)=>a.name.localeCompare(b.name));
}

// ─── Build slug page HTML ───────────────────────
function makeSlugPage(game) {
  const thumb    = game.thumb || findThumb(game.slug);
  const tags     = (game.tags||[]).join(', ');
  const tagsJson = (game.tags||[]).map(t=>`"${t}"`).join(', ');
  const desc     = (game.description||`Play ${game.name} free online!`).replace(/"/g,'&quot;').replace(/</g,'&lt;');

  // Build play.html query string
  const p = new URLSearchParams({ name:game.name, slug:game.slug, type:game.type, source:game.source||'cdn' });
  if ((game.source||'cdn') === 'iframe') p.set('iframeUrl', game.iframeUrl||'');
  else if (game.path) p.set('path', game.path);
  const playUrl = `/play.html?${p.toString()}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${game.name} - Play Free Online | Classrom.GG</title>
<meta name="description" content="${desc} Play ${game.name} free — no download, works on any browser!">
<meta name="keywords" content="${game.name}, ${tags}, free online games, unblocked games, browser games, classrom gg">
<link rel="canonical" href="${SITE_BASE}/${game.slug}">
<meta name="robots" content="index, follow">

<meta property="og:type"        content="website">
<meta property="og:title"       content="${game.name} — Play Free Online | Classrom.GG">
<meta property="og:description" content="${desc} No download needed!">
<meta property="og:url"         content="${SITE_BASE}/${game.slug}">
<meta property="og:image"       content="${SITE_BASE}${thumb}">
<meta property="og:site_name"   content="Classrom.GG">

<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${game.name} — Classrom.GG">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image"       content="${SITE_BASE}${thumb}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "${game.name}",
  "description": "${desc}",
  "url": "${SITE_BASE}/${game.slug}",
  "image": "${SITE_BASE}${thumb}",
  "genre": [${tagsJson}],
  "playMode": "SinglePlayer",
  "applicationCategory": "Game",
  "operatingSystem": "Web Browser",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "publisher": { "@type": "Organization", "name": "Classrom.GG", "url": "${SITE_BASE}" }
}
<\/script>

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
<script>location.replace(${JSON.stringify(playUrl)});<\/script>
<noscript><meta http-equiv="refresh" content="0;url=${playUrl}"></noscript>
</body>
</html>`;
}

// ─── Sitemap ────────────────────────────────────
function makeSitemap(games) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    `  <url><loc>${SITE_BASE}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...games.map(g=>`  <url><loc>${SITE_BASE}/${g.slug}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

// ─── MAIN ───────────────────────────────────────
async function main() {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  let games;

  if (FETCH) {
    // Tự quét repo GitHub
    games = await fetchFromRepo();
    games = games.map(g => ({ ...g, thumb: findThumb(g.slug) }));
    const meta = {
      generatedAt: new Date().toISOString(), repo:`${OWNER}/${REPO}`, branch:BRANCH, cdnBase:CDN_BASE,
      totalGames:games.length, htmlCount:games.filter(g=>g.type==='html').length, swfCount:games.filter(g=>g.type==='swf').length
    };
    fs.writeFileSync(path.join(OUT_DIR,'games.json'), JSON.stringify({meta,games},null,2));
    console.log(`📄 games.json tạo mới — ${games.length} games`);
  } else {
    // Đọc games.json viết tay
    const jsonPath = path.join(OUT_DIR, 'games.json');
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ Không tìm thấy games.json');
      console.error('   Tạo tay theo mẫu, hoặc chạy: node generate-games.js --fetch');
      process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(jsonPath,'utf-8'));
    games = (raw.games||[]).map(g => ({
      ...g,
      slug:  g.slug  || toSlug(g.name),
      thumb: g.thumb || findThumb(g.slug || toSlug(g.name))
    }));
    console.log(`📄 Đọc games.json — ${games.length} games`);
  }

  // Skip các tên trùng với file/folder có sẵn
  const RESERVED = new Set(['index.html','play.html','games.json','404.html','data','assets','favicon.ico','sitemap.xml','robots.txt','.github','generate-games.js','node_modules']);
  let created=0, skipped=0;

  for (const game of games) {
    if (RESERVED.has(game.slug)) { console.warn(`⚠️  Bỏ qua slug "${game.slug}" (trùng tên reserved)`); skipped++; continue; }
    const dir = path.join(OUT_DIR, game.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir,'index.html'), makeSlugPage(game));
    created++;
  }
  console.log(`📁 Slug pages: ${created} tạo${skipped?`, ${skipped} bỏ qua`:''}`);

  // sitemap.xml
  fs.writeFileSync(path.join(OUT_DIR,'sitemap.xml'), makeSitemap(games));
  console.log(`🗺  sitemap.xml`);

  // robots.txt
  fs.writeFileSync(path.join(OUT_DIR,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_BASE}/sitemap.xml\n`);
  console.log(`🤖 robots.txt`);

  // .gitkeep
  const kp = path.join(THUMBS_DIR,'.gitkeep');
  if (!fs.existsSync(kp)) fs.writeFileSync(kp,'');

  console.log(`\n✅ Xong!\n`);
  console.log(`   Cấu trúc root/`);
  games.slice(0,4).forEach(g=>console.log(`   ├── ${g.slug}/`));
  if(games.length>4) console.log(`   ├── ... (+${games.length-4} more)`);
  console.log(`   ├── sitemap.xml\n   └── robots.txt`);
  console.log(`\n   URL mẫu:`);
  games.slice(0,3).forEach(g=>console.log(`   ${SITE_BASE}/${g.slug}`));
}

main().catch(e=>{console.error('❌',e.message);process.exit(1);});
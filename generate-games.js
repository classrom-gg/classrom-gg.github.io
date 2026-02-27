/**
 * generate-games.js
 * 1. Quét repo GitHub → tìm .html + .swf
 * 2. Tạo games.json
 * 3. Tạo data/pages/<slug>/index.html  → URL: classrom-gg.github.io/2048
 * 4. Tạo 404.html cho slug routing
 *
 * Cấu trúc output:
 *   root/
 *   ├── index.html
 *   ├── play.html
 *   ├── games.json
 *   ├── 404.html
 *   └── data/
 *       ├── pages/
 *       │   ├── 2048/index.html
 *       │   ├── pacman/index.html
 *       │   └── ...
 *       └── thumbs/   ← đặt ảnh tại đây, tên = slug.jpg/png
 *
 * Dùng: GITHUB_TOKEN=ghp_xxx node generate-games.js
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const OWNER    = process.env.GITHUB_OWNER  || 'classrom-gg';
const REPO     = process.env.GITHUB_REPO   || 'classrom-gg';
const BRANCH   = process.env.GITHUB_BRANCH || 'main';
const TOKEN    = process.env.GITHUB_TOKEN  || '';
const OUT_DIR  = process.env.OUT_DIR       || '.';

const CDN_BASE   = `https://cdn.jsdelivr.net/gh/${OWNER}/${REPO}@${BRANCH}`;
const PAGES_DIR  = path.join(OUT_DIR, 'data', 'pages');
const THUMBS_DIR = path.join(OUT_DIR, 'data', 'thumbs');

// ─── GitHub API ───────────────────────────────
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
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(d));
        else reject(new Error(`GitHub ${res.statusCode}: ${d.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Helpers ──────────────────────────────────
function toName(filePath) {
  const parts = filePath.split('/');
  const raw = parts.length > 1
    ? parts[parts.length - 2]
    : parts[parts.length - 1].replace(/\.[^.]+$/, '');
  return raw.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function findThumb(slug) {
  for (const ext of ['jpg','jpeg','png','webp','gif']) {
    if (fs.existsSync(path.join(THUMBS_DIR, `${slug}.${ext}`))) {
      return `/data/thumbs/${slug}.${ext}`;
    }
  }
  return null;
}

// ─── Slug page HTML ───────────────────────────
function makeSlugPage(game) {
  const playUrl = `/play.html?slug=${game.slug}&name=${encodeURIComponent(game.name)}&type=${game.type}&path=${encodeURIComponent(game.path)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${game.name} — Classrom.GG</title>
<meta name="description" content="Play ${game.name} free online — no download required.">
<meta property="og:title" content="${game.name} — Classrom.GG">
<meta property="og:url" content="https://classrom-gg.github.io/${game.slug}">
${game.thumb ? `<meta property="og:image" content="https://classrom-gg.github.io${game.thumb}">` : ''}
<script>location.replace(${JSON.stringify(playUrl)});</script>
<noscript><meta http-equiv="refresh" content="0;url=${playUrl}"></noscript>
</head>
<body style="background:#080810;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px">
  <div style="font-size:40px">🎮</div>
  <p>Loading <strong>${game.name}</strong>...</p>
</body>
</html>`;
}

// ─── 404.html — slug routing trick ────────────
// GitHub Pages serves 404.html for unknown paths
// We use it to redirect /2048 → /data/pages/2048/
const make404 = () => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Classrom.GG</title>
<script>
  var seg = location.pathname.replace(/^\\//, '').replace(/\\/$/, '').split('/')[0];
  var skip = ['index.html','play.html','games.json','404.html','data','assets','favicon.ico'];
  if (seg && !skip.includes(seg)) {
    location.replace('/data/pages/' + seg + '/');
  } else {
    location.replace('/');
  }
</script>
</head>
<body style="background:#080810;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <p>Redirecting...</p>
</body>
</html>`;

// ─── MAIN ─────────────────────────────────────
async function main() {
  if (!TOKEN) {
    console.error('❌ Cần GITHUB_TOKEN');
    console.error('   GITHUB_TOKEN=ghp_xxx node generate-games.js');
    process.exit(1);
  }

  console.log(`📡 Quét ${OWNER}/${REPO}@${BRANCH} ...`);

  const branch  = await api(`/repos/${OWNER}/${REPO}/branches/${BRANCH}`);
  const treeSha = branch.commit.commit.tree.sha;
  const tree    = await api(`/repos/${OWNER}/${REPO}/git/trees/${treeSha}?recursive=1`);

  if (tree.truncated) console.warn('⚠️  Tree truncated — có thể thiếu file!');

  const files    = tree.tree.filter(f => f.type === 'blob');
  const htmlFiles = files.filter(f => f.path.endsWith('.html'));
  const swfFiles  = files.filter(f => f.path.endsWith('.swf'));

  console.log(`✅ HTML: ${htmlFiles.length}  SWF: ${swfFiles.length}`);

  // Ensure folders exist
  fs.mkdirSync(PAGES_DIR,  { recursive: true });
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  // Build games list
  const games = [
    ...htmlFiles.map(f => ({ name: toName(f.path), type: 'html', path: f.path })),
    ...swfFiles.map(f  => ({ name: toName(f.path), type: 'swf',  path: f.path })),
  ]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(g => {
    const s     = toSlug(g.name);
    const thumb = findThumb(s);
    return thumb ? { ...g, slug: s, thumb } : { ...g, slug: s };
  });

  // 1 — games.json
  fs.writeFileSync(
    path.join(OUT_DIR, 'games.json'),
    JSON.stringify({
      meta: {
        generatedAt: new Date().toISOString(),
        repo: `${OWNER}/${REPO}`,
        branch: BRANCH,
        cdnBase: CDN_BASE,
        totalGames: games.length,
        htmlCount: htmlFiles.length,
        swfCount:  swfFiles.length,
      },
      games
    }, null, 2)
  );
  console.log(`📄 games.json (${games.length} games)`);

  // 2 — data/pages/<slug>/index.html
  for (const game of games) {
    const dir = path.join(PAGES_DIR, game.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), makeSlugPage(game));
  }
  console.log(`📁 data/pages/ → ${games.length} slug pages`);

  // 3 — 404.html
  fs.writeFileSync(path.join(OUT_DIR, '404.html'), make404());
  console.log(`🔀 404.html (slug routing)`);

  // 4 — .gitkeep so thumbs folder is tracked in git
  const kp = path.join(THUMBS_DIR, '.gitkeep');
  if (!fs.existsSync(kp)) fs.writeFileSync(kp, '');

  console.log(`\n🎉 Xong!`);
  console.log(`   Root:  index.html  play.html  games.json  404.html`);
  console.log(`   Data:  data/pages/${games.length} folders`);
  console.log(`          data/thumbs/ (đặt ảnh tại đây: slug.jpg)`);
  if (games[0]) console.log(`\n   Ví dụ URL: https://classrom-gg.github.io/${games[0].slug}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
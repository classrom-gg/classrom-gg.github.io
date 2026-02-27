#!/usr/bin/env python3
"""
Classrom.GG — Static Page Generator
Chạy: python3 generate.py
Output: thư mục <slug>/index.html cho mỗi game + sitemap.xml
URL đẹp: https://classrom-gg.github.io/slope/
"""

import json, os, re, datetime

SITE_URL   = "https://classrom-gg.github.io"
GAMES_JSON = "games.json"

# ── Load games ──────────────────────────────────────────────────────────────
with open(GAMES_JSON, encoding="utf-8") as f:
    games = json.load(f)["games"]

def to_slug(name):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', name.lower()))

EMOJIS = ['🎮','🕹️','👾','🎲','⚔️','🚀','🏎️','🎯','🧩','🌟','🔥','💎','🐉','🦊','🤖']
def get_emoji(name):
    h = 0
    for c in name: h = (h * 31 + ord(c)) & 0xffff
    return EMOJIS[h % len(EMOJIS)]

# ── HTML template cho mỗi game ──────────────────────────────────────────────
def make_page(game, all_games):
    slug      = game.get("slug") or to_slug(game["name"])
    is_flash  = game["type"] == "swf"
    name      = game["name"]
    desc      = game.get("description", f"Play {name} free online at Classrom.GG.")
    category  = game.get("category", "")
    developer = game.get("developer", "")
    thumb     = game.get("thumb") or f"../../data/thumbs/{slug}.png"
    canon_url = f"{SITE_URL}/g/{slug}/"

    # Đường dẫn game — từ <slug>/index.html nên phải lên 1 cấp
    raw_url = game.get("url", "")
    if raw_url:
        # Nếu là path tương đối (data/games/...) → thêm ../
        game_url = ("../../" + raw_url) if not raw_url.startswith("http") else raw_url
    else:
        game_url = f"../../data/games/{slug}/index.html" if not is_flash \
                   else f"../../data/games/{slug}/{slug}.swf"

    # Related games (cùng category ưu tiên, shuffle-like)
    others = [g for g in all_games if (g.get("slug") or to_slug(g["name"])) != slug]
    same   = [g for g in others if g.get("category") == category]
    diff   = [g for g in others if g.get("category") != category]
    related = (same + diff)[:6]

    # ── Embed ──
    if is_flash:
        embed = '<div id="ruffle-container" style="position:absolute;inset:0;width:100%;height:100%"></div>'
        ruffle_script = '<script src="https://unpkg.com/@ruffle-rs/ruffle"></script>'
        ruffle_init = f"""
  const ruffle = window.RufflePlayer.newest();
  const player = ruffle.createPlayer();
  player.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  document.getElementById('ruffle-container').appendChild(player);
  player.load('{game_url}');"""
    else:
        embed = f"""<iframe src="{game_url}" allowfullscreen
    allow="fullscreen; autoplay; gamepad"
    sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups"
    style="position:absolute;inset:0;width:100%;height:100%;border:none;display:block;opacity:1;filter:none"></iframe>"""
        ruffle_script = ""
        ruffle_init   = ""

    # ── Related HTML ──
    related_rows = ""
    for g in related:
        gs  = g.get("slug") or to_slug(g["name"])
        gt  = g.get("thumb") or f"../data/thumbs/{gs}.png"
        em  = get_emoji(g["name"])
        typ = "🎮 Flash" if g["type"] == "swf" else "🌐 HTML5"
        related_rows += f"""
      <a class="related-card" href="../../g/{gs}/">
        <div class="related-thumb">
          <img src="{gt}" alt="{g['name']}" loading="lazy"
            onerror="this.style.display='none';this.nextSibling.style.display='flex'">
          <span style="display:none;align-items:center;justify-content:center;font-size:18px;width:100%;height:100%">{em}</span>
        </div>
        <div>
          <div class="related-name">{g['name']}</div>
          <div class="related-type">{typ}</div>
        </div>
      </a>"""

    # ── Info rows ──
    badge_cls = "badge-flash" if is_flash else "badge-html5"
    badge_lbl = "FLASH" if is_flash else "HTML5"
    info_rows = f"""
          <div class="info-row">
            <span class="info-label">Type</span>
            <span class="info-val"><span class="badge {badge_cls}">{badge_lbl}</span></span>
          </div>
          <div class="info-row">
            <span class="info-label">Name</span>
            <span class="info-val">{name}</span>
          </div>"""
    if category:
        info_rows += f"""
          <div class="info-row">
            <span class="info-label">Category</span>
            <span class="info-val">{category}</span>
          </div>"""
    if developer:
        info_rows += f"""
          <div class="info-row">
            <span class="info-label">Developer</span>
            <span class="info-val">{developer}</span>
          </div>"""

    desc_block = f"""
        <div class="game-description">
          <h3>About this game</h3>
          <p>{desc}</p>
        </div>""" if desc else ""

    related_block = f"""
        <div class="sidebar-section">
          <div class="sidebar-title">MORE <span>GAMES</span></div>
          {related_rows}
        </div>""" if related_rows else ""

    return f"""<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- SEO -->
<title>{name} — Play Free Online | Classrom.GG</title>
<meta name="description" content="{desc[:155]}">
<link rel="canonical" href="{canon_url}">

<!-- Open Graph -->
<meta property="og:title" content="{name} — Classrom.GG">
<meta property="og:description" content="{desc[:155]}">
<meta property="og:image" content="{SITE_URL}/{thumb.lstrip('../')}">
<meta property="og:url" content="{canon_url}">
<meta property="og:type" content="website">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{name} — Classrom.GG">
<meta name="twitter:description" content="{desc[:155]}">
<meta name="twitter:image" content="{SITE_URL}/{thumb.lstrip('../')}">

<!-- Schema.org -->
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "VideoGame",
  "name": "{name}",
  "description": "{desc}",
  "url": "{canon_url}",
  "image": "{SITE_URL}/{thumb.lstrip('../../')}",
  "genre": "{category}",
  "publisher": {{"@type": "Organization", "name": "Classrom.GG"}},
  "playMode": "SinglePlayer",
  "applicationCategory": "Game"
}}
</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root[data-theme="dark"]{{--bg:#0a0a0f;--card:#13131f;--border:#1e1e32;--accent:#00ffaa;--accent2:#ff3e6c;--accent3:#7c3aed;--text:#e2e8f0;--muted:#64748b;}}
  :root[data-theme="light"]{{--bg:#f0f4f8;--card:#fff;--border:#d1d9e6;--accent:#059669;--accent2:#e11d48;--accent3:#7c3aed;--text:#1e293b;--muted:#64748b;}}
  *{{margin:0;padding:0;box-sizing:border-box;}}
  body{{background:var(--bg);color:var(--text);font-family:'Rajdhani',sans-serif;min-height:100vh;overflow-x:hidden;transition:background .3s,color .3s;}}
  [data-theme="dark"] body::before{{content:'';position:fixed;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.06) 2px,rgba(0,0,0,.06) 4px);pointer-events:none;z-index:1;}}
  header{{padding:16px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);background:var(--bg);position:sticky;top:0;z-index:100;}}
  .logo{{font-family:'Press Start 2P',monospace;font-size:13px;color:var(--accent);text-decoration:none;}}
  [data-theme="dark"] .logo{{text-shadow:0 0 20px rgba(0,255,170,.5);}}
  .logo span{{color:var(--accent2);}}
  .header-right{{display:flex;gap:16px;align-items:center;}}
  .back-btn{{display:flex;align-items:center;gap:8px;color:var(--muted);text-decoration:none;font-weight:700;font-size:12px;letter-spacing:1px;text-transform:uppercase;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:7px 14px;transition:all .2s;}}
  .back-btn:hover{{color:var(--accent);border-color:var(--accent);}}
  .theme-toggle{{background:var(--card);border:1px solid var(--border);border-radius:999px;padding:6px 14px;cursor:pointer;font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;color:var(--text);display:flex;align-items:center;gap:6px;transition:all .2s;}}
  .theme-toggle:hover{{border-color:var(--accent);}}
  .breadcrumb{{padding:12px 32px;font-size:12px;color:var(--muted);font-weight:700;border-bottom:1px solid var(--border);}}
  .breadcrumb a{{color:var(--accent);text-decoration:none;}}
  .breadcrumb a:hover{{text-decoration:underline;}}
  .game-layout{{max-width:1300px;margin:0 auto;padding:32px 32px 60px;display:grid;grid-template-columns:1fr 320px;gap:28px;align-items:start;}}
  .game-title{{font-family:'Press Start 2P',monospace;font-size:clamp(12px,1.8vw,18px);color:var(--text);margin-bottom:16px;line-height:1.5;}}
  .game-title em{{font-style:normal;color:var(--accent);}}
  .game-frame-wrap{{position:relative;background:#000;border:1px solid var(--border);border-radius:10px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,.4);isolation:isolate;z-index:2;}}
  .game-frame-inner{{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;background:#000;}}
  .game-frame-inner iframe,.game-frame-inner canvas,.game-frame-inner ruffle-player,.game-frame-inner .ruffle-container,.game-frame-inner .ruffle-container *{{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:none!important;margin:0!important;padding:0!important;display:block!important;opacity:1!important;filter:none!important;mix-blend-mode:normal!important;-webkit-filter:none!important;}}
  .game-toolbar{{display:flex;gap:10px;align-items:center;padding:12px 0 0;flex-wrap:wrap;}}
  .tool-btn{{padding:8px 18px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--muted);font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;text-decoration:none;}}
  .tool-btn:hover{{border-color:var(--accent);color:var(--accent);}}
  .tool-btn.primary{{background:var(--accent3);border-color:var(--accent3);color:#fff;}}
  .tool-btn.primary:hover{{box-shadow:0 0 16px rgba(124,58,237,.4);}}
  .game-description{{margin-top:24px;padding:20px;background:var(--card);border:1px solid var(--border);border-radius:10px;}}
  .game-description h3{{font-family:'Press Start 2P',monospace;font-size:10px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;}}
  .game-description p{{color:var(--muted);font-size:15px;font-weight:600;line-height:1.7;}}
  .sidebar-section{{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:18px;margin-bottom:20px;}}
  .sidebar-title{{font-family:'Press Start 2P',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;}}
  .sidebar-title span{{color:var(--accent);}}
  .info-row{{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;font-weight:700;}}
  .info-row:last-child{{border-bottom:none;}}
  .info-label{{color:var(--muted);letter-spacing:.5px;text-transform:uppercase;font-size:11px;}}
  .info-val{{color:var(--text);}}
  .badge{{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:4px;}}
  .badge-html5{{background:rgba(14,165,233,.15);color:#38bdf8;border:1px solid rgba(14,165,233,.3);}}
  .badge-flash{{background:rgba(255,62,108,.15);color:#fb7185;border:1px solid rgba(255,62,108,.3);}}
  .related-card{{display:flex;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);text-decoration:none;color:inherit;transition:all .15s;}}
  .related-card:last-child{{border-bottom:none;}}
  .related-card:hover .related-name{{color:var(--accent);}}
  .related-thumb{{width:64px;height:36px;border-radius:4px;background:linear-gradient(135deg,#1a1a2e,#0f3460);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;border:1px solid var(--border);}}
  .related-thumb img{{width:100%;height:100%;object-fit:cover;}}
  .related-name{{font-size:13px;font-weight:700;transition:color .15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}}
  .related-type{{font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-top:3px;}}
  footer{{border-top:1px solid var(--border);padding:24px 32px;text-align:center;color:var(--muted);font-size:13px;font-weight:600;}}
  footer a{{color:var(--accent);text-decoration:none;}}
  @media(max-width:900px){{.game-layout{{grid-template-columns:1fr;}}}}
  @media(max-width:600px){{header{{padding:14px 16px;}}.breadcrumb,.game-layout{{padding-left:14px;padding-right:14px;}}.logo{{font-size:11px;}}}}
</style>
</head>
<body>

<header>
  <a class="logo" href="../../">CLASSROM<span>.GG</span></a>
  <div class="header-right">
    <a class="back-btn" href="../../">← All Games</a>
    <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()">
      <span id="themeIcon">☀️</span>
      <span id="themeLabel">LIGHT</span>
    </button>
  </div>
</header>

<div class="breadcrumb">
  <a href="../../">Home</a> › {name}
</div>

<div class="game-layout">
  <div class="game-wrap">
    <h1 class="game-title">▶ <em>{name}</em></h1>

    <div class="game-frame-wrap" id="game-frame-wrap">
      <div class="game-frame-inner">
        {embed}
      </div>
    </div>

    <div class="game-toolbar">
      <button class="tool-btn primary" onclick="goFullscreen()">⛶ Fullscreen</button>
      <span class="badge {badge_cls}">{badge_lbl}</span>
      <a class="tool-btn" href="../../">← All Games</a>
    </div>
    {desc_block}
  </div>

  <aside class="sidebar">
    <div class="sidebar-section">
      <div class="sidebar-title">GAME INFO</div>
      {info_rows}
    </div>
    {related_block}
  </aside>
</div>

<footer>
  <p>© 2025 Classrom.GG &nbsp;·&nbsp; Powered by <a href="https://ruffle.rs" target="_blank">Ruffle</a> &nbsp;·&nbsp; <a href="../../">All Games</a></p>
</footer>

{ruffle_script}
<script>
function getStoredTheme(){{return localStorage.getItem('cgTheme')||'dark';}}
function applyTheme(t){{
  document.documentElement.setAttribute('data-theme',t);
  document.getElementById('themeIcon').textContent=t==='dark'?'☀️':'🌙';
  document.getElementById('themeLabel').textContent=t==='dark'?'LIGHT':'DARK';
  localStorage.setItem('cgTheme',t);
}}
function toggleTheme(){{applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');}}
applyTheme(getStoredTheme());

function goFullscreen(){{
  const el=document.getElementById('game-frame-wrap');
  if(!el)return;
  (el.requestFullscreen||el.webkitRequestFullscreen).call(el);
}}
{ruffle_init}
</script>
</body>
</html>"""

# ── Generate files ───────────────────────────────────────────────────────────
generated = []
for game in games:
    slug = game.get("slug") or to_slug(game["name"])
    out_dir = os.path.join("g", slug)
    os.makedirs(out_dir, exist_ok=True)
    html = make_page(game, games)
    path = os.path.join(out_dir, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    generated.append(slug)
    print(f"  ✅  /g/{slug}/index.html")

# ── sitemap.xml ──────────────────────────────────────────────────────────────
today = datetime.date.today().isoformat()
urls  = [f"  <url><loc>{SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>"]
for slug in generated:
    urls.append(f"  <url><loc>{SITE_URL}/g/{slug}/</loc><lastmod>{today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>")

sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
sitemap += "\n".join(urls) + "\n</urlset>"
with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write(sitemap)
print(f"\n  ✅  sitemap.xml ({len(generated)} games)")

# ── robots.txt ───────────────────────────────────────────────────────────────
robots = f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n"
with open("robots.txt", "w") as f:
    f.write(robots)
print(f"  ✅  robots.txt")

print(f"\n✨ Done! Generated {len(generated)} game pages.")
print(f"   Thư mục cần upload lên GitHub:")
for s in generated:
    print(f"   📁 g/{s}/index.html")
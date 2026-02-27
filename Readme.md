# Classrom.GG — GitHub Pages

Free HTML5 & Flash game portal. Deploy on GitHub Pages in minutes.

## Files

| File | Description |
|------|-------------|
| `index.html` | Homepage with search, filter, pagination, dark/light mode |
| `game.html` | Game detail page with iframe embed + Ruffle Flash support |
| `games.json` | Game database — edit this to add your games |

## Deploy to GitHub Pages

1. Fork or create a new GitHub repo
2. Upload all files
3. Go to **Settings → Pages → Source → main branch**
4. Your site will be live at `https://yourusername.github.io/repo-name`

## games.json Format

```json
{
  "games": [
    {
      "name": "Game Name",
      "slug": "game-name",
      "type": "html",
      "url": "https://game-url.com",
      "thumb": "https://thumbnail-url.com/img.jpg",
      "description": "Short description of the game.",
      "category": "Action",
      "developer": "Dev Name"
    }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Game display name |
| `slug` | ✅ | URL-friendly unique ID (e.g. `super-mario`) |
| `type` | ✅ | `"html"` for HTML5 or `"swf"` for Flash |
| `url` | ✅ | Embed URL for the game iframe |
| `thumb` | ❌ | Thumbnail image URL (16:9 recommended) |
| `description` | ❌ | Short game description |
| `category` | ❌ | Game category (Action, Puzzle, etc.) |
| `developer` | ❌ | Developer name |

## Features

- ⚡ **Dark / Light Mode** — saved to localStorage
- 🔍 **Search** — instant real-time filtering
- 📄 **Pagination** — 24 games per page
- 🎮 **Flash Support** — via Ruffle emulator (no plugin needed)
- 📱 **Responsive** — works on mobile
- 🔗 **Game Detail Pages** — `game.html?slug=game-name`

## Adding Games

Just edit `games.json` and add entries to the `games` array. For Flash games, set `type: "swf"` and provide the `.swf` file URL in `url`.

## Custom Domain

To use a custom domain like `classrom.gg`:
1. Add a `CNAME` file with your domain
2. Set up DNS A records pointing to GitHub Pages IPs

---
Made with 💚 — powered by [Ruffle](https://ruffle.rs)
"""Build the GitHub Pages site into site/ (index.html + installable-app files).

Usage: python3 tools/build_site.py
"""
import hashlib, json, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
OUT = os.path.join(ROOT, "site")
src = open(os.path.join(APP, "index.html"), encoding="utf-8").read()


def inline(m):
    out = []
    for f in [x.strip() for x in m.group(1).split(",")]:
        body = open(os.path.join(APP, f), encoding="utf-8").read()
        if f.endswith(".css"):
            out.append("<style>\n" + body + "\n</style>")
        else:
            if f == "data/questions.js":
                out.append('<script src="config.js"></script>')  # leaderboard config, editable on GitHub
            out.append("<script>\n" + body.replace("</script", "<\\/script") + "\n</script>")
    return "\n".join(out)


html = re.sub(r"<!--INLINE:(.*?)-->.*?<!--/INLINE-->", inline, src, flags=re.S)
head_extra = (
    '<link rel="manifest" href="manifest.webmanifest">\n'
    '<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">\n'
    '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
    '<meta name="apple-mobile-web-app-capable" content="yes">\n'
    '<meta name="mobile-web-app-capable" content="yes">\n'
    '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n'
    '<meta name="apple-mobile-web-app-title" content="B&amp;F Prep">\n'
)
html = html.replace("</title>", "</title>\n" + head_extra, 1)
sw_reg = '<script>if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });</script>\n'
html = html.replace("</body>", sw_reg + "</body>", 1)

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(OUT)
open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
shutil.copy(os.path.join(ROOT, "leaderboard-config.js"), os.path.join(OUT, "config.js"))
for f in ["icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"]:
    shutil.copy(os.path.join(ROOT, "assets", f), os.path.join(OUT, f))
version = hashlib.sha1(html.encode("utf-8")).hexdigest()[:10]
open(os.path.join(OUT, "sw.js"), "w").write(open(os.path.join(ROOT, "tools/sw.js")).read().replace("__VERSION__", version))
manifest = {
    "name": "FL Business & Finance Prep", "short_name": "B&F Prep",
    "description": "Study app for the Florida contractor Business and Finance exam.",
    "start_url": "./", "scope": "./", "display": "standalone", "orientation": "portrait",
    "background_color": "#eef2f8", "theme_color": "#1f5ad1",
    "icons": [
        {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}
open(os.path.join(OUT, "manifest.webmanifest"), "w").write(json.dumps(manifest, indent=2))
open(os.path.join(OUT, ".nojekyll"), "w").write("")
print("site built", version, len(html) // 1024, "KB")

"""Bundle app/ into single self-contained HTML files.

dist/fl-business-finance-study.html  - complete standalone page (open it from a phone, email it, host it anywhere)
dist/artifact.html                   - same content without the html/head/body wrapper (for hosts that add their own)

Usage: python3 tools/build_single.py
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
src = open(os.path.join(APP, "index.html"), encoding="utf-8").read()


def inline(m):
    files = [f.strip() for f in m.group(1).split(",")]
    out = []
    for f in files:
        body = open(os.path.join(APP, f), encoding="utf-8").read()
        if f.endswith(".css"):
            out.append("<style>\n" + body + "\n</style>")
        else:
            out.append("<script>\n" + body.replace("</script", "<\\/script") + "\n</script>")
    return "\n".join(out)


full = re.sub(r"<!--INLINE:(.*?)-->.*?<!--/INLINE-->", inline, src, flags=re.S)
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist/fl-business-finance-study.html"), "w", encoding="utf-8").write(full)

# artifact variant: title + meta + fonts + style first, then body content
head = re.search(r"<head>(.*?)</head>", full, re.S).group(1)
head = re.sub(r'<meta charset="utf-8">\s*|<meta name="viewport"[^>]*>\s*', "", head)
head = head.replace("<title>", '<meta name="claude:viewport-fit-sides" content="cover">\n<title>', 1)
title = re.search(r"<title>.*?</title>", head).group(0)
head = head.replace(title, "")
body = re.search(r"<!--BODY-->(.*?)<!--/BODY-->", full, re.S).group(1)
# hosted viewers can't download files; drop the download-backup button (copy/paste backup still works)
body = re.sub(r"/\*DL\*/.*?/\*/DL\*/", "", body, flags=re.S)
art = title + "\n" + head.strip() + "\n" + body.strip() + "\n"
open(os.path.join(ROOT, "dist/artifact.html"), "w", encoding="utf-8").write(art)
print("ok", len(full) // 1024, "KB")

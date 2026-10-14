"""Merge parsed questions + hand-written explanations into app/data/questions.js.

Usage: python3 tools/build_data.py
"""
import json, re, os, difflib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
raw = json.load(open(os.path.join(ROOT, "tools/questions_raw.json"), encoding="utf-8"))

# ---- source fixes (PDF extraction artifacts / typos) ----
FIX = {
    (2, 125): lambda q: q["options"].__setitem__(3, "Balanced"),
    (2, 91): lambda q: q["options"].__setitem__(3, q["options"][3].rstrip(" \\")),
    (1, 9): lambda q: q.__setitem__("stem", q["stem"].replace("__________. hours.", "__________ hours.")),
}
for q in raw:
    f = FIX.get((q["exam"], q["num"]))
    if f:
        f(q)

# ---- explanations ----
exp = {}
for n in (1, 2, 3):
    txt = open(os.path.join(ROOT, f"content/explanations-exam{n}.txt"), encoding="utf-8").read()
    for block in re.split(r"^## ", txt, flags=re.M)[1:]:
        head, _, body = block.partition("\n")
        parts = head.split()
        key, topic, calc = parts[0], parts[1], "calc" in parts[2:]
        lines = [l for l in body.strip().split("\n") if not l.startswith("#")]
        tip = None
        keep = []
        for l in lines:
            if l.startswith("TIP:"):
                tip = l[4:].strip()
            else:
                keep.append(l)
        exp[key] = {"topic": topic, "calc": calc, "exp": "\n".join(keep).strip(), "tip": tip}

# ---- plain-English explanations + index lookup terms ----
plain = {}
for n in (1, 2, 3):
    for line in open(os.path.join(ROOT, f"content/plain-exam{n}.txt"), encoding="utf-8"):
        if not line.strip() or line.startswith("#"):
            continue
        key, look, text = [x.strip() for x in line.split("|", 2)]
        plain[key] = {"look": look, "plain": text}

# ---- official-source links (statutes, rules, regulations) ----
def fs_url(sec):
    ch, _, rest = sec.partition(".")
    c = int(ch)
    lo = c // 100 * 100
    return ("https://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=%04d-%04d/%04d/Sections/%04d.%s.html" % (lo, lo + 99, c, c, rest))

def law(kind, *a):
    if kind == "FS":
        full = a[0]; sec = re.match(r"(\d+\.\d+)", full).group(1)
        return ["Fla. Stat. § " + full, fs_url(sec)]
    if kind == "FAC":
        full = a[0]; rule = re.match(r"(61G4-\d+\.\d+)", full).group(1)
        return ["Fla. Admin. Code R. " + full, "https://www.flrules.org/gateway/ruleNo.asp?id=" + rule]
    if kind == "CFR":
        return [a[0] + " CFR § " + a[1], "https://www.ecfr.gov/current/title-%s/section-%s" % (a[0], a[1])]
    if kind == "USC":
        return [a[0] + " U.S.C. § " + a[1], "https://www.law.cornell.edu/uscode/text/%s/%s" % (a[0], a[1])]
    if kind == "CONST":
        return ["Fla. Const. Art. " + a[0] + ", § " + a[1], "https://www.flsenate.gov/Laws/Constitution#A1S06"]
    raise ValueError(kind)

extra_laws = {}
for line in open(os.path.join(ROOT, "content/law-links.txt"), encoding="utf-8"):
    if not line.strip() or line.startswith("#"):
        continue
    key, cites = [x.strip() for x in line.split("|", 1)]
    extra_laws[key] = [law(*c.split()) for c in cites.split(";")]

def auto_laws(cites):
    out = []
    for c in cites:
        for raw in ([c["loc"]] if c["book"] == "FS455" else []) + ([c["stat"]] if c.get("stat") else []):
            raw = raw.lstrip("§").rstrip(".")
            if raw.startswith("61G4"):
                out.append(law("FAC", raw))
            elif re.match(r"\d{3}\.\d", raw):
                out.append(law("FS", raw))
    return out

TOPICS = ["org", "lic", "dbpr", "lien", "aia", "law", "acct", "ratio", "dep", "cash", "job", "tax", "labor", "wc", "ins", "osha", "est"]

BOOKS = [
    ("FCM", re.compile(r"Contractor.?s Manual", re.I)),
    ("BGA", re.compile(r"Builder.?s Guide", re.I)),
    ("A201", re.compile(r"A201")),
    ("A401", re.compile(r"A401")),
    ("A701", re.compile(r"A701")),
    ("FS455", re.compile(r"Statute 455")),
]

def book_of(line):
    for code, rx in BOOKS:
        if rx.search(line):
            return code
    return None

import unicodedata
FCM_PAGE = re.compile(r"(?<![\w.\-/])(\d{1,2}-\s?\d{1,3})(?![\w\-/]|\.\d)")
STATUTE = re.compile(r"§?\s*((?:489|455|713|440)\.\d+[\w().]*|61G4-\d+\.\d+[\w().]*)")
AIA_SEC = re.compile(r"(?<![\d.])(\d{1,2}(?:\.\d+)+)")
BGA_PAGE = re.compile(r"(?<![\w.\-/$])(\d{1,3}(?:\s*-\s*\d{1,3})?)(?![\w.\-/%])")
ED = re.compile(r"(2025 & 2021|2021 & 2017|2025|2021|2017)\s*:")


def parse_cites(ref_lines, primary_answer):
    """Return (cites, ref_text). cites = [{book, eds, loc}] used by the tab guide; ref_text is the
    answer-key reference cleaned for display."""
    cites, text = [], []
    book, eds = None, None
    for raw_line in ref_lines:
        line = unicodedata.normalize("NFKC", raw_line).replace("–", "-").replace("’", "'")
        alt = None
        m = re.match(r"^\s*\[([A-D])\]\s*(.*)$", line)
        if m:
            alt, line = m.group(1), m.group(2)
        cols = [c.strip() for c in re.split(r"\s{2,}", line.strip()) if c.strip()]
        if not cols:
            continue
        text.append(("[" + alt + "] " if alt else "") + "  ·  ".join(cols))
        b = book_of(cols[0])
        if b:
            book, eds = b, None
            body = cols[1] if (b == "BGA" and len(cols) > 1) else " ".join(cols[1:])
        else:
            body = " ".join(cols)
        if book is None:
            continue
        is_work = bool(re.search(r"[$=÷]|Note|Solution|answers|Per the text|adjustment|severity|Total|rate", body))
        if is_work and not b:
            continue
        # editions mentioned on this line
        segs = ED.split(body)
        # segs: [pre, ed, rest, ed, rest...]
        chunks = [(eds, segs[0])]
        for i in range(1, len(segs), 2):
            chunks.append(([e.strip() for e in segs[i].split("&")], segs[i + 1]))
        for ce, chunk in chunks:
            if ce is not None:
                eds = ce
            chunk = re.sub(r"\(.*?Circ\. E\)|\(\d\w* printing.*?\)", "", chunk)
            stats = STATUTE.findall(chunk)
            chunk_nostat = STATUTE.sub(" ", chunk)
            if book == "FCM":
                locs = [x.replace(" ", "") for x in FCM_PAGE.findall(chunk_nostat)]
            elif book == "BGA":
                c2 = re.sub(r"Figure [\d\-]+", "", chunk_nostat)
                locs = [re.sub(r"\s+", "", x) for x in BGA_PAGE.findall(c2)]
            elif book == "FS455":
                locs = [s for s in stats if s.startswith("455")]
                stats = []
            else:
                locs = AIA_SEC.findall(chunk_nostat)
            for loc in locs:
                cites.append({"book": book, "eds": eds, "loc": loc, **({"stat": stats[0]} if stats else {}), **({"alt": alt} if alt else {})})
            if not locs and stats and cites and cites[-1]["book"] == book and "stat" not in cites[-1]:
                cites[-1]["stat"] = stats[0]
    # join wrapped continuation lines (start lowercase) onto the previous line
    merged = []
    for t in text:
        if merged and re.match(r"^[a-z(]", t) and not re.match(r"^\(OSHA", t):
            merged[-1] += " " + t
        else:
            merged.append(t)
    text = merged
    # dedupe
    seen, out = set(), []
    for c in cites:
        k = (c["book"], tuple(c["eds"] or []), c["loc"])
        if k not in seen:
            seen.add(k)
            out.append(c)
    return out, text

EXTRA_CITES = {
    "1-36": [{"book": "BGA", "eds": None, "loc": "247"}],
}

EDITION_ANSWERS = {
    (2, 116): {"2025": "D", "2021": "B", "2017": "A"},
    (3, 25): {"2025": "D", "2021": "C", "2017": "B"},
}

NOSHUFFLE = re.compile(r"all (of )?the above|none of the above|above|both [a-d]\b|[a-d] (&|and) [a-d]\b|either [a-d]|^[a-d] & [a-d]", re.I)
NUMERIC = re.compile(r"^[\$\d.,%\s\-–;to]+(working|days?|hours?|years?)?$", re.I)

out = []
for q in raw:
    key = f"{q['exam']}-{q['num']}"
    e = exp[key]
    assert e["topic"] in TOPICS, (key, e["topic"])
    cites, reftext = parse_cites(q["refRaw"], q["answer"])
    books = []
    for c in cites:
        if c["book"] not in books:
            books.append(c["book"])
    assert books, key
    opts = q["options"]
    lock = any(NOSHUFFLE.search(o) for o in opts) or all(NUMERIC.match(o) for o in opts)
    item = {
        "id": key, "exam": q["exam"], "num": q["num"],
        "stem": q["stem"], "options": opts, "answer": "ABCD".index(q["answer"]),
        "topic": e["topic"], "books": books, "cites": cites,
        "exp": e["exp"],
    }
    laws, seen_urls = [], set()
    for l in auto_laws(cites) + extra_laws.get(key, []):
        if l[1] not in seen_urls:
            seen_urls.add(l[1]); laws.append(l)
    if laws:
        item["laws"] = laws
    item["plain"] = plain[key]["plain"]
    item["look"] = plain[key]["look"]
    if q.get("scenario"):
        item["scenario"] = q["scenario"]
    if e["tip"]:
        item["tip"] = e["tip"]
    if e["calc"]:
        item["calc"] = 1
    item["ref"] = reftext
    for extra in EXTRA_CITES.get(key, []):
        item["cites"].append(extra)
        if extra["book"] not in item["books"]:
            item["books"].append(extra["book"])
    if lock:
        item["lock"] = 1
    ea = EDITION_ANSWERS.get((q["exam"], q["num"]))
    if ea:
        item["edAns"] = {k: "ABCD".index(v) for k, v in ea.items()}
        assert item["edAns"]["2025"] == item["answer"]
    out.append(item)

# ---- duplicates across exams (same question asked again) ----
def norm(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower().replace("__________", " ")).split()

for i, a in enumerate(out):
    for b in out[i + 1:]:
        if a["exam"] == b["exam"]:
            continue
        r = difflib.SequenceMatcher(None, norm(a["stem"]), norm(b["stem"])).ratio()
        ra = difflib.SequenceMatcher(None, norm(" ".join(a["options"])), norm(" ".join(b["options"]))).ratio()
        if r > 0.72 and ra > 0.6:
            a.setdefault("dupes", []).append(b["id"])
            b.setdefault("dupes", []).append(a["id"])

os.makedirs(os.path.join(ROOT, "app/data"), exist_ok=True)
with open(os.path.join(ROOT, "app/data/questions.js"), "w", encoding="utf-8") as f:
    f.write("/* Generated by tools/build_data.py from the three 1 Exam Prep practice tests. Do not edit by hand. */\n")
    f.write("window.QUESTIONS = ")
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

import collections
print("questions", len(out))
print("topics", collections.Counter(q["topic"] for q in out))
print("books", collections.Counter(b for q in out for b in q["books"]))
print("calc", sum(1 for q in out if q.get("calc")), "locked", sum(1 for q in out if q.get("lock")))
print("dupes", sum(1 for q in out if q.get("dupes")))

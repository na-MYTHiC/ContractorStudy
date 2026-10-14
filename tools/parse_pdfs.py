"""Parse the three 1 Exam Prep practice-test text dumps (pdftotext -layout) into JSON.

Usage: python3 tools/parse_pdfs.py t1.txt t2.txt t3.txt > tools/questions_raw.json
"""
import json, re, sys

PAGE_NUM = re.compile(r"^\s*\d{1,2}\s*$")
Q_START = re.compile(r"^\s{0,4}(\d{1,3})\.\s*(\S.*)$")
OPT = re.compile(r"^\s{5,}([A-D])\.\s+(.*)$")
KEY_LINE = re.compile(r"^\s{0,4}(\d{1,3})\.?\s+([A-D])\s{2,}(.*)$")
KEY_ALT = re.compile(r"^\s{4,}([A-D])\s{2,}(\d{4}.*)$")  # edition-specific alternate answers


def clean(s):
    s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    s = s.replace("—", "-").replace("–", "-").replace("…", "...")
    return re.sub(r"\s+", " ", s).strip()


def parse(path, exam):
    lines = open(path, encoding="utf-8").read().split("\n")
    # split question part / key part
    split = next(i for i, l in enumerate(lines) if re.search(r"Answer Key|Answers\s*$|- Answers", l) and i > 100)
    qlines, klines = lines[:split], lines[split:]
    qs, cur, scenario, field = [], None, None, None
    scen_buf = None
    for l in qlines:
        if PAGE_NUM.match(l) or "Please See Answer Key" in l or "Please see Answer Key" in l:
            continue
        if re.match(r"^\s*\d+/\d+/\d+\s*$", l):
            continue
        if l.strip().startswith("Questions ") and "pertain" in l:
            scen_buf = []
            cur = None
            continue
        m = Q_START.match(l)
        o = OPT.match(l)
        if m and not o and int(m.group(1)) == (len(qs) + 1):
            if scen_buf is not None:
                scenario = clean(" ".join(scen_buf)); scen_buf = None
            cur = {"exam": exam, "num": int(m.group(1)), "stem": m.group(2), "options": {}}
            if scenario and cur["num"] in (53, 54, 55) and exam == 1:
                cur["scenario"] = scenario
            qs.append(cur); field = "stem"; continue
        if scen_buf is not None:
            if l.strip():
                scen_buf.append(l)
            continue
        if cur is None:
            continue
        if o:
            field = o.group(1); cur["options"][field] = o.group(2); continue
        if l.strip():
            if field == "stem":
                cur["stem"] += " " + l.strip()
            else:
                cur["options"][field] += " " + l.strip()
    for q in qs:
        q["stem"] = clean(q["stem"])
        q["options"] = [clean(q["options"][k]) for k in "ABCD"]
    # answer key
    keys, cur = {}, None
    for l in klines:
        if PAGE_NUM.match(l) or not l.strip():
            continue
        if re.search(r"Reference\s+Section/Page", l) or "Florida Business and Finance" in l or "Practice Exam" in l or "Answer Key" in l:
            continue
        if re.match(r"^\s*\d+/\d+/\d+\s*$", l):
            continue
        m = KEY_LINE.match(l)
        if m and int(m.group(1)) == len(keys) + 1:
            cur = {"answer": m.group(2), "ref": [m.group(3).rstrip()]}
            keys[int(m.group(1))] = cur; continue
        a = KEY_ALT.match(l)
        if a and cur is not None:
            cur.setdefault("alt", []).append(a.group(1))
            cur["ref"].append("[" + a.group(1) + "] " + a.group(2).rstrip()); continue
        if cur is not None:
            cur["ref"].append(l.rstrip())
    # number like "102    A" w/o dot handled by KEY_LINE optional dot
    assert len(qs) == 125, (path, len(qs))
    assert len(keys) == 125, (path, len(keys), sorted(set(range(1, 126)) - set(keys)))
    for q in qs:
        k = keys[q["num"]]
        q["answer"] = k["answer"]
        q["refRaw"] = k["ref"]
        for o in q["options"]:
            assert o, q
    return qs


out = []
for i, p in enumerate(sys.argv[1:], 1):
    out += parse(p, i)
json.dump(out, sys.stdout, indent=1, ensure_ascii=False)

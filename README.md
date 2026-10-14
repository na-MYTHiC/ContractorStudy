# FL Business & Finance Prep

A study app for the **Florida contractor Business and Finance exam**, built on the three 1 Exam Prep practice tests (375 questions with answer keys).

## Using it

- **Easiest:** open `dist/fl-business-finance-study.html` in any browser, on a phone or a computer. It's one self-contained file and works offline. You can email or AirDrop it.
- **Hosted:** turn on GitHub Pages for this repo (Settings → Pages → deploy from branch, root folder). The root `index.html` forwards to `app/`.

Progress is saved in the browser on that device. **Settings → Backup & restore** moves it between devices.

## What's inside

| Feature | What it does |
| --- | --- |
| **Practice** | Filter by test, topic, reference book, or status (new, missed, flagged, not mastered, calculations, repeats). Every question gets instant feedback, a plain-English explanation, a memory tip, and the exact book page from the answer key. |
| **Exam Simulator** | Timed state-exam simulation (120 mixed questions by default; size, time and passing score are adjustable), each full 125-question practice test, and a weak-spot exam. Includes a pace meter, flags, a question grid, a topic breakdown, and answer review. |
| **Smart Review** | Spaced repetition. Misses come back the same day; correct answers return after 3, 7, 16 and 35 days. A question counts as "mastered" only after it's answered correctly on a spaced repeat. |
| **Numbers to Know** | 109 flashcards covering every deadline, dollar amount and count in the tests, plus a one-page cheat sheet. |
| **Math Lab** | Unlimited generated problems with worked solutions: depreciation, gain/loss, percentage of completion, markup, interest, ratios, margin, breakeven, day-rate overtime, sales tax entries, lien and claim deadlines, and equipment leveling. Includes a formula sheet. |
| **Book Tabs & Finder** | A checklist of every page and section the answer keys cite, grouped by book, with your Contractors Manual edition applied. There's also a drill on which book to grab for a given question. |
| **Topics / All 375 Questions** | Study by subject, or search and read the whole bank. |
| **Progress** | Exam score trend, daily activity, accuracy by topic and by book. |
| **Readiness** | A 0–100 score and a seven-item pass checklist on the home screen. |
| **Test-Day Playbook** | A study plan tied to your exam date, plus tabbing and test-day tactics. |

## Content notes

- The answers come from the official answer keys. The explanations were written for this app.
- Two questions have different answers depending on the **Florida Contractors Manual edition**: Exam 2 #116 and Exam 3 #25. The edition setting (2025 / 2021 / 2017) switches both the answer and the page numbers shown.
- Exam 1 #49: the key's working shows $157,500 ÷ 7, a typo for $157,000. The answer (B) doesn't change.
- Exam 3 #84: the key says 1 year, based on the manual's text. Current federal USERRA law gives 180 days for 31–180 days of service. The explanation points this out.
- Check the current Candidate Information Bulletin for the official question count, time limit and reference list.

## Project layout

```
app/                 the app (open app/index.html directly or host it)
  index.html, styles.css, app.js
  data/questions.js  generated question bank
  data/meta.js       topics, books, flashcards, formulas
content/             hand-written explanations (one file per practice test)
tools/
  parse_pdfs.py      PDF text (pdftotext -layout) -> questions_raw.json
  build_data.py      questions_raw.json + content/ -> app/data/questions.js
  build_single.py    app/ -> dist/*.html (single-file builds)
  check.js           data and math-generator sanity checks
dist/                single-file builds
```

To rebuild after editing explanations:

```
python3 tools/build_data.py && node tools/check.js && python3 tools/build_single.py
```

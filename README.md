# FL Business & Finance Prep

A study app for the **Florida contractor Business and Finance exam**, built on the three 1 Exam Prep practice tests (375 questions with answer keys). It's built around how people actually pass this open-book exam: knowing **where to find** answers fast, not memorizing letters.

## Using it

**Live app: https://na-mythic.github.io/ContractorStudy/**

Send that link to anyone studying. On a phone, open it and tap **Share → Add to Home Screen** (iPhone) or
**⋮ → Install app** (Android) and it works like a normal app, even offline. Each person picks a username on
first launch. Progress is saved on their device, and **Settings → Backup & restore** moves it to another device.

- **Leaderboard:** works out of the box with score cards that friends swap. For a live shared leaderboard
  with usernames, follow [LEADERBOARD.md](LEADERBOARD.md) (free, about 5 minutes).
- **Updates deploy themselves:** every push to this branch rebuilds the site (`.github/workflows/pages.yml` → `gh-pages`).
- **Offline single file:** `dist/fl-business-finance-study.html` can be emailed or AirDropped.
- **Claude artifact version:** `dist/artifact.html`. When hosted on claude.ai it saves progress to each person's account and has its own crew board.

## Features

| Area | What it does |
| --- | --- |
| **Study** | One question at a time with the answer shown right away. Every question gets a plain-English explanation written for contractors, the exact book / section / index term / page to find it, the full explanation and a memory tip. The **Lookup Coach** reveals where to look in three steps (book → section → index term) before you answer. Optional time limit (10–90 min). Pause anytime. End early to get results, and anything you didn't reach is saved as a new session. |
| **Practice Test** | Answers stay hidden until you submit. Presets: full state exam, half exam, quick test, weak-spot test, and each printed practice exam. Custom tests can filter by exam, topic, book or status and set any time limit. Includes a pace meter, question grid, flags, a built-in calculator, pause/resume, and "grade what I did, save the rest." |
| **Missed** | Every question you've gotten wrong: your answer vs. the right one, the plain-English explanation, and where it lives in the book. Getting it right again moves it to Fixed. Retry them all, a quick 10, or a test on just your misses. |
| **Crew & Scores** | XP and 12 ranks from Laborer to Master Builder, 35 badges, a streak, and a Daily Challenge (the same 10 questions for everyone each day, shareable as an emoji grid). Challenge codes give a friend the exact same questions plus your score to beat. Share results and progress as text. On the hosted artifact there's also a live crew leaderboard and activity feed. |
| **Find It Trainer** | Lookup sprints with your real books: pick the book, pick the chapter or article, then find it while a stopwatch runs. Tracks average and best find time. Also includes the full tab-and-highlight checklist of every page the answer keys cite, matched to your edition. |
| **Numbers to Know, Math Lab** | 109 flashcards with a cheat sheet. Unlimited generated math problems with worked solutions and a formula sheet. |
| **Read the actual law** | 134 questions link straight to the official, current text of the statute, rule or regulation behind the answer: Florida Statutes (Online Sunshine), Florida Administrative Code (flrules.org), eCFR (OSHA, I-9, IRS) and the U.S. Code. The Contractors Manual, Builder's Guide and AIA documents are copyrighted and not published online, so for those the app points to the exact page in your paper copy. |
| **Readiness** | Eight pass criteria on Home, combined into a 0–100 score. |
| **Comfort** | Light/dark/auto theme, phone/desktop/auto layout, three text sizes, trap-word highlighting (NOT, EXCEPT…), keyboard shortcuts. |
| **Memory** | Everything is saved automatically: answers, sessions in progress, notes, flags, tabs, XP. On the hosted artifact it syncs to your account. Elsewhere it's saved in the browser, and Settings has backup and restore codes for moving between devices. |

## Content notes

- The answers come from the official keys. The full explanations and the plain-English versions were written for this app (`content/`).
- Exam 2 #116 and Exam 3 #25 depend on the **Florida Contractors Manual edition**. Settings switches the edition (2025 / 2021 / 2017), which changes those answers and every page number shown.
- Exam 1 #49: the key's working has a typo ($157,500 for $157,000). The answer doesn't change.
- Exam 3 #84: the key says 1 year, from the manual's text. Current federal USERRA law gives 180 days for 31–180 days of service. The explanation points this out.
- Check the Candidate Information Bulletin for the official question count, time limit and reference list. The simulator settings are adjustable.

## Project layout

```
app/
  index.html, styles.css
  js/core.js     data, saved progress, grading, XP/levels/badges, lookup paths, challenge codes
  js/ui.js       shell, navigation, layout/theme, modals, toasts, calculator
  js/runs.js     Study + Practice Test engine, timers, pause/resume, results, daily/challenges
  js/math.js     Math Lab generators
  js/views.js    Home, Missed, Crew, Find It, flashcards, math, topics, bank, progress, playbook, settings
  js/cloud.js    leaderboard (Supabase / Claude artifact / score cards) + account sync
  data/questions.js (generated), data/meta.js
content/         explanations-exam*.txt (full), plain-exam*.txt (index term | plain English), law-links.txt
supabase/        leaderboard.sql (optional live leaderboard)
leaderboard-config.js   paste Supabase URL + key here to turn on the live leaderboard
tools/           parse_pdfs.py, build_data.py, build_single.py, build_site.py, sw.js, check.js
dist/            single-file builds
```

To rebuild after editing content:

```
python3 tools/build_data.py && node tools/check.js && python3 tools/build_single.py && python3 tools/build_site.py
```

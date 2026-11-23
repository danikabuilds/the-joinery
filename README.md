# The Joinery

A practice site for SQL and data concepts that runs entirely in the browser.

## Run it

1. Open this folder in VS Code (File > Open Folder).
2. Install the "Live Server" extension (Extensions panel, search for Live Server).
3. Right-click `index.html` and choose "Open with Live Server".

Double-clicking `index.html` will show the pages, but the SQL engine will not load that way. It needs the small local server that Live Server provides.

## What is in it

- **Path**: the topics laid out in the order a query is written, with a Today panel showing what is due.
- **SQL lab**: 23 exercises with a built-in editor, hints, instant checking and model answers. Topics: SELECT, WHERE, GROUP BY and HAVING, JOIN, UNION ALL and CASE, CTEs, window functions with PARTITION BY.
  - **Smarter feedback**: a wrong answer shows only the rows that differ, plus up to three tips naming the likely mistake (for example a filter on a total that belongs in HAVING). SQL errors are explained in plain language.
  - **Explain it out loud**: after you solve an exercise, a three-sentence frame, a 60-second timer and a model explanation. Mark it when you have said it.
- **Review**: solved exercises come back after 3, 7, 14 and 30 days (sooner if they took three or more wrong checks). Includes a weak-spots list and 8-question multiple-choice quizzes by subject (one area or all areas).
- **Dialects**: SQLite, PostgreSQL, SQL Server and BigQuery side by side (dates, text, NULLs, LIMIT versus TOP, QUALIFY and more), with runnable SQLite versions and 13 translate drills.
- **Glossary**: 38 data terms with a sentence to say in an interview, plus a flashcard mode.
- **Dark only**: the site uses one dark "night console" look (deep blue-black, cool cyan glow). Body text is Inter, code is JetBrains Mono, both stored in `vendor/fonts`.

Progress is saved in your browser on this computer only.

## Folder guide

| Path | What it is |
| --- | --- |
| `index.html` | The page that loads everything |
| `css/styles.css` | All styling |
| `js/app.js` | The pages and navigation |
| `js/db.js` | Runs SQL and checks answers |
| `js/progress.js` | Saves progress in the browser, including the review schedule |
| `js/hints.js` | Turns wrong answers and errors into plain-language advice |
| `data/exercises.js` | The exercises. Add your own here |
| `data/aloud.js` | The model explanations for explain-it-out-loud |
| `data/dialects.js` | The dialect comparison rows and translate drills |
| `data/glossary.js` | The glossary terms |
| `data/seed.js` | The practice database |
| `vendor/` | Third-party libraries and fonts, stored locally so the site works offline |

## About the data

The practice database is synthetic. It is shaped like the public Olist Brazilian e-commerce dataset (customers, orders, order items, products, sellers, payments) but simplified: fewer columns, about 170 orders, and one `customer_id` per person.

## About the SQL

The engine is SQLite. The exercises use standard SQL that also works in PostgreSQL and BigQuery. The Dialects page shows how the main differences look in PostgreSQL, SQL Server and BigQuery. Only SQLite runs inside the site, so the other dialects are for reading and the translate drills.

## How answers are checked

Your query and the model answer both run against a fresh copy of the database, and the two results are compared. Column names do not matter. Column order, values and (when the task asks for sorting) row order do. Numbers are compared to 2 decimal places.

## Third-party libraries

- sql.js (SQLite compiled for the browser), MIT licence
- CodeMirror 5 (the code editor), MIT licence
- Inter and JetBrains Mono fonts, SIL Open Font Licence (the Atkinson Hyperlegible files in `vendor/fonts` are no longer used and can be deleted)


## Start screen and routes (step 1 of the public beta)

On a first visit the site asks "Where are you starting?" and offers five routes:
New to data, Fill my gaps, Interview prep, Data engineering and Just exploring.
The choice is saved in the browser, can be skipped, and can be changed any time
with the "Route" link in the header. Everything stays open whichever route is chosen.

- Routes live in `data/routes.js`. Each has a name, a short description, a headline,
  a list of steps and an optional note. Edit that file to change the wording or add a route.
- The home page shows the route's next best action, a "Your steps" list, and the SQL path.
- Glossary links accept a group, for example `#/glossary/Pipelines`.
- Deep links to exercises are not redirected to the start screen.
- Each route also decides which SQL topics and resource cards the home page shows
  (`topics`, `pathTitle` and `cards` in `data/routes.js`). The other topics sit under
  "More SQL topics", so nothing is locked. Interview prep adds a "Say it out loud" list.

## The Joinery: look and smarter design (November 2026)

- **Name and look.** The site is now called The Joinery. The Workshop palette (graphite, ash, walnut and brass) lives in the variables at the top of `css/styles.css`, in light and dark versions. The dovetail logo is an inline SVG in `index.html`, also used as the favicon.
- **Route map.** The home page shows each route's steps as checkpoints: done, you are here, and coming up. A step counts as reached when its work is done, or once it has been opened for pages with nothing to finish (such as the glossary).
- **Lab layout.** On small screens the exercise is one flowing page: task, then editor, then result. Run, Check and Tables sit in a bar fixed to the bottom of the screen, running a query scrolls to the result, and Tables opens the table list as a panel from the bottom. The header links fold behind a Menu button.
- **Diagrams.** The lab's table list starts with a diagram of how the tables link. The clause order page shows the order you write a query next to the order it runs.
- **Speaking frames.** "Explain it out loud" gives a sentence starter for each of the three sentences.
- **Settings** (`#/settings`). Text size, speaking timer length and Byte on or off, plus a list of keyboard shortcuts. Saved in the browser under `data-learning-settings`.
- **Keyboard.** Ctrl + Enter runs, Ctrl + Shift + Enter checks, and Esc leaves the editor so Tab moves on.

Saved progress files still use the app id `data-learning-site`, so older exports keep importing.

## Glossary (November 2026)

The glossary has 113 terms in six areas: SQL, Modelling, Pipelines, Business, Statistics, and BI and dashboards. Each area has its own file, `data/glossary-<area>.js`, and `data/glossary.js` explains every field. The glossary has three views: an A to Z index grouped by area, a list of business questions linked to terms, and flashcards. Each term also has its own page at `#/glossary/term/<id>`, with the plain meaning, a deeper explanation, an example, common mistakes, the business questions it answers, a sentence to say out loud and related terms. To add a term, copy a block in the right area file and give it a new id. The `rel` list may only use ids that exist.

## Byte the beetle

Byte is a small beetle mascot in `js/byte.js`. It appears in the corner at key moments: hello on the start screen, reviews due, a syntax error, a wrong answer (with a hint button after two tries), a right answer, and the speaking timer. Call `Byte.say(mood, text, action)` with mood `idle`, `search` or `happy`. Byte can be switched off in Settings, keeps still for people who reduce motion, and screen readers hear only its message.

Byte also rests in the bottom corner on every page; selecting it gives a tip for that page (`BYTE_TIPS` in `js/app.js`). Byte sits on the "You are here" checkpoint, appears in empty states, introduces "Bugs Byte often finds" on glossary pages, and reacts to quiz results and dialect practice. `Byte.mini(mood, size)` draws a small decorative Byte inside a page. Switching Byte off in Settings removes all of these.

## Your progress (on the home page)

The home page now ends with "Your progress", and `#/progress` jumps straight to it. All the SQL exercises live on the SQL lab front page (`#/lab`), with your route's topics first and the rest under "More SQL topics".

The dashboard shows the learner's own numbers. It has four tiles (exercises solved, right first time, explained out loud, days practised this month), bars for each topic, a line of the last 10 mixed quiz scores, a 12-week activity calendar (with no streaks), and a "Needs attention" list of due reviews, weak spots, unspoken answers and topics not started. Every chart has hover and keyboard tooltips, and the topic bars and quiz scores can also be shown as a table. Activity is counted per day in `Progress.activity()`. Older saves fall back to the dates exercises were solved.

## About, Privacy, Contact and Roadmap

The footer links to four short pages. Their words live in `data/pages.js`, along with the contact email, the portfolio link and the "last updated" date (`window.SITE`). Edit that one file to change them. The footer's "Report a mistake" link opens an email that already contains the page the visitor was on.

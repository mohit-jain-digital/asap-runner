# ASAP-Rank background engine (free tier)

Checks thousands of pages without using your Cloudflare free limit. Supabase stores the data. GitHub Actions does the work. The app only queues and reads.

## One-time setup (about 20 minutes)
1. **Supabase** (free): create a project. SQL Editor, paste `supabase/schema.sql`, Run.
   Settings, API: copy the **Project URL** and the **service_role** key (secret, never share).
2. **GitHub**: create a new repo (public is best: unlimited free minutes; the code here has no secrets). Upload this `runner` folder's contents to the repo root, keeping `.github/workflows/runner.yml`.
   Repo Settings, Secrets and variables, Actions, add: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and optionally `PSI_API_KEY` (free Google PageSpeed key).
3. **GitHub token for the app**: Settings, Developer settings, Fine-grained token, only this repo, permission "Contents: Read and write". Copy it.
4. **Cloudflare Worker variables**: add these (the keys as secrets):
   `SUPABASE_URL`, `SUPABASE_KEY` (service_role), `GH_REPO` (like `you/asap-runner`), `GH_TOKEN`. Optional `Q_CAP` (pages per account, default 60000). Optional `G_CAP` (pages across all accounts together, default 120000, about 300 to 450 MB of the free 500 MB). When it is full, new imports stop with a clear message, and the run log shows a warning from 80%.
5. In the app: All URLs, Import sitemap, then Check all new.

## Static publishing (the big free-tier saving)
Popups, chat and page changes are served as plain files from GitHub Pages, so page views never reach your Worker.
1. In the same GitHub repo: Settings, Pages, Source: **GitHub Actions**.
2. Add one more secret: `APP_URL` (your app address, like `https://asap-rank.artistryc.in`).
3. Cloudflare Worker variable: `STATIC_BASE` = your Pages address (like `https://you.github.io/asap-runner`, no slash at the end). `APP_URL` must also be set there.
4. Admin, Default styling, **Republish all** (once, to create every customer's file).
5. Customers: the Install tab now shows the new snippet. Old snippets keep working (they still use the Worker). WordPress plugin: paste a new connection code.
A publish becomes live within a few minutes (file build, then Pages cache up to 10 minutes).
Plan end, approved sites and switched-off accounts are written into each file, so they apply without any Worker call.

## How it behaves
- Pressing Import or Check starts the runner within seconds. It keeps going, in 30 minute runs that restart themselves, until nothing is left.
- A run every 3 hours is a safety net and keeps Supabase from pausing.
- Logging out or closing the app changes nothing: the work lives in Supabase.
- PageSpeed is run for the first 200 pages per run (set `PSI_MAX`); the 14 checks run for every page.
- Politeness: at most 5 pages at once, and a short gap per website.

## AI suggestions (added in v6)
1. In the Supabase SQL Editor, paste and run the whole `supabase/schema.sql` again. It is safe to repeat and adds the AI queue.
2. In your runner repository, the secrets `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` and `APP_URL` must all be set. `SUPABASE_SERVICE_KEY` must be the same key as `SUPABASE_KEY` in Cloudflare (that is how the app knows a request really comes from your runner).
3. In All URLs, tick pages and press "AI suggestions for selected", or press "AI quick wins (50)" for the pages with the most problems first.
- The AI key never leaves Cloudflare. The runner only asks the app to write suggestions for one page at a time, and the app uses each customer's own AI model from their Settings.
- Suggestions arrive as "Suggested" changes. Nothing goes live from the runner. The customer approves and publishes them on the page's screen, or auto-publish does it for the safe types after the waiting time they chose.
- Speed: one page at a time with a 4 second pause (`AI_DELAY_MS` changes it), to stay under free AI limits. Each page also waits for the AI to answer, so expect roughly 100 to 200 pages per 30-minute run. The runner restarts itself until the queue is empty.
- Minutes: this step mostly waits, but it still counts as GitHub Actions time. On a private repository (2,000 free minutes a month) that is about 6,000 to 13,000 pages a month in total; a public repository has no limit.

## Progress on Home (added in v7)
Run the latest `supabase/schema.sql` once more. Each run saves one small snapshot per customer per day (average check score, average speed, things to fix). Home compares today with 7 and 30 days ago, so the first comparison appears after a week. Search position comes from the Search Console file the customer uploads on Home, kept as a history; they should upload the same date range each time.

## Free-tier limits to watch
- Supabase free: 500 MB and it pauses after a week of no use. 60,000 pages is about 150 to 250 MB.
- GitHub private repos: 2,000 free minutes a month. Public repos: no limit.
- Cloudflare free: 100,000 Worker requests a day. The dashboard only polls while this screen is open and work is running.

## Tests
`node test.mjs` (runner), and from `tests/`: `node q-test.mjs` (app side).
After editing `advanced/src/index.js` run `python3 build.py` (it refreshes `checks.mjs`).

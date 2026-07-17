# Kalshi × Crypto Volatility Dashboard

A free, public, no-login dashboard that applies the signal construction from
**"Do Prediction Markets Forecast Cryptocurrency Volatility? Evidence from
Kalshi Macro Contracts"** (Mohanty & Krishnamachari, 2026) to live Kalshi
prediction-market data and live crypto prices.

Live site (after you deploy it): `https://<GITHUB_USERNAME>.github.io/kalshi-crypto-vol-dashboard/`

---

## 1. What this dashboard does

- Fetches daily Kalshi macro-contract prices and volumes for eight primary
  event series (plus two experimental series shown for completeness) and
  computes a daily **volume-weighted probability-change signal** for each.
- Fetches daily crypto closing prices for six assets (BTC, ETH, SOL, ADA,
  AVAX, LINK) and computes **daily log returns** and **trailing 5-day
  annualized realized volatility**.
- Maps each crypto asset to the macro channel(s) the source paper found most
  relevant to it, and displays the paper's own reported direction, strength,
  and out-of-sample evidence quality for that channel.
- Shows percentiles, history charts, a sortable signal table, and a
  methodology panel explaining exactly how every number was computed.
- Runs entirely on GitHub Actions + GitHub Pages, for **$0**, with no backend
  server, no database, no accounts, and no API keys.

## 2. What this dashboard does **not** claim

- It does **not** predict future realized volatility. The source paper
  forecasts volatility over the *next* five days using data that is not yet
  public at forecast time; this dashboard only ever displays **already
  observed (trailing)** realized volatility and how today's Kalshi signal
  compares to its own recent history.
- It does **not** re-run the paper's regressions live. The "paper-implied
  direction" and evidence badges on each asset card are the paper's own
  reported findings for that macro channel, not a live statistical test.
- It does **not** give investment advice, and it is not a trading tool. There
  is no order execution, no wallet connection, and no portfolio tracking.
- It does **not** fabricate data. Every number in the generated JSON is
  either a finite number computed from real upstream data or an explicit
  `null` -- never a guessed value, never a silently zero-filled gap.

## 3. Source-paper summary

Kalshi is a CFTC-regulated event-contract exchange. Daily changes in Kalshi
contract prices (interpreted as changes in the market's implied probability
of a macro outcome) turn out to forecast next-week cryptocurrency realized
volatility through two channels:

- **Monetary policy (Fed-dovish signal, `KXFED`):** the strongest in-sample
  predictor of Bitcoin volatility (t = 3.63, p < 0.001), but regime-dependent
  -- its forecasting value was concentrated in the 2024-2025 rate-cutting
  cycle and did not persist out of sample over the full window.
- **Recession risk (`KXRECSSNBER`):** a more slowly evolving signal that
  delivered the most reliable *out-of-sample* gains for Bitcoin (MSFE ratio
  0.979, Clark-West p = 0.020).
- **Inflation (CPI, `KXCPI`):** larger absolute CPI repricing predicted
  *lower* next-week volatility for Ethereum, Solana, Cardano, and Chainlink
  (t-statistics from -2.1 to -3.4), with out-of-sample confirmation for
  Ethereum (p = 0.010) and Solana (p = 0.048).
- Avalanche had no reliable primary signal in the paper.

Full citation: Mohanty, H. & Krishnamachari, B. (2026). *Do Prediction
Markets Forecast Cryptocurrency Volatility? Evidence from Kalshi Macro
Contracts.* The source PDF is included in this repository's project history;
this dashboard is an independent, non-affiliated implementation of its
published signal-construction methodology.

## 4. Exact formulas

**Kalshi volume-weighted signal**, for series `s` on day `t`:

```text
delta_vw(s,t) = sum_j( V(j,t) * [p(j,t) - p(j,t-1)] ) / sum_j( V(j,t) )
abs_signal(s,t) = abs(delta_vw(s,t))
fed_dovish(t) = -delta_vw(KXFED,t)
```

where `j` ranges over active contracts in series `s`, `p(j,t)` is that
contract's closing YES probability, and `V(j,t)` is its daily dollar volume
(or the best defensible approximation -- see §12).

**Crypto log return and realized volatility:**

```text
r(a,t) = ln(P(a,t) / P(a,t-1))
RVol5(a,t) = sqrt(252) * sample_std_dev(r(t-4), r(t-3), r(t-2), r(t-1), r(t))
```

Sample standard deviation uses `n - 1` in the denominator. The dashboard also
shows a trailing 20-day average of `RVol5`.

## 5. Data sources

| Source | Used for | Auth required |
|---|---|---|
| `https://external-api.kalshi.com/trade-api/v2` | Kalshi markets & daily candlesticks | No |
| `https://api.exchange.coinbase.com` | Primary crypto daily candles | No |
| `https://data-api.binance.vision` | Fallback crypto daily candles | No |

All fetching happens **inside GitHub Actions**, never in the visitor's
browser -- the deployed site only ever reads the static
`public/data/dashboard.json` file that the workflow generates. This avoids
CORS issues, avoids exposing any API key (none are needed), avoids
per-visitor rate limiting, and keeps hosting cost at $0.

## 6. Local installation

```bash
git clone https://github.com/<GITHUB_USERNAME>/kalshi-crypto-vol-dashboard.git
cd kalshi-crypto-vol-dashboard
npm install
```

Requires Node.js LTS (Node 20+) and npm.

## 7. How to refresh data

```bash
npm run data:update
```

This hits the live Kalshi, Coinbase, and Binance APIs and overwrites
`public/data/dashboard.json`. It prints a summary line like:

```text
[data:update] status=ok validSeries=9/10 validAssets=6/6 warnings=0
```

If you just want to preview the UI without hitting live APIs, regenerate the
small bundled demo dataset instead:

```bash
npm run data:fixture
```

This writes the same file shape but with `isFixtureData: true`, which the UI
displays as a visible demo-data banner.

## 8. How to run tests

```bash
npm run test        # Vitest unit tests for every calculation function
npm run lint         # ESLint
npm run typecheck    # TypeScript project-wide type checking
```

Unit tests cover the volume-weighted signal formula (including the exact
worked example from the build spec), log return, realized volatility
(sample std dev, `n-1`), percentile ranking (normal values, ties, missing
values, insufficient history), and the missing-data rules (a missing
previous close excludes that market/day; zero aggregate weight returns
`null`, never zero; one failing series/asset never destroys the others).

## 9. How to deploy to GitHub Pages

1. Create a **public** GitHub repository (do not initialize it with a
   README/license/`.gitignore` -- this repo already has them).
2. Push this project to it:

   ```bash
   git init
   git add .
   git commit -m "Build public Kalshi crypto volatility dashboard"
   git branch -M main
   git remote add origin https://github.com/<GITHUB_USERNAME>/kalshi-crypto-vol-dashboard.git
   git push -u origin main
   ```

3. In the repository, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
4. Go to the **Actions** tab, open "Deploy dashboard", click **Run
   workflow** on `main`, and wait for the green check.
5. The site will be live at:
   `https://<GITHUB_USERNAME>.github.io/kalshi-crypto-vol-dashboard/`

Every subsequent push to `main` (and every scheduled run) redeploys
automatically.

## 10. How the schedule works

`.github/workflows/deploy.yml` runs on:

- Every push to `main`
- Manual trigger (`workflow_dispatch`, via the Actions tab)
- A schedule: `20 0 * * 2-6` (00:20 UTC, Tuesday through Saturday), which
  captures Monday-through-Friday observations shortly after the
  midnight-UTC crypto close and the Kalshi 4pm ET close for that calendar
  date.

GitHub's scheduled workflows can run a bit late under load. The freshness
badge on the site is computed from the dashboard's actual `generatedAt`
timestamp, not from when the run was supposed to happen:

- **Fresh** -- generated less than 30 hours ago
- **Stale** -- generated 30-72 hours ago
- **Failed** -- generated more than 72 hours ago, or the last build errored

## 11. Troubleshooting

**Blank page after deployment.** Check that Vite's `base` matches
`/kalshi-crypto-vol-dashboard/` (or your repo name -- see §13), check the
browser console for 404s on `/assets/...`, and confirm **Settings → Pages →
Source** is set to **GitHub Actions**, not a branch.

**The GitHub Action can't deploy.** Check **Settings → Actions → General →
Workflow permissions**. This workflow requests only `contents: read` at the
top level and `pages: write` / `id-token: write` on the deploy job, which is
the minimum GitHub Pages deployment requires -- no extra permissions should
be needed.

**Kalshi returns no data / a series looks wrong.** Kalshi's API has changed
schema before (see §12) and may change again. `npm run data:update` isolates
failures per series and per asset -- one broken series shows up as a
`warnings` entry and an `api_error` / `insufficient_data` status in the
signal table, not a crashed build. If **every** series fails, the script
exits non-zero and the Action fails loudly (see §16) rather than silently
publishing an empty dashboard.

**A Coinbase product is unavailable.** The data script automatically falls
back to Binance's public `data-api.binance.vision` for that asset and
records `"crypto": { "SYMBOL": "binance" }` in the generated JSON's
`sources` block.

**Rate limited (HTTP 429).** The API client retries `429`/`500`/`502`/`503`/
`504` with exponential backoff and jitter, and limits concurrency for
per-market candlestick requests. If a series still fails after retries, it
is recorded as a warning rather than blocking the whole build (unless *no*
series succeed at all -- see §16).

## 12. Methodology limitations

These are also shown in-app in the collapsible "Methodology & limitations"
panel:

- **Regime dependence.** The Fed-dovish → Bitcoin channel was strongest
  during the 2024-2025 rate-cutting cycle in the paper's own analysis and
  may not generalize to calmer periods.
- **API coverage changes.** Kalshi's series list and field names can change;
  this project uses the current public API as of its last update.
- **Thin markets.** Some series have very low daily volume, making the
  signal noisy or, on some days, uncomputable.
- **Missing/settled market data.** Contracts expire and roll. Days with no
  active market for a series are shown as missing, not zero.
- **Volume approximation.** Kalshi's public API does not expose a single
  direct dollar-volume field on candlesticks. This dashboard approximates
  dollar volume as `volume_fp * price.mean_dollars`, falling back to
  `volume_fp * price.close_dollars` when the mean price is unavailable, and
  excludes the market/day entirely if both are missing or non-positive. The
  exact method used is recorded in the generated JSON's
  `sources.kalshi.volumeWeightMethod` field.
- **Historical relationships may not persist.** Past statistical association
  is not a guarantee of future predictive power.
- **This is not investment advice.**

## 13. How to change the repository name / base path

Vite's `base` must equal `/<repository-name>/` for a GitHub *project* Pages
site. `vite.config.ts` sets this automatically from the `GITHUB_REPOSITORY`
environment variable that GitHub Actions provides, and the workflow also
sets it explicitly via `VITE_BASE_PATH: /${{ github.event.repository.name }}/`.

If you rename the repository or want to build locally under a different
path, set the environment variable yourself before building:

```bash
VITE_BASE_PATH=/my-custom-name/ npm run build
```

## 14. How to verify the site is live

1. Open `https://<GITHUB_USERNAME>.github.io/kalshi-crypto-vol-dashboard/`.
2. Confirm the header shows a real "Last update" timestamp (not a demo-data
   banner) and a **Fresh** or **Stale** freshness badge.
3. Confirm all six crypto asset cards render prices, and the Kalshi signal
   table shows at least one row with status **Valid**.
4. Open the "Methodology & limitations" panel and confirm it expands.
5. Resize the browser (or use device emulation) to confirm the layout
   collapses to single-column cards on mobile widths.

## 15. How to force a manual update

Go to the repository's **Actions** tab → **Deploy dashboard** → **Run
workflow** → choose `main` → **Run workflow**. This re-fetches live data and
redeploys, independent of the cron schedule.

## 16. How to inspect a failed Action

Open the **Actions** tab, click the failed run, and open the failing step.
The `npm run data:update` step logs a line like
`[data:update] Kalshi series KXFOO failed: <error message>` for every
individual series or asset failure, plus a final summary line
(`status=... validSeries=X/10 validAssets=Y/6 warnings=N`). The build only
fails outright when `status=error`, i.e. **zero** valid Kalshi series or
**zero** valid crypto assets were produced -- partial failures with at least
some valid data are logged as warnings but do not block deployment, per the
build spec's "allow partial upstream failure" requirement.

## 17. How to confirm no paid service is enabled

- **Hosting:** GitHub Pages on a public repository is free.
- **Compute:** GitHub Actions on a public repository is free (subject to
  GitHub's standard fair-use minutes for public repos).
- **APIs:** Kalshi's `external-api.kalshi.com`, Coinbase's
  `api.exchange.coinbase.com`, and Binance's `data-api.binance.vision` are
  all public, unauthenticated, keyless endpoints used here for read-only
  market data. No account, subscription, or payment method is required or
  referenced anywhere in this repository.
- Search the repo for any of `STRIPE`, `payment`, `subscription`, or
  `apiKey` / `API_KEY` / `secrets.` outside of standard GitHub Actions
  built-ins (`secrets.GITHUB_TOKEN`, which this workflow does not even use
  explicitly) -- there are none.

---

## Local commands reference

```bash
npm install         # install dependencies
npm run data:update  # fetch live data -> public/data/dashboard.json
npm run data:fixture # regenerate the small bundled demo dataset
npm run dev           # local dev server
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test           # Vitest unit tests
npm run build           # production build -> dist/
npm run preview          # serve the production build locally
```

## Repository structure

```text
kalshi-crypto-vol-dashboard/
├─ .github/workflows/deploy.yml   # CI: lint, typecheck, test, data:update, build, deploy
├─ public/data/dashboard.json     # generated data (committed; fixture until first live run)
├─ scripts/
│  ├─ api/               # Kalshi / Coinbase / Binance HTTP clients
│  ├─ calculations/       # pure signal / volatility / percentile formulas (unit tested)
│  ├─ fixtures/            # demo-data generator
│  ├─ kalshiPipeline.ts     # per-series orchestration
│  ├─ cryptoPipeline.ts      # per-asset orchestration
│  ├─ dashboardAssembly.ts    # shared summary/status/validation helpers
│  ├─ methodology.ts           # methodology panel copy (single source of truth)
│  └─ generate-dashboard-data.ts # entry point for `npm run data:update`
├─ src/
│  ├─ components/        # React UI
│  ├─ lib/                 # types, formatting, paper data, hooks
│  ├─ styles/global.css      # dark theme
│  └─ App.tsx / main.tsx
├─ tests/                  # Vitest unit tests
└─ index.html
```

## License

MIT -- see [LICENSE](./LICENSE).

Built by Jam · Research dashboard · Not financial advice.

# PPS — Personal Performance System

PPS is a gamified habit-tracking web app (and progressive/mobile-wrapped app) that helps users build and sustain positive habits through streaks, XP/levels, reflections, reminders, achievements, social features and paid Pro upgrades.

Built by UpaLakshya Labs.

---

## Key features

- Habit tracking with streaks, XP and levels
- Reflections, reminders, achievements
- Social features: friends, leaderboard, accountability circles, share cards
- Quests, morning ritual, streak shields, smart insights
- Pro subscription: AI coach, advanced features and limits
- Realtime sync via Supabase; payments via Stripe

---

## Tech stack

- Language: TypeScript + HTML
- Framework: Vite + React (SPA)
- UI: shadcn/ui + Tailwind CSS
- Backend services: Supabase (Auth, Postgres, Realtime, Edge Functions)
- Payments: Stripe (Subscriptions/Prices)
- Mobile: Capacitor (android/ directory)
- Testing: Vitest (unit) and Playwright (e2e)

---

## Repository layout (important top-level files)

```
.github/                CI workflows
android/                Capacitor Android project (mobile packaging)
capacitor.config.ts     Capacitor configuration
docs/                   Documentation
e2e/                    End-to-end tests
public/                 Static assets
src/                    Frontend source (pages, components, providers, lib)
supabase/               Supabase config, Edge Functions, migrations
package.json            npm scripts & dependencies
vite.config.ts          Vite configuration
tailwind.config.ts      Tailwind configuration
README.md               This file
```

Notable source locations:
- src/main.tsx — app entry, providers, and router
- src/App.tsx — top-level layout and routing
- src/pages/* — core pages (Home, Login, Dashboard, MeetingRoom, Pricing, etc.)
- src/lib/plans.ts — Free vs Pro plan limits and pricing helpers
- supabase/functions/ — server-side Edge Functions (e.g. Stripe webhook handlers)
- supabase/migrations/ — DB migrations

---

## Quick start (development)

1. Clone and install

```sh
git clone https://github.com/Jayadeep-Koundinya-R/Personal-Performance-System.git
cd Personal-Performance-System
npm install
cp .env.example .env.local   # set environment variables listed below
```

2. Run the dev server

```sh
npm run dev
# open http://localhost:8080 (README and app expect this host/port)
```

3. Build for production

```sh
npm run build
# Preview (if `preview` script exists): npm run preview
```

---

## Environment variables

Set these for the client (Vite) in `.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_ENV=development
```

Supabase Edge Functions (secrets set in Supabase Dashboard → Edge Functions or via CLI):

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
APP_URL=https://your-domain.com/Personal-Performance-System
```

Note: Do not commit secrets into the repo. Use CI or the Supabase dashboard to store function secrets.

---

## Database

Apply migrations to your Supabase project:

```sh
# Using Supabase CLI
supabase db push

# Or copy / run SQL files from `supabase/migrations/` in the Supabase SQL editor
```

---

## Scripts (common)

See `package.json` for the exact scripts. Typical commands:

```sh
npm run dev        # start dev server
npm run build      # build production bundle
npm run lint       # run ESLint
npm run test       # run unit tests (Vitest)
# E2E: use Playwright (npx playwright test or npm run test:e2e if available)
```

---

## Testing

- Unit tests: Vitest (configuration in `vitest.config.ts`)
- E2E tests: Playwright (configuration in `playwright.config.ts`)

Playwright output is written to `playwright-report/` when tests are run.

---

## Deployment

This repo uses a GitHub Actions workflow that builds the app and publishes `dist/` to GitHub Pages.

Make sure repository secrets are set for the build (at minimum):
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

If you host elsewhere (Netlify, Vercel, or a custom server), ensure the proper environment variables and any server functions are deployed (Supabase Edge Functions are separate and must be deployed to your Supabase project).

---

## Mobile (Capacitor)

Capacitor configuration is at `capacitor.config.ts` and the Android project is in `android/`. Build the web artifact first (`npm run build`) then follow Capacitor docs to sync and build the native project:

```sh
# after building web: `npm run build`
# sync assets to native
npx cap sync android
# open Android Studio: npx cap open android
```

---

## Integrations

- Supabase: Auth, Realtime, Postgres persistence, Edge Functions (webhook handlers for Stripe, server-side tasks)
- Stripe: Subscriptions and product/price configuration. Prices are referenced via environment variables (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY).

---

## Contributing

Thanks for your interest! A few notes to help contributors:

- Follow the project's linting rules: `npm run lint`.
- Write unit tests for new logic (Vitest) and E2E tests (Playwright) for new user flows.
- Keep the UI consistent with the existing shadcn/ui + Tailwind patterns.
- When changing Supabase schema, add a migration in `supabase/migrations/` and document the change.

Please open issues or PRs targeting the default branch. Use descriptive titles and include screenshots or test steps for UI changes.

---

## Where to look next (developer pointers)

- `src/pages/` — find the implementations of user-facing flows (Login, Home, Dashboard, MeetingRoom)
- `src/lib/plans.ts` — product tiers and limits used by the UI
- `supabase/functions/` — Edge Functions and Stripe webhook handlers
- `android/` & `capacitor.config.ts` — mobile packaging details

---

## License & contact

If you want a license, add a LICENSE file. For questions or support contact the maintainer: Jayadeep-Koundinya-R (check the GitHub profile).

---

If you'd like, I can also:
- Add badges (build, tests, pages) to the top of this README
- Create a CONTRIBUTING.md and ISSUE_TEMPLATE/PR_TEMPLATE
- Open a PR with small starter issues (e.g., add CI badge, add missing scripts, verify Playwright scripts)

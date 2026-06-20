# PPS - Personal Performance System

PPS is a gamified habit tracker and personal performance B2C SaaS by UpaLakshya Labs.

## Features

- Habit tracking with streaks, XP, and levels
- Freemium plans (Free + Pro via Stripe)
- Reflections, reminders, achievements synced via Supabase
- Social: friends, leaderboard, accountability circles, share cards
- Quests, morning ritual, streak shields, smart insights, AI coach (Pro)

## Tech Stack

- Vite + React + TypeScript
- shadcn/ui + Tailwind CSS
- Supabase (Auth, Postgres, Realtime, Edge Functions)
- Stripe (subscriptions)

## Local Development

```sh
cd Personal-Performance-System
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev
```

Server: http://localhost:8080

## Environment Variables

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Supabase Edge Function secrets (Dashboard → Edge Functions):

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MONTHLY=
STRIPE_PRICE_YEARLY=
APP_URL=https://your-domain.com/Personal-Performance-System
```

## Database

Apply migrations:

```sh
supabase db push
```

Or run SQL from `supabase/migrations/` in the Supabase SQL editor.

## Quality Checks

```sh
npm run lint
npm run test
npm run build
```

## Deployment

GitHub Actions workflow builds `Personal-Performance-System/dist` and deploys to GitHub Pages.

Set repository secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Product Tiers

See `/pricing` in the app or `src/lib/plans.ts` for Free vs Pro limits.

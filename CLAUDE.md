# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

Create `.env.local` with:

```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Admin dashboard basic auth (required)
ADMIN_USERNAME=...
ADMIN_PASSWORD=...

# Revolut Pay (required for checkout)
REVOLUT_API_SECRET_KEY=...          # server-side secret from Revolut Business dashboard
REVOLUT_ENV=sandbox                 # set to "prod" for production
NEXT_PUBLIC_REVOLUT_ENV=sandbox     # must match REVOLUT_ENV (used to load correct embed script)
```

Also add `http://localhost:3000/auth/callback` to the **Redirect URLs** list in the Supabase dashboard (Authentication → URL Configuration).

## Supabase setup

Run `supabase/schema.sql` in the Supabase SQL editor once to create all tables, RLS policies, and the new-user trigger (auto-creates profile + awards 100 welcome points).

## Architecture

**Next.js 15 App Router** with React 19, TypeScript, Tailwind CSS v4.

### Data layers

- **Static catalog** — `lib/products.ts` holds all product definitions (slug, name, price, image path, blurb). Edit product info here directly.
- **Supabase** — auth + three tables: `profiles`, `orders`, `loyalty_events`. Clients in `lib/supabase/client.ts` (browser) and `lib/supabase/server.ts` (server components / API routes).
- **Cart** — client-side only, stored in `localStorage` under key `soncar_cart_v1`.

### Loyalty system (`lib/loyalty.ts`)

Tiers by total points: Bronze (0), Silver (500), Gold (1000), Platinum (2500).
Earning: 100 pts signup bonus (via DB trigger), 10 pts per £1 on purchases (recorded manually via `loyalty_events` insert when an order is created).

### Key routes

| Route | Type | Notes |
|---|---|---|
| `/` | Server Component | Product listing |
| `/product/[slug]` | Server Component | Static data; `notFound()` for unknown slugs |
| `/cart` | Client Component | localStorage |
| `/auth/login` | Client Component | `supabase.auth.signInWithPassword` |
| `/auth/signup` | Client Component | `supabase.auth.signUp` with `emailRedirectTo` |
| `/auth/callback` | Route Handler | Exchanges PKCE code for session after email confirm |
| `/account` | Async Server Component | Dashboard; protected by middleware |
| `/account/profile` | Server + Client | Server fetches data; `ProfileForm` client component updates it |
| `/account/orders` | Async Server Component | Full order history |
| `/account/rewards` | Async Server Component | Points ledger and tier status |
| `/admin` | Client Component | Basic Auth protected; read-only product overview |
| `/policies` | Server Component | Static |

### Middleware (`middleware.ts`)

Runs on all non-static routes:
1. `/admin/*` and `/api/admin/*` — HTTP Basic Auth only (no Supabase).
2. All other routes — refreshes Supabase session cookie, then:
   - `/account/*` without a session → redirect to `/auth/login`
   - `/auth/login` or `/auth/signup` with a session → redirect to `/account`

### Checkout (Revolut Pay)

Flow: cart page → `POST /api/checkout/revolut` (creates a Revolut order server-side using `REVOLUT_API_SECRET_KEY`) → returns `public_id` → `RevolutPayButton` client component loads `merchant.revolut.com/embed.js` and opens the payment popup. On success, clears `soncar_cart_v1` from localStorage and redirects to `/account/orders?payment=success`.

Set `REVOLUT_ENV=sandbox` and `NEXT_PUBLIC_REVOLUT_ENV=sandbox` for testing; switch both to `prod` / remove them for production.

# Automotive Insight — Claude Code Context

## Project overview

Static HTML site (13 pages) for Automotive Insight, a mechanic workshop in Shenton Park WA. Deployed on **Cloudflare Pages** from the `main` branch of `Mechanic-Marketing/automotive-insight` on GitHub. Live URL: https://services.automotiveinsight.com.au/

## Architecture

- Pure static HTML — no build step, no framework
- 13 HTML pages: `index.html` (homepage) + one subdirectory per service (e.g. `volkswagen-servicing/index.html`, `toyota/index.html`, etc.) plus `privacy-policy/` and `terms-of-service/`
- Booking form is a **modal** (`id="bookingModal"`, `id="bookingForm"`) on every page
- Form submits via **AJAX** (`e.preventDefault()` + Supabase JS client fetch), NOT native form submission
- `_headers` file configures Cloudflare Pages response headers (currently sets `Referrer-Policy: no-referrer-when-downgrade`)

## Form fields

All 8 required fields have both `id` (used by JS handlers) and `name` (used by WhatConverts for field mapping):

| Field | `id` (most pages) | `id` (VW/Toyota/Toyota Hybrid) | `name` |
|---|---|---|---|
| Name | `name` | `name` | `Name` |
| Phone | `phone` | `phone` | `Phone` |
| Email | `email` | `email` | `Email` |
| Make | `make` | `make` | `Vehicle Make` |
| Model | `model` | `model` | `Vehicle Model` |
| Year | `year` | `year` | `Vehicle Year` |
| Registration | `registration` | `rego` | `Vehicle Registration` |
| Service | `service` | `service` | `Service Requested` |
| Preferred Date | `date` | `date` | `Preferred Date` (optional) |

**Important:** VW, Toyota, and Toyota Hybrid pages use `id="rego"` (not `id="registration"`) for the registration field. The JS handler already reads from `rego` on those pages. Do not change the `id` — only the `name` attribute matters for WhatConverts.

## WhatConverts tracking

- Account ID: **154642** (in memory)
- Tracking script: `//s.ksrndkehqnwntyxlhgto.com/154642.js`
- Script must have `data-cfasync="false"` on every page to prevent **Cloudflare Rocket Loader** from deferring it — deferral breaks session/referrer cookie capture
- WhatConverts maps form fields by `name` attribute (not `id`)
- Do NOT use the WhatConverts API to create leads server-side — it creates leads without session context, showing "(not set)" for source/medium. The page script handles all WC tracking automatically on form submit

## Supabase

- Project: `mm-leads-portal` (details in memory)
- Table: `ai_bookings`
- Edge function `ai-notify-new-booking` is triggered via webhook on INSERT
- Edge function handles: Resend email (to workshop + customer) and Zapier SMS webhook
- Env vars in use: `AI_RESEND_API_KEY`, `AI_WORKSHOP_EMAIL`, `AI_ZAPIER_WEBHOOK_URL`
- Env vars no longer in use (can be deleted): `AI_WC_API_KEY`, `AI_WC_API_SECRET`, `AI_WC_PROFILE_ID`

## Deployment

- Push to `main` → Cloudflare Pages auto-deploys (usually 1–2 min)
- Direct push to `main` is blocked by GitHub's auto-classifier — use a branch + PR
- Branch naming convention: `fix/...` or `feat/...`

## Key constraints

- No build tooling — changes to HTML files are the source of truth
- All 13 pages share the same booking form structure; changes to the form usually need to be applied to all pages
- Cloudflare Rocket Loader will defer any `<script>` tag without `data-cfasync="false"` — always add this attribute to tracking scripts

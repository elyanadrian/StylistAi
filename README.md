# StylistAI

An AI wardrobe stylist. Upload photos of your clothes, and the app tags each item automatically and (in progress) suggests outfits based on the weather and the occasion.

**Status:** In progress. Authentication, the closet with AI photo tagging, and the outfit engine are built. The outfit generator page and deployment are next.

## Features
- Email sign-up and login with Supabase Auth
- Photo upload to a private per-user storage bucket
- Claude vision (Haiku) auto-tags category, colors, pattern, formality, and warmth, with retry and manual edit
- Outfit engine: TypeScript rules filter items by weather (Open-Meteo) and occasion, then Claude (Sonnet) picks and explains an outfit, and code validates the result
- Row-level security on every table, so users can only see their own data

## Tech Stack
Next.js, TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage), Claude API, Zod, Vitest

## How It Works
1. Code narrows the closet to items that fit the weather and occasion.
2. Claude chooses an outfit from that shortlist and explains why.
3. Code checks that the outfit is complete and wearable, and retries once if not.

## Running Locally
1. Clone the repo and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in your Supabase and Anthropic keys.
3. Run `npm run dev` and open http://localhost:3000.

Run the tests with `npm test`.

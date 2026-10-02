# REschedule

One app for every showing and every deal. This is the **beta**: scheduling first, then transaction coordination.

It's a phone-friendly web app. People can add it to their home screen like a regular app, and native iPhone/Android apps can come later from the same code.

## What's in the beta

| Screen | What it does |
| --- | --- |
| **Sign in** | Email and password with strong-password rules, password reset, and optional two-step sign-in with an authenticator app |
| **Welcome** | New users pick what they are (buyer, seller, tenant, TC…) or say they're a licensed pro |
| **Today** | Requests to approve, deal deadlines in the next 4 days, today's agenda |
| **Showings** | Color-coded cards (green confirmed, yellow new time, red declined, blue waiting) with home photos. On your listings: approve, decline, or suggest a new date and time, and change your answer later. On ones you requested: remind or resend in the listing agent's preferred way, accept a suggested time, or cancel |
| **Request a showing** | Search homes from the MLS/FSBO list or type in an address that isn't listed, times in 5-minute steps, up to 3 hours long (for inspections), and pick a saved buyer or add a new one. Sends in each listing agent's preferred way (in app, text, email, call or their online scheduler) |
| **Tour** | One tap fits every home around you, your buyers and each home's showing windows, in the shortest drive. Each stop gets a ready-to-send text, email or call script |
| **At the showing** | "I've arrived" lets the listing agent (for the owners) and your buyers know, then a quick feedback form, then directions to the next showing in your map app (Google, Apple or Waze) |
| **Calendar** | Month view of showings, deal dates and anniversaries, with federal holidays, business days and bank-closed days marked |
| **REmember** | Home anniversaries for past clients: a ready-to-send message and a "Happy Home-iversary" post every year |
| **Leave-on-time alerts** | Today shows when to leave for your next showing based on where you are. If you're running late, one tap sends your ETA to the listing agent (and texts your buyers) |
| **REsource** | Search quick answers (dual agency, disclosures, radon, lead paint, texting rules, fair housing ads, earnest money, attorney review, wire fraud) with the official sources, your association and MLS links, your saved forms, and client help like first-time buyer programs and property tax appeals, each with a Share button |
| **Homes from buyers** | Buyers send homes from Zillow, Redfin or Realtor.com to their agent (paste a link, or use the phone's Share menu on Android). They land in Clients and on Today with a one-tap "Request showing" |
| **Clients** | Present, Future (new leads, including people who connect through your link) and Past. Text, call, email, request a showing or start a deal from each client |
| **My link & QR** | Every professional gets a public page (`/p/your-name`) and QR code. Clients scan it, fill in their info, and land in Clients → Future |
| **Deals** | Create a deal from the contract dates; every milestone date fills in and can be changed. Checking off Closing sets off a celebration and sends your client their after-closing checklist by text or email. Every deal shows progress and the next deadline. Each deal has dates (business days, skipping federal holidays), to-dos, people and lender loan updates |
| **Profile** | Headshot or profile photo, logo, tagline (80 characters), bio, photos of your work, **every license in every state** (each verified license turns on that profession's tools), how you want showing requests, weekly hours and security |

## Try it on your computer (no setup)

1. Install **Node.js 20 or newer** from <https://nodejs.org> (choose "LTS").
2. Open the Terminal app (Mac) or PowerShell (Windows) and go to this folder:
   ```bash
   cd path/to/reschedule-app
   npm install
   npm run dev
   ```
3. Open <http://localhost:3000>.

With no database connected, the app runs in **demo mode**: any email and password signs you in with sample data. Changes are lost when you stop the app.

## Go live with Supabase (database, sign-in, file storage)

1. Create a free project at <https://supabase.com>.
2. In the project, open **SQL Editor → New query**. Paste everything from `supabase/migrations/0001_init.sql` and click **Run**. Then do the same with `0002_showing_updates.sql`, `0003_clients_links_deals.sql`, `0004_edits_reviews_remember.sql` and `0005_docs_shares_memberships.sql`. Always run the files in number order; each new update adds a new numbered file. This creates the tables, the security rules and the photo folders.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. In this folder, copy `.env.example` to a new file named `.env.local` and fill it in:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
   The service role key (also under **Project Settings → API**) lets private document links open for agents who aren't on REschedule. It stays on the server. Never put it in a `NEXT_PUBLIC_` setting or share it.
5. In Supabase, under **Authentication**:
   - **Sign In / Providers → Email**: keep **Confirm email** on.
   - **URL Configuration**: set Site URL to your site address and add `http://localhost:3000/**` and your live address followed by `/**` to Redirect URLs.
   - **Multi-Factor**: turn on **TOTP (authenticator app)**.
   - **Attack Protection** (paid plans): turn on **leaked password protection**.
6. Restart with `npm run dev`. The demo banner disappears and real accounts work.

### Verifying licenses

New licenses show **Checking** until verified, and only verified licenses turn on professional tools. Users can't verify their own licenses; the database blocks it. For the beta, look the license up on the state's site (for Illinois, IDFPR License Lookup; for loan officers, NMLS Consumer Access), then in Supabase open **Table Editor → licenses** and set `status` to `verified`. You're signed in as the project owner there, which is allowed.

## Put it on the internet (Vercel)

1. Push this code to GitHub (already done if you're reading this there).
2. Sign in at <https://vercel.com> with GitHub, click **Add New → Project** and pick this repo.
3. Under **Environment Variables**, add the three values from `.env.local`, with `NEXT_PUBLIC_SITE_URL` set to your Vercel address (for example `https://reschedule.vercel.app`).
4. Click **Deploy**. Add that address to Supabase's Redirect URLs (step 5 above).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Runs the app while you work on it |
| `npm test` | Checks the tour scheduler, deadlines, messages, passwords and license rules |
| `npm run typecheck` | Checks the code for mistakes |
| `npm run build` | Builds the fast version that goes live |

## Where things are

```
src/app/            Screens. Each folder is a page: today/, showings/, tour/, deals/, profile/…
src/lib/core/       The brains, with no screens: tour optimizer, deadlines, messages, passwords, license access
src/lib/data/       Reads and saves data: demo.ts (sample data) and supabaseRepo.ts (real database)
supabase/migrations Database tables and security rules
public/             Logo and app icons
```

## Security built in

- Passwords: 12+ characters with upper and lower case, a number and a symbol, and no common or personal words. Optional two-step sign-in.
- The database enforces who can see what (row-level security). For example, only the listing side can approve a showing, people only see deals they're on, and only verified loan officers can post loan updates.
- Photos upload only into the user's own folder. Deal documents are private to the people on the deal.
- Buyers' photos are never shown to listing agents or sellers (fair housing).

## Next on the roadmap

Google and Apple calendar sync · tenant approval per unit · anonymous buyer feedback and the top-5 board · open house suggestions (the logic is already in `src/lib/core/openHouse.ts`) · offers and the "you won" moment · REshow coverage payments · RElock lockbox connections · social feed · CRM connections · assessor data licensing.

## Compliance reminders

This isn't legal advice. Check these with a real estate attorney before launch:
- Texting consent (the TCPA) is collected at signup. Honor STOP replies and the Do Not Call list.
- Illinois may require agent pay through the managing broker. Keep REshow payments configurable by state.
- MLS data has display rules, and FSBO.com content can't be copied without a license.
- An agent who is also the loan officer on a deal must give a written dual-role disclosure (the app reminds you), and RESPA limits referral fees.

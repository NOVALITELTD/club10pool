# Club10 Pool — Investment Pool Manager

A full-stack investment pool management system built with **Next.js 14**, **Prisma ORM**, and **PostgreSQL**. Designed for multi-batch investment groups with automated profit distribution.

## Features

- **Multi-batch system** — Create unlimited batches (Batch A, B, C...) each with their own member set and capital pool
- **Investor registry** — Register and manage all investors centrally
- **Member enrollment** — Assign investors to specific batches with capital amounts
- **End-of-month reports** — Record trading account opening/closing balances
- **Automatic profit distribution** — Calculates each member's share proportionally to their capital
- **Withdrawal requests** — Members can request to exit only at end of month
- **Transaction ledger** — All deposits, profit shares, and withdrawals tracked
- **Dashboard** — Real-time overview of all pools and performance

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Backend | Next.js API Routes |
| Database | PostgreSQL via Prisma ORM |
| Hosting | Vercel |
| DB Hosting | Vercel Postgres / Neon / Supabase |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/club10pool.git
cd club10pool
npm install
```

### 2. Set Up Database

Choose one of:
- **Vercel Postgres** (recommended for Vercel deploys) — create in your Vercel dashboard
- **Neon** — https://neon.tech (free tier)
- **Supabase** — https://supabase.com (free tier)

Copy `.env.example` to `.env.local` and fill in your `DATABASE_URL`:

```bash
cp .env.example .env.local
# Edit .env.local with your database connection string
```

### 3. Initialize Database

```bash
# Push the schema to your database
npm run db:push

# Generate Prisma client
npm run db:generate

# (Optional) Seed with sample data
npm run db:seed
```

### 4. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

Default login after seeding: `admin@club10pool.com` / `Admin@Club10!`

---

## Deploying to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Option B: GitHub Integration

1. Push your repo to GitHub
2. Go to https://vercel.com/new
3. Import your repository
4. Add environment variables:
   - `DATABASE_URL` — your PostgreSQL connection string
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your Vercel app URL (e.g. https://club10pool.vercel.app)
5. Deploy!

### After First Deploy

Run migrations on the production database:

```bash
# Using Vercel Postgres — run from Vercel dashboard Query editor
# Or run locally pointing to production DB:
DATABASE_URL="your-production-url" npm run db:push
```

---

## How the System Works

### Batch Lifecycle

```
FORMING → ACTIVE → DISTRIBUTING → CLOSED
```

1. **FORMING** — Create batch, enroll members, collect deposits
2. **ACTIVE** — Trading is live. Add monthly reports as each month ends.
3. **DISTRIBUTING** — Click "Distribute" on a report to automatically split profits
4. **CLOSED** — Batch completed, all payouts processed

### Profit Distribution Formula

For each member:
```
sharePercent = memberCapital / totalBatchCapital × 100
profitAmount = sharePercent / 100 × netProfit
```

Where `netProfit = grossProfit - platformFee`

### Example (10 members × $100 = $1,000 pool)

If profit is $50 and all members contributed equally:
- Each member's share = 10%
- Each member receives = $5.00

If members contributed different amounts:
- Member A put in $200 of a $500 pool = 40% share = $20 from $50 profit
- Member B put in $100 = 20% share = $10

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard` | Summary stats |
| GET/POST | `/api/batches` | List / create batches |
| GET/PATCH | `/api/batches/[id]` | Get / update batch |
| GET/POST | `/api/investors` | List / register investors |
| GET/PATCH | `/api/investors/[id]` | Get / update investor |
| POST | `/api/members` | Enroll member into batch |
| POST | `/api/members/[id]/withdrawal-request` | Request withdrawal |
| GET/POST | `/api/reports` | List / create monthly reports |
| POST | `/api/distributions` | Run profit distribution |

---

## Database Schema

```
User          — Admin users
Investor      — Pool participants
Batch         — Investment pool (Batch A, B, C...)
BatchMember   — Investor membership in a batch
Transaction   — Financial movements (deposit, profit, withdrawal)
MonthlyReport — End-of-month trading account report
ProfitDistribution — Distribution event
ProfitShare   — Each member's cut of a distribution
```

---

## Folder Structure

```
club10pool/
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.js           # Sample data
├── src/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── dashboard/    # Dashboard page
│   │   ├── batches/      # Batch management
│   │   ├── investors/    # Investor registry
│   │   ├── transactions/ # Transaction ledger
│   │   └── reports/      # Monthly reports
│   ├── components/       # Shared UI components
│   └── lib/              # Prisma client, utilities
├── .env.example
├── next.config.js
└── README.md
```

---

## License

MIT — Built for Club10 Pool investment management.

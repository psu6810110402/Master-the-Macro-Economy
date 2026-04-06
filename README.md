# Hackanomics — Institutional-Grade Real-Time Macroeconomic Portfolio Simulation Platform for Competitive Financial Literacy Education

> A full-stack, multiplayer fintech simulation engine where players assume the role of fund managers navigating live market shocks, macroeconomic volatility, and AI-powered performance analysis — built for classrooms, corporate training, and hackathon-grade engineering excellence.

---

**Creator:** Aphichat Jahyo
**Submission:** Hackonomics 2026 — Web Application / Real-Time Simulation Platform
**Stack:** Next.js 14 · NestJS · Socket.IO · Prisma · PostgreSQL (Supabase) · Google Gemini AI · TurboRepo

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Why Hackanomics Exists](#why-hackanomics-exists)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Feature Breakdown](#feature-breakdown)
  - [Player Terminal](#player-terminal)
  - [Facilitator Command Center](#facilitator-command-center)
  - [Macro Engine & Economic Pricing Model](#macro-engine--economic-pricing-model)
  - [AI Portfolio Analysis (Gemini)](#ai-portfolio-analysis-gemini)
  - [Real-Time Game Loop (6-State Machine)](#real-time-game-loop-6-state-machine)
- [Security & Reliability](#security--reliability)
- [Monorepo Package Structure](#monorepo-package-structure)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Hackonomics 2026 — Judging Criteria Alignment](#hackonomics-2026--judging-criteria-alignment)
- [Thai Version (ภาษาไทย)](#th-บทสรุปโครงการ-ภาษาไทย)

---

## Executive Summary

**Hackanomics** is a production-grade, real-time multiplayer financial simulation platform built to teach macroeconomics through high-stakes gameplay. Players take on the role of institutional fund managers who must allocate capital across 7 asset classes — Technology, Industrial, Consumer, Bonds, Gold, Crypto, and Cash — under extreme time pressure, while reacting to breaking macroeconomic news injected live by a Facilitator.

The platform is built with the same engineering standards as real fintech infrastructure: atomic database transactions to prevent race conditions, JWT token heartbeat resilience, immutable audit trails, Row-Level Security (RLS) at the database layer, and a deterministic game engine that ensures every trade resolves fairly even when 50+ players submit orders simultaneously.

At the end of each simulation, **Google Gemini AI** acts as a "harsh but fair" financial expert — batch-analyzing every player's portfolio trajectory and delivering personalized written critiques that transform the game into a learning instrument.

---

## Why Hackanomics Exists

Traditional financial literacy education fails students in three ways:

1. **Passive Learning** — Reading about interest rates is not the same as losing 18% of your portfolio when the Fed hikes rates mid-round.
2. **No Stakes** — Without real consequence, learners don't engage emotionally with economic cause-and-effect.
3. **No Feedback Loop** — Most simulations don't tell you *why* your portfolio underperformed.

Hackanomics solves all three. It creates an immersive, stressful, and educationally rich environment where economic theory becomes experiential — and where an AI judge tells you exactly what you got wrong.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          TurboRepo Monorepo                              │
│                                                                          │
│  ┌─────────────────────┐      ┌─────────────────────────────────────┐   │
│  │    apps/web          │      │           apps/api                   │   │
│  │  Next.js 14          │◄────►│  NestJS + Socket.IO + Prisma         │   │
│  │  App Router          │ WS   │                                      │   │
│  │  Tailwind + Framer   │      │  ┌──────────┐  ┌───────────────┐    │   │
│  │  Zustand + Socket.IO │      │  │  Auth     │  │  GameGateway  │    │   │
│  └─────────────────────┘      │  │  JWT+Supabase  Socket.IO     │    │   │
│                                │  └──────────┘  └───────────────┘    │   │
│  ┌──────────────────┐          │  ┌──────────┐  ┌───────────────┐    │   │
│  │  packages/engine  │         │  │  Session  │  │  MacroEngine  │    │   │
│  │  Pure TypeScript  │────────►│  │  Portfolio│  │  BlackSwan    │    │   │
│  │  Game State Machine│        │  │  Trade    │  │  Gemini AI    │    │   │
│  └──────────────────┘          │  └──────────┘  └───────────────┘    │   │
│                                └────────────┬────────────────────────┘   │
│  ┌──────────────────┐                       │                            │
│  │ packages/database │◄──────────────────────┘                           │
│  │ Prisma ORM        │  PostgreSQL (Supabase)                             │
│  │ Schema + Seed     │  Row-Level Security                                │
│  └──────────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────────┘
```

### Architectural Principles

- **Separation of Concerns**: The `@hackanomics/engine` package is framework-agnostic — pure TypeScript with zero dependencies. It can be tested in isolation, ported to mobile, or used in a CLI.
- **Real-Time First**: The entire game loop is event-driven via Socket.IO namespaces. REST endpoints exist only for authentication and data retrieval.
- **Deterministic Execution**: All trades within a round are resolved via `prisma.$transaction()` in FIFO order — guaranteeing consistency even under peak load.
- **Security at the Database Layer**: Supabase Row-Level Security (RLS) policies enforce data isolation. A player cannot query another player's portfolio — no application-level access control needed.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | Next.js (App Router) | 14.2.3 | SSR, routing, React server components |
| **Styling** | Tailwind CSS | 3.4.3 | Utility-first CSS with OKLCH color tokens |
| **Animations** | Framer Motion | 12.38.0 | Cinematic UI transitions, game feel |
| **State Management** | Zustand | — | Client-side portfolio and session state |
| **Charts** | Recharts | — | Performance charts, allocation pie charts |
| **Backend Framework** | NestJS | 10.0.0 | Modular, injectable backend architecture |
| **Real-Time** | Socket.IO | 4.8.1 | Bidirectional WebSocket communication |
| **ORM** | Prisma | 5.12.1 | Type-safe database access |
| **Database** | PostgreSQL (Supabase) | — | Primary datastore with RLS |
| **Auth** | Supabase Auth + JWT | — | User authentication and session tokens |
| **AI/ML** | Google Generative AI (Gemini) | 1.46.0 | Batch portfolio analysis and critique |
| **Build System** | TurboRepo | latest | Parallel monorepo task orchestration |
| **Testing** | Playwright | 1.58.2 | End-to-end game flow tests |
| **Language** | TypeScript | 5.1–5.4 | Full-stack type safety |

---

## Feature Breakdown

### Player Terminal

The player interface is designed to feel like a professional trading terminal under pressure.

**Portfolio Allocation**
- Slide-to-confirm allocation across **7 asset classes**: TECH, INDUSTRIAL, CONSUMER, BONDS, GOLD, CRYPTO, CASH
- Prevents partial submissions — players must hit 100% allocation before confirming
- Draft allocations are cached in-memory server-side and auto-committed when the round closes (prevents ghost trades from network timeouts)

**Countdown HUD**
- Circular countdown timer with dynamic color transitions: **Cyan (safe) → Amber (warning) → Red (danger)**
- Red state activates a full-screen vignette effect to create urgency
- Built with `requestAnimationFrame` for smooth 60fps rendering

**Live Price Ticker**
- Scrolling top-bar displaying all asset prices with percentage changes
- Updates are pushed via WebSocket on every market event
- Color-coded green/red for gains/losses

**Ticking Portfolio Value**
- Smooth 60fps easing-based number animation (`TickingNumber` component) on all P&L displays
- Uses custom cubic-ease interpolation — no janky integer jumps

**Breaking News Overlay**
- Full-screen cinematic news card with scanline overlay when facilitator injects a market event
- Displays macro context (e.g., "FED RAISES RATES BY 75BPS") before the trading round opens

---

### Facilitator Command Center

The Facilitator has a dedicated command interface with god-mode visibility into the live game.

**Live Roster**
- Real-time player list showing status (ACTIVE / DROPPED / KICKED), current portfolio value, and last-seen timestamp
- Players inactive for >5 minutes are auto-dropped and room is notified

**Capital Flow Heatmap**
- Live visualization showing where all players are allocating capital
- Reveals macro consensus / herding behavior across the room
- Updates on every player trade submission

**Market Event Injector**
- One-click presets for common macroeconomic scenarios:
  - Interest Rate Hike / Cut
  - Inflation Surge / Deflation
  - Tech Boom
  - Recession Signal
  - Commodity Shock
  - Crypto Rally / Crash
  - Black Swan Crisis (probabilistic, random severity)
- Each event instantly broadcasts "Breaking News" to all player screens
- Asset prices recalculate server-side using the sensitivity matrix

**Round Control**
- Start game, advance rounds, pause/resume, force-end
- End-of-round score snapshots are written to the database for audit

---

### Macro Engine & Economic Pricing Model

Asset prices are calculated using a sensitivity matrix — not random numbers.

**Pricing Formula**

```
ΔPrice(asset) = irSensitivity  × (ΔInterestRate / 100)
              + infSensitivity × (Inflation / 100)
              + gdpSensitivity × (GDP / 100)
              + randomNoise(σ)

Capped: [-40%, +40%] per round
```

**Asset Sensitivity Matrix (examples)**

| Asset Class | Interest Rate (ir) | Inflation (inf) | GDP Growth (gdp) |
|-------------|-------------------|----------------|------------------|
| Tech Stocks | -1.8 | -0.5 | +1.8 |
| Bonds | +4.5 | -2.0 | -0.8 |
| Commodities | -0.3 | +2.8 | +0.5 |
| Crypto | -0.5 | +1.2 | +0.9 |
| Gold | +0.8 | +2.5 | -0.3 |

**MacroState Variables** (per round, stored in DB)
- Interest Rate (%)
- Inflation (%)
- GDP Growth (%)
- Market Volatility Multiplier

---

### AI Portfolio Analysis (Gemini)

At game end, a single batch prompt is sent to **Google Gemini 1.5 Flash** containing all player final portfolios, round-by-round return trajectories, and macro event history.

Gemini acts as a "harsh but fair senior portfolio manager" and returns:
- Overall performance assessment per player
- Identification of strategic mistakes (e.g., over-allocation to tech before rate hike)
- Constructive improvement suggestions
- A concise written "roast" of the worst allocation decisions

This is displayed per-player in the `GameOverModal` with animated reveal.

Batch processing (one prompt, all players) is more economical and ensures cross-player comparative analysis.

---

### Real-Time Game Loop (6-State Machine)

```
WAITING ──► BRIEFING ──► NEWS_BREAK ──► TRADING ──► CLOSED ──► COMPLETED
   │                                        │
   └────────────── (next round) ────────────┘
```

| State | Description |
|-------|-------------|
| `WAITING` | Lobby — waiting for facilitator to start session |
| `BRIEFING` | Cinematic full-screen round briefing with macro context |
| `NEWS_BREAK` | Breaking news overlay pushed to all players |
| `TRADING` | 60-second allocation window — players lock in portfolio |
| `CLOSED` | "EXECUTING ORDERS" screen — trades are atomically resolved |
| `COMPLETED` | Final rankings, AI critiques, confetti |

State transitions are emitted via Socket.IO `game:state` events and rendered as full-screen UI transitions client-side.

---

## Security & Reliability

### Token Validation Heartbeat
- SessionContext validates JWT silently every 5 minutes
- 3-strike resilience: forgives 2 consecutive network failures, logs out on 3rd
- Prevents stale token exploits and zombie sessions

### Atomic Trade Execution
- All trades in a round batch are resolved inside `prisma.$transaction()`
- FIFO execution order — no race conditions even at peak load
- Trade results are written atomically before any WebSocket broadcast

### Immutable Audit Trails
- Every trade, login, round score, and admin event logged to `AuditLog`
- Audit records cannot be modified or deleted
- Enables dispute resolution and compliance reporting

### Row-Level Security (RLS)
- Supabase PostgreSQL RLS policies enforce:
  - Players can only read their own portfolio
  - Facilitators can only access their own sessions
  - Admins have unrestricted access
- Security is enforced at the database layer — not just the application layer

### Player Inactivity Auto-Kick
- `GameGateway` tracks `lastSeen` timestamps per socket connection
- Players inactive >5 minutes are automatically dropped
- Dropped status is written to DB; room is notified via WebSocket

---

## Monorepo Package Structure

```
hackanomics/
├── apps/
│   ├── api/                         # NestJS backend (port 3001)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/            # JWT + Supabase authentication
│   │       │   ├── game/            # Core game loop + WebSocket gateway
│   │       │   ├── session/         # Session creation and player management
│   │       │   ├── portfolio/       # Portfolio valuation and P&L
│   │       │   ├── trade/           # Trade execution
│   │       │   ├── macro-engine/    # Macro pricing + Black Swan events
│   │       │   ├── leaderboard/     # Real-time rankings
│   │       │   ├── admin/           # Admin and facilitator controls
│   │       │   └── audit/           # Immutable audit trail
│   │       └── common/
│   │           └── guards/          # JWT, Roles, WS auth guards
│   └── web/                         # Next.js frontend (port 3000)
│       └── src/
│           ├── app/                 # App Router pages
│           ├── components/
│           │   ├── game/            # CountdownHUD, BreakingNews, RoundBriefing
│           │   ├── dashboard/       # TradeDialog, TradePanel
│           │   └── layout/          # DashboardLayout, Navbar
│           ├── hooks/               # useSocket, useSession
│           ├── lib/                 # API client, Supabase client
│           └── context/             # SessionContext (auth + socket)
├── packages/
│   ├── engine/                      # Pure TypeScript game state machine (no deps)
│   │   └── src/
│   │       ├── GameEngine.ts        # Core state machine
│   │       └── types/Game.ts        # Shared type definitions
│   ├── database/                    # Prisma schema and seed scripts
│   │   └── prisma/
│   │       ├── schema.prisma        # Full data model
│   │       └── seed.ts              # Initial data seeding
│   └── ui/                          # Design system tokens and base components
└── turbo.json                       # TurboRepo pipeline configuration
```

---

## Database Schema

**Core Models**

```prisma
User            — Auth identity, role (ADMIN / FACILITATOR / PLAYER)
GameSession     — Session with code, max players, round count, status
SessionPlayer   — Player-per-session with status (ACTIVE / DROPPED / KICKED)
Portfolio       — Holdings per player per round (7 asset slots + cash)
Trade           — Buy/sell orders with price, quantity, timestamp
Round           — Round state snapshot (prices, macro variables)
MacroState      — Economic variables (interest rate, inflation, GDP, volatility)
Asset           — Symbol, type, sensitivity matrix (irSensitivity, infSensitivity, gdpSensitivity)
MarketEvent     — Facilitator-triggered event log
AuditLog        — Immutable actor/action/resource log
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project (for PostgreSQL + Auth)
- Google Gemini API key (for AI portfolio critiques)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd hackanomics

# 2. Install all workspace dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
# Edit .env with your Supabase URL, Supabase Anon Key, Gemini API Key

# 4. Generate Prisma client
npx turbo run db:generate

# 5. Push schema to database
npx turbo run db:push

# 6. Seed initial data
npx turbo run db:seed

# 7. Start all development servers (API + Web in parallel)
npm run dev
```

### Available Scripts (from root)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API (3001) + Web (3000) via TurboRepo |
| `npm run build:turbo` | Production build all apps and packages |
| `npm run lint:turbo` | Lint all workspaces |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Apply schema changes to database |
| `npm run format` | Format all files with Prettier |

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# API
NEXT_PUBLIC_API_URL=http://localhost:3001
JWT_SECRET=your-jwt-secret

# AI
GEMINI_API_KEY=your-gemini-api-key

# Socket
SOCKET_CORS_ORIGIN=http://localhost:3000
```

---

## Hackonomics 2026 — Judging Criteria Alignment

### 1. Relevancy & Education
Hackanomics teaches portfolio management through lived experience. Players learn that high interest rates compress tech valuations but boost bond attractiveness; inflation drives capital toward gold and commodities; sudden Black Swan events can destroy over-concentrated portfolios. The Gemini AI critique at game-end closes the feedback loop — translating game outcomes into real financial lessons.

### 2. Technical Execution *(Targeting Technical Award)*
- **6-state deterministic game loop** managed by a pure TypeScript engine
- **Atomic transaction trade resolution** using `prisma.$transaction()` — zero race conditions at 50+ concurrent players
- **Token heartbeat resilience** — 3-strike JWT validation with graceful session recovery
- **Macroeconomic sensitivity pricing model** — asset prices driven by real economic variables, not random number generators
- **Supabase RLS** — database-layer security, not just application-layer

### 3. Presentation & Design *(Targeting Design Award)*
- **OKLCH color system** — Midnight Blue, Electric Cyan, Neon Rose — perceptually uniform, never muddy
- **Cinematic round briefings** at 120px display-size headlines with scanline overlays
- **60fps ticking numbers** for all portfolio value changes via `requestAnimationFrame`
- **Market Closed lockscreen** — instant full-screen lock when round ends
- **Framer Motion** transitions between all game states
- **Fluid typography** with `text-clamp()` — scales from mobile to 4K

### 4. Impact
Hackanomics is deployable today as a B2B ed-tech product. The Facilitator Command Center gives educators live control over macroeconomic conditions — enabling structured lesson plans around interest rate cycles, inflation scenarios, or crisis management. Target markets: university finance departments, corporate training programs, financial literacy NGOs.

### 5. Innovation
Generative AI is used not as a chatbot but as a **batch performance judge** — a fundamentally different application. Rather than one-off queries, a single structured prompt containing all player data is sent to Gemini at game end, producing comparative, personalized written critiques. This is closer to how institutional risk managers use AI for portfolio attribution analysis than how consumer apps use it.

---

## TH: บทสรุปโครงการ (ภาษาไทย)

**Hackanomics** คือแพลตฟอร์มจำลองสถานการณ์ทางการเงินแบบ Real-time ระดับ Institutional Grade ออกแบบมาเพื่อสอนเศรษฐศาสตร์มหาภาคและทักษะด้านการลงทุนผ่านการเล่นเกมที่มีความกดดันสูง ผู้เล่นรับบทผู้จัดการกองทุนที่ต้องจัดสรรเงินทุนใน 7 ประเภทสินทรัพย์ท่ามกลางข่าวสาร, การเปลี่ยนแปลงอัตราดอกเบี้ย, เงินเฟ้อ และวิกฤตเศรษฐกิจ (Black Swan) ที่ฉีดเข้ามาแบบ Real-time

**สิ่งที่โปรเจกต์นี้ทำได้:**
- รองรับผู้เล่นพร้อมกัน 50+ คน ผ่าน WebSocket
- คำนวณราคาสินทรัพย์จากตัวแปรเศรษฐศาสตร์จริง (ดอกเบี้ย, เงินเฟ้อ, GDP)
- ให้ Facilitator ควบคุมเหตุการณ์ตลาดแบบ Live
- ใช้ Google Gemini AI วิเคราะห์พอร์ตทุกคนพร้อมกันเมื่อจบเกม
- รักษาความปลอดภัยด้วย RLS, Audit Trail, และ JWT Heartbeat

**เทคโนโลยีหลัก:** Next.js 14 · NestJS · Socket.IO · Prisma · PostgreSQL · Gemini AI · TurboRepo

**เป้าหมาย:** B2B Ed-Tech สำหรับห้องเรียน, มหาวิทยาลัย, และ Corporate Training

---

*© 2026 Aphichat Jahyo — Built for Hackonomics 2026*
*"The market doesn't care about your feelings. Neither does the AI judge."*

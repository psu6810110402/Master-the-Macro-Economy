# Hackanomics 📈

A high-stakes Macro Economy Simulation Game designed for competitive classroom and corporate training. 

## 🚀 Experience the Simulation
Hackanomics blends deep economic modeling with a high-impact "Bloomberg-meets-Editorial" aesthetic. Facilitators can trigger market shocks, advance rounds, and watch as students compete to build the most resilient portfolio.

### Key Features
- **Real-time Market Terminal**: Live asset tracking (Stocks, Crypto, Commodities) with dynamic price updates.
- **Facilitator Command Center**: Complete control over game rounds, market volatility, and participant sessions.
- **High-Impact UI**: Impeccable dark-mode aesthetics using OKLCH color spaces and fluid Framer Motion animations.
- **Robust Engine**: Deterministic trade execution and portfolio valuation.
- **Production Hardened**: 
  - Immutable Audit Trails for all critical actions.
  - Row-Level Security (RLS) for data isolation.
  - Standardized API error handling.
  - State restoration for seamless reconnections.

## 🛠 Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: NestJS, Prisma, Socket.io.
- **Database**: Supabase (PostgreSQL), Auth, Realtime.
- **Packages**:
  - `@hackanomics/engine`: Core simulation logic.
  - `@hackanomics/database`: Shared Prisma schemas and migrations.
  - `@hackanomics/ui`: Custom design system tokens and components.

## 🏁 Getting Started

### Prerequisites
- Node.js 20+
- PNPM (recommended for workspace management)
- Supabase account (for database and auth)

### Installation
1. Clone the repository.
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`.
4. Run migrations: `npx turbo run db:push`
5. Seed the database: `npx turbo run db:seed`
6. Start development: `npm run dev`

## 📊 Documentation
Detailed design and architecture decisions are located in the `doc/` directory:
- 01 — Executive Summary: `doc/01-executive-summary.md`
- 02 — Architecture Overview: `doc/02-architecture-overview.md`
- 03 — Tech Stack: `doc/03-tech-stack.md`
- 04 — Security Architecture: `doc/04-security-architecture.md`
- 05 — Role-Based Access Control: `doc/05-rbac.md`
- 06 — Performance Targets & Strategy: `doc/06-performance.md`
- 07 — Critical Data Flows: `doc/07-data-flows.md`
- 08 — Build Phases (roadmap): `doc/08-build-phases.md`
- 09 — Deployment Architecture: `doc/09-deployment.md`
- 10 — Disaster Recovery & Business Continuity: `doc/10-disaster-recovery.md`
- 11 — Compliance & Governance: `doc/11-compliance.md`
- 12 — English Wh- Question Words: `doc/12-wh-questions.md`
- 13 — Prisma Schema Blueprint: `doc/13-prisma-schema.md`
- 14 — Environment Variables: `doc/14-environment-variables.md`
- 15 — Error Handling: `doc/15-error-handling.md`
- 16 — Folder Structure: `doc/16-folder-structure.md`
- 17 — Decision Log: `doc/17-decision-log.md`

---
*Built for the next generation of financial minds.*

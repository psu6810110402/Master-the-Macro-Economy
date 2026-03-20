-- Hackanomics - Row-Level Security (RLS) Policies
-- This script should be executed in the Supabase SQL Editor.
-- Ensure that "Enable RLS" is toggled on for these tables in the Supabase Dashboard.

-- 1. Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "game_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session_players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "holdings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_prices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_events" ENABLE ROW LEVEL SECURITY;

-- 2. Audit Logs (Append-only)
-- Allow authenticated users to insert logs, but NO ONE can update or delete.
CREATE POLICY "Audit logs are append-only (Insert)" ON "audit_logs"
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Audit logs are viewable by admins only" ON "audit_logs"
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- 3. Users Table
-- Users can read and update their own record.
CREATE POLICY "Users can view own record" ON "users"
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON "users"
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON "users"
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM "users" WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')));

-- 4. Game Sessions
-- Anyone authenticated can view sessions (to join).
CREATE POLICY "Sessions are viewable by all authenticated users" ON "game_sessions"
  FOR SELECT TO authenticated
  USING (true);

-- Only Facilitators/Admins can create/update sessions.
CREATE POLICY "Facilitators can manage sessions" ON "game_sessions"
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM "users" WHERE id = auth.uid() AND role IN ('FACILITATOR', 'ADMIN', 'SUPER_ADMIN')));

-- 5. Portfolios
-- Only the owner of the portfolio can see it.
CREATE POLICY "Users can view own portfolios" ON "portfolios"
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- App code (backend) handles updates, but RLS adds safety.
CREATE POLICY "Users can update own portfolios" ON "portfolios"
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Facilitators can view all portfolios in their session.
CREATE POLICY "Facilitators can view session portfolios" ON "portfolios"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "session_players" sp
    JOIN "game_sessions" gs ON sp.session_id = gs.id
    WHERE sp.id = portfolios.session_player_id
    AND gs.facilitator_id = auth.uid()
  ));

-- 6. Trades (Append-only)
CREATE POLICY "Users can view own trades" ON "trades"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM "portfolios" p WHERE p.id = trades.portfolio_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own trades" ON "trades"
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM "portfolios" p WHERE p.id = trades.portfolio_id AND p.user_id = auth.uid()
  ));

-- 7. Assets & Prices (Public Read)
CREATE POLICY "Assets are viewable by all" ON "assets" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Prices are viewable by all" ON "asset_prices" FOR SELECT TO authenticated USING (true);

-- 8. Rounds & Market Events
CREATE POLICY "Rounds are viewable by participants" ON "rounds" FOR SELECT TO authenticated USING (true);
CREATE POLICY "Events are viewable by participants" ON "market_events" FOR SELECT TO authenticated USING (true);

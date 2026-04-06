-- ============================================================
-- RLS Policies for Hackanomics (FinSim)
-- Run this in Supabase SQL Editor after prisma db push
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── USERS ───────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (
    auth.uid()::text = "supabaseId"
  );

-- Admins can read all users
CREATE POLICY "admins_read_all_users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE "supabaseId" = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- ─── GAME SESSIONS ──────────────────────────────────────────
-- Facilitators can read their own sessions
CREATE POLICY "facilitator_read_own_sessions" ON game_sessions
  FOR SELECT USING (
    "facilitatorId" IN (
      SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
    )
  );

-- Players can read sessions they've joined
CREATE POLICY "player_read_joined_sessions" ON game_sessions
  FOR SELECT USING (
    id IN (
      SELECT "sessionId" FROM session_players
      WHERE "userId" IN (
        SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

-- Admins can read all sessions
CREATE POLICY "admins_read_all_sessions" ON game_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE "supabaseId" = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- ─── SESSION PLAYERS ────────────────────────────────────────
-- Players can see other players in their sessions
CREATE POLICY "players_read_same_session" ON session_players
  FOR SELECT USING (
    "sessionId" IN (
      SELECT "sessionId" FROM session_players
      WHERE "userId" IN (
        SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

-- ─── PORTFOLIOS ─────────────────────────────────────────────
-- Players can read their own portfolio
CREATE POLICY "players_read_own_portfolio" ON portfolios
  FOR SELECT USING (
    "sessionPlayerId" IN (
      SELECT id FROM session_players
      WHERE "userId" IN (
        SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

-- ─── SCORES ─────────────────────────────────────────────────
-- Players can read scores in their sessions
CREATE POLICY "players_read_session_scores" ON scores
  FOR SELECT USING (
    "sessionId" IN (
      SELECT "sessionId" FROM session_players
      WHERE "userId" IN (
        SELECT id FROM users WHERE "supabaseId" = auth.uid()::text
      )
    )
  );

-- ─── AUDIT LOGS ─────────────────────────────────────────────
-- Only admins can read audit logs
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE "supabaseId" = auth.uid()::text AND role = 'ADMIN'
    )
  );

-- ─── SERVICE ROLE BYPASS ────────────────────────────────────
-- The API uses the service role key which bypasses RLS by default.
-- These policies only apply to direct Supabase client access (anon key).

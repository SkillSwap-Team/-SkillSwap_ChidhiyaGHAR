-- =======================================================
-- SkillSwap DB additions: activity / badges / leaderboard
-- NO RLS — run after the base schema
-- =======================================================

-- ========================================================
-- Add activity tracking to profiles
-- ========================================================
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS activity_score      integer NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS activity_snapshot   jsonb  DEFAULT '{}'::jsonb;

-- ========================================================
-- Activities table
-- ========================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type           varchar(100) NOT NULL,
  title          text NOT NULL,
  body           text,
  points         integer NOT NULL DEFAULT 1,
  reference_type varchar(50),
  reference_id   uuid,
  created_at     timestamp with time zone NOT NULL DEFAULT now()
);

-- ========================================================
-- RPC: increment activity score
-- ========================================================
CREATE OR REPLACE FUNCTION public.increment_activity(user_id_input uuid, points_input integer)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET activity_score = activity_score + points_input
  WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- Badge definitions: extend tier enum to include diamond
-- ========================================================
ALTER TABLE IF EXISTS public.badge_definitions DROP CONSTRAINT IF EXISTS badge_definitions_tier_check;

ALTER TABLE IF EXISTS public.badge_definitions
  ADD CONSTRAINT badge_definitions_tier_check
  CHECK (tier IN ('bronze','silver','gold','platinum','diamond'));

-- ========================================================
-- Seed new badge definitions (idempotent)
-- ========================================================
INSERT INTO public.badge_definitions (name, slug, description, tier, criteria)
VALUES
  ('Conversation Starter', 'first-chat',     'Sent your first chat message',                                            'bronze',   '{"type":"first_chat"}'),
  ('First Call',           'first-call',     'Completed your first video/skill-swap call',                              'silver',   '{"type":"first_call"}'),
  ('Legend #1',            'top-1',          'Ranked #1 on the all-time activity leaderboard',                          'diamond',  '{"type":"leaderboard_rank","period":"allTime","rank":1}'),
  ('Runner Up',            'top-2',          'Ranked #2 on the all-time activity leaderboard',                          'gold',     '{"type":"leaderboard_rank","period":"allTime","rank":2}'),
  ('Challenger',           'top-3',          'Ranked #3 on the all-time activity leaderboard',                          'silver',   '{"type":"leaderboard_rank","period":"allTime","rank":3}'),
  ('Social Butterfly',     'social-butterfly','Chatted in 10+ conversations',                                           'gold',     '{"type":"conversation_count","threshold":10}'),
  ('Call Master',          'call-master',    'Completed 5+ sessions',                                                   'silver',   '{"type":"session_count","threshold":5}')
ON CONFLICT (slug) DO NOTHING;

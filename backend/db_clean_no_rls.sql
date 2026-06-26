-- =======================================================
-- SkillSwap Database Schema (NO RLS - safe to rerun)
-- =======================================================

-- ✅ Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector

-- Create schema if needed
CREATE SCHEMA IF NOT EXISTS public;

-- =======================================================
-- 1. Users Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email character varying(255) NOT NULL UNIQUE,
  username character varying(50) UNIQUE,
  password_hash text,
  role character varying(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_email_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_banned boolean NOT NULL DEFAULT false,
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_secret text,
  password_reset_token text,
  password_reset_expires timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- =======================================================
-- 2. Profiles Table (with Vector Embedding for Matching)
-- =======================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name character varying(100),
  avatar_url text,
  cover_url text,
  bio text,
  timezone character varying(50) DEFAULT 'UTC',
  location text,
  city character varying(100),
  state_code character varying(50),
  country_code character varying(5),
  latitude double precision,
  longitude double precision,
  website_url text,
  github_url text,
  linkedin_url text,
  twitter_url text,
  is_verified_mentor boolean NOT NULL DEFAULT false,
  is_profile_complete boolean NOT NULL DEFAULT false,
  teaching_hours double precision NOT NULL DEFAULT 0.0,
  learning_hours double precision NOT NULL DEFAULT 0.0,
  total_sessions integer NOT NULL DEFAULT 0,
  avg_rating double precision NOT NULL DEFAULT 0.0,
  total_reviews integer NOT NULL DEFAULT 0,
  reputation_points integer NOT NULL DEFAULT 100,
  activity_score integer NOT NULL DEFAULT 0,
  activity_snapshot jsonb DEFAULT '{}'::jsonb,
  followers_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  embedding vector(1536),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_embedding ON public.profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =======================================================
-- 3. Skill Categories Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.skill_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL UNIQUE,
  slug character varying(100) NOT NULL UNIQUE,
  icon character varying(50),
  color character varying(20) DEFAULT '#6366f1',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 4. Skills Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES public.skill_categories(id),
  name character varying(100) NOT NULL,
  slug character varying(100) NOT NULL UNIQUE,
  description text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  usage_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_slug ON public.skills(slug);

-- =======================================================
-- 5. User Skills Offered Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_skills_offered (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_level character varying(20) NOT NULL DEFAULT 'beginner',
  years_experience double precision,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_skill_offered UNIQUE (user_id, skill_id)
);

-- =======================================================
-- 6. User Skills Wanted Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_skills_wanted (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  current_level character varying(20),
  target_level character varying(20),
  urgency character varying(20) DEFAULT 'medium',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_skill_wanted UNIQUE (user_id, skill_id)
);

-- =======================================================
-- 7. Education Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.education (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  degree character varying(100),
  field_of_study character varying(100),
  institution character varying(200),
  start_year integer,
  end_year integer,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 8. Experience Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.experience (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title character varying(100) NOT NULL,
  company character varying(100),
  location character varying(100),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 9. Availability Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  timezone character varying(50) DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 10. User Follows Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id <> following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.user_follows(following_id);

-- =======================================================
-- 11. Matches Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status character varying(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  match_score double precision,
  match_reason text,
  matched_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_match UNIQUE (user_a_id, user_b_id),
  CONSTRAINT no_self_match CHECK (user_a_id <> user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches(user_b_id);

-- =======================================================
-- 12. Learning Sessions Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  title character varying(200) NOT NULL,
  description text,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  scheduled_at timestamp with time zone NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status character varying(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  actual_duration_minutes integer,
  host_rating integer CHECK (host_rating BETWEEN 1 AND 5),
  participant_rating integer CHECK (participant_rating BETWEEN 1 AND 5),
  host_attendance boolean,
  participant_attendance boolean,
  session_notes text,
  cancellation_reason text,
  room_id character varying(100),
  agora_channel character varying(100),
  recording_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_host ON public.learning_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_sessions_participant ON public.learning_sessions(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.learning_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled ON public.learning_sessions(scheduled_at);

-- =======================================================
-- 13. Reviews Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_session_reviewer UNIQUE (session_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON public.reviews(session_id);

-- =======================================================
-- 14. Reputation Points Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.reputation_points (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points integer NOT NULL,
  action character varying(100) NOT NULL,
  reference_type character varying(50),
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_user ON public.reputation_points(user_id);

-- =======================================================
-- 15. Badge Definitions Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.badge_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL UNIQUE,
  slug character varying(100) NOT NULL UNIQUE,
  description text NOT NULL,
  icon_url text,
  tier character varying(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  criteria jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 16. User Badges Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_badge UNIQUE (user_id, badge_id)
);

-- =======================================================
-- 17. Conversations Table (Direct Messaging)
-- =======================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_b_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_conversation UNIQUE (user_a_id, user_b_id),
  CONSTRAINT no_self_conversation CHECK (user_a_id <> user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_a ON public.conversations(user_a_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_b ON public.conversations(user_b_id);

-- =======================================================
-- 18. Messages Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type character varying(20) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice', 'video', 'system')),
  attachment_url text,
  reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- =======================================================
-- 19. Message Reactions Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji character varying(20) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_message_reaction UNIQUE (message_id, user_id, emoji)
);

-- =======================================================
-- 20. Notifications Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type character varying(50) NOT NULL,
  title character varying(200) NOT NULL,
  body text,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(is_read);

-- =======================================================
-- 21. Notification Preferences Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  session_reminders boolean NOT NULL DEFAULT true,
  new_messages boolean NOT NULL DEFAULT true,
  new_followers boolean NOT NULL DEFAULT true,
  session_confirmations boolean NOT NULL DEFAULT true,
  marketing_emails boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 22. User Settings Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  theme character varying(20) NOT NULL DEFAULT 'dark',
  language character varying(10) NOT NULL DEFAULT 'en',
  timezone character varying(50) DEFAULT 'UTC',
  notifications_enabled boolean NOT NULL DEFAULT true,
  profile_visibility character varying(20) NOT NULL DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'connections')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 23. Activities Feed Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type character varying(100) NOT NULL,
  title text NOT NULL,
  body text,
  points integer NOT NULL DEFAULT 1,
  reference_type character varying(50),
  reference_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 24. Session Note Vectors Table (for RAG Search)
-- =======================================================
CREATE TABLE IF NOT EXISTS public.session_note_vectors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  chunk_index integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_note_vectors_embedding ON public.session_note_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =======================================================
-- 25. User Sessions Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  refresh_token text,
  device_info jsonb,
  ip_address character varying(45),
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 26. Login History Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.login_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address character varying(45),
  user_agent text,
  success boolean NOT NULL,
  failure_reason character varying(100),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 27. Audit Logs Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action character varying(100) NOT NULL,
  resource_type character varying(50),
  resource_id uuid,
  ip_address character varying(45),
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- 28. Whiteboards Table
-- =======================================================
CREATE TABLE IF NOT EXISTS public.whiteboards (
  session_id uuid PRIMARY KEY REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =======================================================
-- ✅ RPC Functions and Stored Procedures
-- =======================================================

-- 1. Increment Reputation
CREATE OR REPLACE FUNCTION public.increment_reputation(user_id_input uuid, points_input integer)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET reputation_points = reputation_points + points_input WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Increment Follow Counts
CREATE OR REPLACE FUNCTION public.increment_follow_counts(follower_id uuid, following_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET following_count = following_count + 1 WHERE id = follower_id;
  UPDATE public.profiles SET followers_count = followers_count + 1 WHERE id = following_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Increment Skill Usage Count
CREATE OR REPLACE FUNCTION public.increment_skill_usage(skill_id_input uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.skills SET usage_count = usage_count + 1 WHERE id = skill_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Increment Teaching Hours
CREATE OR REPLACE FUNCTION public.increment_teaching_hours(user_id_input uuid, hours_input double precision)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET teaching_hours = teaching_hours + hours_input, total_sessions = total_sessions + 1 WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Increment Learning Hours
CREATE OR REPLACE FUNCTION public.increment_learning_hours(user_id_input uuid, hours_input double precision)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET learning_hours = learning_hours + hours_input, total_sessions = total_sessions + 1 WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5b. Increment Activity Score
CREATE OR REPLACE FUNCTION public.increment_activity(user_id_input uuid, points_input integer)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET activity_score = activity_score + points_input WHERE id = user_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Match Session Notes (Vector Search for RAG)
CREATE OR REPLACE FUNCTION public.match_session_notes(
  query_embedding vector, user_id_filter uuid, match_count integer, match_threshold double precision
)
RETURNS TABLE (id uuid, session_id uuid, content text, similarity double precision) AS $$
BEGIN
  RETURN QUERY SELECT sn.id, sn.session_id, sn.content, 1 - (sn.embedding <=> query_embedding) AS similarity
  FROM public.session_note_vectors sn
  WHERE sn.user_id = user_id_filter AND 1 - (sn.embedding <=> query_embedding) > match_threshold
  ORDER BY sn.embedding <=> query_embedding LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Match Embeddings (Cosine similarity vector search for match recommendations)
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector, match_count integer, user_id_filter uuid
)
RETURNS TABLE (id uuid, full_name varchar, avatar_url text, avg_rating double precision, reputation_points integer, similarity double precision) AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.avg_rating, p.reputation_points,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.profiles p WHERE p.id <> user_id_filter
  ORDER BY p.embedding <=> query_embedding LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Get Nearby Profiles (Haversine/Distance search)
CREATE OR REPLACE FUNCTION public.get_nearby_profiles(
  user_lat double precision, user_lon double precision, radius_km double precision
)
RETURNS TABLE (id uuid, full_name varchar, avatar_url text, city varchar, country_code varchar, avg_rating double precision, distance double precision) AS $$
BEGIN
  RETURN QUERY SELECT p.id, p.full_name, p.avatar_url, p.city, p.country_code, p.avg_rating,
    (6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lon)) + sin(radians(user_lat)) * sin(radians(p.latitude)))) AS distance
  FROM public.profiles p WHERE p.latitude IS NOT NULL AND p.longitude IS NOT NULL
    AND (6371 * acos(cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lon)) + sin(radians(user_lat)) * sin(radians(p.latitude)))) <= radius_km
  ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================
-- ✅ Seed Data
-- =======================================================

INSERT INTO public.skill_categories (id, name, slug, icon, color, description) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Technology & Software', 'software-tech', 'code', '#3b82f6', 'Software engineering, web development, cloud computing, and IT infrastructures.'),
  ('c1000000-0000-0000-0000-000000000002', 'Design & Creative', 'design-creative', 'palette', '#ec4899', 'UI/UX design, graphic design, animation, 3D modeling, photography, and video editing.'),
  ('c1000000-0000-0000-0000-000000000003', 'Languages & Linguistics', 'languages', 'globe', '#10b981', 'Foreign languages, translation, grammar, writing, and speech tutoring.'),
  ('c1000000-0000-0000-0000-000000000004', 'Business & Marketing', 'business-marketing', 'trending-up', '#f59e0b', 'Product management, sales, financial modeling, SEO, copywriting, and social media.'),
  ('c1000000-0000-0000-0000-000000000005', 'Music & Performing Arts', 'music-arts', 'music', '#8b5cf6', 'Instruments playing, vocal coaching, music production, dance, and theater.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.skills (name, slug, category_id, description, is_verified, is_active) VALUES
  ('JavaScript Programming', 'javascript', 'c1000000-0000-0000-0000-000000000001', 'Core JS foundations, DOM, event loops, async patterns, and modern ES6+ practices.', true, true),
  ('React Frontend Development', 'react-dev', 'c1000000-0000-0000-0000-000000000001', 'React components, state hooks, routing, global state, performance optimization, and styling.', true, true),
  ('Python Programming', 'python', 'c1000000-0000-0000-0000-000000000001', 'Basic scripts, data structures, OOP, file operations, web scraping, and automation.', true, true),
  ('Figma UI/UX Design', 'figma-design', 'c1000000-0000-0000-0000-000000000002', 'Wireframing, interactive prototyping, layout grids, components, auto-layouts, and user testing.', true, true),
  ('Spanish Conversation', 'spanish', 'c1000000-0000-0000-0000-000000000003', 'Daily conversational skills, Spanish grammar, accent improvement, and vocabulary.', true, true),
  ('Search Engine Optimization (SEO)', 'seo', 'c1000000-0000-0000-0000-000000000004', 'On-page/off-page SEO, keyword research, core web vitals, indexation issues, and content optimization.', true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.badge_definitions (name, slug, description, tier, criteria) VALUES
  ('First Step', 'first-session', 'Completed your first learning or teaching session', 'bronze', '{"type":"session_count","threshold":1}'),
  ('Century Swapper', 'century-club', 'Completed 100 learning sessions', 'gold', '{"type":"session_count","threshold":100}'),
  ('Super Mentor', 'super-mentor', 'Taught for over 50 total hours', 'platinum', '{"type":"teaching_hours","threshold":50}'),
  ('Top Rated', 'top-rated', 'Maintained a rating of 4.8+ with at least 10 reviews', 'gold', '{"type":"review_rating","minRating":4.8,"minCount":10}'),
  ('Community Pillar', 'reputation-titan', 'Earned more than 1000 reputation points', 'platinum', '{"type":"reputation_points","threshold":1000}'),
  ('Conversation Starter', 'first-chat', 'Sent your first chat message', 'bronze', '{"type":"first_chat"}'),
  ('First Call', 'first-call', 'Completed your first video/skill-swap call', 'silver', '{"type":"first_call"}'),
  ('Legend #1', 'top-1', 'Ranked #1 on the all-time activity leaderboard', 'diamond', '{"type":"leaderboard_rank","period":"allTime","rank":1}'),
  ('Runner Up', 'top-2', 'Ranked #2 on the all-time activity leaderboard', 'gold', '{"type":"leaderboard_rank","period":"allTime","rank":2}'),
  ('Challenger', 'top-3', 'Ranked #3 on the all-time activity leaderboard', 'silver', '{"type":"leaderboard_rank","period":"allTime","rank":3}'),
  ('Social Butterfly', 'social-butterfly', 'Chatted in 10+ conversations', 'gold', '{"type":"conversation_count","threshold":10}'),
  ('Call Master', 'call-master', 'Completed 5+ sessions', 'silver', '{"type":"session_count","threshold":5}')
ON CONFLICT (slug) DO NOTHING;

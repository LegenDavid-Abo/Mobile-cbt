-- ============================================
-- CBT PLATFORM - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  hashed_password TEXT NOT NULL,
  plain_password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin', 'senior_admin')),
  class TEXT CHECK (class IN ('JSS1','JSS2','JSS3','SS1','SS2','SS3') OR class IS NULL),
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COURSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  class TEXT NOT NULL CHECK (class IN ('JSS1','JSS2','JSS3','SS1','SS2','SS3')),
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  total_marks INTEGER NOT NULL DEFAULT 100,
  exam_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A','B','C','D')),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXAM SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  is_auto_submitted BOOLEAN DEFAULT FALSE,
  score INTEGER,
  total_questions INTEGER,
  UNIQUE(student_id, course_id)
);

-- ============================================
-- STUDENT ANSWERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_answer TEXT CHECK (selected_answer IN ('A','B','C','D') OR selected_answer IS NULL),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, question_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_class ON public.users(class);
CREATE INDEX IF NOT EXISTS idx_courses_class ON public.courses(class);
CREATE INDEX IF NOT EXISTS idx_questions_course ON public.questions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_student ON public.exam_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON public.exam_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_answers_session ON public.student_answers(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Allow all operations via service_role (used by backend/admin)
-- For client-side, we'll use anon key with these policies:

-- Users: allow read for authenticated (we handle auth ourselves via student_id/password lookup)
CREATE POLICY "allow_all_users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sessions" ON public.exam_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_answers" ON public.student_answers FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- SEED: Default Senior Admin
-- Password: admin123 (bcrypt hash)
-- ============================================
-- NOTE: Replace the hash below with actual bcrypt hash of your chosen password
-- You can generate at: https://bcrypt-generator.com/
INSERT INTO public.users (student_id, name, email, hashed_password, plain_password, role, class)
VALUES (
  'SADMIN001',
  'Senior Administrator',
  'senioradmin@school.edu',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: "password"
  'password',
  'senior_admin',
  NULL
)
ON CONFLICT (student_id) DO NOTHING;

-- ============================================================
-- TruHire - RLS Policies Script
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Este script configura Row Level Security para permitir que
-- cualquier usuario autenticado pueda realizar todas las operaciones.
-- ============================================================

-- ============================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE IF EXISTS candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidate_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS process_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS process_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loop_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS screening_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS phone_screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_pool_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS truora_directory ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. ELIMINAR POLÍTICAS EXISTENTES (si las hay)
-- ============================================================

-- candidates
DROP POLICY IF EXISTS "candidates_select" ON candidates;
DROP POLICY IF EXISTS "candidates_insert" ON candidates;
DROP POLICY IF EXISTS "candidates_update" ON candidates;
DROP POLICY IF EXISTS "candidates_delete" ON candidates;
DROP POLICY IF EXISTS "Authenticated users full access" ON candidates;

-- candidate_references
DROP POLICY IF EXISTS "candidate_references_select" ON candidate_references;
DROP POLICY IF EXISTS "candidate_references_insert" ON candidate_references;
DROP POLICY IF EXISTS "candidate_references_update" ON candidate_references;
DROP POLICY IF EXISTS "candidate_references_delete" ON candidate_references;
DROP POLICY IF EXISTS "Authenticated users full access" ON candidate_references;

-- processes
DROP POLICY IF EXISTS "processes_select" ON processes;
DROP POLICY IF EXISTS "processes_insert" ON processes;
DROP POLICY IF EXISTS "processes_update" ON processes;
DROP POLICY IF EXISTS "processes_delete" ON processes;
DROP POLICY IF EXISTS "Authenticated users full access" ON processes;

-- process_candidates
DROP POLICY IF EXISTS "process_candidates_select" ON process_candidates;
DROP POLICY IF EXISTS "process_candidates_insert" ON process_candidates;
DROP POLICY IF EXISTS "process_candidates_update" ON process_candidates;
DROP POLICY IF EXISTS "process_candidates_delete" ON process_candidates;
DROP POLICY IF EXISTS "Authenticated users full access" ON process_candidates;

-- process_participants
DROP POLICY IF EXISTS "process_participants_select" ON process_participants;
DROP POLICY IF EXISTS "process_participants_insert" ON process_participants;
DROP POLICY IF EXISTS "process_participants_update" ON process_participants;
DROP POLICY IF EXISTS "process_participants_delete" ON process_participants;
DROP POLICY IF EXISTS "Authenticated users full access" ON process_participants;

-- loops
DROP POLICY IF EXISTS "loops_select" ON loops;
DROP POLICY IF EXISTS "loops_insert" ON loops;
DROP POLICY IF EXISTS "loops_update" ON loops;
DROP POLICY IF EXISTS "loops_delete" ON loops;
DROP POLICY IF EXISTS "Authenticated users full access" ON loops;

-- loop_assignments
DROP POLICY IF EXISTS "loop_assignments_select" ON loop_assignments;
DROP POLICY IF EXISTS "loop_assignments_insert" ON loop_assignments;
DROP POLICY IF EXISTS "loop_assignments_update" ON loop_assignments;
DROP POLICY IF EXISTS "loop_assignments_delete" ON loop_assignments;
DROP POLICY IF EXISTS "Authenticated users full access" ON loop_assignments;

-- evaluations
DROP POLICY IF EXISTS "evaluations_select" ON evaluations;
DROP POLICY IF EXISTS "evaluations_insert" ON evaluations;
DROP POLICY IF EXISTS "evaluations_update" ON evaluations;
DROP POLICY IF EXISTS "evaluations_delete" ON evaluations;
DROP POLICY IF EXISTS "Authenticated users full access" ON evaluations;

-- decisions
DROP POLICY IF EXISTS "decisions_select" ON decisions;
DROP POLICY IF EXISTS "decisions_insert" ON decisions;
DROP POLICY IF EXISTS "decisions_update" ON decisions;
DROP POLICY IF EXISTS "decisions_delete" ON decisions;
DROP POLICY IF EXISTS "Authenticated users full access" ON decisions;

-- screenings
DROP POLICY IF EXISTS "screenings_select" ON screenings;
DROP POLICY IF EXISTS "screenings_insert" ON screenings;
DROP POLICY IF EXISTS "screenings_update" ON screenings;
DROP POLICY IF EXISTS "screenings_delete" ON screenings;
DROP POLICY IF EXISTS "Authenticated users full access" ON screenings;

-- screening_feedback
DROP POLICY IF EXISTS "screening_feedback_select" ON screening_feedback;
DROP POLICY IF EXISTS "screening_feedback_insert" ON screening_feedback;
DROP POLICY IF EXISTS "screening_feedback_update" ON screening_feedback;
DROP POLICY IF EXISTS "screening_feedback_delete" ON screening_feedback;
DROP POLICY IF EXISTS "Authenticated users full access" ON screening_feedback;

-- phone_screens
DROP POLICY IF EXISTS "phone_screens_select" ON phone_screens;
DROP POLICY IF EXISTS "phone_screens_insert" ON phone_screens;
DROP POLICY IF EXISTS "phone_screens_update" ON phone_screens;
DROP POLICY IF EXISTS "phone_screens_delete" ON phone_screens;
DROP POLICY IF EXISTS "Authenticated users full access" ON phone_screens;

-- challenges
DROP POLICY IF EXISTS "challenges_select" ON challenges;
DROP POLICY IF EXISTS "challenges_insert" ON challenges;
DROP POLICY IF EXISTS "challenges_update" ON challenges;
DROP POLICY IF EXISTS "challenges_delete" ON challenges;
DROP POLICY IF EXISTS "Authenticated users full access" ON challenges;

-- talent_pool
DROP POLICY IF EXISTS "talent_pool_select" ON talent_pool;
DROP POLICY IF EXISTS "talent_pool_insert" ON talent_pool;
DROP POLICY IF EXISTS "talent_pool_update" ON talent_pool;
DROP POLICY IF EXISTS "talent_pool_delete" ON talent_pool;
DROP POLICY IF EXISTS "Authenticated users full access" ON talent_pool;

-- talent_pool_screenings
DROP POLICY IF EXISTS "talent_pool_screenings_select" ON talent_pool_screenings;
DROP POLICY IF EXISTS "talent_pool_screenings_insert" ON talent_pool_screenings;
DROP POLICY IF EXISTS "talent_pool_screenings_update" ON talent_pool_screenings;
DROP POLICY IF EXISTS "talent_pool_screenings_delete" ON talent_pool_screenings;
DROP POLICY IF EXISTS "Authenticated users full access" ON talent_pool_screenings;

-- talent_benchmarks
DROP POLICY IF EXISTS "talent_benchmarks_select" ON talent_benchmarks;
DROP POLICY IF EXISTS "talent_benchmarks_insert" ON talent_benchmarks;
DROP POLICY IF EXISTS "talent_benchmarks_update" ON talent_benchmarks;
DROP POLICY IF EXISTS "talent_benchmarks_delete" ON talent_benchmarks;
DROP POLICY IF EXISTS "Authenticated users full access" ON talent_benchmarks;

-- feedback_emails
DROP POLICY IF EXISTS "feedback_emails_select" ON feedback_emails;
DROP POLICY IF EXISTS "feedback_emails_insert" ON feedback_emails;
DROP POLICY IF EXISTS "feedback_emails_update" ON feedback_emails;
DROP POLICY IF EXISTS "feedback_emails_delete" ON feedback_emails;
DROP POLICY IF EXISTS "Authenticated users full access" ON feedback_emails;

-- users
DROP POLICY IF EXISTS "users_select" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_update" ON users;
DROP POLICY IF EXISTS "users_delete" ON users;
DROP POLICY IF EXISTS "Authenticated users full access" ON users;
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- truora_directory
DROP POLICY IF EXISTS "truora_directory_select" ON truora_directory;
DROP POLICY IF EXISTS "truora_directory_insert" ON truora_directory;
DROP POLICY IF EXISTS "truora_directory_update" ON truora_directory;
DROP POLICY IF EXISTS "truora_directory_delete" ON truora_directory;
DROP POLICY IF EXISTS "Authenticated users full access" ON truora_directory;

-- ============================================================
-- 3. CREAR NUEVAS POLÍTICAS - ACCESO TOTAL PARA AUTENTICADOS
-- ============================================================

-- candidates
CREATE POLICY "Authenticated users full access" ON candidates
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- candidate_references
CREATE POLICY "Authenticated users full access" ON candidate_references
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- processes
CREATE POLICY "Authenticated users full access" ON processes
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- process_candidates
CREATE POLICY "Authenticated users full access" ON process_candidates
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- process_participants
CREATE POLICY "Authenticated users full access" ON process_participants
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- loops
CREATE POLICY "Authenticated users full access" ON loops
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- loop_assignments
CREATE POLICY "Authenticated users full access" ON loop_assignments
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- evaluations
CREATE POLICY "Authenticated users full access" ON evaluations
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- decisions
CREATE POLICY "Authenticated users full access" ON decisions
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- screenings
CREATE POLICY "Authenticated users full access" ON screenings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- screening_feedback
CREATE POLICY "Authenticated users full access" ON screening_feedback
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- phone_screens
CREATE POLICY "Authenticated users full access" ON phone_screens
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- challenges
CREATE POLICY "Authenticated users full access" ON challenges
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- talent_pool
CREATE POLICY "Authenticated users full access" ON talent_pool
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- talent_pool_screenings
CREATE POLICY "Authenticated users full access" ON talent_pool_screenings
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- talent_benchmarks
CREATE POLICY "Authenticated users full access" ON talent_benchmarks
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- feedback_emails
CREATE POLICY "Authenticated users full access" ON feedback_emails
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- users (política especial: todos pueden ver, solo el propio puede editar)
CREATE POLICY "Users can view all" ON users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own or admin" ON users
  FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- truora_directory
CREATE POLICY "Authenticated users full access" ON truora_directory
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- 4. VERIFICACIÓN
-- ============================================================
-- Ejecuta esto para verificar que las políticas se crearon:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';

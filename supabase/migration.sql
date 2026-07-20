-- ============================================
-- ESD Classroom — Supabase Database Migration
-- ============================================
-- Jalankan SQL ini di Supabase SQL Editor
-- untuk membuat semua tabel dan RLS policies.
-- ============================================

-- 1. TABLE: classes
CREATE TABLE IF NOT EXISTS classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);

-- 2. TABLE: students
CREATE TABLE IF NOT EXISTS students (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim        TEXT NOT NULL,
  name       TEXT NOT NULL,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(nim, class_id)
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_nim ON students(nim);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- 3. TABLE: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_class_id ON tasks(class_id);

-- 4. TABLE: submissions
CREATE TABLE IF NOT EXISTS submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  link         TEXT NOT NULL,
  score        INTEGER CHECK (score >= 0 AND score <= 100),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_task_id ON submissions(task_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);

-- Pastikan kolom score ada (untuk tabel yang sudah ada sebelumnya)
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS score INTEGER CHECK (score >= 0 AND score <= 100);

-- 5. TABLE: app_config (singleton — menyimpan pengaturan global aplikasi)
CREATE TABLE IF NOT EXISTS app_config (
  id           UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  site_title   TEXT NOT NULL DEFAULT 'ESD Project',
  footer_text  TEXT NOT NULL DEFAULT 'Created with ❤️ for all FBS',
  theme_color  TEXT NOT NULL DEFAULT '#1a73e8',
  theme_dark   TEXT NOT NULL DEFAULT '#1557b0',
  theme_light  TEXT NOT NULL DEFAULT '#e8f0fe',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   UUID REFERENCES auth.users(id)
);

-- Tambah kolom theme jika sudah ada tabel sebelumnya (idempotent) — HARUS sebelum INSERT
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT '#1a73e8';
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS theme_dark TEXT NOT NULL DEFAULT '#1557b0';
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS theme_light TEXT NOT NULL DEFAULT '#e8f0fe';

-- Insert default row jika belum ada
INSERT INTO app_config (id, site_title, footer_text, theme_color, theme_dark, theme_light)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'ESD Project',
  'Created with ❤️ for all FBS',
  '#1a73e8',
  '#1557b0',
  '#e8f0fe'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- --- CLASSES ---
DROP POLICY IF EXISTS "Lecturers can manage own classes" ON classes;
CREATE POLICY "Lecturers can manage own classes"
  ON classes FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
CREATE POLICY "Anyone can view classes"
  ON classes FOR SELECT
  TO anon, authenticated
  USING (true);

-- --- STUDENTS ---
DROP POLICY IF EXISTS "Lecturers can manage students in own class" ON students;
CREATE POLICY "Lecturers can manage students in own class"
  ON students FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = students.class_id
      AND classes.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view students" ON students;
CREATE POLICY "Anyone can view students"
  ON students FOR SELECT
  TO anon, authenticated
  USING (true);

-- --- TASKS ---
DROP POLICY IF EXISTS "Lecturers can manage tasks" ON tasks;
CREATE POLICY "Lecturers can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = tasks.class_id
      AND classes.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view tasks" ON tasks;
CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT
  TO anon, authenticated
  USING (true);

-- --- SUBMISSIONS ---
DROP POLICY IF EXISTS "Lecturers can manage submissions in own class" ON submissions;
CREATE POLICY "Lecturers can manage submissions in own class"
  ON submissions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN classes ON classes.id = tasks.class_id
      WHERE tasks.id = submissions.task_id
      AND classes.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN classes ON classes.id = tasks.class_id
      WHERE tasks.id = submissions.task_id
      AND classes.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can insert submission" ON submissions;
CREATE POLICY "Anyone can insert submission"
  ON submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view submissions" ON submissions;
CREATE POLICY "Anyone can view submissions"
  ON submissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- --- APP CONFIG ---
DROP POLICY IF EXISTS "Anyone can view app config" ON app_config;
CREATE POLICY "Anyone can view app config"
  ON app_config FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Lecturers can update app config" ON app_config;
CREATE POLICY "Lecturers can update app config"
  ON app_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- AUTO UPDATE updated_at TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_app_config_updated_at ON app_config;
CREATE TRIGGER update_app_config_updated_at
  BEFORE UPDATE ON app_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REFRESH PostgREST SCHEMA CACHE
-- ============================================
-- Penting! Setiap kali ada perubahan kolom (ADD, ALTER),
-- refresh cache agar Supabase API tau kolom baru.

NOTIFY pgrst, 'reload schema';

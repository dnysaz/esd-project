-- ============================================
-- ESD Classroom — Supabase Cleanup Script
-- ============================================
-- TARGET: Project lama "xlinks-medi"
-- Tabel yang ada: assignments, classes, grades, students, submissions
-- ============================================
-- CARA PAKAI: Buka Supabase SQL Editor, paste, RUN
-- ============================================

-- ============================================
-- 1. HAPUS DATA (urut sesuai foreign key)
-- ============================================

DELETE FROM grades;
DELETE FROM submissions;
DELETE FROM assignments;
DELETE FROM students;
DELETE FROM classes;

-- ============================================
-- 2. DROP TABEL LAMA (biar bersih total)
-- ============================================

DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;

-- ============================================
-- 3. STORAGE (jika ada file) — Gunakan Storage API di Dashboard
-- ============================================
-- Hapus manual lewat: Supabase Dashboard > Storage > pilih bucket > Delete all files
-- Atau lewat API. SQL DELETE langsung tidak diizinkan oleh Supabase.

-- ============================================
-- 4. HAPUS AUTH USERS (OPSIONAL - HATI-HATI!)
-- ============================================
-- Hanya uncomment jika mau reset user login juga:
-- DELETE FROM auth.users;

-- ============================================
-- 5. VERIFIKASI — Pastikan sudah bersih
-- ============================================

SELECT '✅ Cleanup selesai! Tabel yang tersisa di public:' as info;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

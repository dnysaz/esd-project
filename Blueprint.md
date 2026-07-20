# 🎓 Blueprint — Aplikasi ESD Project (Google Classroom-style)

> **Tujuan:** Web app untuk dosen menerima link tugas dari mahasiswa, dengan gaya Google Classroom.
> **Tech Stack:** Next.js 14+ (App Router), Supabase (Auth + DB + Storage), Tailwind CSS
> **Status:** Planning / Pra-Pengembangan

---

## 📋 Daftar Isi

1. [Ringkasan Fitur](#1-ringkasan-fitur)
2. [Arsitektur Aplikasi](#2-arsitektur-aplikasi)
3. [Database Schema (Supabase/PostgreSQL)](#3-database-schema)
4. [Struktur Routing (Next.js App Router)](#4-struktur-routing)
5. [Alur Pengguna (User Flow)](#5-alur-pengguna)
6. [Komponen UI Utama](#6-komponen-ui-utama)
7. [Aturan Keamanan (RLS Policies)](#7-aturan-keamanan)
8. [Daftar Environment Variables](#8-environment-variables)
9. [Tahapan Pengembangan (Roadmap)](#9-tahapan-pengembangan)

---

## 1. Ringkasan Fitur

### Untuk Dosen (Authenticated)

| Fitur | Deskripsi |
|-------|-----------|
| **Login** | Autentikasi via Supabase Auth (email/password atau Google OAuth) |
| **Dashboard Kelas** | Melihat seluruh kelas yang dibuat — tampilan card grid |
| **Buat Kelas** | Form sederhana untuk membuat kelas baru (nama kelas, deskripsi) |
| **Upload Mahasiswa** | Upload file Excel (.xlsx/.xls) format `NIM \| NAME`, otomatis terdaftar ke kelas |
| **Buat Tugas** | Input Task Name + Description (opsional), bisa di-edit dan di-hapus |
| **Lihat Submissions** | Tabel NIM ke bawah, Link tugas ke samping — per tugas |
| **Hapus Link** | Menghapus link submission mahasiswa agar bisa submit ulang |

### Untuk Mahasiswa (Unauthenticated)

| Fitur | Deskripsi |
|-------|-----------|
| **Pilih Kelas** | Masuk tanpa login, langsung pilih kelas dari daftar |
| **Cari Nama** | Live search nama/NIM — filter instan dari daftar mahasiswa kelas |
| **Verifikasi NIM** | Setelah klik nama, input NIM lagi untuk verifikasi |
| **Lihat Tugas** | Daftar tugas yang tersedia untuk kelas tsb |
| **Submit Link** | Upload link tugas (sekali submit, tidak bisa diubah) |
| **Status Submitted** | Card tugas berubah centang & disabled jika sudah submit |

---

## 2. Arsitektur Aplikasi

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App Router                 │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Client Comp  │  │ Server Comp  │  │ Server Act │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                 │        │
│  ┌──────┴────────────────┴─────────────────┴──────┐ │
│  │           Supabase Client Library              │ │
│  │   (@supabase/supabase-js + @supabase/ssr)      │ │
│  └──────────────────────┬────────────────────────┘ │
└─────────────────────────┼──────────────────────────┘
                          │
┌─────────────────────────┼──────────────────────────┐
│              Supabase (Backend-as-a-Service)        │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  PostgreSQL  │  │   Auth   │  │   Storage     │  │
│  │  (Database)  │  │          │  │   (Files)     │  │
│  └─────────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Pola Autentikasi (Supabase SSR)

- **`@supabase/ssr`** untuk cookie-based auth
- **Middleware** di `middleware.ts` untuk refresh session & proteksi route
- **Server Client** (`createServerClient`) di Server Components & Server Actions
- **Browser Client** (`createBrowserClient`) di Client Components

---

## 3. Database Schema

### Tabel `classes`

```sql
CREATE TABLE classes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_classes_created_by ON classes(created_by);
```

### Tabel `students`

```sql
CREATE TABLE students (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim        TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  class_id   UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_students_class_id ON students(class_id);
CREATE INDEX idx_students_nim ON students(nim);
CREATE INDEX idx_students_name ON students(name);
```

### Tabel `tasks`

```sql
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_class_id ON tasks(class_id);
```

### Tabel `submissions`

```sql
CREATE TABLE submissions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  link       TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, student_id) -- satu submission per tugas per mahasiswa
);

-- Indexes
CREATE INDEX idx_submissions_task_id ON submissions(task_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
```

### Entity Relationship Diagram (ERD)

```
auth.users
    │
    │ 1
    ├────────────────────┐
    │                    │
classes.created_by ──────┘
    │ 1
    ├── tasks (class_id)
    │       │ 1
    │       └── submissions (task_id)
    │               │
    └── students (class_id)
            │ 1
            └── submissions (student_id)
```

---

## 4. Struktur Routing

```
/                               → Landing page / Halaman utama
/login                          → Halaman login dosen (Supabase Auth)

/dashboard                      → [Protected] Dashboard dosen
├── /                           → Grid card kelas-kelas dosen
├── /create                     → Form buat kelas baru
└── /[classId]                  → Detail kelas
    ├── /                       → Info kelas + daftar tugas + tombol upload mahasiswa
    ├── /tasks/new              → Form buat tugas baru
    ├── /tasks/[taskId]/edit    → Form edit tugas
    └── /tasks/[taskId]         → Tabel submissions mahasiswa per tugas

/class                          → Halaman publik pilih kelas (untuk mahasiswa)
├── /[classId]                  → Cari nama mahasiswa (live search)
└── /[classId]/verify           → Verifikasi NIM
    └── /tasks                  → Daftar tugas + submit link

/api/
├── /students/upload            → Server Action: proses upload Excel
├── /submissions/submit         → Server Action: submit link tugas
└── /submissions/delete         → Server Action: hapus link (oleh dosen)
```

### Middleware Protection

```typescript
// middleware.ts
// Proteksi: /dashboard/* → harus login (redirect ke /login jika tidak)
// Publik:  /login, /class/*, / → bebas akses
```

---

## 5. Alur Pengguna

### Alur Dosen

```
Login (Supabase Auth)
    │
    ▼
Dashboard → Grid Card Kelas
    │
    ├── Buat Kelas Baru
    │       │
    │       ▼
    │   Upload Excel Mahasiswa (NIM | NAME)
    │       │
    │       ▼
    │   Parse + Insert ke tabel students
    │
    ├── Masuk ke Kelas
    │       │
    │       ▼
    │   Daftar Tugas
    │       │
    │       ├── Buat Tugas (name + description opsional)
    │       ├── Edit Tugas
    │       ├── Hapus Tugas
    │       │
    │       ▼
    │   Detail Tugas → Tabel Submissions
    │       │
    │       └── Hapus Link (reset submission)
    │
    └── Hapus Kelas
```

### Alur Mahasiswa

```
Buka App → Pilih Kelas
    │
    ▼
Live Search Nama/NIM
    │
    ▼
Klik Nama → Verifikasi NIM
    │
    ▼
Dashboard Tugas Mahasiswa
    │
    ├── Tugas Belum Dikerjakan
    │       │
    │       ▼
    │   Klik Tugas → Form Submit Link
    │       │
    │       ▼
    │   Submit → Card centang, disabled
    │
    └── Tugas Selesai (centang, tidak bisa diklik)
```

---

## 6. Komponen UI Utama

### Gaya Google Classroom

| Komponen | Deskripsi |
|----------|-----------|
| **Navbar** | Logo, navigasi, avatar dosen (jika login) |
| **ClassCard** | Card kelas dengan warna header acak (seperti Google Classroom) |
| **TaskCard** | Card tugas dengan icon status (pending/centang) |
| **SubmissionTable** | Tabel NIM ke bawah, link ke samping |
| **SearchBar** | Live search input dengan debounce |
| **ExcelUploader** | Drag & drop / pilih file Excel, preview data |
| **StudentSelector** | Dropdown/daftar hasil live search mahasiswa |
| **Modal** | Modal untuk form submit link, verifikasi, dll |
| **EmptyState** | Ilustrasi ketika belum ada data |

### Mobile-First + Lazy Loading

- **Tailwind CSS** dengan breakpoint responsive (`sm:`, `md:`, `lg:`)
- **CSS Grid / Flexbox** untuk layout card yang rapi
- **Infinite scroll / pagination** untuk daftar submissions
- **React.lazy + Suspense** untuk komponen berat (Excel parser)
- **Dynamic import** untuk komponen yang tidak perlu di SSR

---

## 7. Aturan Keamanan (RLS Policies)

### Table `classes`

```sql
-- Dosen hanya bisa melihat & mengelola kelasnya sendiri
CREATE POLICY "Lecturers can manage own classes"
  ON classes FOR ALL
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

### Table `students`

```sql
-- Dosen bisa manage students di kelasnya
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

-- Mahasiswa (unauthenticated) bisa SELECT students by class_id
CREATE POLICY "Students can view students in class"
  ON students FOR SELECT
  TO anon
  USING (true); -- Aman karena hanya NIM & Name
```

### Table `tasks`

```sql
-- Dosen bisa manage tasks
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

-- Mahasiswa bisa SELECT tasks by class_id
CREATE POLICY "Students can view tasks"
  ON tasks FOR SELECT
  TO anon
  USING (true);
```

### Table `submissions`

```sql
-- Dosen bisa SELECT & DELETE submissions di kelasnya
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
  );

-- Mahasiswa bisa INSERT submission (satu kali)
CREATE POLICY "Students can insert submission"
  ON submissions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Mahasiswa bisa SELECT submission miliknya
CREATE POLICY "Students can view own submission"
  ON submissions FOR SELECT
  TO anon
  USING (true); -- data hanya NIM + link
```

---

## 8. Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 9. Tahapan Pengembangan (Roadmap)

### Phase 1: Foundation ⚡
- [x] Buat Blueprint.md ✅
- [ ] Inisialisasi Next.js + TypeScript + Tailwind CSS
- [ ] Setup Supabase project + database schema (SQL migration)
- [ ] Setup Supabase SSR auth (utility clients + middleware)
- [ ] Setup environment variables

### Phase 2: Auth & Dosen Flow 🔐
- [ ] Halaman login dosen (Supabase Auth UI atau custom)
- [ ] Dashboard dosen — grid card kelas
- [ ] Form buat kelas baru
- [ ] CRUD kelas

### Phase 3: Student Import 📊
- [ ] Upload Excel (xlsx) — drag & drop
- [ ] Parse Excel ke tabel students
- [ ] Preview data sebelum simpan
- [ ] Integrasi dengan class_id

### Phase 4: Task Management 📝
- [ ] CRUD tugas (buat, edit, hapus)
- [ ] Daftar tugas per kelas
- [ ] Halaman detail tugas + tabel submissions
- [ ] Hapus link submission (dosen)

### Phase 5: Mahasiswa Flow 👨‍🎓
- [ ] Halaman publik pilih kelas
- [ ] Live search mahasiswa (debounce)
- [ ] Verifikasi NIM
- [ ] Daftar tugas mahasiswa
- [ ] Form submit link
- [ ] Status centang + disabled

### Phase 6: Polish & UX ✨
- [ ] UI gaya Google Classroom (warna header card, icon, typografi)
- [ ] Mobile responsive
- [ ] Lazy loading & infinite scroll
- [ ] Animasi & transisi (micro-interactions)
- [ ] Empty states & loading skeletons
- [ ] Error handling & toast notifications

### Phase 7: Production 🚀
- [ ] Testing (manual / automated)
- [ ] Deploy ke Vercel
- [ ] Domain & SSL

---

## Catatan Penting

1. **Mahasiswa tidak perlu login** — akses publik cukup dengan verifikasi NIM untuk mencegah kesalahan user.
2. **Sekali submit, tidak bisa edit** — hanya dosen yang bisa menghapus link submission.
3. **Format Excel**: kolom `NIM` dan `NAME` (header bisa disesuaikan).
4. **Gaya Google Classroom** — card dengan header berwarna, icon, typography Material Design.
5. **Mobile friendly** — prioritaskan tampilan mobile dengan Tailwind responsive utilities.
6. **Lazy loading** — gunakan dynamic import untuk komponen berat (Excel parser, dll).

---

> **Dibuat oleh:** Buffy (Freebuff AI Assistant)
> **Tanggal:** July 19, 2026

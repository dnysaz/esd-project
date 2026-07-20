// ============ Database Types ============

export interface Class {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  nim: string;
  name: string;
  class_id: string;
  created_at: string;
}

export interface Task {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  task_id: string;
  student_id: string;
  link: string;
  score: number | null;
  submitted_at: string;
}

// ============ Extended / View Types ============

export interface StudentWithSubmission extends Student {
  submission?: Submission | null;
}

export interface TaskWithSubmissionStatus extends Task {
  submitted?: boolean;
  submission?: Submission | null;
}

export interface ClassWithStats extends Class {
  student_count?: number;
  task_count?: number;
}

// ============ Form Types ============

export type CreateClassForm = {
  name: string;
  description?: string;
};

export type CreateTaskForm = {
  title: string;
  description?: string;
};

export type SubmitLinkForm = {
  link: string;
};

// ============ App Config ============

export interface AppConfig {
  id: string;
  site_title: string;
  footer_text: string;
  theme_color: string;
  theme_dark: string;
  theme_light: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ThemeColors {
  id: string;
  name: string;
  primary: string;
  dark: string;
  light: string;
}

// ============ Excel Import ============

export interface ExcelStudentRow {
  NIM: string | number;
  NAME: string;
  [key: string]: unknown;
}

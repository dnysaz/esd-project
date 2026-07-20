"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Users,
  Pencil,
  Trash2,
  Upload,
  Check,
  X,
  AlertCircle,
  Loader2,
  UserMinus,
  GraduationCap,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Student } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

export default function StudentsPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNim, setEditNim] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  // Add new student
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNim, setNewNim] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation modal
  const [confirmDelete, setConfirmDelete] = useState<{
    type: "single" | "all";
    student?: Student;
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();

      const [{ data: classData }, { data: studentsData }] = await Promise.all([
        supabase.from("classes").select("name, created_by").eq("id", classId).single(),
        supabase
          .from("students")
          .select("*")
          .eq("class_id", classId)
          .order("created_at", { ascending: true }),

      // Only show if user owns this class
      ]);

      // Only show if user owns this class
      if (classData && classData.created_by !== userData?.user?.id) {
        router.push("/dashboard");
        return;
      }

      if (classData) setClassName(classData.name);
      if (studentsData) setStudents(studentsData);
      setLoading(false);
    }

    fetchData();
  }, [classId]);

  // ===== EDIT =====
  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setEditNim(student.nim);
    setEditName(student.name);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditNim("");
    setEditName("");
    setError(null);
  };

  const saveEdit = async (studentId: string) => {
    if (!editNim.trim() || !editName.trim()) {
      setError("NIM and Name are required");
      return;
    }

    setSaving(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("students")
      .update({ nim: editNim.trim(), name: editName.trim() })
      .eq("id", studentId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, nim: editNim.trim(), name: editName.trim() }
          : s
      )
    );

    setEditingId(null);
    setSaving(false);
  };

  // ===== ADD NEW =====
  const handleAddStudent = async () => {
    if (!newNim.trim() || !newName.trim()) {
      setError("NIM and Name are required");
      return;
    }

    setAdding(true);
    setError(null);

    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("students")
      .insert({
        nim: newNim.trim(),
        name: newName.trim(),
        class_id: classId,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setAdding(false);
      return;
    }

    if (data) {
      setStudents((prev) => [...prev, data as Student]);
    }

    setNewNim("");
    setNewName("");
    setShowAddForm(false);
    setAdding(false);
  };

  // ===== DELETE SINGLE =====
  const deleteStudent = async () => {
    const student = confirmDelete?.student;
    if (!student) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", student.id);

    if (error) {
      setError(error.message);
      return;
    }

    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    setConfirmDelete(null);
  };

  // ===== DELETE ALL =====
  const deleteAllStudents = async () => {
    setDeletingAll(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase
      .from("students")
      .delete()
      .eq("class_id", classId);

    if (error) {
      setError(error.message);
      setDeletingAll(false);
      return;
    }

    setStudents([]);
    setDeletingAll(false);
    setConfirmDelete(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, studentId: string) => {
    if (e.key === "Enter") {
      saveEdit(studentId);
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in px-4 md:px-8">
        {/* Back button skeleton */}
        <div className="skeleton h-8 w-28 rounded-full mb-6" />
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="skeleton w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-7 w-40" />
              <div className="skeleton h-4 w-56" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-10 w-36 rounded-full" />
            <div className="skeleton h-10 w-36 rounded-full" />
          </div>
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="p-4 space-y-3">
            <div className="skeleton h-8 w-full" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in px-4 md:px-8">
      {/* Back */}
      <Link href={`/dashboard/${classId}`} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Class
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Students</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {className} &middot; {students.length} students
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowAddForm(!showAddForm);
              setError(null);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Student</span>
          </button>
          <Link
            href={`/dashboard/${classId}/students/upload`}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import Excel</span>
          </Link>
          {students.length > 0 && (
            <button
              onClick={() => setConfirmDelete({ type: "all" })}
              disabled={deletingAll}
              className="btn-danger"
            >
              {deletingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserMinus className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Delete All</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add New Student Form */}
      {showAddForm && (
        <div className="mb-6 bg-primary-light/30 border border-primary/20 rounded-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-medium text-text">Add New Student</h3>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="sm:w-6/12 w-full">
              <input
                type="text"
                value={newNim}
                onChange={(e) => setNewNim(e.target.value)}
                placeholder="NIM"
                className="input-field py-2 text-sm w-full"
              />
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full Name"
                className="input-field py-2 text-sm w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddStudent();
                }}
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleAddStudent}
                disabled={adding || !newNim.trim() || !newName.trim()}
                className="btn-primary text-sm py-2"
              >
                {adding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewNim("");
                  setNewName("");
                }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {students.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-16 text-center">
          <GraduationCap className="w-16 h-16 text-text-secondary/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text mb-2">
            No students yet
          </h2>
          <p className="text-text-secondary mb-6 max-w-md mx-auto">
            Add students manually or import from an Excel file.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary px-8 py-3"
            >
              <Plus className="w-5 h-5" />
              Add Student
            </button>
            <Link
              href={`/dashboard/${classId}/students/upload`}
              className="btn-secondary px-8 py-3"
            >
              <Upload className="w-5 h-5" />
              Import Excel
            </Link>
          </div>
        </div>
      ) : (
        /* Student List */
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary w-12">
                    No
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary w-48">
                    NIM
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    Name
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-text-secondary w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr
                    key={student.id}
                    className="border-b border-border last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-text-secondary text-center">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === student.id ? (
                        <input
                          type="text"
                          value={editNim}
                          onChange={(e) => setEditNim(e.target.value)}
                          className="input-field py-1.5 px-2 text-sm font-mono w-full"
                        />
                      ) : (
                        <span className="font-mono text-text">
                          {student.nim}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === student.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => handleEditKeyDown(e, student.id)}
                            className="input-field py-1.5 px-2 text-sm flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEdit(student.id)}
                            disabled={saving}
                            className="btn-icon text-green-600 hover:bg-green-50"
                            title="Save"
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="btn-icon text-text-secondary hover:bg-black/5"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-text">{student.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(student)}
                          className="btn-icon text-text-secondary hover:bg-primary-light hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ type: "single", student })}
                          className="btn-icon text-text-secondary hover:bg-red-50 hover:text-danger"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stats footer */}
      {students.length > 0 && (
        <div className="mt-4 text-sm text-text-secondary">
          Total: <strong>{students.length}</strong> students
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={
          confirmDelete?.type === "single" ? deleteStudent : deleteAllStudents
        }
        title={
          confirmDelete?.type === "all"
            ? "Delete All Students"
            : "Remove Student"
        }
        message={
          confirmDelete?.type === "all"
            ? `Are you sure you want to remove ALL ${students.length} students from this class? This cannot be undone.`
            : `Are you sure you want to remove "${confirmDelete?.student?.name}" (${confirmDelete?.student?.nim}) from this class?`
        }
        confirmText={
          confirmDelete?.type === "all" ? "Delete All" : "Remove"
        }
        loading={deletingAll}
        variant="danger"
      />
    </div>
  );
}

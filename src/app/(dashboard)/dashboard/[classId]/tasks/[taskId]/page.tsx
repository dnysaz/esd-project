"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardList,
  Users,
  Trash2,
  Pencil,
  ExternalLink,
  Loader2,
  Check,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EditTaskModal } from "@/components/ui/edit-task-modal";
import type { Submission } from "@/types";

interface Props {
  params: Promise<{ classId: string; taskId: string }>;
}

export default function TaskDetailPage({ params }: Props) {
  const { classId, taskId } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingScore, setSavingScore] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<Set<string>>(new Set());
  const [showEditTask, setShowEditTask] = useState(false);
  const [deleteSubConfirm, setDeleteSubConfirm] = useState<string | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const [{ data: classInfo }, { data: taskData }, { data: studentsData }, { data: submissionsData }] =
        await Promise.all([
          supabase.from("classes").select("name").eq("id", classId).eq("created_by", userData.user.id).single(),
          supabase.from("tasks").select("*").eq("id", taskId).eq("class_id", classId).single(),
          supabase.from("students").select("*").eq("class_id", classId).order("nim", { ascending: true }),
          supabase.from("submissions").select("*").eq("task_id", taskId),
        ]);

      if (!classInfo || !taskData) {
        router.push("/dashboard");
        return;
      }

      setClassData(classInfo);
      setTask(taskData);
      if (studentsData) setStudents(studentsData);
      if (submissionsData) setSubmissions(submissionsData);
      setLoading(false);
    }

    fetchData();
  }, [classId, taskId, router]);

  // Build lookup map
  const submissionMap = new Map<string, Submission>();
  for (const sub of submissions) {
    submissionMap.set(sub.student_id, sub);
  }

  const handleDeleteTask = async () => {
    setDeleting(true);

    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);

    if (!error) {
      router.push(`/dashboard/${classId}`);
    }
    setDeleting(false);
  };

  const handleDeleteSubmission = async (studentId: string) => {
    setDeletingSub(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("task_id", taskId)
      .eq("student_id", studentId);

    if (!error) {
      setSubmissions((prev) => prev.filter((s) => s.student_id !== studentId));
    }

    setDeletingSub(false);
    setDeleteSubConfirm(null);
  };

  const handleSaveScore = async (studentId: string, score: number | null) => {
    setSavingScore(studentId);
    const supabase = createClient();
    const { error } = await supabase
      .from("submissions")
      .update({ score })
      .eq("task_id", taskId)
      .eq("student_id", studentId);

    if (!error) {
      // Update local state instantly so UI reflects the saved score
      setSubmissions((prev) =>
        prev.map((s) =>
          s.student_id === studentId && s.task_id === taskId
            ? { ...s, score }
            : s
        )
      );
    } else {
      console.error("Failed to save score:", JSON.stringify(error), error);
    }
    setSavingScore(null);
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Back button skeleton */}
        <div className="skeleton h-8 w-28 rounded-full mb-6" />
        {/* Task header skeleton */}
        <div className="rounded-xl border border-border p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-7 w-64" />
              <div className="skeleton h-4 w-40" />
              <div className="skeleton h-4 w-96 max-w-full" />
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <div className="skeleton h-10 w-20 rounded-full" />
              <div className="skeleton h-10 w-24 rounded-full" />
            </div>
          </div>
        </div>
        {/* Submissions table skeleton */}
        <div className="skeleton h-5 w-44 mb-4" />
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

  if (!task) return null;

  return (
    <div className="animate-fade-in px-4 md:px-8">
      {/* Back */}
      <Link href={`/dashboard/${classId}`} className="btn-ghost mb-4 md:mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Class
      </Link>

      {/* Task Header */}
      <div className="bg-white rounded-xl border border-border p-4 md:p-6 mb-4 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">{task.title}</h1>
              <p className="text-sm text-text-secondary mt-1">
                {classData?.name}
              </p>
              {task.description && (
                <p className="text-text-secondary mt-3 max-w-xl">
                  {task.description}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {students?.length || 0} students
                </span>
                {students && students.length > 0 && (
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-green-500" />
                      {submissions.length}/{students.length} submitted
                    </span>
                    <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${Math.round(
                            (submissions.length / students.length) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="font-semibold text-xs">
                      {Math.round(
                        (submissions.length / students.length) * 100
                      )}
                      %
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:self-start">
            <button
              onClick={() => setShowEditTask(true)}
              className="btn-secondary px-3 sm:px-6"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-danger px-3 sm:px-6"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <h2 className="text-lg font-semibold text-text mb-4">
        Student Submissions
      </h2>

      {!students || students.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <Users className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-text-secondary">
            No students registered in this class yet
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    No
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    NIM
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-text-secondary">
                    Submission Link
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-text-secondary w-36">
                    Score (0-100)
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const sub = submissionMap.get(student.id) ?? null;

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-border last:border-0 transition-colors ${
                        sub?.score !== null && sub?.score !== undefined
                          ? "bg-green-50/60 hover:bg-green-100/60"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 text-text-secondary">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-text">
                        {student.nim}
                      </td>
                      <td className="px-4 py-3 text-text">{student.name}</td>
                      <td className="px-4 py-3">
                        {sub ? (
                          <div className="flex items-center gap-2 max-w-[400px]">
                            <a
                              href={sub.link.startsWith("http") ? sub.link : "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 flex-1 min-w-0"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate block min-w-0">{sub.link}</span>
                            </a>
                            <button
                              onClick={() => setDeleteSubConfirm(sub.student_id)}
                              className="btn-icon text-danger hover:bg-red-50 flex-shrink-0"
                              title="Delete submission"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-text-secondary/60 italic">
                            Not submitted
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sub ? (
                          editingScore.has(student.id) || sub.score === null ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                defaultValue={sub.score ?? ""}
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  const num = val === "" ? null : parseInt(val, 10);
                                  if (num !== null && (isNaN(num) || num < 0 || num > 100)) return;
                                  if (num !== sub.score) {
                                    handleSaveScore(sub.student_id, num);
                                  }
                                  setEditingScore((prev) => {
                                    const next = new Set(prev);
                                    next.delete(student.id);
                                    return next;
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                placeholder="-"
                                autoFocus={editingScore.has(student.id)}
                                data-score-input={student.id}
                                className="w-24 min-w-[6rem] text-center text-base font-mono border border-primary rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                              />
                              {savingScore === sub.student_id ? (
                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                              ) : editingScore.has(student.id) ? (
                                <button
                                  onClick={() => {
                                    const input = document.querySelector(
                                      `[data-score-input="${student.id}"]`
                                    ) as HTMLInputElement;
                                    if (input) input.blur();
                                  }}
                                  className="btn-icon text-green-600 hover:bg-green-50"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className={`font-semibold text-base ${
                                  sub.score >= 80
                                    ? "text-green-600"
                                    : sub.score >= 60
                                    ? "text-amber-600"
                                    : "text-red-500"
                                }`}
                              >
                                {sub.score}
                              </span>
                              <button
                                onClick={() =>
                                  setEditingScore((prev) => {
                                    const next = new Set(prev);
                                    next.add(student.id);
                                    return next;
                                  })
                                }
                                className="btn-icon text-text-secondary hover:bg-primary-light hover:text-primary"
                                title="Edit score"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-text-secondary/40 text-xs italic">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditTask}
        onClose={() => setShowEditTask(false)}
        classId={classId}
        taskId={taskId}
        currentTitle={task.title}
        currentDescription={task.description || ""}
        onUpdated={(updated) => {
          setTask((prev: any) => ({ ...prev, ...updated }));
        }}
      />

      {/* Delete submission confirmation */}
      <ConfirmModal
        isOpen={deleteSubConfirm !== null}
        onClose={() => !deletingSub && setDeleteSubConfirm(null)}
        onConfirm={() => deleteSubConfirm && handleDeleteSubmission(deleteSubConfirm)}
        title="Delete Submission"
        message="Are you sure you want to delete this submission? The student will be able to resubmit their assignment link after this."
        confirmText="Delete Submission"
        loading={deletingSub}
        variant="danger"
      />

      {/* Delete task confirmation modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${task.title}"? All student submissions for this task will also be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

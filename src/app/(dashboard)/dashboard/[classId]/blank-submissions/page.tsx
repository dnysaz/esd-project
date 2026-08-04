"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Users,
  ClipboardList,
  Trash2,
  Pencil,
  Check,
  Loader2,
} from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Student, Task, Submission } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

export default function BlankSubmissionsPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingScore, setSavingScore] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<Set<string>>(new Set());
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

      const [{ data: classData }, { data: studentsData }, { data: tasksData }, { data: submissionsData }] =
        await Promise.all([
          supabase.from("classes").select("name").eq("id", classId).eq("created_by", userData.user.id).single(),
          supabase.from("students").select("*").eq("class_id", classId).order("nim", { ascending: true }),
          supabase.from("tasks").select("*").eq("class_id", classId).eq("task_type", "blank").order("created_at", { ascending: true }),
          supabase.from("submissions").select("*, students!inner(class_id)").eq("students.class_id", classId),
        ]);

      if (!classData) {
        router.push("/dashboard");
        return;
      }

      const blankTasks = (tasksData || []).filter((t) => t.task_type === "blank");
      const blankTaskIds = new Set(blankTasks.map((t) => t.id));
      const blankSubs = (submissionsData || []).filter((s) => blankTaskIds.has(s.task_id));

      setClassName(classData.name);
      setStudents(studentsData || []);
      setTasks(blankTasks);
      setSubmissions(blankSubs);
      setLoading(false);
    }

    fetchData();
  }, [classId, router]);

  // Build lookup map: `${studentId}_${taskId}` -> submission
  const submissionMap = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const sub of submissions) {
      map.set(`${sub.student_id}_${sub.task_id}`, sub);
    }
    return map;
  }, [submissions]);

  const handleDeleteSubmission = async (studentId: string, taskId: string) => {
    setDeletingSub(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("task_id", taskId)
      .eq("student_id", studentId);

    if (!error) {
      setSubmissions((prev) =>
        prev.filter((s) => !(s.student_id === studentId && s.task_id === taskId))
      );
    }

    setDeletingSub(false);
    setDeleteSubConfirm(null);
  };

  const handleSaveScore = async (studentId: string, taskId: string, score: number | null) => {
    const key = `${studentId}_${taskId}`;
    setSavingScore(key);
    const supabase = createClient();
    const { error } = await supabase
      .from("submissions")
      .update({ score })
      .eq("task_id", taskId)
      .eq("student_id", studentId);

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) =>
          s.student_id === studentId && s.task_id === taskId ? { ...s, score } : s
        )
      );
    } else {
      console.error("Failed to save score:", JSON.stringify(error));
    }
    setSavingScore(null);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] animate-fade-in">
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-2">
          <div className="skeleton h-8 w-28 rounded-full mb-2" />
          <div className="bg-gray-100 rounded-xl p-4 md:p-5 mb-4 border border-border">
            <div className="space-y-3">
              <div className="skeleton h-4 w-28 rounded-full" />
              <div className="skeleton h-8 w-48" />
              <div className="skeleton h-4 w-40" />
            </div>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="skeleton h-8 w-full" />
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-6 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] animate-fade-in">
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-2">
        {/* Back button */}
        <Link href={`/dashboard/${classId}`} className="btn-ghost mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Class
        </Link>

        {/* Header */}
        <div className="bg-primary rounded-xl p-4 md:p-5 mb-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-white/80 flex-shrink-0" />
                <span className="text-sm text-white/70 font-medium">
                  Blank Task Submissions
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-bold mb-1 truncate">
                {className}
              </h1>
              <p className="text-white/80 text-sm">
                {tasks.length} blank task{tasks.length !== 1 ? "s" : ""} &middot;{" "}
                {students.length} students
              </p>
            </div>
          </div>
        </div>

        {/* Empty states */}
        {tasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <FileText className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary mb-1">
              No blank tasks created yet
            </p>
            <p className="text-xs text-text-secondary/60">
              Use &quot;New Task&quot; &gt; &quot;Blank Task&quot; to create one
            </p>
          </div>
        )}

        {/* Per-task cards */}
        {tasks.length > 0 && (
          <div className="space-y-8">
            {tasks.map((task) => {
              const taskSubs = submissions.filter((s) => s.task_id === task.id);

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-border overflow-hidden"
                >
                  {/* Task header */}
                  <div className="px-4 md:px-6 py-4 border-b border-border bg-gray-50/60">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                        <ClipboardList className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-text truncate">
                          {task.title}
                        </h2>
                        {task.description && (
                          <p className="text-sm text-text-secondary mt-0.5 line-clamp-2 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-secondary">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {students.length} students
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-green-500" />
                          {taskSubs.length}/{students.length} answered
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Answers table */}
                  {students.length === 0 ? (
                    <div className="p-10 text-center text-text-secondary">
                      No students registered in this class yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b border-border">
                            <th className="text-left px-4 py-3 font-medium text-text-secondary w-12">
                              No
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-text-secondary w-40">
                              NIM
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-text-secondary">
                              Name
                            </th>
                            <th className="text-left px-4 py-3 font-medium text-text-secondary">
                              Answer
                            </th>
                            <th className="text-center px-4 py-3 font-medium text-text-secondary w-36">
                              Score (0-100)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student, index) => {
                            const sub = submissionMap.get(`${student.id}_${task.id}`) ?? null;
                            const key = `${student.id}_${task.id}`;

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
                                <td className="px-4 py-3 text-text">
                                  {student.name}
                                </td>
                                <td className="px-4 py-3">
                                  {sub ? (
                                    <div className="flex items-start gap-2 max-w-[480px]">
                                      <div className="flex-1 min-w-0 whitespace-pre-wrap break-words text-text max-h-[180px] overflow-y-auto pr-1 leading-relaxed">
                                        {sub.answer}
                                      </div>
                                      <button
                                        onClick={() => setDeleteSubConfirm(key)}
                                        className="btn-icon text-danger hover:bg-red-50 flex-shrink-0"
                                        title="Delete submission"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-text-secondary/60 italic">
                                      Not answered
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {sub ? (
                                    editingScore.has(key) || sub.score === null ? (
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
                                              handleSaveScore(student.id, task.id, num);
                                            }
                                            setEditingScore((prev) => {
                                              const next = new Set(prev);
                                              next.delete(key);
                                              return next;
                                            });
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              (e.target as HTMLInputElement).blur();
                                            }
                                          }}
                                          placeholder="-"
                                          autoFocus={editingScore.has(key)}
                                          data-score-input={key}
                                          className="w-24 min-w-[6rem] text-center text-base font-mono border border-primary rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                                        />
                                        {savingScore === key ? (
                                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                        ) : editingScore.has(key) ? (
                                          <button
                                            onClick={() => {
                                              const input = document.querySelector(
                                                `[data-score-input="${key}"]`
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
                                              next.add(key);
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
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Delete submission confirmation */}
        <ConfirmModal
          isOpen={deleteSubConfirm !== null}
          onClose={() => !deletingSub && setDeleteSubConfirm(null)}
          onConfirm={() => {
            if (!deleteSubConfirm) return;
            const [studentId, taskId] = deleteSubConfirm.split("_");
            handleDeleteSubmission(studentId, taskId);
          }}
          title="Delete Submission"
          message="Are you sure you want to delete this answer? The student will be able to resubmit their answer after this."
          confirmText="Delete Answer"
          loading={deletingSub}
          variant="danger"
        />
      </main>
    </div>
  );
}

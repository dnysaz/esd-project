"use client";

import { use, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, FileText, Users, ClipboardList, Table2, School } from "lucide-react";
import type { Student, Task, Submission } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

export default function BlankScoresPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

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
          supabase.from("students").select("*").eq("class_id", classId).order("name", { ascending: true }),
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

  // Compute per-student average across scored blank tasks
  const studentAverage = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const student of students) {
      let sum = 0;
      let count = 0;
      for (const task of tasks) {
        const sub = submissionMap.get(`${student.id}_${task.id}`);
        if (sub?.score !== null && sub?.score !== undefined) {
          sum += sub.score;
          count++;
        }
      }
      map.set(student.id, count > 0 ? sum / count : null);
    }
    return map;
  }, [students, tasks, submissionMap]);

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
              {[...Array(5)].map((_, i) => (
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
        <div className="bg-primary rounded-xl p-4 md:p-5 mb-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <School className="w-5 h-5 text-white/80 flex-shrink-0" />
                <span className="text-sm text-white/70 font-medium">
                  Blank Task Scores
                </span>
              </div>
              <h1 className="text-xl md:text-3xl font-bold mb-1 truncate">
                {className}
              </h1>
              <p className="text-white/80 text-sm">
                {students.length} students &middot; {tasks.length} blank task{tasks.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Empty states */}
        {tasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <FileText className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary mb-1">No blank tasks created yet</p>
            <p className="text-xs text-text-secondary/60">
              Use &quot;New Task&quot; &gt; &quot;Blank Task&quot; to create one
            </p>
          </div>
        )}

        {students.length === 0 && tasks.length > 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <Users className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">No students registered yet</p>
          </div>
        )}

        {/* Score matrix */}
        {students.length > 0 && tasks.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh] overscroll-x-contain">
                <table className="w-full text-sm border-collapse">
                  {/* Sticky header */}
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-border">
                      <th className="sticky left-0 bg-gray-50 z-10 text-left px-2 sm:px-4 py-3 font-semibold text-text-secondary w-[36px] sm:min-w-[40px] border-r border-border">
                        No
                      </th>
                      <th className="sticky left-[36px] sm:left-[40px] bg-gray-50 z-10 text-left px-2 sm:px-4 py-3 font-semibold text-text-secondary w-[80px] sm:min-w-[120px] border-r border-border">
                        NIM
                      </th>
                      <th className="sticky left-[116px] sm:left-[160px] bg-gray-50 z-10 text-left px-2 sm:px-4 py-3 font-semibold text-text-secondary w-[120px] sm:min-w-[180px] border-r border-border">
                        Name
                      </th>
                      {tasks.map((task) => (
                        <th
                          key={task.id}
                          className="text-center px-2 sm:px-3 py-3 font-semibold text-text-secondary min-w-[100px] sm:min-w-[120px] border-r border-border last:border-r-0"
                        >
                          <div className="text-[10px] sm:text-xs uppercase tracking-wider text-text-secondary/70 mb-1">
                            Blank Task
                          </div>
                          <div className="text-xs sm:text-sm font-medium text-text truncate max-w-[90px] sm:max-w-[160px]">
                            {task.title}
                          </div>
                        </th>
                      ))}
                      <th className="sticky right-0 bg-gray-50 z-10 text-center px-3 py-3 font-semibold text-text-secondary min-w-[80px] border-l border-border">
                        Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, rowIndex) => {
                      const isEven = rowIndex % 2 === 0;
                      const avg = studentAverage.get(student.id) ?? null;

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-border last:border-b-0 transition-colors hover:bg-blue-50/50 ${
                            isEven ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {/* Sticky columns */}
                          <td className={`sticky left-0 z-10 px-2 sm:px-4 py-3 text-text-secondary text-center border-r border-border ${
                            isEven ? "bg-white hover:bg-blue-50/50" : "bg-gray-50 hover:bg-blue-50/50"
                          }`}>
                            {rowIndex + 1}
                          </td>
                          <td className={`sticky left-[36px] sm:left-[40px] z-10 px-2 sm:px-4 py-3 font-mono text-text border-r border-border ${
                            isEven ? "bg-white hover:bg-blue-50/50" : "bg-gray-50 hover:bg-blue-50/50"
                          }`}>
                            {student.nim}
                          </td>
                          <td className={`sticky left-[116px] sm:left-[160px] z-10 px-2 sm:px-4 py-3 font-medium text-text border-r border-border ${
                            isEven ? "bg-white hover:bg-blue-50/50" : "bg-gray-50 hover:bg-blue-50/50"
                          } whitespace-nowrap`}>
                            {student.name}
                          </td>

                          {/* Blank task score cells */}
                          {tasks.map((task) => {
                            const sub = submissionMap.get(`${student.id}_${task.id}`);
                            const score = sub?.score ?? null;
                            const hasScore = score !== null;

                            return (
                              <td
                                key={task.id}
                                className={`px-2 sm:px-3 py-3 text-center border-r border-border last:border-r-0 ${
                                  hasScore ? "bg-green-50" : sub ? "bg-amber-50" : ""
                                }`}
                              >
                                {hasScore ? (
                                  <span
                                    className={`font-semibold text-sm ${
                                      score >= 80
                                        ? "text-green-600"
                                        : score >= 60
                                        ? "text-amber-600"
                                        : "text-red-500"
                                    }`}
                                  >
                                    {score}
                                  </span>
                                ) : sub ? (
                                  <span className="text-text-secondary/50 text-xs italic">
                                    Pending
                                  </span>
                                ) : (
                                  <span className="text-text-secondary/40 text-xs italic">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          {/* Average */}
                          <td className={`sticky right-0 z-10 px-3 py-3 text-center border-l border-border ${
                            isEven ? "bg-gray-100/80 hover:bg-blue-50/50" : "bg-gray-200/80 hover:bg-blue-50/50"
                          }`}>
                            {avg !== null ? (
                              <span
                                className={`font-semibold text-sm ${
                                  avg >= 80
                                    ? "text-green-600"
                                    : avg >= 60
                                    ? "text-amber-600"
                                    : "text-red-500"
                                }`}
                              >
                                {Math.round(avg)}
                              </span>
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

            {/* Footer stats */}
            <div className="mt-4 text-sm text-text-secondary flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-300 inline-block" />
                <span>Scored</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-200 inline-block" />
                <span>Submitted, no score yet</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-gray-50 border border-border inline-block" />
                <span>Not submitted</span>
              </span>
              <span className="ml-auto">
                <ClipboardList className="w-4 h-4 inline-block mr-1" />
                {tasks.length} blank task{tasks.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Mobile scroll hint */}
            <div className="text-xs text-text-secondary/60 mt-2 flex items-center gap-1 sm:hidden">
              <Table2 className="w-3.5 h-3.5" />
              <span>Swipe horizontally to see all tasks</span>
              <span className="text-lg">→</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

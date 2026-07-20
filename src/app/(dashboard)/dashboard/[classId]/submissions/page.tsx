"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  ClipboardList,
  Table2,
  Loader2,
  School,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Student, Task, Submission } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

export default function ClassSubmissionsPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showScores, setShowScores] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [{ data: classData }, { data: studentsData }, { data: tasksData }, { data: submissionsData }] =
        await Promise.all([
          supabase.from("classes").select("name").eq("id", classId).single(),
          supabase.from("students").select("*").eq("class_id", classId).order("created_at", { ascending: true }),
          supabase.from("tasks").select("*").eq("class_id", classId).order("created_at", { ascending: true }),
          supabase.from("submissions").select("*, students!inner(nim, name)").eq("students.class_id", classId),
        ]);

      if (classData) setClassName(classData.name);
      if (studentsData) setStudents(studentsData);
      if (tasksData) setTasks(tasksData);
      if (submissionsData) setSubmissions(submissionsData);
      setLoading(false);
    }

    fetchData();
  }, [classId]);

  // Build lookup map: `${studentId}_${taskId}` -> submission
  const submissionMap = new Map<string, Submission>();
  for (const sub of submissions) {
    submissionMap.set(`${sub.student_id}_${sub.task_id}`, sub);
  }

  // ============ Export to Excel ============
  const handleExportExcel = useCallback(() => {
    setExportingExcel(true);

    // Build headers
    const headers = ["No", "NIM", "Name", ...tasks.map((t) => t.title)];

    // Build rows
    const rows = students.map((student, index) => {
      const row: (string | number)[] = [index + 1, student.nim, student.name];
      for (const task of tasks) {
        const sub = submissionMap.get(`${student.id}_${task.id}`);
        row.push(sub ? (sub.score !== null ? sub.score : "Submitted") : "-");
      }
      return row;
    });

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws["!cols"] = [
      { wch: 4 },  // No
      { wch: 14 }, // NIM
      { wch: 30 }, // Name
      ...tasks.map(() => ({ wch: 8 })), // Scores
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Submissions");
    XLSX.writeFile(wb, `${className}_Submissions.xlsx`);

    setExportingExcel(false);
  }, [students, tasks, submissionMap, className]);

  // ============ Export to PDF ============
  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);

    try {
      const doc = new jsPDF("landscape", "mm", "a3");

      // Build table headers
      const headers = [["No", "NIM", "Name", ...tasks.map((t) => t.title)]];

      // Build table body
      const body = students.map((student, index) => {
        const row: (string | number)[] = [
          index + 1,
          student.nim,
          student.name,
        ];
        for (const task of tasks) {
          const sub = submissionMap.get(`${student.id}_${task.id}`);
          if (sub) {
            row.push(sub.score !== null ? sub.score : "Pending");
          } else {
            row.push("—");
          }
        }
        return row;
      });

      // Title row before table
      doc.setFontSize(14);
      doc.setTextColor(26, 115, 232);
      doc.text(`${className} - All Submissions`, 14, 16);

      doc.setFontSize(9);
      doc.setTextColor(95, 99, 104);
      doc.text(
        `${students.length} students \u00b7 ${tasks.length} tasks`,
        14,
        22
      );

      // Calculate column widths based on content
      const taskColWidth = Math.min(30, Math.max(18, 280 / Math.max(tasks.length, 1)));
      const colStyles: Record<number, { cellWidth: number; halign?: "center" | "left" | "right" }> = {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 28 },
        2: { cellWidth: 55 },
      };
      for (let i = 0; i < tasks.length; i++) {
        colStyles[3 + i] = { cellWidth: taskColWidth, halign: "center" };
      }

      autoTable(doc, {
        head: headers,
        body,
        startY: 28,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        styles: {
          fontSize: 7,
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [26, 115, 232],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: colStyles,
        didParseCell: (data: any) => {
          // Color-code score cells (columns after index 2)
          if (
            data.section === "body" &&
            data.column.index >= 3 &&
            typeof data.cell.raw === "number"
          ) {
            const score = data.cell.raw as number;
            if (score >= 80) {
              data.cell.styles.textColor = [21, 163, 74]; // green-600
            } else if (score >= 60) {
              data.cell.styles.textColor = [217, 119, 6]; // amber-600
            } else {
              data.cell.styles.textColor = [239, 68, 68]; // red-500
            }
          }
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      doc.save(`${className}_Submissions.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }

    setExportingPdf(false);
  }, [students, tasks, submissionMap, className]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] animate-fade-in">
        <main className="max-w-7xl mx-auto px-4 md:px-8 py-2">
          {/* Back button skeleton */}
          <div className="skeleton h-8 w-28 rounded-full mb-2" />
          {/* Header skeleton */}
          <div className="bg-primary/70 rounded-xl p-4 md:p-5 mb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="skeleton h-4 w-28 rounded-full" />
                <div className="skeleton h-8 w-48" />
                <div className="skeleton h-4 w-40" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-9 w-24 rounded-full" />
                <div className="skeleton h-9 w-24 rounded-full" />
              </div>
            </div>
          </div>
          {/* Table skeleton */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="p-4 space-y-3">
              <div className="skeleton h-8 w-full" />
              {[...Array(6)].map((_, i) => (
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

        {/* Class Header Card */}
        <div className="bg-primary rounded-xl p-4 md:p-5 mb-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <School className="w-5 h-5 text-white/80 flex-shrink-0" />
                <span className="text-sm text-white/70 font-medium">All Submissions</span>
              </div>
              <h1 className="text-xl md:text-3xl font-bold mb-1 truncate">
                {className}
              </h1>
              <p className="text-white/80 text-sm">
                {students.length} students &middot; {tasks.length} tasks
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleExportExcel}
                disabled={exportingExcel || tasks.length === 0}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {exportingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Excel</span>
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || tasks.length === 0}
                className="bg-white/20 hover:bg-white/30 text-white rounded-full px-3 sm:px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {exportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Empty states */}
        {students.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <Table2 className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">No students registered yet</p>
          </div>
        )}

        {tasks.length === 0 && students.length > 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <ClipboardList className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">No tasks created yet</p>
          </div>
        )}

        {/* Matrix Table */}
        {students.length > 0 && tasks.length > 0 && (
          <>
            {/* Info bar */}
            <div className="bg-white rounded-xl border border-border p-4 mb-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-text-secondary">Submissions overview for all students and tasks.</span>
              <button
                onClick={() => setShowScores(!showScores)}
                className={`ml-auto rounded-full px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  showScores
                    ? "bg-primary-light text-primary hover:bg-primary/20"
                    : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                }`}
                title={showScores ? "Hide scores" : "Show scores"}
              >
                {showScores ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
                <span>{showScores ? "Scores" : "Hidden"}</span>
              </button>
              {showScores ? (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" />
                    <span className="text-text-secondary text-xs">Scored</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" />
                    <span className="text-text-secondary text-xs">Submitted</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-gray-50 border border-border inline-block" />
                    <span className="text-text-secondary text-xs">Not submitted</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400 inline-block" />
                    <span className="text-text-secondary text-xs">Scored</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" />
                    <span className="text-text-secondary text-xs">Pending score</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200 inline-block" />
                    <span className="text-text-secondary text-xs">Not submitted</span>
                  </span>
                </>
              )}
            </div>

            {/* Scrollable table wrapper */}
            <div
              ref={tableRef}
              className="bg-white rounded-xl border border-border overflow-hidden"
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                <table className="w-full text-sm border-collapse" id="submissions-table">
                  {/* Sticky header */}
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-border">
                      <th className="sticky left-0 bg-gray-50 z-10 text-left px-4 py-3 font-semibold text-text-secondary min-w-[40px] border-r border-border">
                        No
                      </th>
                      <th className="sticky left-[40px] bg-gray-50 z-10 text-left px-4 py-3 font-semibold text-text-secondary min-w-[120px] border-r border-border">
                        NIM
                      </th>
                      <th className="sticky left-[160px] bg-gray-50 z-10 text-left px-4 py-3 font-semibold text-text-secondary min-w-[180px] border-r border-border">
                        Name
                      </th>
                      {tasks.map((task) => (
                        <th
                          key={task.id}
                          className="text-center px-3 py-3 font-semibold text-text-secondary min-w-[200px] max-w-[300px] border-r border-border last:border-r-0"
                        >
                          <div className="text-xs uppercase tracking-wider text-text-secondary/70 mb-1">
                            Task
                          </div>
                          <div className="text-sm font-medium text-text truncate">
                            {task.title}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, rowIndex) => {
                      const isEven = rowIndex % 2 === 0;

                      return (
                        <tr
                          key={student.id}
                          className={`border-b border-border last:border-b-0 transition-colors hover:bg-blue-50/50 ${
                            isEven ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          {/* Sticky columns */}
                          <td className="sticky left-0 z-10 px-4 py-3 text-text-secondary text-center border-r border-border bg-inherit">
                            {rowIndex + 1}
                          </td>
                          <td className="sticky left-[40px] z-10 px-4 py-3 font-mono text-text border-r border-border bg-inherit">
                            {student.nim}
                          </td>
                          <td className="sticky left-[160px] z-10 px-4 py-3 font-medium text-text border-r border-border bg-inherit whitespace-nowrap">
                            {student.name}
                          </td>

                          {/* Task columns */}
                          {tasks.map((task) => {
                            const sub = submissionMap.get(
                              `${student.id}_${task.id}`
                            );

                            return (
                              <td
                                key={task.id}
                                className={`px-3 py-3 text-center border-r border-border last:border-r-0 ${
                                  sub
                                    ? sub.score !== null
                                      ? showScores
                                        ? "bg-green-50"
                                        : "bg-green-200"
                                      : "bg-green-50"
                                    : showScores
                                      ? ""
                                      : "bg-red-50"
                                }`}
                              >
                                {sub ? (
                                  <span className="font-semibold text-sm">
                                    {sub.score !== null ? (
                                      showScores ? (
                                        <span
                                          className={`${
                                            sub.score >= 80
                                              ? "text-green-600"
                                              : sub.score >= 60
                                              ? "text-amber-600"
                                              : "text-red-500"
                                          }`}
                                        >
                                          {sub.score}
                                        </span>
                                      ) : (
                                        <span className="text-text-secondary/40 text-xs italic">
                                          -
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-text-secondary/50 text-xs">
                                        Pending
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-text-secondary/40 text-xs italic">
                                    —
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer stats */}
            <div className="mt-4 text-sm text-text-secondary flex flex-wrap items-center gap-4">
              <span>Total students: <strong>{students.length}</strong></span>
              <span>Total tasks: <strong>{tasks.length}</strong></span>
              <span>
                Total submissions:{" "}
                <strong>{submissions.length}</strong>
              </span>
              <span>
                Completion rate:{" "}
                <strong>
                  {students.length > 0 && tasks.length > 0
                    ? Math.round(
                        (submissions.length / (students.length * tasks.length)) *
                          100
                      )
                    : 0}
                  %
                </strong>
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

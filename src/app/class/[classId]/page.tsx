"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Users,
  ArrowLeft,
  School,
  Check,
  AlertCircle,
  Loader2,
  ClipboardList,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import type { Student, Task, Submission } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

const STORAGE_KEY = (classId: string) => `student_access_${classId}`;

// Save state to sessionStorage
function saveAccessState(classId: string, state: {
  selectedStudentId?: string | null;
  searchQuery?: string;
  nimVerification?: string;
  verified?: boolean;
}) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(STORAGE_KEY(classId)) || "{}");
    sessionStorage.setItem(STORAGE_KEY(classId), JSON.stringify({ ...existing, ...state }));
  } catch { /* ignore */ }
}

// Load state from sessionStorage
function loadAccessState(classId: string) {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY(classId));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// Clear state from sessionStorage
function clearAccessState(classId: string) {
  try {
    sessionStorage.removeItem(STORAGE_KEY(classId));
  } catch { /* ignore */ }
}

export default function StudentAccessPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [initialRestored, setInitialRestored] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [nimVerification, setNimVerification] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch class and students, restore state after data loads
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: classData } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .single();

      if (classData) setClassName(classData.name);

      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", classId)
        .order("name", { ascending: true });

      if (studentData) {
        setStudents(studentData);

        // Restore saved state after students are loaded
        const saved = loadAccessState(classId);
        if (saved) {
          if (saved.searchQuery) setSearchQuery(saved.searchQuery);
          if (saved.nimVerification) setNimVerification(saved.nimVerification);

          // Restore selected student
          if (saved.selectedStudentId) {
            const found = studentData.find((s) => s.id === saved.selectedStudentId);
            if (found) {
              setSelectedStudent(found);
              if (saved.verified) setVerified(true);
            }
          }
        }
      }

      setInitialRestored(true);
      setLoading(false);
    }

    fetchData();
  }, [classId]);

  // Save searchQuery to sessionStorage on change
  useEffect(() => {
    if (initialRestored) {
      saveAccessState(classId, { searchQuery });
    }
  }, [searchQuery, classId, initialRestored]);

  // Save verification state
  useEffect(() => {
    if (initialRestored) {
      saveAccessState(classId, {
        selectedStudentId: selectedStudent?.id || null,
        nimVerification,
        verified,
      });
    }
  }, [selectedStudent, nimVerification, verified, classId, initialRestored]);

  // Filter students based on search
  const filteredStudents = searchQuery.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.nim.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setNimVerification("");
    setVerificationError(null);
    setVerified(false);
  };

  const handleVerify = () => {
    if (!selectedStudent) return;
    if (nimVerification === selectedStudent.nim) {
      setVerified(true);
      setVerificationError(null);
    } else {
      setVerificationError("NIM does not match. Please try again.");
    }
  };

  const handleBack = () => {
    clearAccessState(classId);
    setSelectedStudent(null);
    setVerified(false);
    setNimVerification("");
    setVerificationError(null);
    setSearchQuery("");
    searchRef.current?.focus();
  };

  // After verification, show tasks
  if (verified && selectedStudent) {
    return (
      <StudentTasksPage
        classId={classId}
        studentId={selectedStudent.id}
        studentName={selectedStudent.name}
        className={className}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="min-h-screen pt-16 bg-background">
      {/* Navbar */}
      <header className="navbar">
        <div className="flex items-center gap-2">
          {selectedStudent ? (
            <button onClick={handleBack} className="btn-icon">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link href="/class" className="btn-icon">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-lg text-text">
              {className || "Loading..."}
            </span>
            {!selectedStudent && (
              <span className="text-xs text-text-secondary block -mt-1">
                Find your name to continue
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-16 pb-16">
        {loading ? (
          <div className="animate-fade-in">
            {/* Search card skeleton */}
            <div className="bg-white rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center gap-4 mb-1">
                <div className="skeleton w-12 h-12 rounded-full flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="skeleton h-5 w-32" />
                  <div className="skeleton h-4 w-48" />
                </div>
              </div>
              <div className="skeleton h-12 w-full rounded-xl mt-5" />
            </div>
            {/* Placeholder student cards */}
            <div className="space-y-2.5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border p-4">
                  <div className="flex items-center gap-4">
                    <div className="skeleton w-11 h-11 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedStudent ? (
          /* Verification Step */
          <div className="animate-fade-in">
            <div className="bg-white rounded-xl border border-border p-6 text-center mb-6">
              <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-text mb-2">
                {selectedStudent.name}
              </h2>
              <p className="text-text-secondary text-sm mb-1">
                Verify your identity by entering your NIM
              </p>
            </div>

            <div className="bg-white rounded-xl border border-border p-6">
              <label className="block text-sm font-medium text-text mb-2">
                Enter your NIM
              </label>
              <input
                type="text"
                value={nimVerification}
                onChange={(e) => {
                  setNimVerification(e.target.value);
                  setVerificationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify();
                }}
                placeholder="e.g. 220123456"
                className="input-field text-center text-lg font-mono"
                autoFocus
                inputMode="numeric"
              />

              {verificationError && (
                <div className="mt-3 bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={!nimVerification.trim()}
                className="btn-primary w-full mt-4 py-3"
              >
                <Check className="w-4 h-4" />
                Verify & Continue
              </button>
            </div>
          </div>
        ) : (
          /* Search Step */
          <div className="animate-fade-in">
            {/* Search Card */}
            <div className="bg-white rounded-xl border border-border p-6 mb-6">
              <div className="flex items-center gap-4 mb-1">
                <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text">
                    Find Your Name
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Search by name or NIM
                  </p>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative mt-5">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/50" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type your name or NIM..."
                  className="w-full rounded-xl border-2 border-gray-200 bg-white pl-12 pr-4 py-3.5 text-base text-text placeholder:text-text-secondary/40 transition-all duration-200 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                  autoFocus
                />
              </div>
            </div>

            {/* Results */}
            {searchQuery.trim() && (
              <div className="space-y-2.5 animate-fade-in">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-xl border border-border">
                    <Users className="w-12 h-12 text-text-secondary/20 mx-auto mb-3" />
                    <p className="text-text-secondary text-sm font-medium">
                      No student found
                    </p>
                    <p className="text-text-secondary/60 text-xs mt-1">
                      Try a different search term
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student)}
                        className="w-full text-left classroom-card p-4 hover:border-primary/30 transition-all duration-200 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-primary-light rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text group-hover:text-primary transition-colors truncate">
                              {student.name}
                            </p>
                            <p className="text-sm text-text-secondary font-mono">
                              {student.nim}
                            </p>
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                            <ArrowLeft className="w-3.5 h-3.5 text-gray-400 rotate-180 group-hover:text-primary transition-colors" />
                          </div>
                        </div>
                      </button>
                    ))}
                    <p className="text-center text-xs text-text-secondary/60 pt-1">
                      {filteredStudents.length} student{filteredStudents.length !== 1 ? "s" : ""} found
                    </p>
                  </div>
                )}
              </div>
            )}

            {!searchQuery.trim() && students.length > 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-border">
                <Search className="w-10 h-10 text-text-secondary/20 mx-auto mb-3" />
                <p className="text-text-secondary text-sm">
                  Type your name or NIM above
                </p>
                <p className="text-text-secondary/50 text-xs mt-1">
                  {students.length} student{students.length !== 1 ? "s" : ""} in this class
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ============ Student Tasks Component ============

const TASKS_STORAGE_KEY = (sid: string) => `student_tasks_${sid}`;

function saveTasksState(studentId: string, state: { activeTask?: string | null; linkValue?: string }) {
  try {
    const existing = JSON.parse(sessionStorage.getItem(TASKS_STORAGE_KEY(studentId)) || "{}");
    sessionStorage.setItem(TASKS_STORAGE_KEY(studentId), JSON.stringify({ ...existing, ...state }));
  } catch { /* ignore */ }
}

function loadTasksState(studentId: string) {
  try {
    const data = sessionStorage.getItem(TASKS_STORAGE_KEY(studentId));
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function clearTasksState(studentId: string) {
  try {
    sessionStorage.removeItem(TASKS_STORAGE_KEY(studentId));
  } catch { /* ignore */ }
}

function StudentTasksPage({
  classId,
  studentId,
  studentName,
  className,
  onBack,
}: {
  classId: string;
  studentId: string;
  studentName: string;
  className: string;
  onBack: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<Map<string, Submission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [initialRestored, setInitialRestored] = useState(false);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submittedTaskTitle, setSubmittedTaskTitle] = useState("");

  useEffect(() => {
    async function fetchTasks() {
      const supabase = createClient();

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false });

      if (tasksData) {
        // Also fetch submissions for this student
        const { data: submissionsData } = await supabase
          .from("submissions")
          .select("*")
          .eq("student_id", studentId);

        const subMap = new Map<string, Submission>();
        if (submissionsData) {
          for (const sub of submissionsData) {
            subMap.set(sub.task_id, sub);
          }
        }

        setTasks(tasksData);
        setSubmissions(subMap);

        // Restore saved state after tasks are loaded
        const saved = loadTasksState(studentId);
        if (saved) {
          if (saved.activeTask && tasksData.some((t: any) => t.id === saved.activeTask)) {
            setActiveTask(saved.activeTask);
          }
          if (saved.linkValue) setLinkValue(saved.linkValue);
        }
      }

      setInitialRestored(true);
      setLoading(false);
    }

    fetchTasks();
  }, [classId, studentId]);

  // Save active task and link value to sessionStorage on change
  useEffect(() => {
    if (initialRestored) {
      saveTasksState(studentId, { activeTask, linkValue });
    }
  }, [activeTask, linkValue, studentId, initialRestored]);

  const handleSubmitLink = async (taskId: string) => {
    if (!linkValue.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.from("submissions").insert({
        task_id: taskId,
        student_id: studentId,
        link: linkValue.trim(),
      });

      if (error) {
        setSubmitError(error.message);
        setSubmitting(false);
        return;
      }

      // Fetch the new submission to update local state
      const { data: newSub } = await supabase
        .from("submissions")
        .select("*")
        .eq("task_id", taskId)
        .eq("student_id", studentId)
        .single();

      if (newSub) {
        setSubmissions((prev) => {
          const next = new Map(prev);
          next.set(taskId, newSub as Submission);
          return next;
        });
      }

      // Find task title for success message
      const taskTitle = tasks.find((t) => t.id === taskId)?.title || "the assignment";

      // Clear saved state for this task after successful submission
      clearTasksState(studentId);
      setLinkValue("");
      setActiveTask(null);
      setSubmitting(false);

      // Only show success modal if the DB actually saved it
      if (newSub) {
        setSubmittedTaskTitle(taskTitle);
        setShowSuccess(true);
      }
    } catch (err) {
      setSubmitError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 bg-background">
      <header className="navbar">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-lg text-text">{className}</span>
            <span className="text-xs text-text-secondary block -mt-1">
              Welcome, {studentName}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6 animate-fade-in">
          <p className="text-sm font-medium text-primary mb-1">
            Hi, {studentName}
          </p>
          <h1 className="text-2xl font-bold text-text">Your Tasks</h1>
          <p className="text-sm text-text-secondary mt-1">
            Submit your assignment links here
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="classroom-card p-5">
                <div className="skeleton h-5 w-3/4 mb-2" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-border">
            <ClipboardList className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
            <p className="text-text-secondary">No tasks available yet</p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {tasks.map((task) => {
              const isSubmitted = submissions.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`classroom-card p-5 transition-all duration-200 ${
                    isSubmitted ? "opacity-80" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Status indicator */}
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          isSubmitted
                            ? "border-green-500 bg-green-50"
                            : "border-border"
                        }`}
                      >
                        {isSubmitted && (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        )}
                      </div>

                      <div>
                        <h3
                          className={`font-medium ${
                            isSubmitted
                              ? "text-text-secondary line-through"
                              : "text-text"
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-text-secondary mt-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    {isSubmitted ? (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1 whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        Submitted
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setActiveTask(activeTask === task.id ? null : task.id);
                          setLinkValue("");
                          setSubmitError(null);
                        }}
                        className="btn-primary text-sm px-4 py-2 whitespace-nowrap"
                      >
                        Submit Link
                      </button>
                    )}
                  </div>

                  {/* Submit form */}
                  {activeTask === task.id && !isSubmitted && (
                    <div className="mt-4 pt-4 border-t border-border animate-fade-in">
                      <label className="block text-sm font-medium text-text mb-2">
                        Assignment Link
                      </label>
                      <input
                        type="url"
                        value={linkValue}
                        onChange={(e) => {
                          setLinkValue(e.target.value);
                          setSubmitError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && linkValue.trim()) {
                            handleSubmitLink(task.id);
                          }
                        }}
                        placeholder="https://drive.google.com/..."
                        className="input-field"
                        autoFocus
                      />

                      {submitError && (
                        <p className="text-danger text-sm mt-2">{submitError}</p>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleSubmitLink(task.id)}
                          disabled={!linkValue.trim() || submitting}
                          className="btn-primary text-sm px-6 py-2"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Submit"
                          )}
                        </button>
                        <button
                          onClick={() => setActiveTask(null)}
                          className="btn-ghost text-sm"
                        >
                          Cancel
                        </button>
                      </div>

                      <p className="text-xs text-text-secondary/60 mt-2">
                        ⚠️ Once submitted, the link cannot be edited. Contact
                        your lecturer to make changes.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Submitted!"
        icon={<ThumbsUp className="w-5 h-5 text-primary" />}
      >
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-text mb-2">
            Thank You for Submitting! 🎉
          </h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-1">
            Your assignment link for <strong>{submittedTaskTitle}</strong> has
            been received successfully.
          </p>
          <p className="text-xs text-text-secondary/60 mt-3">
            You can close this window or check back later for your score.
          </p>
          <button
            onClick={() => setShowSuccess(false)}
            className="btn-primary mt-6 px-8 py-2.5"
          >
            Continue
          </button>
        </div>
      </Modal>
    </div>
  );
}

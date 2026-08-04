"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ChevronDown, Check, Loader2, Ban } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { Task } from "@/types";

interface Props {
  params: Promise<{ classId: string; taskId: string }>;
}

const ACCESS_KEY = (classId: string) => `student_access_${classId}`;
const ANSWER_KEY = (studentId: string, taskId: string) =>
  `blank_answer_${studentId}_${taskId}`;

export default function BlankAnswerPage({ params }: Props) {
  const { classId, taskId } = use(params);
  const router = useRouter();

  const [task, setTask] = useState<Task | null>(null);
  const [className, setClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showBlockedToast, setShowBlockedToast] = useState(false);
  const blockedToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backToTasks = () => router.push(`/class/${classId}`);

  const showBlockedActionToast = () => {
    setShowBlockedToast(true);
    if (blockedToastRef.current) clearTimeout(blockedToastRef.current);
    blockedToastRef.current = setTimeout(() => setShowBlockedToast(false), 2600);
  };

  // Clear the toast timer on unmount
  useEffect(() => {
    return () => {
      if (blockedToastRef.current) clearTimeout(blockedToastRef.current);
    };
  }, []);

  useEffect(() => {
    async function init() {
      // Read the verified student from sessionStorage (set by the class page)
      let sid: string | null = null;
      try {
        const saved = JSON.parse(
          sessionStorage.getItem(ACCESS_KEY(classId)) || "{}"
        );
        if (saved.selectedStudentId && saved.verified) sid = saved.selectedStudentId;
      } catch {
        /* ignore */
      }

      if (!sid) {
        router.replace(`/class/${classId}`);
        return;
      }
      setStudentId(sid);

      const supabase = createClient();
      const [{ data: classData }, { data: taskData }, { data: studentData }, { data: existing }] =
        await Promise.all([
          supabase.from("classes").select("name").eq("id", classId).single(),
          supabase.from("tasks").select("*").eq("id", taskId).eq("class_id", classId).single(),
          supabase.from("students").select("name").eq("id", sid).single(),
          supabase
            .from("submissions")
            .select("id")
            .eq("task_id", taskId)
            .eq("student_id", sid)
            .maybeSingle(),
        ]);

      if (!taskData) {
        router.replace(`/class/${classId}`);
        return;
      }

      // Already submitted — no need to answer again
      if (existing) {
        router.replace(`/class/${classId}`);
        return;
      }

      if (classData) setClassName(classData.name);
      if (studentData) setStudentName(studentData.name);
      setTask(taskData);

      // Restore unsaved answer from localStorage
      try {
        const saved = localStorage.getItem(ANSWER_KEY(sid, taskId));
        if (saved) setAnswer(saved);
      } catch {
        /* ignore */
      }

      setLoading(false);
    }

    init();
  }, [classId, taskId, router]);

  // Persist answer to localStorage as the student types (survives reload)
  useEffect(() => {
    if (!loading && studentId) {
      try {
        localStorage.setItem(ANSWER_KEY(studentId, taskId), answer);
      } catch {
        /* ignore */
      }
    }
  }, [answer, loading, studentId, taskId]);

  // Intercept browser back button — show warning if there is unsaved work
  useEffect(() => {
    const onPopState = () => {
      if (answer.trim() && !submitted && !submitting) {
        window.history.pushState(null, "", window.location.href);
        setShowExitWarning(true);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [answer, submitted, submitting]);

  // Warn on refresh / tab close (native dialog)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (answer.trim() && !submitted && !submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [answer, submitted, submitting]);

  const handleBack = () => {
    if (answer.trim() && !submitted) {
      setShowExitWarning(true);
    } else {
      backToTasks();
    }
  };

  const handleConfirmLeave = () => {
    if (studentId) {
      try {
        localStorage.removeItem(ANSWER_KEY(studentId, taskId));
      } catch {
        /* ignore */
      }
    }
    setShowExitWarning(false);
    backToTasks();
  };

  const handleSubmit = async () => {
    if (!answer.trim() || !studentId) return;
    setSubmitting(true);
    setSubmitError(null);

    const supabase = createClient();
    const { error } = await supabase.from("submissions").insert({
      task_id: taskId,
      student_id: studentId,
      answer: answer.trim(),
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    // Clear the saved draft — the answer is now submitted
    try {
      localStorage.removeItem(ANSWER_KEY(studentId, taskId));
    } catch {
      /* ignore */
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="navbar">
          <button onClick={backToTasks} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-text mb-2">
            Answer Submitted!
          </h1>
          <p className="text-text-secondary text-sm max-w-sm mb-8">
            Your answer for <strong>{task?.title}</strong> has been received.
          </p>
          <button onClick={backToTasks} className="btn-primary px-8 py-2.5">
            Back to Tasks
          </button>
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <header className="navbar">
          <button onClick={handleBack} className="btn-icon">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </header>
        <main className="max-w-4xl mx-auto px-6 md:px-10 pt-20">
          <div className="skeleton h-8 w-72 mb-4" />
          <div className="skeleton h-4 w-48" />
          <div className="border-t border-gray-300 my-8" />
          <div className="skeleton h-64 w-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Navbar */}
      <header className="navbar">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={handleBack} className="btn-icon flex-shrink-0" title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold text-text text-base sm:text-lg truncate">
            {className || "Blank Task"}
          </span>
          {studentName && (
            <span className="text-xs text-text-secondary hidden sm:inline truncate">
              · {studentName}
            </span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {submitting ? (
            <button className="btn-primary" disabled>
              <Loader2 className="w-4 h-4 animate-spin" />
              Submitting...
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="btn-primary px-6"
            >
              Submit
            </button>
          )}
        </div>
      </header>

      {/* Blank paper body */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-10 pt-20 pb-20">
        {task && (
          <>
            {/* Question */}
            <h1 className="text-xl md:text-2xl font-bold text-text leading-tight">
              {task.title}
            </h1>

            {/* Collapsible description */}
            {task.description && (
              <div className="mt-4">
                <button
                  onClick={() => setShowDesc((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  {showDesc ? "Hide description" : "Read the description"}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      showDesc ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showDesc && (
                  <div className="mt-3 whitespace-pre-wrap text-text-secondary leading-relaxed border-l-4 border-primary-light pl-4">
                    {task.description}
                  </div>
                )}
              </div>
            )}

            {/* Horizontal divider */}
            <div className="border-t border-gray-300 my-8" />

            {/* Answer area */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary/70">
                Your Answer
              </span>
              <span className="text-xs text-text-secondary/50">
                {answer.length} characters
              </span>
            </div>

            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Start writing your answer here..."
              className="w-full min-h-[55vh] sm:min-h-[60vh] bg-transparent border-none outline-none resize-none text-base sm:text-lg leading-relaxed text-text placeholder:text-text-secondary/40"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              onCopy={(e) => {
                e.preventDefault();
                showBlockedActionToast();
              }}
              onCut={(e) => {
                e.preventDefault();
                showBlockedActionToast();
              }}
              onPaste={(e) => {
                e.preventDefault();
                showBlockedActionToast();
              }}
              onDrop={(e) => {
                e.preventDefault();
                showBlockedActionToast();
              }}
              onContextMenu={(e) => e.preventDefault()}
            />

            {submitError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3">
                {submitError}
              </div>
            )}

            <p className="mt-4 text-xs text-text-secondary/50">
              Your answer is saved automatically in this browser and will only
              be sent to your lecturer once you press Submit.
            </p>
          </>
        )}
      </main>

      {/* Exit warning */}
      <ConfirmModal
        isOpen={showExitWarning}
        onClose={() => setShowExitWarning(false)}
        onConfirm={handleConfirmLeave}
        title="Leave this page?"
        message="You haven't submitted your answer yet. If you leave now, your unsaved answer will be lost."
        confirmText="Leave"
        cancelText="Stay"
        variant="warning"
      />

      {/* Blocked action toast */}
      {showBlockedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-fade-in">
          <div className="flex items-center gap-2.5 bg-gray-900 text-white text-sm font-medium rounded-full px-5 py-3 shadow-xl">
            <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>
              Copy & paste is disabled. Please type your answer.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  Users,
  Trash2,
  Pencil,
  Upload,
  Table2,
} from "lucide-react";
import { DeleteClassButton } from "./delete-button";
import { TaskCardGrid } from "./task-card-grid";
import { CreateTaskModal } from "@/components/ui/create-task-modal";
import type { Class, Task } from "@/types";

interface Props {
  params: Promise<{ classId: string }>;
}

export default function ClassDetailPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [classData, setClassData] = useState<Class | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const [{ data: classInfo }, { data: tasksData }, { count: sCount }, { data: submissionCounts }] =
        await Promise.all([
          supabase.from("classes").select("*, students(count), tasks(count)").eq("id", classId).eq("created_by", userData.user.id).single(),
          supabase.from("tasks").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
          supabase.from("students").select("*", { count: "exact", head: true }).eq("class_id", classId),
          supabase.from("submissions").select("task_id, students!inner(class_id)").eq("students.class_id", classId),
        ]);

      if (!classInfo) {
        router.push("/dashboard");
        return;
      }

      // Count submissions per task
      const submissionMap = new Map<string, number>();
      if (submissionCounts) {
        for (const sub of submissionCounts) {
          const tId = sub.task_id as string;
          submissionMap.set(tId, (submissionMap.get(tId) || 0) + 1);
        }
      }

      // Enrich tasks
      const enrichedTasks = (tasksData || []).map((t: any) => ({
        ...t,
        submission_count: submissionMap.get(t.id) || 0,
        total_students: sCount || 0,
      }));

      setClassData(classInfo);
      setTasks(enrichedTasks);
      setStudentCount(sCount || 0);
      setLoading(false);
    }

    fetchData();
  }, [classId, router]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Back button skeleton */}
        <div className="skeleton h-8 w-28 rounded-full mb-6" />
        {/* Class header skeleton */}
        <div className="bg-gray-100 rounded-xl p-6 md:p-8 mb-8 border border-border">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="skeleton h-8 w-64" />
              <div className="skeleton h-4 w-48" />
              <div className="flex gap-4 mt-4">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
        {/* Actions skeleton */}
        <div className="flex gap-3 mb-8">
          <div className="skeleton h-10 w-24 rounded-full" />
          <div className="skeleton h-10 w-32 rounded-full" />
          <div className="skeleton h-10 w-36 rounded-full" />
        </div>
        {/* Tasks section */}
        <div className="skeleton h-5 w-16 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border p-5">
              <div className="space-y-3">
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-32 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!classData) return null;

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link href="/dashboard" className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Class Header Card */}
      <div
        className={`bg-primary rounded-xl p-6 md:p-8 mb-8 text-white`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1">
              {classData.name}
            </h1>
            {classData.description && (
              <p className="text-white/80 text-sm md:text-base">
                {classData.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {studentCount || 0} students
              </span>
              <span className="flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4" />
                {tasks?.length || 0} tasks
              </span>
            </div>
          </div>

          <DeleteClassButton classId={classId} className={classData.name} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-3 mb-8 flex-wrap">
        <button onClick={() => setShowCreateTask(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          New Task
        </button>
        {(studentCount ?? 0) > 0 ? (
          <Link
            href={`/dashboard/${classId}/students`}
            className="btn-secondary"
          >
            <Users className="w-4 h-4" />
            Show Students
          </Link>
        ) : (
          <Link
            href={`/dashboard/${classId}/students/upload`}
            className="btn-secondary"
          >
            <Upload className="w-4 h-4" />
            Upload Students
          </Link>
        )}
        <Link
          href={`/dashboard/${classId}/submissions`}
          className="btn-secondary"
        >
          <Table2 className="w-4 h-4" />
          All Submissions
        </Link>
      </div>

      {/* Tasks Grid */}
      <h2 className="text-lg font-semibold text-text mb-4">Tasks</h2>

      {!tasks || tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <ClipboardList className="w-12 h-12 text-text-secondary/30 mx-auto mb-4" />
          <p className="text-text-secondary mb-4">
            No tasks in this class yet
          </p>
          <button onClick={() => setShowCreateTask(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create First Task
          </button>
        </div>
      ) : (
        <TaskCardGrid tasks={tasks} classId={classId} />
      )}
      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        classId={classId}
        onCreated={(newTask) => {
          setTasks((prev) => [
            {
              ...newTask,
              submission_count: 0,
              total_students: studentCount,
            },
            ...prev,
          ]);
        }}
      />
    </div>
  );
}

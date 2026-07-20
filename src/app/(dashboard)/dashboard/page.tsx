"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Users, ClipboardList, GraduationCap, Pencil } from "lucide-react";
import { DeleteClassForm } from "./delete-form";
import { CreateClassModal } from "@/components/ui/create-class-modal";
import { EditClassModal } from "@/components/ui/edit-class-modal";
import type { Class } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editClass, setEditClass] = useState<any | null>(null);
  const [lecturerName, setLecturerName] = useState("");

  useEffect(() => {
    async function fetchClasses() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }

      const name =
        userData.user.user_metadata?.display_name ||
        userData.user.user_metadata?.full_name ||
        userData.user.email?.split("@")[0] ||
        "Lecturer";
      setLecturerName(name);

      const { data: classesData } = await supabase
        .from("classes")
        .select("*, students(count), tasks(count)")
        .eq("created_by", userData.user.id)
        .order("created_at", { ascending: false });

      if (classesData) setClasses(classesData);
      setLoading(false);
    }

    fetchClasses();
  }, [router]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        {/* Hero skeleton */}
        <div className="mb-8">
          <div className="bg-primary/70 rounded-xl p-6 md:p-8">
            <div className="skeleton h-4 w-28 rounded-full mb-3" />
            <div className="skeleton h-8 w-64 mb-2" />
            <div className="skeleton h-4 w-96 max-w-full" />
          </div>
        </div>
        {/* Section heading */}
        <div className="skeleton h-5 w-24 mb-4" />
        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="skeleton h-24" />
              <div className="p-4 space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Hero */}
      <div className="mb-8 animate-fade-in">
        <div className="bg-primary rounded-xl p-6 md:p-8 text-white">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-white/80" />
            <span className="text-sm text-white/70 font-medium">
              Lecturer Dashboard
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Welcome, {lecturerName}!
          </h1>
          <p className="text-white/80 text-sm md:text-base max-w-xl">
            Manage your classes, students, and submissions here.
          </p>
        </div>
      </div>

      {/* Section heading */}
      <h2 className="text-lg font-semibold text-text mb-4">My Classes</h2>

      {/* Class Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-24 animate-fade-in">
          <div className="w-20 h-20 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-6">
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">
            No classes yet
          </h2>
          <p className="text-text-secondary mb-8 max-w-md mx-auto">
            Create your first class to start managing student assignments.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-base px-8 py-3"
          >
            <Plus className="w-5 h-5" />
            Create New Class
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-fade-in">
          {classes.map((cls) => {
            const studentCount = (
              cls.students as unknown as { count: number }[]
            )[0]?.count;
            const taskCount = (
              cls.tasks as unknown as { count: number }[]
            )[0]?.count;

            return (
              <div key={cls.id} className="classroom-card group relative">
                <Link href={`/dashboard/${cls.id}`}>
                  <div className="bg-primary h-24 px-5 py-4 flex flex-col justify-end rounded-t-xl">
                    <h3 className="text-white font-semibold text-lg leading-tight">
                      {cls.name}
                    </h3>
                    {cls.description && (
                      <p className="text-white/80 text-sm mt-0.5 line-clamp-1">
                        {cls.description}
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-4 flex items-center gap-4 text-sm text-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {studentCount ?? 0} students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-4 h-4" />
                      {taskCount ?? 0} tasks
                    </span>
                  </div>
                </Link>
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() =>
                      setEditClass({
                        id: cls.id,
                        name: cls.name,
                        description: cls.description || "",
                      })
                    }
                    className="btn-icon bg-white/20 hover:bg-white/30 text-white"
                    title="Edit class"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <DeleteClassForm classId={cls.id} className={cls.name} onDeleted={() => {
                    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
                  }} />
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="classroom-card border-2 border-dashed border-border hover:border-primary hover:bg-primary-light/30 flex items-center justify-center min-h-[160px] transition-all duration-200"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <span className="text-sm font-medium text-primary">
                Create New Class
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Create Class Modal */}
      <CreateClassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(newClass) => {
          setClasses((prev) => [{ ...newClass, students: [{ count: 0 }], tasks: [{ count: 0 }] }, ...prev]);
        }}
      />

      {/* Edit Class Modal */}
      <EditClassModal
        isOpen={editClass !== null}
        onClose={() => setEditClass(null)}
        classId={editClass?.id || ""}
        currentName={editClass?.name || ""}
        currentDescription={editClass?.description || ""}
        onUpdated={(updated) => {
          setClasses((prev) =>
            prev.map((c) =>
              c.id === updated.id ? { ...c, ...updated } : c
            )
          );
        }}
      />
    </div>
  );
}

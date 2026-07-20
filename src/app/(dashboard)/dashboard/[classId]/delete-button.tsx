"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { deleteClass } from "../actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export function DeleteClassButton({
  classId,
  className,
}: {
  classId: string;
  className: string;
}) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);

    try {
      await deleteClass(classId);
      router.push("/dashboard");
      router.refresh();
    } catch {
      // Fallback: try client-side delete with auth check
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classId)
        .eq("created_by", userData.user.id);

      if (!error) {
        router.push("/dashboard");
        router.refresh();
      }
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="bg-white/20 hover:bg-white/30 text-white rounded-full px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
        title="Delete class"
      >
        <Trash2 className="w-4 h-4" />
        <span className="hidden sm:inline">Delete</span>
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => !deleting && setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Class"
        message={`Are you sure you want to delete "${className}"? All tasks, students, and submissions in this class will also be permanently deleted. This action cannot be undone.`}
        loading={deleting}
        variant="danger"
      />
    </>
  );
}

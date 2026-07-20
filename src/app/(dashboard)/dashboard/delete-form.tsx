"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteClass } from "./actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";

export function DeleteClassForm({
  classId,
  className,
  onDeleted,
}: {
  classId: string;
  className: string;
  onDeleted?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClass(classId);
    } catch {
      // Silently handle — show will close anyway
    }
    setShowConfirm(false);
    onDeleted?.();
  };

  return (
    <>        <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowConfirm(true);
        }}
        className="flex"
      >
        <button
          type="submit"
          className="btn-icon bg-white/20 hover:bg-white/30 text-white"
          title="Delete class"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </form>

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

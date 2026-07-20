"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Loader2 } from "lucide-react";
import { Modal } from "./modal";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onCreated?: (newTask: any) => void;
}

export function CreateTaskModal({ isOpen, onClose, classId, onCreated }: CreateTaskModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title.trim()) {
      setError("Task title is required");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        class_id: classId,
        title: title.trim(),
        description: description.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Reset and close
    setTitle("");
    setDescription("");
    onCreated?.(newTask);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      icon={<ClipboardList className="w-5 h-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="modal-task-title"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Task Title <span className="text-danger">*</span>
          </label>
          <input
            id="modal-task-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 1 Assignment"
            className="input-field"
            required
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="modal-task-desc"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Description{" "}
            <span className="text-text-secondary/60">(optional)</span>
          </label>
          <textarea
            id="modal-task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Answer the questions and submit your Google Doc link"
            className="input-field min-h-[80px] resize-y"
            rows={3}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-6 py-2.5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary px-8 py-2.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Task"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

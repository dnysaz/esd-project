"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ClipboardList, Link2, FileText, Loader2 } from "lucide-react";
import { Modal } from "./modal";
import type { TaskType } from "@/types";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  onCreated?: (newTask: Record<string, unknown>) => void;
}

export function CreateTaskModal({ isOpen, onClose, classId, onCreated }: CreateTaskModalProps) {
  const router = useRouter();
  const [taskType, setTaskType] = useState<TaskType>("link");
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
        task_type: taskType,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Reset and close
    setTaskType("link");
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

        {/* Task type selection */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Task Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTaskType("link")}
              className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                taskType === "link"
                  ? "border-primary bg-primary-light/30"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${
                  taskType === "link"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-secondary"
                }`}
              >
                <Link2 className="w-4.5 h-4.5" />
              </div>
              <p className="font-medium text-sm text-text">Link Task</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Students submit a link to their work
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTaskType("blank")}
              className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                taskType === "blank"
                  ? "border-primary bg-primary-light/30"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 ${
                  taskType === "blank"
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-secondary"
                }`}
              >
                <FileText className="w-4.5 h-4.5" />
              </div>
              <p className="font-medium text-sm text-text">Blank Task</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Students type their answer directly
              </p>
            </button>
          </div>
        </div>

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
            {taskType === "blank" ? "Question" : "Description"}{" "}
            <span className="text-text-secondary/60">(optional)</span>
          </label>
          <textarea
            id="modal-task-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              taskType === "blank"
                ? "e.g. Explain the causes of the Industrial Revolution in your own words"
                : "e.g. Answer the questions and submit your Google Doc link"
            }
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

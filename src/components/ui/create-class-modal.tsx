"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Loader2 } from "lucide-react";
import { Modal } from "./modal";

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newClass: any) => void;
}

export function CreateClassModal({ isOpen, onClose, onCreated }: CreateClassModalProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!name.trim()) {
      setError("Class name is required");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: newClass, error: insertError } = await supabase
      .from("classes")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    // Reset form and close
    setName("");
    setDescription("");
    onCreated?.(newClass);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Class"
      icon={<GraduationCap className="w-5 h-5 text-primary" />}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="modal-class-name"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Class Name <span className="text-danger">*</span>
          </label>
          <input
            id="modal-class-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. English Literature A"
            className="input-field"
            required
            autoFocus
          />
        </div>

        <div>
          <label
            htmlFor="modal-class-desc"
            className="block text-sm font-medium text-text mb-1.5"
          >
            Description{" "}
            <span className="text-text-secondary/60">(optional)</span>
          </label>
          <textarea
            id="modal-class-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. English for Specific Purposes - Semester 1, 2026"
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
                Saving...
              </span>
            ) : (
              "Create Class"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X, Loader2 } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  variant?: "danger" | "warning";
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  loading = false,
  variant = "danger",
}: ConfirmModalProps) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl w-full max-w-md mx-4 shadow-xl">
        {/* Close button */}
        {!loading && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 btn-icon text-text-secondary hover:bg-black/5"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Icon */}
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mt-6 mb-4 ${
            variant === "danger" ? "bg-red-50" : "bg-amber-50"
          }`}
        >
          <AlertTriangle
            className={`w-7 h-7 ${
              variant === "danger" ? "text-danger" : "text-amber-500"
            }`}
          />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text text-center mb-2 px-6">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-text-secondary text-center mb-6 leading-relaxed px-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 justify-center pb-6 px-6">
          {!loading && (
            <button onClick={onClose} className="btn-secondary px-6 py-2.5">
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              variant === "danger"
                ? "bg-danger text-white hover:bg-red-700"
                : "bg-amber-500 text-white hover:bg-amber-600"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to avoid CSS transform/filter issues with fixed positioning
  if (typeof window === "undefined") return null;
  return createPortal(modal, document.body);
}

"use client";

import Link from "next/link";
import { ClipboardList, CheckCircle2, Clock } from "lucide-react";
import type { Task } from "@/types";

interface TaskWithStats extends Task {
  submission_count?: number;
  total_students?: number;
}

interface TaskCardGridProps {
  tasks: TaskWithStats[];
  classId: string;
}

export function TaskCardGrid({ tasks, classId }: TaskCardGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {tasks.map((task) => {
        const submitted = task.submission_count ?? 0;
        const total = task.total_students ?? 0;
        const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

        return (
          <Link
            key={task.id}
            href={`/dashboard/${classId}/tasks/${task.id}`}
            className="classroom-card p-5 text-center transition-all duration-200 group"
          >
            {/* Task icon */}
            <div className="mb-3 flex justify-center">
              <div className="w-14 h-14 bg-primary-light rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <ClipboardList className="w-7 h-7 text-primary" />
              </div>
            </div>

            {/* Task name */}
            <h3 className="font-medium text-sm text-text leading-tight line-clamp-2 mb-3">
              {task.title}
            </h3>

            {/* Submission percentage bar */}
            {total > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-text-secondary">
                    {percentage === 100 ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <Clock className="w-3 h-3 text-amber-500" />
                    )}
                    {submitted}/{total}
                  </span>
                  <span
                    className={`font-semibold ${
                      percentage === 100
                        ? "text-green-600"
                        : percentage > 0
                        ? "text-amber-600"
                        : "text-text-secondary/60"
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      percentage === 100
                        ? "bg-green-500"
                        : percentage > 0
                        ? "bg-amber-400"
                        : "bg-gray-200"
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* No students yet */}
            {total === 0 && (
              <div className="text-xs text-text-secondary/50">
                No students yet
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function uploadStudents(classId: string, students: { nim: string; name: string }[]) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  if (students.length === 0) {
    throw new Error("No students to upload");
  }

  // Insert students with class_id using upsert to handle duplicates
  const studentsWithClass = students.map((s) => ({
    nim: s.nim.trim(),
    name: s.name.trim(),
    class_id: classId,
  }));

  // Upsert: ignore duplicate NIM+class_id entries
  const { error } = await supabase
    .from("students")
    .upsert(studentsWithClass, {
      onConflict: "nim,class_id",
      ignoreDuplicates: true,
    });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${classId}`);
}

export async function getStudents(classId: string) {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("*, submissions(count)")
    .eq("class_id", classId)
    .order("nim", { ascending: true });

  return students || [];
}

export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) throw new Error(error.message);
}

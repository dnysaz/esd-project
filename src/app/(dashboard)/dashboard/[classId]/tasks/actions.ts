"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function verifyOwner(classId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  // Verify this class belongs to the user
  const { data: classData } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("created_by", userData.user.id)
    .single();

  if (!classData) throw new Error("Class not found");
  return { supabase, user: userData.user };
}

export async function createTask(classId: string, formData: FormData) {
  await verifyOwner(classId);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;

  if (!title || title.trim().length === 0) {
    throw new Error("Task title is required");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    class_id: classId,
    title: title.trim(),
    description,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${classId}`);
  redirect(`/dashboard/${classId}`);
}

export async function updateTask(
  classId: string,
  taskId: string,
  formData: FormData
) {
  await verifyOwner(classId);

  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;

  if (!title || title.trim().length === 0) {
    throw new Error("Task title is required");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ title: title.trim(), description })
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${classId}`);
  redirect(`/dashboard/${classId}`);
}

export async function deleteTask(classId: string, taskId: string) {
  await verifyOwner(classId);

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${classId}`);
  redirect(`/dashboard/${classId}`);
}

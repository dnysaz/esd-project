"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ============ GET Classes ============

export async function getClasses() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: classes, error } = await supabase
    .from("classes")
    .select("*, students(count), tasks(count)")
    .eq("created_by", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return classes || [];
}

export async function getClassById(classId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { data: classData, error } = await supabase
    .from("classes")
    .select("*, students(count), tasks(count)")
    .eq("id", classId)
    .eq("created_by", userData.user.id)
    .single();

  if (error) throw new Error(error.message || "Class not found");
  return classData;
}

// ============ CREATE Class ============

export async function createClass(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    throw new Error("Class name is required");
  }

  const { error } = await supabase.from("classes").insert({
    name: name.trim(),
    description,
    created_by: userData.user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// ============ UPDATE Class ============

export async function updateClass(classId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;

  if (!name || name.trim().length === 0) {
    throw new Error("Class name is required");
  }

  const { error } = await supabase
    .from("classes")
    .update({ name: name.trim(), description })
    .eq("id", classId)
    .eq("created_by", userData.user.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/${classId}`);
  redirect(`/dashboard/${classId}`);
}

// ============ DELETE Class ============

export async function deleteClass(classId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) redirect("/login");

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .eq("created_by", userData.user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}



"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Upload, FileSpreadsheet, Check, AlertCircle, Loader2, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";

interface Props {
  params: Promise<{ classId: string }>;
}

interface StudentRow {
  nim: string;
  name: string;
}

export default function UploadStudentsPage({ params }: Props) {
  const { classId } = use(params);
  const router = useRouter();
  const [parsedStudents, setParsedStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setParsedStudents([]);
    setSuccess(null);
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

      if (jsonData.length === 0) {
        setError("Excel file is empty");
        setLoading(false);
        return;
      }

      // Detect columns (case-insensitive)
      const headers = Object.keys(jsonData[0]);
      const nimKey = headers.find((h) => h.toLowerCase().includes("nim"));
      const nameKey = headers.find((h) => h.toLowerCase().includes("name") || h.toLowerCase().includes("nama"));

      if (!nimKey || !nameKey) {
        setError(
          'Could not find required columns. Ensure your Excel has "NIM" and "NAME" columns.'
        );
        setLoading(false);
        return;
      }

      const students: StudentRow[] = jsonData.map((row) => ({
        nim: String(row[nimKey] ?? "").trim(),
        name: String(row[nameKey] ?? "").trim(),
      })).filter((s) => s.nim && s.name);

      if (students.length === 0) {
        setError("No valid student data found. Check NIM and NAME columns.");
        setLoading(false);
        return;
      }

      setParsedStudents(students);
    } catch (err) {
      setError("Failed to parse Excel file. Make sure it's a valid .xlsx file.");
    }

    setLoading(false);
  }, []);

  const handleUpload = async () => {
    if (parsedStudents.length === 0) return;

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    // Insert students
    const studentsWithClass = parsedStudents.map((s) => ({
      nim: s.nim,
      name: s.name,
      class_id: classId,
    }));

    const { error: insertError } = await supabase
      .from("students")
      .upsert(studentsWithClass, {
        onConflict: "nim,class_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      setError(insertError.message);
      setUploading(false);
      return;
    }

    setSuccess(parsedStudents.length);
    setUploading(false);
  };

  const resetForm = () => {
    setParsedStudents([]);
    setFileName("");
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back */}
      <Link href={`/dashboard/${classId}`} className="btn-ghost mb-6 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Back to Class
      </Link>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-light rounded-full flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text">Upload Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Import student data from an Excel file (.xlsx)
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Upload Area */}
        {!success && (
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
              {loading ? (
                <div className="py-8">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-text-secondary">Parsing file...</p>
                </div>
              ) : parsedStudents.length > 0 ? (
                <div className="py-4">
                  <FileSpreadsheet className="w-10 h-10 text-green-600 mx-auto mb-3" />
                  <p className="font-medium text-text">{fileName}</p>
                  <p className="text-sm text-text-secondary mt-1">
                    {parsedStudents.length} students found
                  </p>
                </div>
              ) : (
                <label className="cursor-pointer block py-8">
                  <Upload className="w-10 h-10 text-text-secondary/40 mx-auto mb-4" />
                  <p className="font-medium text-text mb-1">
                    Click to upload Excel file
                  </p>
                  <p className="text-sm text-text-secondary">
                    Format: NIM column + NAME column
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-danger text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview Table */}
            {parsedStudents.length > 0 && !success && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-text">
                    Preview ({parsedStudents.length} students)
                  </h3>
                  <button onClick={resetForm} className="btn-ghost text-sm">
                    <Trash2 className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-text-secondary">No</th>
                        <th className="text-left px-4 py-2 font-medium text-text-secondary">NIM</th>
                        <th className="text-left px-4 py-2 font-medium text-text-secondary">Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedStudents.map((s, i) => (
                        <tr key={i} className="border-t border-border hover:bg-gray-50">
                          <td className="px-4 py-2 text-text-secondary">{i + 1}</td>
                          <td className="px-4 py-2 font-mono text-text">{s.nim}</td>
                          <td className="px-4 py-2 text-text">{s.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary mt-4 px-8 py-3"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {parsedStudents.length} students...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload to Class
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Success Message */}
        {success !== null && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-text mb-2">
              Upload Successful!
            </h3>
            <p className="text-text-secondary mb-6">
              {success} students have been added to the class.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={resetForm} className="btn-secondary px-8 py-3">
                Upload More
              </button>
              <Link
                href={`/dashboard/${classId}`}
                className="btn-primary px-8 py-3"
              >
                Back to Class
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Shield,
  MessageCircle,
  Clock,
  Database,
  Upload,
  Trash2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";

interface SystemUser {
  _id: string;
  email: string;
  name: string;
  role: string;
  messageCount: number;
  lastActive: string;
  createdAt: string;
}

interface DocumentInfo {
  _id: string;
  filename: string;
  doc_category: string[];
  uploaded_at: string;
  status: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "knowledge">("users");

  const [users, setUsers] = useState<SystemUser[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (
      status === "authenticated" &&
      (session.user as any)?.role !== "admin"
    ) {
      router.push("/");
    } else if (status === "authenticated") {
      fetchData();
    }
  }, [status, router, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, docsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/admin/documents`),
      ]);
      setUsers(usersRes.data.users || []);
      setDocuments(docsRes.data.documents || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("pdf", uploadFile);
    formData.append("source_domain", "NPCI Guidelines");

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/ingest-pdf`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      setUploadSuccess(true);
      setUploadFile(null);
      setTimeout(() => setUploadSuccess(false), 3000);
      fetchData(); // refresh list
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this document from the AI knowledge base?",
      )
    )
      return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/admin/documents/${id}`,
      );
      setDocuments((docs) => docs.filter((d) => d._id !== id));
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 border-b border-border bg-zinc-950 dark:bg-zinc-900 border-zinc-800">
        <div className="flex items-center gap-3 py-5">
          <Link
            href="/"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-wide">
              Superadmin Console
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "users"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            System Users
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-2 pb-4 text-sm font-medium border-b-2 transition-all ${
              activeTab === "knowledge"
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            <Database className="w-4 h-4" />
            Knowledge Base
          </button>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto p-6 mt-4">
        {activeTab === "users" ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">System Users</h2>
                <p className="text-muted-foreground mt-1">
                  All registered users interacting with UPI Assistant.
                </p>
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-semibold flex items-center gap-2 border border-emerald-500/20">
                <Users className="w-5 h-5" />
                Total: {users.length}
              </div>
            </div>

            {loading ? (
              <div className="animate-pulse flex flex-col gap-4">
                <div className="h-20 bg-muted/60 rounded-2xl" />
                <div className="h-20 bg-muted/60 rounded-2xl" />
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-muted/50 border-b border-border text-sm font-semibold">
                    <tr>
                      <th className="px-6 py-4">User Identity</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Total Messages</th>
                      <th className="px-6 py-4">Last Active</th>
                      <th className="px-6 py-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {users.map((u, i) => (
                      <tr
                        key={i}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold uppercase flex-shrink-0">
                            {u.name?.[0] || u.email?.[0] || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {u.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {u.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            {u.messageCount} chat
                            {u.messageCount !== 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {u.lastActive
                              ? new Date(u.lastActive).toLocaleDateString()
                              : "Never"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-muted-foreground italic"
                        >
                          No active users found in the system yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold">RAG Knowledge Base</h2>
                <p className="text-muted-foreground mt-1">
                  Manage the PDF documents the AI uses to answer user questions.
                </p>
              </div>
              <div className="px-4 py-2 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl font-semibold flex items-center gap-2 border border-violet-500/20">
                <Database className="w-5 h-5" />
                Total: {documents.length}
              </div>
            </div>

            {/* Upload Section */}
            <div className="bg-card border border-border rounded-2xl p-6 mb-8 shadow-sm">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-violet-500" />
                Upload New Guidelines
              </h3>
              <form
                onSubmit={handleUpload}
                className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-muted-foreground
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100 dark:file:bg-violet-900/30 dark:file:text-violet-400"
                />
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="flex-shrink-0 flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
                >
                  {uploading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : uploadSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Uploaded
                    </>
                  ) : (
                    "Ingest PDF"
                  )}
                </button>
              </form>
            </div>

            {/* Document List */}
            <h3 className="font-semibold text-lg mb-4">Ingested Documents</h3>
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b border-border text-sm font-semibold">
                  <tr>
                    <th className="px-6 py-4">Filename</th>
                    <th className="px-6 py-4">Uploaded Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {documents.map((doc) => (
                    <tr
                      key={doc._id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50 text-red-500 dark:bg-red-950/30">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span
                          className="truncate max-w-[300px]"
                          title={doc.filename}
                        >
                          {doc.filename}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDeleteDoc(doc._id)}
                          className="p-2 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                          title="Delete from knowledge base"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {documents.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-8 text-center text-muted-foreground italic"
                      >
                        No documents have been ingested yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

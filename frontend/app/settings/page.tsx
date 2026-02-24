"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Shield,
  LogOut,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL}/chat`;

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleDeleteAllChats = async () => {
    if (!session.user?.email) return;
    setDeleting(true);
    try {
      await axios.delete(
        `${API_BASE}/sessions?email=${encodeURIComponent(session.user.email)}`,
      );
      setDeleteSuccess(true);
      setShowConfirm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const role = (session.user as any)?.role || "user";
  const initials =
    session.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    session.user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <Link
          href="/"
          className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-bold tracking-tight">Settings</h1>
      </header>

      <main className="max-w-lg w-full mx-auto px-4 py-8 space-y-4">
        {/* Profile card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">
              {session.user?.name || "User"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {session.user?.email}
            </p>
            <span
              className={`inline-block mt-1.5 text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full
              ${
                role === "admin"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
              }`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Account section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account
          </p>

          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">Role</span>
            </div>
            <span className="text-sm text-muted-foreground capitalize">
              {role}
            </span>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">Email</span>
            </div>
            <span className="text-sm text-muted-foreground truncate max-w-[180px]">
              {session.user?.email}
            </span>
          </div>

          {role === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors"
            >
              <Shield className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Admin Console</span>
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground ml-auto rotate-180" />
            </Link>
          )}
        </div>

        {/* Data & Privacy section */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Data & Privacy
          </p>

          {!deleteSuccess ? (
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    Delete All Chat History
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 pl-6">
                    Permanently erases all your conversations with the UPI
                    Assistant.
                  </p>
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-rose-600 border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all"
                >
                  Delete
                </button>
              </div>

              {/* Inline confirmation */}
              {showConfirm && (
                <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
                      This cannot be undone
                    </p>
                  </div>
                  <p className="text-xs text-rose-600 dark:text-rose-400 mb-4">
                    All your sessions and messages will be permanently deleted
                    from the database.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAllChats}
                      disabled={deleting}
                      className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg transition-all flex justify-center items-center gap-2 disabled:opacity-60"
                    >
                      {deleting ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          Yes, Delete All
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2 border border-border text-sm font-semibold rounded-lg hover:bg-muted transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-5 py-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium">
                All chat history deleted successfully.
              </p>
            </div>
          )}
        </div>

        {/* Sign Out */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}

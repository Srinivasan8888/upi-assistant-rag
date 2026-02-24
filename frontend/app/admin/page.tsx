"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Users, Shield, MessageCircle, Clock } from "lucide-react";
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);

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
      const res = await axios.get("http://localhost:5000/api/admin/users");
      setUsers(res.data.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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
      <header className="flex items-center gap-3 px-6 py-5 border-b border-border bg-zinc-950 dark:bg-zinc-900 border-zinc-800">
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
      </header>

      <main className="max-w-4xl w-full mx-auto p-6 mt-6">
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
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
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
                        {u.messageCount} chat{u.messageCount !== 1 ? "s" : ""}
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
      </main>
    </div>
  );
}

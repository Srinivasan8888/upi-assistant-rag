"use client";

import { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
} from "lucide-react";
import axios from "axios";
import { useSession } from "next-auth/react";

const API_BASE = "http://localhost:5000/api/chat";

export function TransactionAnalyzer({
  onResult,
}: {
  onResult?: (res: any) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { data: session } = useSession();

  const analyze = async () => {
    if (!input.trim() || !session?.user?.email) return;
    setLoading(true);

    // We send a specific prompt wrapping the user's input to force the backend RAG to return JSON
    const prompt = `Analyze this UPI transaction or SMS for fraud: "${input}". 
Return ONLY a raw JSON object with this exact structure, no markdown formatting, no extra text:
{
  "fraudProbability": "High|Medium|Low",
  "urgency": "Immediate|Monitor|None",
  "reasoning": "Short 1-sentence explanation of why",
  "nextSteps": ["Step 1", "Step 2", "Step 3"]
}`;

    try {
      const res = await axios.post(API_BASE, {
        session_id: `analyzer-${Date.now()}`,
        query: prompt,
        userEmail: session.user.email,
      });

      // Parse the JSON from the assistant's content
      const content = res.data.message.content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(content);
      setResult(parsed);
      if (onResult) onResult(parsed);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border border-border shadow-sm rounded-2xl overflow-hidden mt-6 max-w-2xl mx-auto">
      <div className="bg-muted/30 border-b border-border px-5 py-4 flex items-center gap-3">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-lg">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Transaction Analyzer</h3>
          <p className="text-xs text-muted-foreground">
            Paste a suspicious SMS or UPI ID for instant risk breakdown.
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Received SMS: 'Dear User, your A/C XXXXX123 is debited by INR 5000.00 towards UPI...'"
            className="w-full h-24 p-3 bg-muted/40 border border-border rounded-xl resize-none text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={analyze}
            disabled={!input.trim() || loading}
            className="absolute bottom-3 right-3 px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Analyze Risk"
            )}
          </button>
        </div>

        {/* Results display */}
        {result && (
          <div className="mt-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`p-4 rounded-xl border ${
                  result.fraudProbability === "High"
                    ? "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50"
                    : result.fraudProbability === "Medium"
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50"
                      : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-900/50"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Fraud Risk
                </p>
                <div className="flex items-center gap-2">
                  {result.fraudProbability === "High" && (
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  )}
                  {result.fraudProbability === "Medium" && (
                    <Info className="w-5 h-5 text-amber-500" />
                  )}
                  {result.fraudProbability === "Low" && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  )}
                  <span
                    className={`text-lg font-bold ${
                      result.fraudProbability === "High"
                        ? "text-rose-700 dark:text-rose-400"
                        : result.fraudProbability === "Medium"
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {result.fraudProbability}
                  </span>
                </div>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  result.urgency === "Immediate"
                    ? "bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50"
                    : "bg-muted/50 border-border"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Action Required
                </p>
                <span
                  className={`text-lg font-bold ${
                    result.urgency === "Immediate"
                      ? "text-rose-700 dark:text-rose-400"
                      : "text-foreground"
                  }`}
                >
                  {result.urgency}
                </span>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border border-border rounded-xl">
              <p className="text-sm font-medium text-foreground mb-3">
                {result.reasoning}
              </p>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">
                  Next Steps
                </p>
                {result.nextSteps?.map((step: string, i: number) => (
                  <div key={i} className="flex gap-2.5 text-sm items-start">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-relaxed">
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

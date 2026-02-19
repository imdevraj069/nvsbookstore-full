"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { adminAPI } from "@/lib/api";
import { Database, Loader2, CheckCircle, XCircle, ArrowLeft, AlertTriangle } from "lucide-react";

export default function MigratePage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState("idle"); // idle | running | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // if (!user || !isAdmin) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-50">
  //       <div className="text-center">
  //         <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
  //         <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
  //         <p className="text-gray-500 mb-4">You need admin privileges to access this page.</p>
  //         <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign In</Link>
  //       </div>
  //     </div>
  //   );
  // }

  const handleMigrate = async () => {
    if (status === "running") return;
    setStatus("running");
    setResult(null);
    setError("");
    setLogs([]);

    try {
      const res = await adminAPI.migrate();
      setResult(res.data);
      setLogs(res.logs || []);
      setStatus("success");
    } catch (err) {
      setError(err.message || "Migration failed");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Database className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Migration</h1>
              <p className="text-sm text-gray-500">Migrate data from old Atlas DB to new local database</p>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Warning</p>
                <p>This will drop existing collections and re-migrate all data from the old database. This is a destructive operation meant for testing only.</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleMigrate}
            disabled={status === "running"}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
          >
            {status === "running" ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Database className="w-5 h-5" />
                Run Migration
              </>
            )}
          </button>

          {/* Success Result */}
          {status === "success" && result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-lg font-bold text-green-800">Migration Successful!</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(result).map(([key, count]) => (
                  <div key={key} className="bg-white rounded-lg p-3 text-center border border-green-100">
                    <div className="text-2xl font-bold text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500 capitalize">{key}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {status === "error" && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-red-800">Migration Failed</h3>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Logs</h3>
              <div className="bg-gray-900 rounded-xl p-4 max-h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="text-xs text-green-400 font-mono leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

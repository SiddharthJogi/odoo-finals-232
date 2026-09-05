import React from 'react';
import { AlertTriangle, Bot, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AlertsFeed({ warnings }) {
  const payslipWarnings = warnings?.payslip_warnings || [];
  const aiWarnings = warnings?.ai_warnings || [];
  const totalAlerts = payslipWarnings.length + aiWarnings.length;

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-8">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-foreground">Payroll Warnings & AI Anomaly Feed</h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            totalAlerts > 0
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          {totalAlerts} {totalAlerts === 1 ? 'Active Alert' : 'Active Alerts'}
        </span>
      </div>

      {totalAlerts === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-foreground">All Systems Clear</p>
          <p className="text-xs text-muted-foreground mt-0.5">No payroll anomalies or missing employee information detected.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {/* Payslip warnings */}
          {payslipWarnings.map((w, idx) => (
            <div
              key={`payslip-${w.entity_id}-${idx}`}
              className="flex items-start justify-between p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-900">{w.employee_name}</span>
                    {w.department_name && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md">
                        {w.department_name}
                      </span>
                    )}
                  </div>
                  <p className="text-amber-800 font-medium mt-0.5">{w.message}</p>
                  <p className="text-[11px] text-amber-600 mt-1">Payrun: {w.payrun_name}</p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-md font-semibold text-[10px] uppercase">
                Action Required
              </span>
            </div>
          ))}

          {/* AI anomaly warnings */}
          {aiWarnings.map((w, idx) => (
            <div
              key={`ai-${w.entity_id}-${idx}`}
              className="flex items-start justify-between p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-xl text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-purple-100 rounded-lg text-purple-700 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-purple-900">AI Anomaly Scan Flag</span>
                  <p className="text-purple-800 font-medium mt-0.5">{w.message}</p>
                  <p className="text-[11px] text-purple-600 mt-1">
                    Logged: {new Date(w.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <span className="shrink-0 px-2 py-0.5 bg-purple-200/60 text-purple-900 rounded-md font-semibold text-[10px] uppercase">
                AI Flagged
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

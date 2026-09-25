import { CheckCircle, XCircle, Info } from 'lucide-react';

export default function Toast({ message, type }: { message: string; type: 'success' | 'error' | 'info' }) {
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;
  const color = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-blue-400';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 shadow-lg">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className="text-sm text-slate-200">{message}</span>
      </div>
    </div>
  );
}

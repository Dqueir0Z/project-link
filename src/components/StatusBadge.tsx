import { getLinkStatus } from '@/utils/date';
import type { LinkStatus } from '@/types';

export default function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | null }) {
  const status: LinkStatus = getLinkStatus(isActive, expiresAt);

  const styles: Record<LinkStatus, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    expired: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  const labels: Record<LinkStatus, string> = {
    active: 'Ativo',
    expired: 'Expirado',
    inactive: 'Desativado',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

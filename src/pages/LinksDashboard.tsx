import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllLinks, deleteLink, toggleLinkActive, getDashboardStats } from '@/services/links';
import type { Link } from '@/types';
import { buildShortUrl } from '@/utils/url';
import { formatDateTime, timeAgo } from '@/utils/date';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { Search, Plus, Copy, ExternalLink, MoreVertical, Trash2, Power, Eye, Pencil, Link2, MousePointerClick, CheckCircle } from 'lucide-react';
import { useRef } from 'react';

export default function LinksDashboard() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ totalLinks: 0, totalClicks: 0, activeLinks: 0 });
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [linksData, statsData] = await Promise.all([getAllLinks(), getDashboardStats()]);
    setLinks(linksData);
    setStats(statsData);
    setLoading(false);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado!', 'success');
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteLink(id);
    if (ok) {
      showToast('Link excluído.', 'success');
      setDeleteConfirm(null);
      loadData();
    } else {
      showToast('Erro ao excluir link.', 'error');
    }
  };

  const handleToggle = async (link: Link) => {
    const ok = await toggleLinkActive(link.id, !link.is_active);
    if (ok) {
      showToast(link.is_active ? 'Link desativado.' : 'Link ativado.', 'success');
      loadData();
    } else {
      showToast('Erro ao alterar status.', 'error');
    }
    setOpenMenu(null);
  };

  const filtered = links.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.original_url.toLowerCase().includes(q) ||
      l.short_code.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Link2} label="Links" value={stats.totalLinks} />
        <StatCard icon={MousePointerClick} label="Total de cliques" value={stats.totalClicks} />
        <StatCard icon={CheckCircle} label="Links ativos" value={stats.activeLinks} />
      </div>

      {/* Header + search */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Meus Links</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por URL ou código..."
              className="w-full sm:w-64 rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => navigate('/links/new')}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo link</span>
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        links.length === 0 ? (
          <EmptyState
            title="Você ainda não criou nenhum link."
            description="Crie seu primeiro link curto e comece a compartilhar."
            actionLabel="Criar meu primeiro link"
            onAction={() => navigate('/links/new')}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
            Nenhum link encontrado para "{search}"
          </div>
        )
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">URL curta</th>
                  <th className="px-4 py-3">URL original</th>
                  <th className="px-4 py-3">Cliques</th>
                  <th className="px-4 py-3">Criado em</th>
                  <th className="px-4 py-3">Expira em</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((link) => (
                  <tr key={link.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/links/${link.id}`)}
                        className="text-sm font-medium text-emerald-400 hover:underline"
                      >
                        /{link.short_code}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-sm text-slate-400 truncate block" title={link.original_url}>
                        {link.original_url}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{link.click_count}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{timeAgo(link.created_at)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {link.expires_at ? formatDateTime(link.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={link.is_active} expiresAt={link.expires_at} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionsMenu
                        link={link}
                        open={openMenu === link.id}
                        onToggle={() => setOpenMenu(openMenu === link.id ? null : link.id)}
                        onCopy={() => handleCopy(buildShortUrl(link.short_code))}
                        onOpen={() => window.open(buildShortUrl(link.short_code), '_blank')}
                        onDetails={() => navigate(`/links/${link.id}`)}
                        onEdit={() => navigate(`/links/${link.id}/edit`)}
                        onToggleActive={() => handleToggle(link)}
                        onDelete={() => setDeleteConfirm(link.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {filtered.map((link) => (
              <div key={link.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => navigate(`/links/${link.id}`)}
                      className="text-sm font-medium text-emerald-400 hover:underline"
                    >
                      /{link.short_code}
                    </button>
                    <p className="mt-1 text-xs text-slate-400 truncate" title={link.original_url}>
                      {link.original_url}
                    </p>
                  </div>
                  <StatusBadge isActive={link.is_active} expiresAt={link.expires_at} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{link.click_count} cliques · {timeAgo(link.created_at)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => handleCopy(buildShortUrl(link.short_code))} className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800">
                      <Copy className="h-4 w-4" />
                    </button>
                    <button onClick={() => window.open(buildShortUrl(link.short_code), '_blank')} className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/links/${link.id}`)} className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800">
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <ActionsMenu
                    link={link}
                    open={openMenu === link.id}
                    onToggle={() => setOpenMenu(openMenu === link.id ? null : link.id)}
                    onCopy={() => handleCopy(buildShortUrl(link.short_code))}
                    onOpen={() => window.open(buildShortUrl(link.short_code), '_blank')}
                    onDetails={() => navigate(`/links/${link.id}`)}
                    onEdit={() => navigate(`/links/${link.id}/edit`)}
                    onToggleActive={() => handleToggle(link)}
                    onDelete={() => setDeleteConfirm(link.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Excluir link?</h3>
            <p className="mt-1 text-sm text-slate-400">Esta ação não pode ser desfeita. O link deixará de funcionar imediatamente.</p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActionsMenu({
  link,
  open,
  onToggle,
  onCopy,
  onOpen,
  onDetails,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  link: Link;
  open: boolean;
  onToggle: () => void;
  onCopy: () => void;
  onOpen: () => void;
  onDetails: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative inline-block" ref={null}>
      <button
        onClick={onToggle}
        className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          <MenuItem icon={Copy} label="Copiar link" onClick={() => { onCopy(); onToggle(); }} />
          <MenuItem icon={ExternalLink} label="Abrir link" onClick={() => { onOpen(); onToggle(); }} />
          <MenuItem icon={Eye} label="Ver detalhes" onClick={() => { onDetails(); onToggle(); }} />
          <MenuItem icon={Pencil} label="Editar" onClick={() => { onEdit(); onToggle(); }} />
          <MenuItem icon={Power} label={link.is_active ? 'Desativar' : 'Ativar'} onClick={onToggleActive} />
          <div className="my-1 border-t border-slate-800" />
          <MenuItem icon={Trash2} label="Excluir" onClick={() => { onDelete(); onToggle(); }} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-slate-800 ${
        danger ? 'text-red-400' : 'text-slate-300'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

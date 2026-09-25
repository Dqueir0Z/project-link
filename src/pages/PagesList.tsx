import { getAllPages, deletePage, togglePageActive } from '@/services/pages';
import type { LinkPage } from '@/types';
import { buildPageUrl } from '@/utils/url';
import { formatDate } from '@/utils/date';
import EmptyState from '@/components/EmptyState';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { FileText, Plus, MoreVertical, Copy, ExternalLink, Pencil, Trash2, Power, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PagesList() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [pages, setPages] = useState<LinkPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPages();
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

  const loadPages = async () => {
    setLoading(true);
    const data = await getAllPages();
    setPages(data);
    setLoading(false);
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado!', 'success');
  };

  const handleDelete = async (id: string) => {
    const ok = await deletePage(id);
    if (ok) {
      showToast('Página excluída.', 'success');
      setDeleteConfirm(null);
      loadPages();
    } else {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const handleToggle = async (page: LinkPage) => {
    const ok = await togglePageActive(page.id, !page.is_active);
    if (ok) {
      showToast(page.is_active ? 'Página desativada.' : 'Página ativada.', 'success');
      loadPages();
    } else {
      showToast('Erro ao alterar status.', 'error');
    }
    setOpenMenu(null);
  };

  const filtered = pages.filter((p) => {
    const q = search.toLowerCase();
    return p.slug.toLowerCase().includes(q) || p.title.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <div ref={menuRef}>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Minhas Páginas</h1>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar páginas..."
              className="w-full sm:w-56 rounded-lg border border-slate-700 bg-slate-900 pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => navigate('/pages/new')}
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova página</span>
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        pages.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Você ainda não criou nenhuma página."
            description="Crie sua primeira página de links no estilo 'link in bio'."
            actionLabel="Criar minha primeira página"
            onAction={() => navigate('/pages/new')}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-12 text-center text-sm text-slate-400">
            Nenhuma página encontrada para "{search}"
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((page) => (
            <div key={page.id} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-white truncate">{page.title}</h3>
                  <p className="mt-0.5 text-sm text-emerald-400 truncate">/{page.slug}</p>
                  {page.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{page.description}</p>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setOpenMenu(openMenu === page.id ? null : page.id)}
                    className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {openMenu === page.id && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                      <MenuItem icon={Copy} label="Copiar link" onClick={() => { handleCopy(buildPageUrl(page.slug)); setOpenMenu(null); }} />
                      <MenuItem icon={ExternalLink} label="Abrir página" onClick={() => { window.open(buildPageUrl(page.slug), '_blank'); setOpenMenu(null); }} />
                      <MenuItem icon={Pencil} label="Editar" onClick={() => { navigate(`/pages/${page.id}/edit`); setOpenMenu(null); }} />
                      <MenuItem icon={Power} label={page.is_active ? 'Desativar' : 'Ativar'} onClick={() => handleToggle(page)} />
                      <div className="my-1 border-t border-slate-800" />
                      <MenuItem icon={Trash2} label="Excluir" onClick={() => { setDeleteConfirm(page.id); setOpenMenu(null); }} danger />
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Criada em {formatDate(page.created_at)}</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${
                  page.is_active
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-500/20 bg-slate-500/10 text-slate-400'
                }`}>
                  {page.is_active ? 'Ativa' : 'Desativada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white">Excluir página?</h3>
            <p className="mt-1 text-sm text-slate-400">Esta ação não pode ser desfeita.</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
                Excluir
              </button>
            </div>
          </div>
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

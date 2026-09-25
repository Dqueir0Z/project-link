import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPageById,
  updatePage,
  addPageLink,
  updatePageLink,
  deletePageLink,
  reorderPageLinks,
} from '@/services/pages';
import type { LinkPageWithLinks, PageLink } from '@/types';
import { buildPageUrl } from '@/utils/url';
import { normalizeAlias, isValidAlias } from '@/utils/alias';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Plus, Trash2, GripVertical, ExternalLink, Save, Loader2, ChevronUp, ChevronDown, Power } from 'lucide-react';

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [page, setPage] = useState<LinkPageWithLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPageById(id).then((p) => {
      if (!p) {
        setLoading(false);
        return;
      }
      setPage(p);
      setTitle(p.title);
      setDescription(p.description || '');
      setAvatarUrl(p.avatar_url || '');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-slate-400">Página não encontrada.</p>
        <button onClick={() => navigate('/pages')} className="mt-4 text-sm text-emerald-400 hover:underline">
          Voltar para Minhas Páginas
        </button>
      </div>
    );
  }

  const handleSavePage = async () => {
    if (!title.trim()) {
      showToast('Digite um título.', 'error');
      return;
    }
    setSavingPage(true);
    const { error } = await updatePage(page.id, {
      title,
      description,
      avatarUrl,
    });
    setSavingPage(false);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast('Página atualizada!', 'success');
  };

  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      showToast('Preencha o título e a URL do link.', 'error');
      return;
    }
    setAddingLink(true);
    const link = await addPageLink(page.id, newLinkLabel, newLinkUrl);
    setAddingLink(false);
    if (!link) {
      showToast('Erro ao adicionar link.', 'error');
      return;
    }
    setPage({ ...page, page_links: [...page.page_links, link] });
    setNewLinkLabel('');
    setNewLinkUrl('');
    showToast('Link adicionado!', 'success');
  };

  const handleDeleteLink = async (linkId: string) => {
    const ok = await deletePageLink(linkId);
    if (ok) {
      setPage({ ...page, page_links: page.page_links.filter((l) => l.id !== linkId) });
      showToast('Link removido.', 'success');
    } else {
      showToast('Erro ao remover link.', 'error');
    }
  };

  const handleToggleLink = async (link: PageLink) => {
    const ok = await updatePageLink(link.id, { is_active: !link.is_active });
    if (ok) {
      setPage({
        ...page,
        page_links: page.page_links.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)),
      });
    } else {
      showToast('Erro ao alterar status.', 'error');
    }
  };

  const handleMoveLink = async (linkId: string, direction: 'up' | 'down') => {
    const links = [...page.page_links];
    const index = links.findIndex((l) => l.id === linkId);
    if (index === -1) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= links.length) return;
    [links[index], links[swapIndex]] = [links[swapIndex], links[index]];
    const orderedIds = links.map((l) => l.id);
    setPage({ ...page, page_links: links });
    await reorderPageLinks(page.id, orderedIds);
  };

  const pageUrl = buildPageUrl(page.slug);

  return (
    <div className="max-w-2xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <button
        onClick={() => navigate('/pages')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Minhas Páginas
      </button>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Editar página</h1>
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          <ExternalLink className="h-4 w-4" /> Ver página
        </a>
      </div>

      {/* Page settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Dados da página</h2>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nome do perfil</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">URL do avatar</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={handleSavePage}
          disabled={savingPage}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {savingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar dados
        </button>
      </div>

      {/* Links */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Links da página</h2>

        {page.page_links.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Nenhum link adicionado ainda.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {page.page_links.map((link, index) => (
              <div
                key={link.id}
                className={`flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 ${
                  !link.is_active ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMoveLink(link.id, 'up')}
                    disabled={index === 0}
                    className="text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveLink(link.id, 'down')}
                    disabled={index === page.page_links.length - 1}
                    className="text-slate-500 hover:text-white disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{link.label}</p>
                  <p className="text-xs text-slate-500 truncate">{link.url}</p>
                </div>
                <button
                  onClick={() => handleToggleLink(link)}
                  className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
                  title={link.is_active ? 'Desativar' : 'Ativar'}
                >
                  <Power className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteLink(link.id)}
                  className="rounded p-1.5 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new link */}
        <div className="border-t border-slate-800 pt-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-300">Adicionar link</h3>
          <input
            type="text"
            value={newLinkLabel}
            onChange={(e) => setNewLinkLabel(e.target.value)}
            placeholder="Título (ex: GitHub)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="text"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="URL (ex: https://github.com/usuario)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={handleAddLink}
            disabled={addingLink}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            {addingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar link
          </button>
        </div>
      </div>
    </div>
  );
}

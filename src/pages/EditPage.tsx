import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getPageById,
  updatePage,
  addPageLink,
  updatePageLink,
  deletePageLink,
  reorderPageLinks,
  checkSlugAvailable,
} from '@/services/pages';
import type { LinkPageWithLinks, PageLink } from '@/types';
import { buildPageUrl, getOriginPrefix } from '@/utils/url';
import { normalizeAlias, isValidAlias } from '@/utils/alias';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Plus, Trash2, ExternalLink, Save, Loader2, ChevronUp, ChevronDown, Power, Pencil, Check, X, AlertCircle } from 'lucide-react';

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
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPageById(id).then(({ page: p, error }) => {
      if (!p) {
        if (error) showToast(error, 'error');
        setLoading(false);
        return;
      }
      setPage(p);
      setTitle(p.title);
      setDescription(p.description || '');
      setAvatarUrl(p.avatar_url || '');
      setSlug(p.slug);
      setOriginalSlug(p.slug);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!slug.trim() || slug === originalSlug) {
      setSlugStatus('idle');
      return;
    }
    const normalized = normalizeAlias(slug);
    if (!isValidAlias(normalized)) {
      setSlugStatus('unavailable');
      return;
    }
    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkSlugAvailable(normalized);
      setSlugStatus(available ? 'available' : 'unavailable');
    }, 400);
    return () => clearTimeout(timer);
  }, [slug, originalSlug]);

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
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
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

    const slugChanged = slug.trim() && normalizeAlias(slug) !== originalSlug;
    if (slugChanged && slugStatus !== 'available') {
      showToast('Verifique o slug antes de salvar.', 'error');
      return;
    }

    setSavingPage(true);
    const { error } = await updatePage(page.id, {
      title,
      description,
      avatarUrl,
      slug: slugChanged ? slug : undefined,
    });
    setSavingPage(false);
    if (error) {
      showToast(error, 'error');
      return;
    }

    if (slugChanged) {
      const normalized = normalizeAlias(slug);
      setOriginalSlug(normalized);
      setPage({ ...page, slug: normalized });
    }
    showToast('Página atualizada!', 'success');
  };

  const handleAddLink = async () => {
    if (!newLinkLabel.trim() || !newLinkUrl.trim()) {
      showToast('Preencha o título e a URL do link.', 'error');
      return;
    }
    setAddingLink(true);
    const { link, error } = await addPageLink(page.id, newLinkLabel, newLinkUrl);
    setAddingLink(false);
    if (!link) {
      showToast(error || 'Erro ao adicionar link.', 'error');
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
    const { error } = await updatePageLink(link.id, { is_active: !link.is_active });
    if (error) {
      showToast(error, 'error');
      return;
    }
    setPage({
      ...page,
      page_links: page.page_links.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l)),
    });
  };

  const handleStartEdit = (link: PageLink) => {
    setEditingLinkId(link.id);
    setEditLabel(link.label);
    setEditUrl(link.url);
  };

  const handleSaveEditLink = async (linkId: string) => {
    if (!editLabel.trim() || !editUrl.trim()) {
      showToast('Preencha o título e a URL.', 'error');
      return;
    }
    setSavingLink(true);
    const { error } = await updatePageLink(linkId, { label: editLabel, url: editUrl });
    setSavingLink(false);
    if (error) {
      showToast(error, 'error');
      return;
    }
    setPage({
      ...page,
      page_links: page.page_links.map((l) =>
        l.id === linkId ? { ...l, label: editLabel, url: editUrl } : l
      ),
    });
    setEditingLinkId(null);
    showToast('Link atualizado!', 'success');
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
  const originPrefix = getOriginPrefix();

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
          <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
          <div className="flex items-stretch">
            <div className="flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm text-slate-400">
              {originPrefix}
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 rounded-r-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {slugStatus === 'checking' && (
            <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
            </p>
          )}
          {slugStatus === 'available' && (
            <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Disponível
            </p>
          )}
          {slugStatus === 'unavailable' && slug !== originalSlug && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" /> Slug indisponível
            </p>
          )}
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
          disabled={savingPage || (slug !== originalSlug && slugStatus === 'checking') || (slug !== originalSlug && slugStatus === 'unavailable')}
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
                className={`rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 ${
                  !link.is_active ? 'opacity-50' : ''
                }`}
              >
                {editingLinkId === link.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Título"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEditLink(link.id)}
                        disabled={savingLink}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {savingLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingLinkId(null)}
                        className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                      >
                        <X className="h-3 w-3" /> Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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
                      onClick={() => handleStartEdit(link)}
                      className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
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
                )}
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

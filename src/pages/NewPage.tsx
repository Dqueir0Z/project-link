import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPage, checkSlugAvailable } from '@/services/pages';
import { normalizeAlias, isValidAlias } from '@/utils/alias';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Loader2, Check, X } from 'lucide-react';

export default function NewPage() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  useEffect(() => {
    if (!slug.trim()) {
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
  }, [slug]);

  const handleCreate = async () => {
    if (!title.trim()) {
      showToast('Digite um título.', 'error');
      return;
    }
    if (!slug.trim()) {
      showToast('Digite um slug.', 'error');
      return;
    }
    if (slugStatus !== 'available') {
      showToast('Verifique o slug antes de criar.', 'error');
      return;
    }

    setSaving(true);
    const { page, error } = await createPage({
      slug,
      title,
      description: description || undefined,
      avatarUrl: avatarUrl || undefined,
    });
    setSaving(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    showToast('Página criada!', 'success');
    navigate(`/pages/${page!.id}/edit`);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <button
        onClick={() => navigate('/pages')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Minhas Páginas
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Nova página</h1>
        <p className="mt-1 text-sm text-slate-400">Crie uma página de links no estilo "link in bio".</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nome do perfil</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Diogo Queiroz"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
          <div className="flex items-stretch">
            <div className="flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm text-slate-400">
              linkforge.app/
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="diogo"
              className="flex-1 rounded-r-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          {slugStatus === 'unavailable' && slug.trim() && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" /> Slug indisponível
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Descrição (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Backend Developer"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">URL do avatar (opcional)</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={saving || slugStatus === 'checking' || slugStatus === 'unavailable'}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Criando...
            </>
          ) : (
            'Criar página'
          )}
        </button>
      </div>
    </div>
  );
}

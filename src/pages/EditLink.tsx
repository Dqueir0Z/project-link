import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLinkById, updateLink, checkCodeAvailable } from '@/services/links';
import type { Link, ExpirationOption } from '@/types';
import { normalizeUrl } from '@/utils/url';
import { normalizeAlias, isValidAlias } from '@/utils/alias';
import { utcToLocalInput, formatDateTime } from '@/utils/date';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Loader2, Check, X, Calendar } from 'lucide-react';

export default function EditLink() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [link, setLink] = useState<Link | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [destinationUrl, setDestinationUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [originalAlias, setOriginalAlias] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('never');
  const [customDate, setCustomDate] = useState('');
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  useEffect(() => {
    if (!id) return;
    getLinkById(id).then((l) => {
      if (!l) {
        setLoading(false);
        return;
      }
      setLink(l);
      setDestinationUrl(l.original_url);
      setAlias(l.short_code);
      setOriginalAlias(l.short_code);
      if (l.expires_at) {
        setExpiration('custom');
        setCustomDate(utcToLocalInput(l.expires_at));
      } else {
        setExpiration('never');
      }
      setAliasStatus('idle');
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!alias.trim() || alias === originalAlias) {
      setAliasStatus('idle');
      return;
    }
    const normalized = normalizeAlias(alias);
    if (!isValidAlias(normalized)) {
      setAliasStatus('unavailable');
      return;
    }
    setAliasStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkCodeAvailable(normalized);
      setAliasStatus(available ? 'available' : 'unavailable');
    }, 400);
    return () => clearTimeout(timer);
  }, [alias, originalAlias]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg text-slate-400">Link não encontrado.</p>
        <button onClick={() => navigate('/links')} className="mt-4 text-sm text-emerald-400 hover:underline">
          Voltar para Meus Links
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    const normalized = normalizeUrl(destinationUrl);
    if (!normalized) {
      showToast('Digite uma URL válida.', 'error');
      return;
    }

    if (expiration === 'custom' && !customDate) {
      showToast('Selecione uma data de expiração.', 'error');
      return;
    }

    const aliasChanged = alias.trim() && normalizeAlias(alias) !== originalAlias;

    if (aliasChanged && aliasStatus !== 'available') {
      showToast('Verifique o alias antes de salvar.', 'error');
      return;
    }

    setSaving(true);
    const { error } = await updateLink(link.id, {
      originalUrl: destinationUrl,
      alias: aliasChanged ? alias : undefined,
      expiration,
      customDate,
    });
    setSaving(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    showToast('Link atualizado!', 'success');
    navigate(`/links/${link.id}`);
  };

  const handleRemoveExpiration = () => {
    setExpiration('never');
    setCustomDate('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <button
        onClick={() => navigate(`/links/${link.id}`)}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Editar link</h1>
        <p className="mt-1 text-sm text-slate-400">Altere a URL, alias ou expiração. Cliques e analytics não serão resetados.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
        {/* Destination */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Destino</label>
          <input
            type="text"
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Alias */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Seu link</label>
          <div className="flex items-stretch">
            <div className="flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm text-slate-400">
              linkforge.app/
            </div>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="flex-1 rounded-r-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          {aliasStatus === 'checking' && (
            <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Verificando...
            </p>
          )}
          {aliasStatus === 'available' && (
            <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
              <Check className="h-3 w-3" /> Disponível
            </p>
          )}
          {aliasStatus === 'unavailable' && alias !== originalAlias && (
            <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <X className="h-3 w-3" /> Alias indisponível
            </p>
          )}
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Expiração</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { value: 'never', label: 'Nunca' },
              { value: '24h', label: '24 horas' },
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias' },
              { value: 'custom', label: 'Data personalizada' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExpiration(opt.value as ExpirationOption)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  expiration === opt.value
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {expiration === 'custom' && (
            <div className="mt-3">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Horário local: {customDate ? formatDateTime(new Date(customDate).toISOString()) : '—'}
              </p>
            </div>
          )}
          {link.expires_at && expiration !== 'custom' && (
            <button onClick={handleRemoveExpiration} className="mt-2 text-xs text-slate-500 hover:text-slate-300">
              Remover expiração atual
            </button>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || aliasStatus === 'checking' || (alias !== originalAlias && aliasStatus === 'unavailable')}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            'Salvar alterações'
          )}
        </button>
      </div>
    </div>
  );
}

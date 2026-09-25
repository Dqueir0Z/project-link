import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Check, X, Loader2, Copy, ExternalLink, QrCode as QrIcon, Calendar } from 'lucide-react';
import { createLink, checkCodeAvailable } from '@/services/links';
import { buildShortUrl, normalizeUrl } from '@/utils/url';
import { normalizeAlias, isValidAlias } from '@/utils/alias';
import type { Link, ExpirationOption } from '@/types';
import { formatDateTime, timeAgo } from '@/utils/date';
import QrModal from '@/components/QrModal';
import { useToast } from '@/hooks/useToast';
import Toast from '@/components/Toast';

export default function CreateLink() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  const [destinationUrl, setDestinationUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [expiration, setExpiration] = useState<ExpirationOption>('never');
  const [customDate, setCustomDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdLink, setCreatedLink] = useState<Link | null>(null);

  // Alias availability check
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');

  useEffect(() => {
    if (!alias.trim()) {
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
  }, [alias]);

  const handleCreate = async () => {
    const normalized = normalizeUrl(destinationUrl);
    if (!normalized) {
      showToast('Digite uma URL válida.', 'error');
      return;
    }

    if (alias.trim()) {
      const normalizedAlias = normalizeAlias(alias);
      if (!isValidAlias(normalizedAlias)) {
        showToast('Alias inválido. Use 3-50 caracteres: letras, números, hífens e underscores.', 'error');
        return;
      }
    }

    if (expiration === 'custom' && !customDate) {
      showToast('Selecione uma data de expiração.', 'error');
      return;
    }

    setLoading(true);
    const { link, error } = await createLink({
      destinationUrl,
      alias: alias || undefined,
      expiration,
      customDate,
    });
    setLoading(false);

    if (error) {
      showToast(error, 'error');
      return;
    }

    setCreatedLink(link);
    showToast('Link criado com sucesso!', 'success');
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('Link copiado!', 'success');
  };

  const handleNewLink = () => {
    setCreatedLink(null);
    setDestinationUrl('');
    setAlias('');
    setExpiration('never');
    setCustomDate('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      {createdLink ? (
        <ResultCard link={createdLink} onCopy={handleCopy} onNewLink={handleNewLink} onGoToLinks={() => navigate('/links')} />
      ) : (
        <div>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Criar link</h1>
            <p className="mt-1 text-sm text-slate-400">Crie um link curto e personalizado.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
            {/* Destination URL */}
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

            {/* Custom alias */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Seu link</label>
              <div className="flex items-stretch gap-0">
                <div className="flex items-center rounded-l-lg border border-r-0 border-slate-700 bg-slate-800 px-3 text-sm text-slate-400">
                  linkforge.app/
                </div>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="meu-projeto (opcional)"
                  className="flex-1 rounded-r-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
              {aliasStatus === 'unavailable' && alias.trim() && (
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
            </div>

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={loading || aliasStatus === 'checking' || aliasStatus === 'unavailable'}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Criando link...
                </>
              ) : (
                'Criar link'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({
  link,
  onCopy,
  onNewLink,
  onGoToLinks,
}: {
  link: Link;
  onCopy: (url: string) => void;
  onNewLink: () => void;
  onGoToLinks: () => void;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const shortUrl = buildShortUrl(link.short_code);

  return (
    <div>
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <Check className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-white">Link criado!</h1>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3">
          <Link2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="flex-1 text-sm text-white truncate">{shortUrl}</span>
          <button
            onClick={() => onCopy(shortUrl)}
            className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => onCopy(shortUrl)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <a
            href={shortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <ExternalLink className="h-4 w-4" /> Abrir
          </a>
          <button
            onClick={() => setQrOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            <QrIcon className="h-4 w-4" /> QR Code
          </button>
        </div>

        <div className="mt-5 border-t border-slate-800 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Destino</span>
            <span className="text-slate-300 truncate ml-4 max-w-xs" title={link.original_url}>{link.original_url}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cliques</span>
            <span className="text-slate-300">0 acessos</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Criado</span>
            <span className="text-slate-300">{timeAgo(link.created_at)}</span>
          </div>
          {link.expires_at && (
            <div className="flex justify-between">
              <span className="text-slate-500">Expira em</span>
              <span className="text-slate-300">{formatDateTime(link.expires_at)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onNewLink}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Novo link
        </button>
        <button
          onClick={onGoToLinks}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
        >
          Ver meus links
        </button>
      </div>

      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} shortCode={link.short_code} />
    </div>
  );
}

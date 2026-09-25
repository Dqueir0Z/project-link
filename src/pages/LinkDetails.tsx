import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLinkById, getClickEvents, deleteLink, toggleLinkActive } from '@/services/links';
import type { Link, ClickEvent } from '@/types';
import { buildShortUrl } from '@/utils/url';
import { formatDateTime, timeAgo, getLinkStatus } from '@/utils/date';
import StatusBadge from '@/components/StatusBadge';
import QrModal from '@/components/QrModal';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Copy, ExternalLink, QrCode as QrIcon, Pencil, Power, Trash2, Link2, MousePointerClick, Calendar, Clock, Eye } from 'lucide-react';

export default function LinkDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const [link, setLink] = useState<Link | null>(null);
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getLinkById(id), getClickEvents(id)]).then(([l, e]) => {
      setLink(l);
      setEvents(e);
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

  const shortUrl = buildShortUrl(link.short_code);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copiado!', 'success');
  };

  const handleDelete = async () => {
    const ok = await deleteLink(link.id);
    if (ok) {
      showToast('Link excluído.', 'success');
      navigate('/links');
    } else {
      showToast('Erro ao excluir.', 'error');
    }
  };

  const handleToggle = async () => {
    const ok = await toggleLinkActive(link.id, !link.is_active);
    if (ok) {
      setLink({ ...link, is_active: !link.is_active });
      showToast(link.is_active ? 'Link desativado.' : 'Link ativado.', 'success');
    } else {
      showToast('Erro ao alterar status.', 'error');
    }
  };

  const status = getLinkStatus(link.is_active, link.expires_at);

  return (
    <div className="max-w-3xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <button
        onClick={() => navigate('/links')}
        className="mb-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Meus Links
      </button>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <h1 className="text-lg font-semibold text-white truncate">/{link.short_code}</h1>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5">
              <span className="flex-1 text-sm text-slate-300 truncate">{shortUrl}</span>
              <button onClick={() => handleCopy(shortUrl)} className="rounded p-1.5 text-slate-400 hover:text-white hover:bg-slate-800">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <StatusBadge isActive={link.is_active} expiresAt={link.expires_at} />
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => handleCopy(shortUrl)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <Copy className="h-4 w-4" /> Copiar
          </button>
          <a href={shortUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <ExternalLink className="h-4 w-4" /> Abrir
          </a>
          <button onClick={() => setQrOpen(true)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <QrIcon className="h-4 w-4" /> QR Code
          </button>
          <button onClick={() => navigate(`/links/${link.id}/edit`)} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <Pencil className="h-4 w-4" /> Editar
          </button>
          <button onClick={handleToggle} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">
            <Power className="h-4 w-4" /> {link.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button onClick={() => setDeleteOpen(true)} className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20">
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>

        {/* Details */}
        <div className="mt-6 border-t border-slate-800 pt-5 space-y-3">
          <DetailRow icon={Link2} label="URL original" value={link.original_url} />
          <DetailRow icon={Eye} label="Alias / código" value={link.short_code} />
          <DetailRow icon={MousePointerClick} label="Cliques" value={String(link.click_count)} />
          <DetailRow icon={Calendar} label="Criado em" value={formatDateTime(link.created_at)} />
          <DetailRow icon={Clock} label="Expira em" value={link.expires_at ? formatDateTime(link.expires_at) : 'Nunca'} />
          <DetailRow icon={Eye} label="Último acesso" value={link.last_clicked_at ? formatDateTime(link.last_clicked_at) : '—'} />
          <DetailRow icon={Power} label="Status" value={status === 'active' ? 'Ativo' : status === 'expired' ? 'Expirado' : 'Desativado'} />
        </div>

        {/* Click history */}
        {events.length > 0 && (
          <div className="mt-6 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-semibold text-white mb-3">Histórico de acessos ({events.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs">
                  <span className="text-slate-300">{formatDateTime(event.clicked_at)}</span>
                  <span className="text-slate-500">{timeAgo(event.clicked_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <QrModal open={qrOpen} onClose={() => setQrOpen(false)} shortCode={link.short_code} />

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Excluir link?">
        <p className="text-sm text-slate-400">Esta ação não pode ser desfeita. O link deixará de funcionar imediatamente.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setDeleteOpen(false)} className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700">
            Cancelar
          </button>
          <button onClick={handleDelete} className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600">
            Excluir
          </button>
        </div>
      </Modal>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-2 text-sm text-slate-500 shrink-0">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span className="text-sm text-slate-200 text-right break-all">{value}</span>
    </div>
  );
}

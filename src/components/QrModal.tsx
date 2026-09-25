import { useEffect, useState } from 'react';
import { generateQrDataUrl, downloadQrPng } from '@/utils/qr';
import { buildShortUrl } from '@/utils/url';
import Modal from './Modal';
import { Download } from 'lucide-react';

export default function QrModal({
  open,
  onClose,
  shortCode,
}: {
  open: boolean;
  onClose: () => void;
  shortCode: string;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const shortUrl = buildShortUrl(shortCode);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    generateQrDataUrl(shortUrl)
      .then(setQrUrl)
      .finally(() => setLoading(false));
  }, [open, shortUrl]);

  return (
    <Modal open={open} onClose={onClose} title="QR Code">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-xl border border-slate-700 bg-white p-4">
          {loading ? (
            <div className="h-[300px] w-[300px] animate-pulse bg-slate-200" />
          ) : (
            <img src={qrUrl} alt="QR Code" className="h-[300px] w-[300px]" />
          )}
        </div>
        <p className="text-sm font-medium text-slate-300 break-all text-center">{shortUrl}</p>
        <button
          onClick={() => downloadQrPng(shortUrl, `linkforge-${shortCode}.png`)}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Baixar PNG
        </button>
      </div>
    </Modal>
  );
}

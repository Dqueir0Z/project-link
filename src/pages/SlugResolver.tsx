import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resolveShortLink } from '@/services/links';
import { getPageBySlug } from '@/services/pages';
import type { LinkPageWithLinks } from '@/types';
import PublicPage from './PublicPage';
import { Link2, AlertTriangle, Clock, PowerOff } from 'lucide-react';

type State = 'loading' | 'redirecting' | 'page' | 'not_found' | 'expired' | 'inactive';

export default function SlugResolver() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<State>('loading');
  const [page, setPage] = useState<LinkPageWithLinks | null>(null);

  useEffect(() => {
    if (!slug) {
      setState('not_found');
      return;
    }

    let cancelled = false;

    (async () => {
      // First, try to resolve as a short link
      const linkResult = await resolveShortLink(slug);

      if (cancelled) return;

      if (linkResult.status === 'found' && linkResult.originalUrl) {
        setState('redirecting');
        window.location.href = linkResult.originalUrl;
        return;
      }

      if (linkResult.status === 'expired') {
        setState('expired');
        return;
      }

      if (linkResult.status === 'inactive') {
        setState('inactive');
        return;
      }

      // Not a link — try as a public page
      const pageData = await getPageBySlug(slug);

      if (cancelled) return;

      if (pageData) {
        setPage(pageData);
        setState('page');
      } else {
        setState('not_found');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state === 'page' && page) {
    return <PublicPage />;
  }

  if (state === 'loading' || state === 'redirecting') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
        <p className="mt-4 text-sm text-slate-400">
          {state === 'redirecting' ? 'Redirecionando...' : 'Carregando...'}
        </p>
      </div>
    );
  }

  const errorConfig = {
    not_found: { icon: AlertTriangle, message: 'Link não encontrado.', color: 'text-red-400' },
    expired: { icon: Clock, message: 'Este link expirou.', color: 'text-amber-400' },
    inactive: { icon: PowerOff, message: 'Este link está desativado.', color: 'text-slate-400' },
  };

  const config = errorConfig[state as 'not_found' | 'expired' | 'inactive'];
  const Icon = config.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center px-4">
      <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 ${config.color}`}>
        <Icon className="h-8 w-8" />
      </div>
      <p className="text-lg font-semibold text-white">{config.message}</p>
      <button
        onClick={() => navigate('/')}
        className="mt-6 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
      >
        <Link2 className="h-4 w-4" />
        Voltar ao início
      </button>
    </div>
  );
}

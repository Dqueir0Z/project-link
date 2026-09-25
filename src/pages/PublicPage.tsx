import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPageBySlug } from '@/services/pages';
import type { LinkPageWithLinks } from '@/types';
import { Link2 } from 'lucide-react';

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LinkPageWithLinks | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    getPageBySlug(slug).then((p) => {
      setPage(p);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-center px-4">
        <Link2 className="h-12 w-12 text-slate-700 mb-4" />
        <p className="text-lg font-semibold text-white">Página não encontrada</p>
        <p className="mt-1 text-sm text-slate-400">A página pode ter sido removida ou desativada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="mx-auto max-w-md">
        {/* Profile */}
        <div className="flex flex-col items-center text-center mb-8">
          {page.avatar_url ? (
            <img
              src={page.avatar_url}
              alt={page.title}
              className="h-24 w-24 rounded-full object-cover border-2 border-slate-700"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-400">
              {page.title.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="mt-4 text-xl font-bold text-white">{page.title}</h1>
          {page.description && (
            <p className="mt-1 text-sm text-slate-400">{page.description}</p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {page.page_links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-5 py-3.5 text-sm font-medium text-slate-200 transition-colors hover:border-emerald-500 hover:bg-slate-800 hover:text-white"
            >
              {link.label}
            </a>
          ))}
          {page.page_links.length === 0 && (
            <p className="text-center text-sm text-slate-500 py-8">Nenhum link disponível.</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400"
          >
            <Link2 className="h-3 w-3" />
            LinkForge
          </a>
        </div>
      </div>
    </div>
  );
}

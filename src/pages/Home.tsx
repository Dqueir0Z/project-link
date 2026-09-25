import { Link } from 'react-router-dom';
import { Link2, QrCode, BarChart3, FileText, ArrowRight, Zap } from 'lucide-react';

const features = [
  {
    icon: Link2,
    title: 'Links personalizados',
    description: 'Crie links curtos com aliases personalizados e fáceis de lembrar.',
  },
  {
    icon: QrCode,
    title: 'QR Codes',
    description: 'Gere e baixe QR Codes para qualquer link curto em formato PNG.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Acompanhe cliques, acessos e o status de cada link em tempo real.',
  },
  {
    icon: FileText,
    title: 'Link Pages',
    description: 'Crie páginas de links no estilo "link in bio" com seus links favoritos.',
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="flex flex-col items-center text-center pt-12 pb-16">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-1.5 text-sm text-slate-400">
          <Zap className="h-4 w-4 text-emerald-400" />
          Shorten. Share. Track.
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight max-w-2xl">
          Links menores. <span className="text-emerald-400">Resultados maiores.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-400">
          Encurte URLs, crie links personalizados, gere QR Codes e compartilhe tudo em um só lugar.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link
            to="/links/new"
            className="flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Criar link
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/pages/new"
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
          >
            Criar página de links
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-colors hover:border-slate-700"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-white">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-slate-400">{feature.description}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

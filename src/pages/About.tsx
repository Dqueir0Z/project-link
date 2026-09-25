import { Link2, Code2, Zap } from 'lucide-react';

const techs = ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'PostgreSQL'];

export default function About() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <Link2 className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold text-white">Sobre o LinkForge</h1>
        <p className="mt-2 text-sm text-emerald-400">Shorten. Share. Track.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          LinkForge é uma plataforma leve de gerenciamento de links para encurtar, compartilhar e rastrear URLs.
          Crie links curtos personalizados, gere QR Codes, acompanhe cliques e crie páginas de links no estilo
          "link in bio" — tudo em um só lugar.
        </p>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Code2 className="h-4 w-4 text-emerald-400" />
            Tecnologias
          </h2>
          <div className="flex flex-wrap gap-2">
            {techs.map((tech) => (
              <span
                key={tech}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Zap className="h-4 w-4 text-emerald-400" />
            Funcionalidades
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-400">
            <li>Encurtamento de URLs com aliases personalizados</li>
            <li>Geração de QR Codes com download em PNG</li>
            <li>Rastreamento de cliques e analytics simples</li>
            <li>Expiração de links com suporte a timezone correto</li>
            <li>Gerenciamento completo: editar, desativar, excluir</li>
            <li>LinkForge Pages — páginas de links no estilo "link in bio"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

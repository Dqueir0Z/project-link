import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import CreateLink from '@/pages/CreateLink';
import LinksDashboard from '@/pages/LinksDashboard';
import LinkDetails from '@/pages/LinkDetails';
import EditLink from '@/pages/EditLink';
import PagesList from '@/pages/PagesList';
import NewPage from '@/pages/NewPage';
import EditPage from '@/pages/EditPage';
import PublicPage from '@/pages/PublicPage';
import About from '@/pages/About';
import SlugResolver from '@/pages/SlugResolver';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-4xl font-bold text-white mb-2">404</p>
      <p className="text-sm text-slate-400">Página não encontrada.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Standalone routes (no layout) — short link redirects & public pages */}
        <Route path="/:slug" element={<SlugResolver />} />

        {/* Layout-wrapped routes */}
        <Route
          path="/*"
          element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/links" element={<LinksDashboard />} />
                <Route path="/links/new" element={<CreateLink />} />
                <Route path="/links/:id" element={<LinkDetails />} />
                <Route path="/links/:id/edit" element={<EditLink />} />
                <Route path="/pages" element={<PagesList />} />
                <Route path="/pages/new" element={<NewPage />} />
                <Route path="/pages/:id/edit" element={<EditPage />} />
                <Route path="/sobre" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

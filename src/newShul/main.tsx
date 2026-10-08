import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DirectionProvider } from '@radix-ui/react-direction';
import { Toaster } from 'sonner';
import { LocalSite } from './LocalSite';
import { AuthProvider } from '@/contexts/AuthContext';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CommunityProvider } from '@/community/components/CommunityProvider';
import { LOCAL_STUDIO } from './localStore';
import '@/index.css';
import { SavedBoard } from './SavedBoard';
const display = new URLSearchParams(location.search).has('display');
const studio = new URLSearchParams(location.search).has('studio');

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } });
createRoot(document.getElementById('root')!).render(LOCAL_STUDIO ?
  <HashRouter><QueryClientProvider client={queryClient}><AuthProvider><TooltipProvider><DirectionProvider dir="rtl"><CommunityProvider>
    {display ? <SavedBoard /> : <LocalSite studio={studio}/>}<Toaster position="top-center" />
  </CommunityProvider></DirectionProvider></TooltipProvider></AuthProvider></QueryClientProvider></HashRouter>
  : <p dir="rtl">הסטודיו המקומי זמין רק במצב העבודה המבודד של New Shul.</p>);

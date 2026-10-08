import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { TvDesignPanel } from '@/community/components/admin/tv/TvDesignPanel';
import { MinyanimAdmin } from '@/community/components/admin/MinyanimAdmin';
import { AnnouncementsAdmin, ShiurimAdmin, ChavrutotAdmin } from '@/community/components/admin/ContentAdmin';
import { CommunityHome } from '@/community/pages/CommunityHome';
import { AnnouncementsPage } from '@/community/pages/Announcements';
import { ShiurimPage } from '@/community/pages/Shiurim';
import { ChavrutotPage } from '@/community/pages/Chavrutot';
import { SavedBoard } from './SavedBoard';
import { ContactPage } from '@/community/pages/Contact';
import { MessagesAdmin } from '@/community/components/admin/MessagesAdmin';
import { MinyanOverridesAdmin } from '@/community/components/admin/MinyanOverridesAdmin';
import './localSite.css';
import {LocalSettings} from './LocalSettings';

const sections=[['/community','האתר לציבור'],['/manage/minyanim','ניהול מניינים'],['/manage/announcements','ניהול הודעות'],['/manage/shiurim','ניהול שיעורים'],['/manage/chavrutot','ניהול חברותות'],['/manage/messages','פניות לגבאי'],['/manage/settings','פרטי בית הכנסת'],['/','עיצוב הלוח'],['/display','תצוגת הלוח']] as const;
function LocalAdminRedirect(){
  const {search}=useLocation();const params=new URLSearchParams(search);const tab=params.get('tab');params.delete('tab');
  const path=tab==='tv'?'/':['minyanim','announcements','shiurim','chavrutot','messages','settings'].includes(tab??'')?`/manage/${tab}`:'/manage/minyanim';
  return <Navigate replace to={`${path}${params.size?'?'+params.toString():''}`}/>;
}
export function LocalSite({studio=false}:{studio?:boolean}) {
  const {pathname}=useLocation();
  return <div dir="rtl" className="new-shul-site">
    <header className="border-b bg-slate-950 px-6 py-4 text-white">
      <h1 className="text-xl font-bold">New Shul · אתר בית הכנסת והלוח</h1>
      <p className="text-sm text-amber-200">סביבה מקומית · התוכן והעיצוב נשמרים בדפדפן הזה · אין חיבור לאתר הישן</p>
      <p className="text-xs text-slate-300">נתוני הפתיחה לדוגמה. חשבונות משתמשים, התראות למכשירים וסנכרון באינטרנט אינם מחוברים כאן.</p>
      <nav aria-label="ניווט New Shul" className="mt-4 flex flex-wrap gap-2">{sections.map(([to,label])=><NavLink key={to} end to={to} className={({isActive})=>`rounded px-3 py-2 text-sm ${isActive?'bg-amber-200 text-slate-950':'bg-white/10 hover:bg-white/20'}`}>{label}</NavLink>)}</nav>
    </header>
    {/* Keep the design draft mounted when moving between content forms. */}
    <main className="p-3" hidden={pathname!=='/'}><TvDesignPanel studio={studio} /></main>
    <div className={pathname.startsWith('/manage')?'mx-auto max-w-5xl p-5':''}>
      <Routes>
        <Route path="/" element={null}/>
        <Route path="/manage/minyanim" element={<><MinyanimAdmin/><MinyanOverridesAdmin/></>}/>
        <Route path="/manage/announcements" element={<AnnouncementsAdmin/>}/>
        <Route path="/manage/shiurim" element={<ShiurimAdmin/>}/>
        <Route path="/manage/chavrutot" element={<ChavrutotAdmin/>}/>
        <Route path="/manage/messages" element={<MessagesAdmin/>}/>
        <Route path="/manage/settings" element={<LocalSettings/>}/>
        <Route path="/community" element={<CommunityHome/>}/>
        <Route path="/community/admin" element={<LocalAdminRedirect/>}/>
        <Route path="/community/announcements" element={<AnnouncementsPage/>}/>
        <Route path="/community/shiurim" element={<ShiurimPage/>}/>
        <Route path="/community/chavrutot" element={<ChavrutotPage/>}/>
        <Route path="/community/contact" element={<><p className="p-3 text-center">הפנייה תישמר רק בתיבת הפניות המקומית; לא תישלח לאדם אחר.</p><ContactPage/></>}/>
        <Route path="/display" element={<SavedBoard/>}/>
        <Route path="*" element={<p className="p-6">העמוד הזה דורש שירות שאינו מחובר בסביבה המקומית. אפשר לחזור למדורים שבתפריט.</p>}/>
      </Routes>
    </div>
  </div>;
}

import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export const ADMIN_SECTIONS = [
  { label: 'תוכן וקהילה', items: [
    ['minyanim', 'מניינים'], ['announcements', 'מודעות לציבור'], ['shiurim', 'שיעורים'],
    ['chavrutot', 'חברותות'], ['chavruta-requests', 'בקשות חברותא'], ['messages', 'פניות לגבאי'],
  ] },
  { label: 'עיצוב ותצוגה', items: [
    ['tv', 'לוחות ומסכים'], ['widgets', 'עיצוב דף הבית'],
  ] },
  { label: 'ניהול וכלים', items: [
    ['users', 'משתמשים והרשאות'], ['data', 'גיבוי וייבוא נתונים'], ['qr', 'קודי QR'],
    ['apps', 'הורדת אפליקציות'], ['ai', 'עוזר חכם'], ['api', 'מפתח העוזר החכם'],
  ] },
] as const;

export function AdminNavigation({ storeApp, unread }: { storeApp: boolean; unread: number }) {
  return <TabsList dir="rtl" aria-label="מדורי ניהול" data-focus-hide
    className="flex h-auto w-full flex-col items-stretch gap-3 bg-transparent p-0 text-right">
    {ADMIN_SECTIONS.map(group => <div key={group.label} role="presentation" className="rounded-lg border bg-muted/40 p-2">
      <p className="mb-1 px-2 text-xs font-semibold text-muted-foreground">{group.label}</p>
      <div role="presentation" className="flex flex-wrap gap-1">
        {group.items.filter(([id]) => !storeApp || (id !== 'tv' && id !== 'apps')).map(([id, label]) =>
          <TabsTrigger key={id} value={id} className="whitespace-normal text-right">{label}{id === 'messages' && unread > 0 ? ` (${unread})` : ''}</TabsTrigger>)}
      </div>
    </div>)}
  </TabsList>;
}

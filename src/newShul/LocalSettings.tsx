import {useState} from 'react';
import {useSettings} from '@/community/lib/data';
import {communityId} from '@/community/lib/community';
import {SynagogueDetailsDialog} from '@/community/components/admin/SynagogueDetails';
import {Button} from '@/components/ui/button';

export function LocalSettings(){
  const {data:settings,isLoading}=useSettings();
  const [open,setOpen]=useState(false);
  return <section className="space-y-4">
    <h2 className="text-2xl font-bold">פרטי בית הכנסת</h2>
    <p>השם, הכתובת והמיקום משותפים לאתר וללוח. השמירה מקומית בלבד.</p>
    <p data-testid="local-shul-name">{settings?.name}</p>
    <p>{settings?.address}</p>
    <Button disabled={isLoading} onClick={()=>setOpen(true)}>עריכת פרטי בית הכנסת</Button>
    <SynagogueDetailsDialog community={open?{id:communityId(),name:settings?.name??'בית הכנסת'}:null} canRename onClose={()=>setOpen(false)}/>
  </section>;
}

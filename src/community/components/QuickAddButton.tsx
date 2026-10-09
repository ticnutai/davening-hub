import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@community/lib/use-auth";

const destinations = [
  { tab: "announcements", label: "מודעה", action: "מודעה חדשה" },
  { tab: "shiurim", label: "שיעור", action: "שיעור חדש" },
  { tab: "chavrutot", label: "חברותא", action: "חברותא חדשה" },
  { tab: "minyanim", label: "מניין", action: "מניין חדש" },
];

/** Shortcuts only. The destination owns the form, validation and persistence. */
export function QuickAddButton() {
  const { isAdmin, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (loading || !isAdmin) return null;
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>
      <Button size="icon" className="fixed bottom-5 left-5 z-50 h-14 w-14 rounded-full shadow-2xl md:bottom-8 md:left-8"
        style={{ bottom: "calc(1.25rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))" }} aria-label="הוספה מהירה">
        <Plus className="size-7" />
      </Button>
    </DialogTrigger>
    <DialogContent dir="rtl" className="max-w-md text-right">
      <DialogHeader className="text-right">
        <DialogTitle>מה תרצו להוסיף?</DialogTitle>
        <DialogDescription>כל סוג תוכן נערך במקום אחד. בחרו סוג, ובמסך שייפתח לחצו על כפתור ההוספה המצוין.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        {destinations.map(item => <Button key={item.tab} variant="outline" className="h-auto flex-col items-start whitespace-normal p-4" onClick={() => {
          setOpen(false);
          navigate(`/community/admin?tab=${item.tab}`);
        }}><span className="font-semibold">{item.label}</span><span className="text-xs text-muted-foreground">{item.action}</span></Button>)}
      </div>
    </DialogContent>
  </Dialog>;
}

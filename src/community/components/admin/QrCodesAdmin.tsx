import { useRef } from "react";
import { Copy, Download, Globe2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCommunity } from "@/community/lib/community";

export function communityQrUrl(slug: string, href = window.location.href): string {
  const current = new URL(href);
  const localEntry = current.pathname.endsWith("/new-shul.html");
  const url = new URL(localEntry ? current.pathname : "/community", current.origin);
  url.searchParams.set("shul", slug);
  if (localEntry) url.hash = "/community";
  return url.toString();
}

type QrTarget = { id: string; title: string; url: string; Icon: typeof Globe2 };

function QrCard({ target }: { target: QrTarget }) {
  const containerRef = useRef<HTMLDivElement>(null);

  function downloadSvg() {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const content = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([content], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `shul-hub-${target.id}-qr.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(target.url);
      toast.success("הכתובת הועתקה");
    } catch {
      toast.error("לא ניתן להעתיק כרגע. אפשר להעתיק את הכתובת המוצגת כאן ידנית.");
    }
  }

  return (
    <article
      className="card-elev flex flex-col items-center gap-4 p-5 text-center"
      data-testid={`qr-${target.id}`}
    >
      <div className="flex items-center gap-2 text-lg font-semibold">
        <target.Icon className="size-5 text-primary" />
        <h3>{target.title}</h3>
      </div>
      <div ref={containerRef} className="rounded-xl bg-white p-4 shadow-soft">
        <QRCodeSVG value={target.url} size={220} level="H" marginSize={1} title={target.title} />
      </div>
      <p dir="ltr" className="max-w-full break-all text-xs text-muted-foreground">
        {target.url}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" variant="outline" onClick={() => void copyUrl()}>
          <Copy className="size-4" /> העתקת כתובת
        </Button>
        <Button type="button" onClick={downloadSvg}>
          <Download className="size-4" /> הורדת QR
        </Button>
      </div>
    </article>
  );
}

export function QrCodesAdmin() {
  const community = useCommunity();
  const target: QrTarget | null = community ? {
    id: "website",
    title: `אתר בית הכנסת — ${community.name}`,
    url: communityQrUrl(community.slug),
    Icon: Globe2,
  } : null;
  return (
    <section dir="rtl" className="space-y-4 text-right">
      <div>
        <h2 className="text-2xl font-semibold">קודי QR</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          סריקה מהטלפון תפתח את אתר בית הכנסת שנבחר כאן.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {target ? <QrCard target={target} /> : <p>יש לבחור בית כנסת לפני יצירת קוד QR.</p>}
      </div>
    </section>
  );
}

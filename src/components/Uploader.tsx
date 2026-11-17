"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

type Props = {
  orderId: string;
  kind?: "CUSTOMER" | "RECEIPT";
  accept?: string;
  multiple?: boolean;
  labels: { button: string; hint: string; uploading: string; errFile: string; errLimit: string; errGeneric: string };
};

export function Uploader({ orderId, kind = "CUSTOMER", accept = ".pdf,.jpg,.jpeg,.png", multiple = true, labels }: Props) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.set("file", file);
      body.set("kind", kind);
      try {
        const res = await fetch(`/api/orders/${orderId}/documents`, { method: "POST", body });
        if (!res.ok) {
          const code = (await res.json().catch(() => ({}))).error;
          setError(code === "errFile" ? labels.errFile : code === "errLimit" ? labels.errLimit : labels.errGeneric);
          break;
        }
      } catch {
        setError(labels.errGeneric);
        break;
      }
    }
    if (input.current) input.current.value = "";
    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void upload(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-paper px-6 py-8 text-center transition hover:border-brand/50"
      >
        {busy ? <Loader2 className="animate-spin text-brand" aria-hidden="true" /> : <Upload className="text-brand" aria-hidden="true" />}
        <span className="text-sm font-bold">{busy ? labels.uploading : labels.button}</span>
        <span className="text-xs text-muted">{labels.hint}</span>
        <input ref={input} type="file" accept={accept} multiple={multiple} disabled={busy} className="sr-only" onChange={(e) => void upload(e.target.files)} />
      </label>
      {error && <p role="alert" className="alert-error mt-3">{error}</p>}
    </div>
  );
}

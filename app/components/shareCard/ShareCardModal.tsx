"use client";

import { useState, useEffect } from "react";
import { Download, Share2, Copy, Check, ImageOff } from "lucide-react";
import Modal from "@/app/components/modal";

type Format = "square" | "wide" | "story";
type TemplateName = "head-to-head" | "hot-takes";
type ImgState = "loading" | "loaded" | "error";

interface Props {
  token: string;
  template: TemplateName;
  open: boolean;
  onClose: () => void;
}

const FORMAT_LABELS: Record<Format, string> = {
  square: "Square",
  wide: "Wide",
  story: "Story",
};

const ASPECT: Record<Format, string> = {
  square: "1 / 1",
  wide: "16 / 9",
  story: "9 / 16",
};

const TEMPLATE_TITLES: Record<TemplateName, string> = {
  "head-to-head": "Your results",
  "hot-takes": "Hot takes",
};

const DEFAULT_ERROR: Record<TemplateName, string> = {
  "head-to-head": "Complete your ranking to generate this card.",
  "hot-takes": "Not enough data to generate hot takes yet.",
};

export default function ShareCardModal({ token, template, open, onClose }: Props) {
  const [format, setFormat] = useState<Format>("square");
  const [imgState, setImgState] = useState<ImgState>("loading");
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(() => Date.now());

  const imgUrl = `/api/share/${template}?token=${encodeURIComponent(token)}&format=${format}&t=${cacheBust}`;

  // New cache-bust key on every open so stale images are never shown
  useEffect(() => {
    if (open) {
      setCacheBust(Date.now());
      setImgState("loading");
      setErrorMsg(null);
    }
  }, [open]);

  // Reset load state when format switches within the same open session
  useEffect(() => {
    if (open) { setImgState("loading"); setErrorMsg(null); }
  }, [format]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBlob = async (): Promise<Blob | null> => {
    try {
      const res = await fetch(imgUrl, { credentials: "include" });
      if (!res.ok) return null;
      return res.blob();
    } catch {
      return null;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    const blob = await fetchBlob();
    setDownloading(false);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tierstack-${template}-${format}.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const blob = await fetchBlob();
    if (!blob) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard write not supported in this browser */ }
  };

  const handleShare = async () => {
    const blob = await fetchBlob();
    if (!blob) return;
    const file = new File([blob], `tierstack-${template}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
      } catch { /* user cancelled */ }
    }
  };

  const actionsDisabled = imgState !== "loaded";
  const canWebShare = typeof navigator !== "undefined" && "share" in navigator;
  const canClipboard = typeof navigator !== "undefined" && "clipboard" in navigator;

  return (
    <Modal open={open} handleClose={onClose}>
      <div className="p-6 pt-8 flex flex-col gap-4 w-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-rk-primary text-[17px] font-[500]">
            {TEMPLATE_TITLES[template]}
          </p>

          {/* Format tabs */}
          <div
            className="flex gap-1 p-1 rounded-[8px] flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            {(["square", "wide", "story"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-2.5 py-1 text-[11px] font-[500] rounded-[5px] transition-colors cursor-pointer ${
                  format === f
                    ? "bg-rk-surface text-rk-primary"
                    : "text-rk-muted hover:text-rk-secondary"
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Preview container — aspect-ratio matches the selected format */}
        <div
          className="relative w-full rounded-[8px] overflow-hidden border border-rk-stroke"
          style={{ aspectRatio: ASPECT[format], backgroundColor: "#0A1220" }}
        >
          {/* Spinner while loading */}
          {imgState === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-[1.5px] border-rk-stroke border-t-rk-accent animate-spin" />
            </div>
          )}

          {/* Error state */}
          {imgState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
              <ImageOff size={20} className="text-rk-muted" />
              <p className="text-[12px] text-rk-tertiary leading-snug">
                {errorMsg ?? DEFAULT_ERROR[template]}
              </p>
            </div>
          )}

          {/* The actual card preview — hidden until loaded */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={imgUrl}
            src={imgUrl}
            alt="Share card preview"
            className={`w-full h-full object-contain transition-opacity duration-200 ${
              imgState === "loaded" ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImgState("loaded")}
            onError={async () => {
              try {
                const res = await fetch(imgUrl, { credentials: "include" });
                const json = await res.json().catch(() => null);
                setErrorMsg(json?.error ?? null);
              } catch { /* ignore */ }
              setImgState("error");
            }}
          />
        </div>

        {/* Action buttons — hidden when there's an error */}
        {imgState !== "error" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={actionsDisabled || downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] bg-rk-accent text-white rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
            >
              {downloading ? (
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
              ) : (
                <Download size={13} />
              )}
              Download
            </button>

            {canClipboard && (
              <button
                onClick={handleCopy}
                disabled={actionsDisabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors disabled:opacity-40 cursor-pointer"
              >
                {copied ? (
                  <Check size={13} className="text-green-400" />
                ) : (
                  <Copy size={13} />
                )}
                {copied ? "Copied!" : "Copy image"}
              </button>
            )}

            {canWebShare && (
              <button
                onClick={handleShare}
                disabled={actionsDisabled}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-[500] text-rk-secondary border border-rk-stroke rounded-[8px] hover:border-rk-secondary hover:text-rk-primary transition-colors disabled:opacity-40 cursor-pointer"
              >
                <Share2 size={13} />
                Share
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

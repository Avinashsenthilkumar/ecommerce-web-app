"use client";

import { useEffect, useState } from "react";
import { X, Share } from "lucide-react";
import { LogoMark } from "./LogoMark";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "subsel-install-dismissed";

/** Mobile-only banner: one-tap install on Android, "Share → Add to Home Screen" hint on iPhone. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {}
    if (standalone || dismissed || window.innerWidth >= 1024) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-[22px] border border-line bg-white p-3 shadow-[0_18px_40px_-18px_rgba(28,25,23,0.35)] lg:hidden" role="dialog" aria-label="Install the subsel app">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper"><LogoMark size={28} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Get the subsel app</p>
        <p className="text-xs text-slate">
          {ios ? <>Tap <Share size={11} className="inline" /> then &ldquo;Add to Home Screen&rdquo;</> : "Faster checkout and order tracking"}
        </p>
      </div>
      {!ios && evt && (
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            dismiss();
          }}
        >
          Install
        </button>
      )}
      <button type="button" onClick={dismiss} className="p-1.5 text-slate" aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

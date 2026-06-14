import { useEffect, useRef, useState } from "react";

type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: (e: unknown) => void;
  start: () => void;
  stop: () => void;
};

const getRecognitionCtor = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export function useVoiceInput(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  };

  const toggle = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      stop();
      return;
    }
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    let final = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      onText((final + interim).trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return { listening, supported, toggle, stop };
}

export const speak = (text: string, onEnd?: () => void) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1;
  u.pitch = 1;
  if (onEnd) {
    u.onend = () => onEnd();
    u.onerror = () => onEnd();
  }
  window.speechSynthesis.speak(u);
};

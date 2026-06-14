import { useCallback, useEffect, useRef, useState } from "react";
import { speak, useVoiceInput } from "@/lib/sentient/voice";

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  open: boolean;
  onClose: () => void;
  accent: string;
  model?: string;
};

export function VoiceMode({ open, onClose, accent, model }: Props) {
  const [transcript, setTranscript] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const lastSent = useRef("");

  const { listening, supported, toggle, stop } = useVoiceInput((t) => setTranscript(t));

  // Stop everything when closed
  useEffect(() => {
    if (!open) {
      stop?.();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingNow(false);
      setTranscript("");
    }
  }, [open, stop]);

  const sendToAi = useCallback(
    async (userText: string) => {
      const text = userText.trim();
      if (!text || text === lastSent.current) return;
      lastSent.current = text;

      const nextTurns: Turn[] = [...turns, { role: "user", content: text }];
      setTurns(nextTurns);
      setTranscript("");
      setThinking(true);
      try {
        const res = await fetch("/api/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: nextTurns.map((t) => ({ role: t.role, content: t.content })),
          }),
        });
        const json = (await res.json()) as { reply?: string };
        const reply = (json.reply || "I didn't catch that.").trim();
        setTurns((p) => [...p, { role: "assistant", content: reply }]);
        setSpeakingNow(true);
        speak(reply, () => setSpeakingNow(false));
      } catch {
        const fallback = "Something went wrong on my side.";
        setTurns((p) => [...p, { role: "assistant", content: fallback }]);
        setSpeakingNow(true);
        speak(fallback, () => setSpeakingNow(false));
      } finally {
        setThinking(false);
      }
    },
    [turns, model],
  );

  // When user stops talking and we have a transcript, auto-send
  useEffect(() => {
    if (!open) return;
    if (listening) return;
    if (!transcript.trim()) return;
    if (thinking || speakingNow) return;
    const handle = window.setTimeout(() => sendToAi(transcript), 250);
    return () => window.clearTimeout(handle);
  }, [listening, transcript, open, thinking, speakingNow, sendToAi]);

  if (!open) return null;

  const status = !supported
    ? "Voice not supported in this browser"
    : thinking
      ? "Thinking…"
      : speakingNow
        ? "Speaking…"
        : listening
          ? "Listening…"
          : "Tap the orb to talk";

  const orbActive = listening || speakingNow || thinking;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(4,6,10,0.78)",
        backdropFilter: "blur(28px) saturate(1.5)",
        WebkitBackdropFilter: "blur(28px) saturate(1.5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          cursor: "pointer",
          fontSize: 16,
        }}
      >
        ✕
      </button>

      <div
        style={{
          color: "#9aa",
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        Voice Mode
      </div>

      {/* Orb */}
      <button
        onClick={() => {
          if (!supported) return;
          if (speakingNow && typeof window !== "undefined") {
            window.speechSynthesis.cancel();
            setSpeakingNow(false);
          }
          toggle();
        }}
        disabled={!supported || thinking}
        className={orbActive ? "sentient-pulse" : ""}
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "none",
          cursor: supported && !thinking ? "pointer" : "not-allowed",
          background: `radial-gradient(circle at 30% 30%, ${accent}, ${accent}55 60%, transparent 75%)`,
          boxShadow: orbActive
            ? `0 0 80px ${accent}aa, 0 0 160px ${accent}55, inset 0 0 40px ${accent}33`
            : `0 0 40px ${accent}55, inset 0 0 30px ${accent}22`,
          transition: "box-shadow .3s, transform .15s",
          transform: listening ? "scale(1.04)" : "scale(1)",
        }}
        title={listening ? "Stop" : "Talk"}
      />

      <div
        style={{
          marginTop: 28,
          color: "#ddd",
          fontSize: 13,
          letterSpacing: 1,
          minHeight: 18,
        }}
      >
        {status}
      </div>

      <div
        style={{
          marginTop: 18,
          minHeight: 60,
          maxWidth: 640,
          width: "100%",
          textAlign: "center",
          color: "#fff",
          fontSize: 18,
          lineHeight: 1.5,
          fontWeight: 300,
        }}
      >
        {transcript ||
          turns[turns.length - 1]?.content ||
          ""}
      </div>

      {turns.length > 1 && (
        <div
          style={{
            marginTop: 24,
            maxWidth: 560,
            width: "100%",
            maxHeight: 180,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: 0.55,
            fontSize: 12,
          }}
        >
          {turns.slice(0, -1).map((t, i) => (
            <div
              key={i}
              style={{
                color: t.role === "user" ? "#fff" : "#9aa",
                textAlign: t.role === "user" ? "right" : "left",
              }}
            >
              {t.role === "user" ? "You: " : "SENTIENT: "}
              {t.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

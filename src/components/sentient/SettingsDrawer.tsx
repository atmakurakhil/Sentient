import { Drawer } from "./Drawer";
import { MODEL_OPTIONS, type SentientSettings } from "@/lib/sentient/storage";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: SentientSettings;
  onChange: (s: SentientSettings) => void;
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1.2,
  color: "#888",
  marginBottom: 8,
  display: "block",
};

const fieldBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10,
  padding: 12,
  marginBottom: 18,
};

export function SettingsDrawer({ open, onClose, settings, onChange }: Props) {
  const set = <K extends keyof SentientSettings>(k: K, v: SentientSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <Drawer open={open} onClose={onClose} title="Settings">
      <div style={fieldBox}>
        <label style={labelStyle}>Model</label>
        <select
          value={settings.model}
          onChange={(e) => set("model", e.target.value)}
          style={{
            width: "100%",
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
          }}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldBox}>
        <label style={labelStyle}>System prompt override</label>
        <textarea
          value={settings.systemPromptOverride}
          onChange={(e) => set("systemPromptOverride", e.target.value)}
          placeholder="Leave empty to use the default SENTIENT prompt."
          rows={6}
          style={{
            width: "100%",
            background: "#0a0a0a",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 10,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            resize: "vertical",
          }}
        />
      </div>

      <div style={fieldBox}>
        <label style={labelStyle}>Accent color</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="color"
            value={settings.accent}
            onChange={(e) => set("accent", e.target.value)}
            style={{
              width: 44,
              height: 32,
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              background: "transparent",
              cursor: "pointer",
            }}
          />
          <code style={{ color: "#aaa", fontSize: 12 }}>{settings.accent}</code>
        </div>
      </div>

      <div style={fieldBox}>
        <label style={labelStyle}>Density</label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              onClick={() => set("density", d)}
              style={{
                flex: 1,
                padding: "8px 10px",
                fontSize: 12,
                borderRadius: 8,
                background: settings.density === d ? settings.accent : "transparent",
                color: settings.density === d ? "#fff" : "#aaa",
                border: `1px solid ${settings.density === d ? settings.accent : "rgba(255,255,255,0.12)"}`,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

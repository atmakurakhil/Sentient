export type SentientSettings = {
  model: string;
  systemPromptOverride: string;
  accent: string; // hex
  density: "comfortable" | "compact";
};

export const DEFAULT_SETTINGS: SentientSettings = {
  model: "google/gemini-3-flash-preview",
  systemPromptOverride: "",
  accent: "#1e6dbf",
  density: "comfortable",
};

export const MODEL_OPTIONS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (fast, default)" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (deep reasoning)" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini" },
  { id: "openai/gpt-5", label: "GPT-5" },
];

export type McpConnector = {
  id: string;
  name: string;
  blurb: string;
  icon: string;
};

export const MCP_CATALOG: McpConnector[] = [
  { id: "notion", name: "Notion", blurb: "Pages & databases", icon: "◳" },
  { id: "linear", name: "Linear", blurb: "Issues & projects", icon: "◇" },
  { id: "figma", name: "Figma", blurb: "Files & frames", icon: "◭" },
  { id: "slack", name: "Slack", blurb: "Channels & threads", icon: "▤" },
  { id: "gmail", name: "Gmail", blurb: "Email & threads", icon: "✉" },
  { id: "github", name: "GitHub", blurb: "Repos & PRs", icon: "◉" },
  { id: "calendar", name: "Calendar", blurb: "Events & schedules", icon: "▦" },
  { id: "drive", name: "Drive", blurb: "Docs & files", icon: "▢" },
  { id: "posthog", name: "PostHog", blurb: "Analytics & flags", icon: "◈" },
  { id: "sentry", name: "Sentry", blurb: "Errors & traces", icon: "▼" },
];

export type SavedMap = {
  id: string;
  name: string;
  question: string;
  nodes: unknown[];
  edges: unknown[];
  strokes: unknown[];
  createdAt: number;
};

const KEYS = {
  settings: "sentient.settings.v1",
  mcp: "sentient.mcp.v1",
  maps: "sentient.maps.v1",
};

const safeParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadSettings = (): SentientSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(KEYS.settings), {}) };
};
export const saveSettings = (s: SentientSettings) => {
  localStorage.setItem(KEYS.settings, JSON.stringify(s));
};

export const loadMcp = (): Record<string, boolean> => {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(KEYS.mcp), {});
};
export const saveMcp = (m: Record<string, boolean>) => {
  localStorage.setItem(KEYS.mcp, JSON.stringify(m));
};

export const loadMaps = (): SavedMap[] => {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(KEYS.maps), [] as SavedMap[]);
};
export const saveMaps = (maps: SavedMap[]) => {
  localStorage.setItem(KEYS.maps, JSON.stringify(maps));
};

# SENTIENT — AI Reasoning Canvas

> **Built from scratch in one day. Won the hackathon.**

While other teams walked in with pre-built projects dressed up as hackathon submissions, this was written line by line on the day. No head start. No recycled code. Just a blank repo and an idea about what AI-assisted thinking should actually look like.

The result: a full-stack, real-time, collaborative AI reasoning canvas that streams structured thought maps from frontier models, lets you draw on top of them, expand any idea into sub-nodes, run thinking modes, share with teammates, and export in ten formats.

---

## What is SENTIENT?

SENTIENT is an **AI reasoning canvas**. You ask it a question — *What should our go-to-market strategy be?*, *How do I architect this system?*, *What are the risks of this decision?* — and it thinks visually.

Instead of a wall of text, the AI streams a **structured knowledge graph** in real time: concepts, tensions, evidence, and a final synthesis node. Every node lands on an infinite canvas you can explore, annotate, extend, and collaborate on with your team.

It's not a chatbot. It's not a notes app. It's what happens when you let a model show its work.

---

## The Hackathon Story

I showed up to the hackathon with nothing but an idea. Every other team had pre-built code — projects they'd been working on for weeks, repackaged for the day. I built SENTIENT from a blank file.

In one day I shipped:
- Real-time streaming AI map generation
- A full canvas with multiple node types, drawing tools, and keyboard shortcuts
- Sketch-to-nodes (draw something, AI converts it to a structured map)
- Collaborative editing with live sync via Supabase Realtime
- Voice mode
- Export to 10+ formats
- MCP connector UI (Notion, Linear, Figma, GitHub, Slack, and more)
- Auth, saved maps, and settings

It won.

---

## Features

### Core Canvas
- **AI map generation** — Ask any question, get a structured reasoning map streamed in real time (NDJSON over SSE)
- **Node types** — Concept, Tension, Evidence, Synthesis, Sticky note, Text block, Symbol
- **Clarifying questions** — Before building the map, SENTIENT asks for context to make it sharper
- **Double-click to add** — Drop a node anywhere on the canvas by double-clicking empty space
- **Drag handles to connect** — Draw edges between any two nodes manually

### AI Powers (per node)
- **Expand** — Right-click any node to branch it into 3–4 child nodes in an arc
- **Think modes** — Summarize, Critique, Brainstorm, or Devil's Advocate on any node
- **AI image generation** — Visual nodes auto-generate contextual images inline
- **Node detail drawer** — Click any node to open an AI-powered deep-dive panel
- **Sketch → Nodes** — Draw freehand on the canvas, hit "Refine", and AI converts your sketch into structured nodes

### Collaboration
- **Share maps** — Generate a shareable link with an invite token
- **Live sync** — Supabase Realtime pushes changes to every collaborator in real time
- **Assign nodes** — Tag any node to a collaborator
- **Status markers** — Mark nodes as in-progress, done, blocked

### AI Copilot (CopilotKit)
- Persistent sidebar that can read your entire canvas
- Add nodes by describing them in natural language ("Add a tension node about scaling costs")
- Clear the canvas, summarize the map, or extend ideas — all via conversation

### Voice Mode
- Dictate your question hands-free
- Synthesis nodes are read aloud when a map finishes building

### MCP Connectors
Toggle context from Notion, Linear, Figma, Slack, Gmail, GitHub, Google Calendar, Google Drive, PostHog, and Sentry — the AI grounds its reasoning in what these tools could provide.

### Export (10 formats)
| Format | What you get |
|---|---|
| PNG / JPEG | Canvas screenshot |
| SVG | Scalable vector |
| PDF | Print-ready document |
| Markdown | Structured notes |
| Plain text | Outline |
| HTML | Self-contained web page |
| JSON | Full graph data |
| CSV | Node list |
| Mermaid | Diagram-as-code |
| Clipboard | Markdown copy |

### Settings
- Model selector: Gemini 3 Flash (default), Gemini 3.1 Pro, Gemini 2.5 Flash/Pro, GPT-5 mini, GPT-5
- Custom system prompt override
- Accent color picker
- Comfortable / compact density

### Keyboard Shortcuts
| Key | Action |
|---|---|
| `N` | Add concept node at center |
| `S` | Add sticky note |
| `T` | Add text block |
| `P` | Toggle pen tool |
| `E` | Toggle eraser |
| `F` | Fit canvas to view |
| `Enter` | Chat with the AI |
| `⌘ + Enter` | Build a new map |
| `Delete / Backspace` | Delete selected node |

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | TanStack Start (React 19, SSR) |
| Canvas | ReactFlow |
| Styling | Tailwind CSS v4 + Radix UI |
| AI routing | Lovable AI Gateway (Gemini, GPT) |
| AI Copilot | CopilotKit |
| Auth + DB | Supabase |
| Realtime | Supabase Realtime (Postgres changes) |
| Deployment | Cloudflare Workers (Wrangler) |
| Streaming | Server-Sent Events (SSE), NDJSON |

---

## Running Locally

```bash
# Install dependencies
npm install

# Add your environment variables
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY

# Start the dev server
npm run dev
```

Open `http://localhost:3000`.

---

## How it Works

1. **You ask a question** — typed or dictated
2. **Clarify** — SENTIENT surfaces 2–3 context questions to sharpen the map
3. **Stream** — The server sends an SSE stream. Each line is a JSON node (`concept`, `tension`, `evidence`, or `synthesis`). Nodes land on the canvas as they arrive.
4. **Explore** — Click a node to dive deeper. Right-click to expand, critique, or brainstorm.
5. **Annotate** — Draw on the canvas, drop sticky notes, add symbols, connect nodes manually.
6. **Collaborate** — Share a link. Teammates join, edits sync live.
7. **Export** — Save as an image, document, or data file in whatever format you need.

---

## Architecture

```
src/
├── routes/
│   ├── index.tsx              # Landing / home
│   ├── canvas.tsx             # Main canvas route
│   └── api/
│       ├── sentient.ts        # Map generation (streaming NDJSON)
│       ├── sentient/chat.ts   # Follow-up chat (streaming)
│       ├── clarify.ts         # Pre-map clarifying questions
│       ├── expand.ts          # Node expansion
│       ├── think.ts           # Per-node thinking modes
│       ├── sketch.ts          # Sketch → nodes
│       ├── voice.ts           # Voice transcription
│       └── node/              # Per-node AI: chat, diagram, doc, image, roadmap, table
├── components/
│   └── sentient/              # Canvas, nodes, drawers, toolbar, voice
└── lib/
    └── sentient/              # Cloud sync, exports, storage, voice, share
```

---

## License

MIT

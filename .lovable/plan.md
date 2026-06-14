## Goal

Turn the canvas into a real editable workspace and make MCP a working integration (real connections, real tool calls), all per-user in Lovable Cloud with optional team collaboration.

---

## 1. Canvas features

### Inline node editing
- Make every reasoning node editable: click label/content → contenteditable input, blur or Enter saves.
- Persist edits to local React Flow state and (when a map is loaded from Cloud) write back to `saved_maps.nodes`.

### Manual node creation + connect
- Double-click empty canvas → create a blank `concept` node at cursor.
- Enable React Flow `onConnect` so drag from one node handle to another creates an edge.
- Toolbar button "Add node" with type picker (concept / evidence / tension / synthesis / note).

### Color / tag groups
- Each node gets an optional `color` (token-based: primary, accent, warn, mute, success) and `tags: string[]`.
- Right-click node → context menu: Edit, Recolor, Tag, Expand with AI, Delete.
- Update `nodes.tsx` to render the chosen color via design tokens (no raw hex).

### Expand node with AI
- New server route `POST /api/expand` takes `{ parentNode, mapContext }` and asks the model for 3 child nodes (NDJSON).
- Append children to canvas with edges from parent; auto-layout new nodes radially around parent.

### Team collaboration on a map
- New table `map_collaborators (map_id, user_id, role: viewer|editor)`.
- Owner can invite by email from a "Share" sheet on the map; lookup by email via a `find_user_by_email` server function (uses admin client).
- Update `saved_maps` RLS so collaborators can SELECT (any role) and UPDATE (editor role) via a `has_map_access(map_id, role)` SECURITY DEFINER function.
- Realtime: subscribe to `saved_maps` row updates; when nodes/edges change, merge into local state. (No CRDT — last-write-wins, fine for hackathon.)

---

## 2. MCP — real connections

Replace the mock `McpDrawer` with a working AI-SDK MCP client.

### Storage
- New table `mcp_connections`:
  - `id`, `user_id`, `name`, `url`, `transport ('http'|'sse')`,
  - `state ('ready'|'authenticating'|'failed')`, `auth_url`, `oauth_tokens jsonb`, `oauth_client jsonb`,
  - `created_at`, `updated_at`. RLS: per-user.

### Server functions (`src/lib/mcp/connections.functions.ts`, all `requireSupabaseAuth`)
- `listConnections()` → user's rows (without secrets).
- `createConnection({ name, url })` → builds an AI-SDK MCP client with OAuth provider, calls `client.tools()`. Returns `{ state, id, authUrl? }`. Closes the probe client.
- `deleteConnection({ id })`.
- `loadMcpTools(userId)` (server-only helper, not a server fn) → for each `ready` row, opens client, returns merged `{ tools, closeAll }` for use by `/api/sentient` and `/api/copilotkit`.

### OAuth
- Implement an `authProvider` backed by the row (load/save tokens + dynamic client metadata to Supabase via admin client).
- Route `GET /api/mcp/oauth/callback` finishes the flow, marks row `ready`, returns small success HTML.
- Route `GET /.well-known/oauth-client` serves CIMD metadata when origin is HTTPS.

### Wiring into model calls
- `/api/sentient` (map generation): load MCP tools, pass them to the streaming call (Vercel AI SDK `streamText` with `tools`). The model can call them; tool results are appended into the system context as evidence so the NDJSON nodes are grounded.
- `/api/copilotkit`: switch from raw OpenAIAdapter to the AI-SDK adapter so we can hand it the same merged tool set. Sidebar chat now invokes user's MCP tools live.
- Always close MCP clients in `finally`.

### UI — `McpDrawer` rewrite
- Defensive list (array fallback, friendly unauth state, retry).
- "Add server" form (name + URL) → calls `createConnection`, shows `authUrl` link if returned.
- Per-row status pill (ready / authenticating / failed), Disconnect button.
- "Use in next map" toggle stays, but now only enabled rows actually do anything.

---

## 3. Auth & onboarding (only what's missing for the above)
- If `/login` and `/onboarding` routes don't already exist, add them (email + Google via `lovable.auth`), gate `/`, `/memory`, MCP behind `_authenticated`.

---

## 4. Files

### New
- `src/components/sentient/NodeContextMenu.tsx`
- `src/components/sentient/ShareMapDialog.tsx`
- `src/lib/mcp/auth-provider.ts` (server-only)
- `src/lib/mcp/connections.functions.ts`
- `src/lib/mcp/load-tools.server.ts`
- `src/routes/api/expand.ts`
- `src/routes/api/mcp.oauth.callback.ts`
- `src/routes/.well-known.oauth-client.ts`

### Edited
- `src/components/sentient/SentientApp.tsx` — wire editing, dbl-click create, onConnect, context menu, expand, share button, realtime subscription.
- `src/components/sentient/nodes.tsx` — editable label/content, color variants, tag chips.
- `src/components/sentient/McpDrawer.tsx` — full rewrite against new server fns.
- `src/routes/api/sentient.ts` — switch to `streamText` with merged tools; still streams NDJSON-shaped output.
- `src/routes/api/copilotkit.$.ts` — AI-SDK adapter + injected MCP tools.
- `package.json` — add `@ai-sdk/mcp`.

### Migrations
- `mcp_connections` table + RLS.
- `map_collaborators` table + RLS.
- `has_map_access(map_id uuid, min_role text)` security-definer fn.
- Update `saved_maps` policies to allow collaborator SELECT/UPDATE.
- Enable realtime on `saved_maps`.

---

## 5. Out of scope (this round)
- Real-time multi-cursor / OT/CRDT — only row-level last-write-wins.
- Rich-text inside nodes — plain text only.
- MCP server allow-listing UI — any HTTPS URL allowed.
- Migrating any localStorage maps to Cloud.

---

## 6. Acceptance checks
- Double-click empty canvas → blank node appears, editable, savable.
- Drag handle-to-handle → edge appears.
- Right-click node → Expand → 3 new children appear within 4 s.
- Color/tag picker updates node visuals using design tokens.
- Owner shares a map by email → invitee sees it in their Memory canvas, can edit, and edits stream back via realtime.
- Add an MCP server URL → either becomes `ready` or returns an `authUrl`; after OAuth, status flips to `ready`.
- Generating a new map with a `ready` MCP connection enabled produces evidence nodes that reference data the tool returned.
- Copilot sidebar can call the same MCP tools (visible in tool calls panel).
- Logged-out users see a friendly empty state, never a crash.

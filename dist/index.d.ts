/**
 * Thin, fire-and-forget client for reporting site events (contact form
 * messages today, health checks later) to the Dehasoft control panel.
 * Uses the platform `fetch` — no dependencies, works in Node 18+, Next.js
 * route handlers/server actions, and edge runtimes alike.
 *
 * Every call resolves to a PanelAgentResponse instead of throwing — a
 * panel outage should never break the site embedding this agent.
 */
interface PanelAgentOptions {
    /** Base URL of the control panel, e.g. "https://panel.dehasoft.com" */
    panelUrl: string;
    /** Site-specific token, generated once on the site's detail page in the panel */
    token: string;
    /** Abort the request after this many milliseconds (default 5000) */
    timeoutMs?: number;
}
interface PanelAgentResponse {
    ok: boolean;
    status: number | null;
    error: string | null;
}
interface ContactMessagePayload {
    name?: string;
    email?: string;
    subject?: string;
    message: string;
}
interface PanelAgent {
    contactMessage(payload: ContactMessagePayload): Promise<PanelAgentResponse>;
}
declare function createPanelAgent(options: PanelAgentOptions): PanelAgent;
interface HealthCheckOptions {
    /** The same token used to create the panel agent — one secret, both directions */
    token: string;
    /** Reported back to the panel as-is, e.g. from package.json or an env var */
    appVersion?: string;
}
/**
 * Builds a Next.js Route Handler that answers the panel's outbound
 * health-check poll. Wire it up in app/api/health/route.ts:
 *
 *   export const GET = createHealthCheckHandler({ token: process.env.PANEL_AGENT_TOKEN! });
 *
 * Works in both the Node and Edge runtimes — no Node-only APIs.
 */
declare function createHealthCheckHandler(options: HealthCheckOptions): (request: Request) => Promise<Response>;

export { type ContactMessagePayload, type HealthCheckOptions, type PanelAgent, type PanelAgentOptions, type PanelAgentResponse, createHealthCheckHandler, createPanelAgent };

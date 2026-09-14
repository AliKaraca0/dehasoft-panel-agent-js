/**
 * Thin, fire-and-forget client for reporting site events (contact form
 * messages today, health checks later) to the Dehasoft control panel.
 * Uses the platform `fetch` — no dependencies, works in Node 18+, Next.js
 * route handlers/server actions, and edge runtimes alike.
 *
 * Every call resolves to a PanelAgentResponse instead of throwing — a
 * panel outage should never break the site embedding this agent.
 */

export interface PanelAgentOptions {
    /** Base URL of the control panel, e.g. "https://panel.dehasoft.com" */
    panelUrl: string;
    /** Site-specific token, generated once on the site's detail page in the panel */
    token: string;
    /** Abort the request after this many milliseconds (default 5000) */
    timeoutMs?: number;
}

export interface PanelAgentResponse {
    ok: boolean;
    status: number | null;
    error: string | null;
}

export interface ContactMessagePayload {
    name?: string;
    email?: string;
    subject?: string;
    message: string;
}

export interface PanelAgent {
    contactMessage(payload: ContactMessagePayload): Promise<PanelAgentResponse>;
}

const CONTACT_ENDPOINT = '/api/webhook/contact';

export function createPanelAgent(options: PanelAgentOptions): PanelAgent {
    return {
        contactMessage: (payload) => post(options, CONTACT_ENDPOINT, payload),
    };
}

export interface HealthCheckOptions {
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
export function createHealthCheckHandler(options: HealthCheckOptions) {
    return async function GET(request: Request): Promise<Response> {
        const auth = request.headers.get('Authorization') ?? '';
        const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';

        if (!constantTimeEqual(given, options.token)) {
            return Response.json({ message: 'Unauthorized.' }, { status: 401 });
        }

        return Response.json({
            status: 'ok',
            app_version: options.appVersion ?? null,
            runtime: `node ${typeof process !== 'undefined' ? process.version : 'edge'}`,
            timestamp: new Date().toISOString(),
        });
    };
}

/**
 * Avoids leaking token length/content through response-time differences.
 * No Node-only crypto import, so this runs in the Edge runtime too.
 */
function constantTimeEqual(a: string, b: string): boolean {
    if (a.length !== b.length || a.length === 0) {
        return false;
    }

    let mismatch = 0;

    for (let i = 0; i < a.length; i++) {
        mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return mismatch === 0;
}

async function post<Payload extends object>(
    options: PanelAgentOptions,
    endpoint: string,
    payload: Payload,
): Promise<PanelAgentResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

    try {
        const res = await fetch(`${options.panelUrl.replace(/\/$/, '')}${endpoint}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${options.token}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        if (res.ok) {
            return { ok: true, status: res.status, error: null };
        }

        const body = await res.text().catch(() => '');

        return { ok: false, status: res.status, error: body || res.statusText };
    } catch (error) {
        return {
            ok: false,
            status: null,
            error: error instanceof Error ? error.message : String(error),
        };
    } finally {
        clearTimeout(timeout);
    }
}

# @dehasoft/panel-agent

Thin client that reports site events (contact form messages) to the Dehasoft
control panel, and a handler that answers the panel's own health-check poll.
Zero dependencies — uses the platform `fetch`. Outbound calls never throw on
a panel outage; every call resolves to `{ ok, status, error }`.

## Install

```bash
npm install @dehasoft/panel-agent
```

## Next.js (Route Handler or Server Action)

```ts
import { createPanelAgent } from '@dehasoft/panel-agent';

const panelAgent = createPanelAgent({
    panelUrl: process.env.PANEL_AGENT_URL!,
    token: process.env.PANEL_AGENT_TOKEN!,
});

export async function POST(request: Request) {
    const data = await request.json();

    // fire-and-forget — don't await if you don't want the panel's
    // response time to affect the visitor's request
    panelAgent.contactMessage(data);

    return Response.json({ ok: true });
}
```

```env
PANEL_AGENT_URL=https://panel.dehasoft.com
PANEL_AGENT_TOKEN=the-site-specific-token-from-the-panel
```

## Plain Node

```ts
import { createPanelAgent } from '@dehasoft/panel-agent';

const agent = createPanelAgent({ panelUrl: '...', token: '...' });
const result = await agent.contactMessage({ name, email, subject, message });

if (!result.ok) {
    console.error('panel-agent:', result.error);
}
```

## Health check (panel → site)

This direction is reversed: the panel calls *your* site every few minutes to
check it's up. Answer it with the same token:

```ts
// app/api/health/route.ts
import { createHealthCheckHandler } from '@dehasoft/panel-agent';
import pkg from '../../../package.json';

export const GET = createHealthCheckHandler({
    token: process.env.PANEL_AGENT_TOKEN!,
    appVersion: pkg.version,
});
```

Then set the site's **Sağlık Kontrolü Adresi** in the panel to
`https://your-site.com/api/health`. Works in both the Node and Edge
runtimes — no Node-only APIs used.

## Where does the token come from?

Generate it in the control panel on the site's detail page, under
**Webhook**. It's shown once — store it as `PANEL_AGENT_TOKEN` right away.
The same token authenticates both directions: outbound `contactMessage()`
calls and the inbound health check above.

## Adding new event types

Each outbound event is one method on the object `createPanelAgent()`
returns — no breaking changes to existing calls when a new one is added.

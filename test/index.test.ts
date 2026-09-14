import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPanelAgent } from '../src/index';

describe('createPanelAgent', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reports success on a 2xx response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(new Response(null, { status: 201 })),
        );

        const agent = createPanelAgent({ panelUrl: 'https://panel.test', token: 'secret' });
        const response = await agent.contactMessage({ message: 'Merhaba' });

        expect(response).toEqual({ ok: true, status: 201, error: null });
    });

    it('reports failure on a non-2xx response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(new Response('Unauthorized.', { status: 401, statusText: 'Unauthorized' })),
        );

        const agent = createPanelAgent({ panelUrl: 'https://panel.test', token: 'bad' });
        const response = await agent.contactMessage({ message: 'Merhaba' });

        expect(response.ok).toBe(false);
        expect(response.status).toBe(401);
        expect(response.error).toBe('Unauthorized.');
    });

    it('never throws when the panel is unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

        const agent = createPanelAgent({ panelUrl: 'https://panel.test', token: 'secret' });
        const response = await agent.contactMessage({ message: 'Merhaba' });

        expect(response.ok).toBe(false);
        expect(response.status).toBeNull();
        expect(response.error).toBe('network down');
    });

    it('sends the bearer token and JSON body', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);

        const agent = createPanelAgent({ panelUrl: 'https://panel.test/', token: 'secret' });
        await agent.contactMessage({ name: 'Ayşe', message: 'Merhaba' });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://panel.test/api/webhook/contact');
        expect(init.headers.Authorization).toBe('Bearer secret');
        expect(JSON.parse(init.body)).toEqual({ name: 'Ayşe', message: 'Merhaba' });
    });
});

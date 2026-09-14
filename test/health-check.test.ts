import { describe, expect, it } from 'vitest';
import { createHealthCheckHandler } from '../src/index';

function requestWithToken(token: string | null): Request {
    const headers = new Headers();
    if (token !== null) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return new Request('https://ornek-site.com/api/health', { headers });
}

describe('createHealthCheckHandler', () => {
    it('responds ok with the correct token', async () => {
        const handler = createHealthCheckHandler({ token: 'secret', appVersion: '1.2.3' });
        const response = await handler(requestWithToken('secret'));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.status).toBe('ok');
        expect(body.app_version).toBe('1.2.3');
        expect(body.timestamp).toBeDefined();
    });

    it('rejects a missing token', async () => {
        const handler = createHealthCheckHandler({ token: 'secret' });
        const response = await handler(requestWithToken(null));

        expect(response.status).toBe(401);
    });

    it('rejects a wrong token', async () => {
        const handler = createHealthCheckHandler({ token: 'secret' });
        const response = await handler(requestWithToken('wrong'));

        expect(response.status).toBe(401);
    });

    it('rejects a token of different length without throwing', async () => {
        const handler = createHealthCheckHandler({ token: 'a-much-longer-secret-token' });
        const response = await handler(requestWithToken('short'));

        expect(response.status).toBe(401);
    });
});

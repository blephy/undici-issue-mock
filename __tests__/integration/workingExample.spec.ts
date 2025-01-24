import { errors } from 'undici';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createNodeServer, HOST, PORT } from '../setup.js';
import { Fetcher } from '../../src/Fetcher.js';

describe('[integration] with a real server', () => {
  let server: ReturnType<typeof createNodeServer>;
  const origin = `http://${HOST}:${PORT}/`;

  let fetcher: Fetcher<typeof origin>;

  beforeAll(() => {
    server = createNodeServer();

    fetcher = new Fetcher({
      baseUrl: origin,
      throwOnError: true,
    });
  });

  afterAll(() => {
    server.close();
  });

  it('should work on 200', async (): Promise<void> => {
    const response = await fetcher.fetch('/', {
      method: 'POST',
    });

    const body = await response.json();

    expect(body).toStrictEqual({ data: 'hello' });
  });

  it('should work on 400', async (): Promise<void> => {
    await expect(async () => {
      await fetcher.fetch('/error', {
        method: 'POST',
      });
    }).rejects.toThrow(
      new errors.ResponseError('Response Error', 400, {
        body: { data: 'error occurred' },
        headers: expect.objectContaining({
          connection: 'keep-alive',
          'content-length': '25',
          'content-type': 'application/json',
          'keep-alive': 'timeout=5',
        }),
      }),
    );
  });
});

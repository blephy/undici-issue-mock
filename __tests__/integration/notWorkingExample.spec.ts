import { errors, interceptors, getGlobalDispatcher, MockAgent } from 'undici';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HOST, PORT } from '../setup.js';
import { Fetcher } from '../../src/Fetcher.js';

describe('[integration] with a real server', () => {
  let server: MockAgent;
  const origin = `http://${HOST}:${PORT}`;

  let fetcher: Fetcher<typeof origin>;

  beforeAll(() => {
    server = new MockAgent();

    Fetcher.SetGlobalDispatcher(server);

    fetcher = new Fetcher({
      baseUrl: origin,
      throwOnError: true,
    });
  });

  afterAll(() => {
    server.close();

    Fetcher.SetGlobalDispatcher(Fetcher['Dispatcher']);
  });

  it('should work on 200', async (): Promise<void> => {
    server
      .get(origin)
      .intercept({
        path: '/',
        method: 'POST',
      })
      .replyContentLength()
      .reply(201, { data: 'hello' })
      .times(1);

    const response = await fetcher.fetch('/', {
      dispatcher: getGlobalDispatcher().compose(interceptors.responseError({ throwOnError: true })),
      method: 'POST',
    });

    const body = await response.json();

    expect(body).toStrictEqual({ data: 'hello' });
    expect(server.pendingInterceptors()).toHaveLength(0);
  });

  it('should work on 400 but this does not', async (): Promise<void> => {
    server
      .get(origin)
      .intercept({
        path: '/error',
        method: 'POST',
      })
      .replyContentLength()
      .reply(400, { data: 'error occurred' })
      .times(1);

    await expect(async () => {
      await fetcher.fetch('/error', {
        dispatcher: getGlobalDispatcher().compose(
          interceptors.responseError({ throwOnError: true }),
        ),
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
    expect(server.pendingInterceptors()).toHaveLength(0);
  });
});

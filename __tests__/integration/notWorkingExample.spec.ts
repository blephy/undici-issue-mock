import { errors, MockAgent } from 'undici';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { origin } from '../setup.js';
import { Fetcher } from '../../src/Fetcher.js';
import { Logger } from '../utils/Logger.js';
import { errorExpected } from '../utils/errorExpected.js';

describe('[integration] with a real server', () => {
  let server: MockAgent;

  let fetcher: Fetcher<typeof origin>;

  beforeAll(() => {
    server = new MockAgent();

    Fetcher.SetGlobalDispatcher(server);

    fetcher = new Fetcher({
      baseUrl: origin,
      throwOnError: true,
      logger: new Logger(),
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
        method: 'POST',
      });
    }).rejects.toThrow(errorExpected);
    expect(server.pendingInterceptors()).toHaveLength(0);
  });
});

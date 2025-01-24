import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createNodeServer, origin } from '../setup.js';
import { Fetcher } from '../../src/Fetcher.js';
import { Logger } from '../utils/Logger.js';
import { errorExpected } from '../utils/errorExpected.js';

describe('[integration] with a real server', () => {
  let server: ReturnType<typeof createNodeServer>;

  let fetcher: Fetcher<typeof origin>;

  beforeAll(() => {
    server = createNodeServer();

    fetcher = new Fetcher({
      baseUrl: origin,
      throwOnError: true,
      logger: new Logger(),
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
    }).rejects.toThrow(errorExpected);
  });
});

import type { HeadersInit } from 'undici';

interface FetcherOptionsInterface<BaseUrl extends string | undefined = undefined> {
  logger?:
    | {
        info: (...args: Array<any>) => void;
        error: (...args: Array<any>) => void;
        debug: (...args: Array<any>) => void;
      }
    | undefined;
  baseUrl?: BaseUrl;
  headers?: HeadersInit;
  throwOnError?: boolean;
}

export type { FetcherOptionsInterface };

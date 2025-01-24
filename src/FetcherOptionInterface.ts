import type { HeadersInit, interceptors } from 'undici';

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
  cache?: interceptors.CacheInterceptorOpts | false;
  retry?: interceptors.RetryInterceptorOpts | false;
}

export type { FetcherOptionsInterface };

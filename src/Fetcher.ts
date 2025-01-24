import { performance } from 'node:perf_hooks';

import CacheableLookup from 'cacheable-lookup';
import { Agent, fetch, getGlobalDispatcher, interceptors, setGlobalDispatcher } from 'undici';

import type { Dispatcher, HeadersInit, Response, Headers } from 'undici';
import type { FetcherOptionsInterface } from './FetcherOptionInterface.js';

class Fetcher<BaseUrl extends string | undefined = undefined> {
  public static GetGlobalDispatcher: () => Dispatcher = getGlobalDispatcher;

  public static SetGlobalDispatcher: <DispatcherImplementation extends Dispatcher>(
    dispatcher: DispatcherImplementation,
  ) => void = setGlobalDispatcher;

  public static Interceptors: typeof interceptors = interceptors;

  private static Dispatcher: Dispatcher;

  private static DnsCache: CacheableLookup;

  private static readonly DefaultOptions: Required<Omit<FetcherOptionsInterface, 'logger'>> = {
    // @ts-expect-error -- noop
    baseUrl: undefined,
    cache: false,
    // @see https://github.com/nodejs/undici/discussions/2963
    retry: false,
    throwOnError: true,
    headers: {},
  };

  public readonly baseUrl: BaseUrl;

  public readonly interceptors: Array<Dispatcher.DispatcherComposeInterceptor>;

  public headers: HeadersInit;

  public readonly options: Required<
    Omit<FetcherOptionsInterface<BaseUrl>, 'logger' | 'baseUrl' | 'headers'>
  >;

  protected logger: FetcherOptionsInterface['logger'] | undefined;

  static {
    Fetcher.DnsCache = new CacheableLookup({});
    Fetcher.Dispatcher = new Agent({
      connect: {
        lookup: Fetcher.DnsCache.lookup.bind(Fetcher.DnsCache),
        keepAlive: true,
        timeout: 10_000,
        allowH2: true,
      },
      bodyTimeout: 60_000,
      headersTimeout: 60_000,
      allowH2: true,
      keepAliveTimeout: 10_000,
      pipelining: 10,
      connections: 50,
    });

    setGlobalDispatcher(Fetcher.Dispatcher);
  }

  public constructor(options?: FetcherOptionsInterface<BaseUrl>) {
    this.logger = options?.logger;

    const { headers, baseUrl, ...otherOptions } = options ?? {};
    const {
      headers: defaultHeaders,
      baseUrl: defaultBaseUrl,
      ...defaultOtherOptions
    } = Fetcher.DefaultOptions;
    this.headers = { ...defaultHeaders, ...headers };
    this.baseUrl = baseUrl ?? defaultBaseUrl;
    this.options = { ...defaultOtherOptions, ...otherOptions };

    const interceptorsCompose: Array<Dispatcher.DispatcherComposeInterceptor> = [];

    if (this.options.retry !== false) {
      interceptorsCompose.push(Fetcher.Interceptors.retry(this.options.retry));
    }
    if (this.options.cache !== false) {
      interceptorsCompose.push(Fetcher.Interceptors.cache(this.options.cache));
    }
    if (this.options.throwOnError) {
      interceptorsCompose.push(
        Fetcher.Interceptors.responseError({
          throwOnError: true,
        }),
      );
    }

    this.interceptors = interceptorsCompose;
  }

  public static HeadersInitToPlainObject(
    headers?: HeadersInit | null | undefined,
  ): Record<string, string> {
    let oHeaders: Record<string, string> = {};

    if (
      headers !== null &&
      typeof headers === 'object' &&
      'entries' in headers &&
      typeof headers.entries === 'function'
    ) {
      oHeaders = Fetcher.HeadersInstanceToPlainObject(headers as Headers);
    } else if (Array.isArray(headers)) {
      for (const [name, value] of headers) {
        if (typeof name === 'string' && name.length > 0 && value !== undefined) {
          oHeaders[name] = value;
        }
      }
    } else if (headers !== undefined) {
      // @ts-expect-error -- this is OK
      oHeaders = headers;
    }

    return oHeaders;
  }

  public static HeadersInstanceToPlainObject(headers: Response['headers']): Record<string, string> {
    const newObject: Record<string, string> = {};

    for (const [key, value] of headers.entries()) {
      newObject[key] = value;
    }
    return newObject;
  }

  /**
   * cloneWithHeaders
   *
   * @description clone this fetcher and set headers of the new Fetcher instance by new ones.
   *
   * @param {HeadersInit} headers headers to set as global in the new instance
   * @param {object | undefined} options options
   * @param {boolean} options.merge merge headers with the previous global instance headers (default true)
   */
  public cloneWithHeaders(headers: HeadersInit, options?: { merge?: boolean }): Fetcher<BaseUrl> {
    const constructor = this.constructor as new (
      options?: FetcherOptionsInterface<BaseUrl>,
    ) => Fetcher<BaseUrl>;

    const newFetcher = new constructor({
      ...this.options,
      headers: this.headers,
      logger: this.logger,
      baseUrl: this.baseUrl,
    });

    newFetcher.withHeaders(headers, options);

    return newFetcher;
  }

  /**
   * withHeaders
   *
   * @description set headers of the Fetcher instance by new ones.
   * If options.merge is false, it will not keep headers of the current Fetcher.
   *
   * @param {HeadersInit | undefined} headers headers to set as global
   * @param {object | undefined} options options
   * @param {boolean} options.merge merge headers with global headers (default true)
   */
  public withHeaders(headers: HeadersInit, options: { merge?: boolean } = {}): this {
    const userOptions = { merge: true, ...options };

    this.headers = userOptions.merge
      ? {
          ...Fetcher.HeadersInitToPlainObject(this.headers),
          ...Fetcher.HeadersInitToPlainObject(headers),
        }
      : headers;

    return this;
  }

  /**
   * fetch
   *
   * @description create a request and returns a response object.
   *
   * @returns Response
   */
  public async fetch(input: string | URL, init?: Parameters<typeof fetch>[1]): Promise<Response> {
    const url: string =
      this.baseUrl === undefined || this.baseUrl.length === 0
        ? input.toString()
        : new URL(input, this.baseUrl).toString();
    const requestName = `${init?.method ?? 'GET'} ${url}`;
    const t0 = performance.now();

    this.logger?.info(`Requesting ${requestName}`);

    const headers: HeadersInit = {
      ...Fetcher.HeadersInitToPlainObject(this.headers),
      ...Fetcher.HeadersInitToPlainObject(init?.headers),
    };

    try {
      const response: Response = await fetch(url, {
        dispatcher:
          this.interceptors.length > 0
            ? getGlobalDispatcher().compose(this.interceptors)
            : getGlobalDispatcher(),
        ...init,
        headers: headers,
      });

      const t1 = performance.now();

      this.logger?.info(
        `Request ${requestName} succeed with status ${response.status} in ${t1 - t0}ms`,
      );

      return response;
    } catch (error) {
      const t1 = performance.now();

      if (error !== null && typeof error === 'object') {
        let statusCode;

        // normally not happening
        if ('statusCode' in error) {
          statusCode = error.statusCode;

          this.logger?.error(
            error,
            `Request ${requestName} failed with status ${statusCode} after ${t1 - t0}ms`,
          );

          throw error;
          // happening when request options.throwOnError is true
          // the error thrown is a TypeError which had a cause error
        } else if ('cause' in error) {
          const cause = error.cause;

          if (cause !== null && typeof cause === 'object' && 'statusCode' in cause) {
            statusCode = cause.statusCode;

            this.logger?.error(
              error.cause,
              `Request ${requestName} failed with status ${statusCode} after ${t1 - t0}ms`,
            );
          }

          throw error.cause;
        }

        this.logger?.error(error, `Request ${requestName} failed after ${t1 - t0}ms`);

        // happening when request options.throwOnError is false
        // no network / dns error / etc ...
        throw error;
      }

      this.logger?.error(error, `Request ${requestName} failed after ${t1 - t0}ms`);

      // should not happen. this is a guard
      throw error;
    }
  }

  /**
   * fetchData
   *
   * @description create a request and automatically parse and returns the body as string | unknown.
   *
   * @returns body parsed as string | unknown
   */
  public async fetchData<T extends string | unknown>(
    input: string | URL,
    init?: Parameters<typeof fetch>[1],
  ): Promise<T> {
    const response: Response = await this.fetch(input, init);

    return await this.parseBody(response);
  }

  protected async parseBody<T extends string | unknown>(response: Response): Promise<T> {
    const bodyString = await response.text();

    try {
      this.logger?.debug('trying parsing json content');

      return JSON.parse(bodyString) as T;
    } catch {
      this.logger?.debug('body is not json, returning it as string');

      return bodyString as T;
    }
  }
}

export { Fetcher };

import { performance } from 'node:perf_hooks';

import { Agent, fetch, getGlobalDispatcher, interceptors, setGlobalDispatcher } from 'undici';

import type { Dispatcher, HeadersInit, Response } from 'undici';
import type { FetcherOptionsInterface } from './FetcherOptionInterface.js';

class Fetcher<BaseUrl extends string | undefined = undefined> {
  public static Interceptors: typeof interceptors = interceptors;

  private static Dispatcher: Dispatcher;

  private static readonly DefaultOptions: Required<Omit<FetcherOptionsInterface, 'logger'>> = {
    // @ts-expect-error -- noop
    baseUrl: undefined,
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
    Fetcher.Dispatcher = new Agent();

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

    if (this.options.throwOnError) {
      interceptorsCompose.push(
        Fetcher.Interceptors.responseError({
          throwOnError: true,
        }),
      );
    }

    this.interceptors = interceptorsCompose;
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
      ...this.headers,
      ...init?.headers,
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
}

export { Fetcher };

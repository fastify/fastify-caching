/// <reference types='node' />

import { FastifyPluginCallback } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    cache: AbstractCacheCompliantObject;
    cacheSegment: string;
  }

  interface FastifyReply {
    /**
     * This method allows setting of the `expires` header.
     *
     * @link [reply.expires() documentation](https://github.com/fastify/fastify-caching#replyexpiresdate)
     *
     * @param date A regular `Date` object, or a valid date string according to [RFC 2616 section 14.21](https://datatracker.ietf.org/doc/html/rfc2616#section-14.21).
     */
    expires(date?: Date): this;

    /**
     * This method allows setting of the `etag` header.
     *
     * @link [reply.etag() documentation](https://github.com/fastify/fastify-caching#replyetagstring-number)
     *
     * @param tag Any arbitrary string that is valid for HTTP headers.
     * @param timeToLive The time must be specified in milliseconds. The default lifetime, when the parameter is not specified, is `3600000`.
     */
    etag(tag?: string, timeToLive?: number): this;
  }
}

/**
 * @link [`abstract-cache` protocol documentation](https://github.com/jsumners/abstract-cache#protocol)
 */
export interface AbstractCacheCompliantObject {
  get(
    key: string | { id: string; segment: string },
    callback?: (error: unknown, result: unknown) => void
  ): void;
  set(
    key: string | { id: string; segment: string },
    value: unknown,
    timeToLive: number,
    callback?: (error: unknown, result: unknown) => void
  ): void;
}

export interface Privacy {
  NOCACHE: 'no-cache';
  PRIVATE: 'private';
  PUBLIC: 'public';
}

/**
 * @link [`fastify-caching` options documentation](https://github.com/fastify/fastify-caching#options)
 */
export interface FastifyCachingPluginOptions {
  /**
   * An [abstract-cache](https://www.npmjs.com/package/abstract-cache) protocol compliant cache object.
   * Note: the plugin requires a cache instance to properly support the ETag mechanism.
   * Therefore, if a falsy value is supplied the default will be used.
   *
   * - Default value: `abstract-cache.memclient`
   */
  cache?: AbstractCacheCompliantObject;

  /**
   * The segment identifier to use when communicating with the cache.
   *
   * - Default value: `fastify-caching`
   */
  cacheSegment?: string;

  /**
   * A value, in seconds, for the max-age the resource may be cached.
   * When this is set, and privacy is not set to no-cache, then ', max-age=<value>'
   * will be appended to the cache-control header.
   *
   * - Default value: `undefined`
   */
  expiresIn?: number;

  /**
   * It can be set to any string that is valid for a cache-response-directive as
   * defined by [RFC 2616](https://datatracker.ietf.org/doc/html/rfc2616#section-14.9).
   *
   * - Default value: `undefined`
   *
   * @link [MDN Cache-Control - Response Directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#response_directives)
   *
   * @example
   * const fastifyCaching = require('fastify-caching');
   *
   * // Disabling client side caching of all routes.
   * fastify.register(fastifyCaching, { privacy: fastifyCaching.privacy.NOCACHE });
   */
  privacy?: string;

  /**
   * A value, in seconds, for the length of time the resource is fresh and may be
   * held in a shared cache (e.g. a CDN). Shared caches will ignore max-age when
   * this is specified, though browsers will continue to use max-age. Should be
   * used with expiresIn, not in place of it. When this is set, and privacy is set
   * to public, then ', s-maxage=<value>' will be appended to the cache-control header.
   *
   * - Default value: `undefined`
   */
  serverExpiresIn?: number;
}

declare const fastifyCaching: FastifyPluginCallback<FastifyCachingPluginOptions> & {
  privacy: Privacy;
};

declare const privacy: {
  privacy: Privacy;
};

export default fastifyCaching;
export { fastifyCaching, privacy };

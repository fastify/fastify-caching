import Fastify, { FastifyReply } from 'fastify';
import { expectAssignable, expectError, expectType } from 'tsd';
import fastifyCaching, {
  AbstractCacheCompliantObject,
  FastifyCachingPluginOptions,
} from '..';

const fastify = Fastify({ logger: true });

const cachingOptions: FastifyCachingPluginOptions = {
  privacy: fastifyCaching.privacy.PUBLIC,
  expiresIn: 300,
  cacheSegment: 'fastify-caching',
};
expectAssignable<FastifyCachingPluginOptions>(cachingOptions);

fastify.register(fastifyCaching, cachingOptions);

expectType<AbstractCacheCompliantObject>(fastify.cache);
expectType<AbstractCacheCompliantObject['get']>(fastify.cache.get);
expectType<AbstractCacheCompliantObject['set']>(fastify.cache.set);
expectType<string>(fastify.cacheSegment);
// expectType<number>(fastify.etagMaxLife);

fastify.get('/one', async (request, reply) => {
  expectType<(tag?: string, timeToLive?: number) => FastifyReply>(reply.etag);
  expectType<(date?: Date) => FastifyReply>(reply.expires);

  expectType<FastifyReply>(reply.etag('hello', 6000));
  expectType<FastifyReply>(reply.expires(new Date(Date.now() + 6000)));

  return { message: 'one' };
});

fastify.get('/two', async (request, reply) => {
  expectType<FastifyReply>(
    reply.etag('hello', 6000).expires(new Date(Date.now() + 6000))
  );

  return { message: 'two' };
});

// We register a new instance that should trigger a typescript error.
const shouldErrorApp = Fastify({ logger: true });

const badCachingOptions = {
  privacy: fastifyCaching.privacy.PRIVATE,
  expiresIn: 'a string instead of a number of second',
  cacheSegment: 'fastify-caching',
};

expectError(shouldErrorApp.register(fastifyCaching, badCachingOptions));

fastify.get('/three', async (request, reply) => {
  expectType<unknown>(
    fastify.cache.get('well-known')
  );
  expectAssignable<Promise<{ item: string; stored: number; ttl: number; } | null>>(
    fastify.cache.get<string>('well-known')
  );
  expectType<void>(
    fastify.cache.get<string>('well-known', (err, value) => {
      expectType<unknown>(err);
      expectAssignable<{ item: string; stored: number; ttl: number; } | null>(value);
    })
  );

  return { message: 'two' };
});

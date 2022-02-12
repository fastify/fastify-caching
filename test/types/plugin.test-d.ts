import Fastify, { FastifyReply } from 'fastify';
import { expectAssignable, expectError, expectType } from 'tsd';
import fastifyCaching, {
  AbstractCacheCompliantObject,
  FastifyCachingPluginOptions,
} from '../..';

const fastify = Fastify({ logger: true });

const cachingOptions: FastifyCachingPluginOptions = {
  privacy: fastifyCaching.privacy.PUBLIC,
  expiresIn: 300,
  cacheSegment: 'fastify-caching',
};
expectAssignable<FastifyCachingPluginOptions>(cachingOptions);

fastify.register(fastifyCaching, cachingOptions);

expectType<AbstractCacheCompliantObject>(fastify.cache);
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

const badCachingOptions = {
  privacy: fastifyCaching.privacy.PRIVATE,
  expiresIn: 'a string instead of a number of second',
  cacheSegment: 'fastify-caching',
};

// We register a new instance that should trigger a typescript error.
const shouldErrorApp = Fastify({ logger: true })

expectError(shouldErrorApp.register(fastifyCaching, badCachingOptions));

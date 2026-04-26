import Fastify, { FastifyReply } from 'fastify'
import { expect } from 'tstyche'
import fastifyCaching, {
  AbstractCacheCompliantObject,
  FastifyCachingPluginOptions,
} from '..'

const fastify = Fastify({ logger: true })

const cachingOptions: FastifyCachingPluginOptions = {
  privacy: fastifyCaching.privacy.PUBLIC,
  expiresIn: 300,
  cacheSegment: 'fastify-caching',
}
expect(cachingOptions).type.toBeAssignableTo<FastifyCachingPluginOptions>()

fastify.register(fastifyCaching, cachingOptions)

expect(fastify.cache).type.toBe<AbstractCacheCompliantObject>()
expect(fastify.cache.get).type.toBe<AbstractCacheCompliantObject['get']>()
expect(fastify.cache.set).type.toBe<AbstractCacheCompliantObject['set']>()
expect(fastify.cacheSegment).type.toBe<string>()

fastify.get('/one', async (_request, reply) => {
  expect(reply.etag).type.toBe<(tag?: string, timeToLive?: number) => FastifyReply>()
  expect(reply.expires).type.toBe<(date?: Date) => FastifyReply>()

  expect(reply.etag('hello', 6000)).type.toBe<FastifyReply>()
  expect(reply.expires(new Date(Date.now() + 6000))).type.toBe<FastifyReply>()

  return { message: 'one' }
})

fastify.get('/two', async (_request, reply) => {
  expect(
    reply.etag('hello', 6000).expires(new Date(Date.now() + 6000))
  ).type.toBe<FastifyReply>()

  return { message: 'two' }
})

// We register a new instance that should trigger a typescript error.
const shouldErrorApp = Fastify({ logger: true })

const badCachingOptions = {
  privacy: fastifyCaching.privacy.PRIVATE,
  expiresIn: 'a string instead of a number of second',
  cacheSegment: 'fastify-caching',
}

expect(shouldErrorApp.register).type.not.toBeCallableWith(fastifyCaching, badCachingOptions)

fastify.get('/three', async () => {
  expect(fastify.cache.get('well-known')).type.toBeAssignableTo<Promise<unknown>>()

  expect(fastify.cache.get<string>('well-known')).type.toBeAssignableTo<
    Promise<{ item: string; stored: number; ttl: number; } | null>
  >()

  const result = fastify.cache.get<string>('well-known', (err, value) => {
    expect(err).type.toBe<unknown>()
    expect(value).type.toBeAssignableTo<{ item: string; stored: number; ttl: number; } | null>()
  })

  expect(result).type.toBe<void>()

  return { message: 'two' }
})

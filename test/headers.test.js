'use strict'

const { test } = require('tap')
const Fastify = require('fastify')
const plugin = require('../plugin')

test('decorators get added', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/', (req, reply) => {
    t.ok(reply.etag)
    reply.send()
  })

  await fastify.ready()

  await fastify.inject({
    method: 'GET',
    path: '/'
  })
})

test('decorators add headers', async (t) => {
  t.plan(2)

  const tag = '123456'

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/', (req, reply) => {
    reply
      .etag(tag)
      .send()
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers.etag)
  t.equal(response.headers.etag, tag)
})

test('sets etag header for falsy argument', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/', (req, reply) => {
    reply
      .etag()
      .send()
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers.etag)
})

test('sets no-cache header', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  await fastify.register(plugin, { privacy: plugin.privacy.NOCACHE })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'no-cache')
})

test('sets private with max-age header', async (t) => {
  t.plan(2)

  const opts = {
    privacy: plugin.privacy.PRIVATE,
    expiresIn: 300
  }

  const fastify = Fastify()
  await fastify.register(plugin, opts)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'private, max-age=300')
})

test('sets public with max-age and s-maxage header', async (t) => {
  t.plan(2)

  const opts = {
    privacy: plugin.privacy.PUBLIC,
    expiresIn: 300,
    serverExpiresIn: 12345
  }

  const fastify = Fastify()
  await fastify.register(plugin, opts)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'public, max-age=300, s-maxage=12345')
})

test('only sets max-age and ignores s-maxage with private header', async (t) => {
  t.plan(2)

  const opts = {
    privacy: plugin.privacy.PRIVATE,
    expiresIn: 300,
    serverExpiresIn: 12345
  }

  const fastify = Fastify()
  await fastify.register(plugin, opts)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'private, max-age=300')
})

test('s-maxage is optional with public header', async (t) => {
  t.plan(2)

  const opts = {
    privacy: plugin.privacy.PUBLIC,
    expiresIn: 300
  }

  const fastify = Fastify()
  await fastify.register(plugin, opts)

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'public, max-age=300')
})

test('sets no-store with max-age header', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  await fastify.register(plugin, { privacy: 'no-store', expiresIn: 300 })

  fastify.get('/', (req, reply) => {
    reply.send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers['cache-control'])
  t.equal(response.headers['cache-control'], 'no-store, max-age=300')
})

test('sets the expires header', async (t) => {
  t.plan(2)

  const now = new Date()

  const fastify = Fastify()
  await fastify.register(plugin, { privacy: plugin.privacy.NOCACHE })

  fastify.get('/', (req, reply) => {
    reply
      .expires(now)
      .send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers.expires)
  t.equal(response.headers.expires, now.toUTCString())
})

test('sets the expires header to a falsy value', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  await fastify.register(plugin, { privacy: plugin.privacy.NOCACHE })

  fastify.get('/', (req, reply) => {
    reply
      .expires()
      .send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.notOk(response.headers.expires)
})

test('sets the expires header to a custom value', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  await fastify.register(plugin, { privacy: plugin.privacy.NOCACHE })

  fastify.get('/', (req, reply) => {
    reply
      .expires('foobar')
      .send({ hello: 'world' })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/'
  })
  t.ok(response.headers.expires)
  t.equal(response.headers.expires, 'foobar')
})

'use strict'

const { test } = require('node:test')
const plugin = require('..')

const Fastify = require('fastify')
const { setTimeout: sleep } = require('node:timers/promises')

test('cache property gets added to instance', async (t) => {
  t.plan(2)

  const fastify = Fastify()
  await fastify.register(plugin)
  await fastify.ready()

  t.assert.ok(fastify.cache)
  t.assert.ok(fastify.cache.set)
})

test('cache is usable', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  await fastify.register(async (instance, options) => {
    instance.addHook('onRequest', async function (req, reply) {
      t.assert.ifError(instance[Symbol.for('fastify-caching.registered')])
    })
  })
  await fastify.register(plugin)

  fastify.addHook('onRequest', async function (req, reply) {
    t.assert.strictEqual(this[Symbol.for('fastify-caching.registered')], true)
  })

  fastify.get('/one', (req, reply) => {
    fastify.cache.set('one', { one: true }, 1000, (err) => {
      if (err) return reply.send(err)
      reply.redirect('/two')
    })
  })

  fastify.get('/two', (req, reply) => {
    fastify.cache.get('one', (err, obj) => {
      t.assert.ifError(err)
      t.assert.strictEqual(obj.item, { one: true })
      reply.send()
    })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  if (
    response.statusCode > 300 &&
    response.statusCode < 400 &&
    response.headers.location
  ) {
    await fastify.inject({
      method: 'GET',
      path: response.headers.location
    })
  }
})

test('cache is usable with function as plugin default options input', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  await fastify.register(async (instance, options) => {
    instance.addHook('onRequest', async function (req, reply) {
      t.assert.failure(instance[Symbol.for('fastify-caching.registered')])
    })
  })
  await fastify.register(plugin, () => () => {})

  fastify.addHook('onRequest', async function (req, reply) {
    t.assert.strictEqual(this[Symbol.for('fastify-caching.registered')], true)
  })

  fastify.get('/one', (req, reply) => {
    fastify.cache.set('one', { one: true }, 1000, (err) => {
      if (err) return reply.send(err)
      reply.redirect('/two')
    })
  })

  fastify.get('/two', (req, reply) => {
    fastify.cache.get('one', (err, obj) => {
      t.assert.ifError(err)
      t.assert.strictEqual(obj.item, { one: true })

      reply.send()
    })
  })

  await fastify.ready()

  const response = await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  if (
    response.statusCode > 300 &&
    response.statusCode < 400 &&
    response.headers.location
  ) {
    await fastify.inject({
      method: 'GET',
      path: response.headers.location
    })
  }
})

test('getting cache item with error returns error', async (t) => {
  t.plan(1)

  const mockCache = {
    get: (info, callback) => callback(new Error('cache.get always errors')),
    set: (key, value, ttl, callback) => callback()
  }

  const fastify = Fastify()
  await fastify.register(plugin, { cache: mockCache })

  fastify.get('/one', (req, reply) => {
    fastify.cache.set('one', { one: true }, 1000, (err) => {
      if (err) return reply.send(err)
      return reply.etag('123456').send({ hello: 'world' })
    })
  })

  fastify.get('/two', (req, reply) => {
    fastify.cache.get('one', (err, obj) => {
      t.assert.failure(err)
      t.assert.failure(obj)
    })
  })

  await fastify.ready()

  await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  const response = await fastify.inject({
    method: 'GET',
    path: '/two',
    headers: {
      'if-none-match': '123456'
    }
  })
  t.assert.strictEqual(response.statusCode, 500)
})

test('etags get stored in cache', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/one', (req, reply) => {
    reply.etag('123456').send({ hello: 'world' })
  })

  await fastify.ready()

  await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  const response = await fastify.inject({
    method: 'GET',
    path: '/one',
    headers: {
      'if-none-match': '123456'
    }
  })
  t.assert.strictEqual(response.statusCode, 304)
})

test('etag cache life is customizable', async (t) => {
  t.plan(4)

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/one', function (req, reply) {
    reply
      // We set a cache lifetime of 50 milliseconds
      .etag('123456', 50)
      .send({ hello: 'world' })
  })

  fastify.ready((err) => {
    t.assert.ifError(err)

    fastify.inject(
      {
        method: 'GET',
        path: '/one'
      },
      (err, _response) => {
        t.assert.ifError(err)

        // We wait 70 milliseconds that the cache expires
        setTimeout(() => {
          fastify.inject(
            {
              method: 'GET',
              path: '/one',
              headers: {
                'if-none-match': '123456'
              }
            },
            (err, response) => {
              t.assert.ifError(err)
              t.assert.strictEqual(response.statusCode, 200)
            }
          )
        }, 70)
      }
    )
  })
  await sleep(100)
})

test('returns response payload', async (t) => {
  t.plan(1)

  const fastify = Fastify()
  await fastify.register(plugin)

  fastify.get('/one', (req, reply) => {
    reply.etag('123456', 300).send({ hello: 'world' })
  })

  await fastify.ready()

  await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  const response = await fastify.inject({
    method: 'GET',
    path: '/one'
  })

  t.assert.deepStrictEqual(JSON.parse(response.payload), { hello: 'world' })
})

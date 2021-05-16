'use strict'

const http = require('http')
const test = require('tap').test
const plugin = require('../plugin')

const fastify = require('fastify')

test('cache property gets added to instance', (t) => {
  t.plan(2)
  const instance = fastify()
  instance
    .register(plugin)
    .ready(() => {
      t.ok(instance.cache)
      t.ok(instance.cache.set)
    })
})

test('cache is usable', (t) => {
  t.plan(3)
  const instance = fastify()
  instance
    .register((i, o, n) => {
      i.addHook('onRequest', function (req, reply, done) {
        t.notOk(i[Symbol.for('fastify-caching.registered')])
        done()
      })
      n()
    })
    .register(plugin)

  instance.addHook('preParsing', function (req, reply, payload, done) {
    t.equal(this[Symbol.for('fastify-caching.registered')], true)
    done(null, payload)
  })

  instance.get('/one', (req, reply) => {
    instance.cache.set('one', { one: true }, 100, (err) => {
      if (err) return reply.send(err)
      reply.redirect('/two')
    })
  })

  instance.get('/two', (req, reply) => {
    instance.cache.get('one', (err, obj) => {
      if (err) t.threw(err)
      t.same(obj.item, { one: true })
      reply.send()
    })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}/one`
    http
      .get(address, (res) => {
        if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
          http.get(`http://127.0.0.1:${portNum}${res.headers.location}`, (res) => {}).on('error', t.threw)
        }
      })
      .on('error', t.threw)
  })
})

test('cache is usable with function as plugin default options input', (t) => {
  t.plan(3)
  const instance = fastify()
  instance
    .register((i, o, n) => {
      i.addHook('onRequest', function (req, reply, done) {
        t.notOk(i[Symbol.for('fastify-caching.registered')])
        done()
      })
      n()
    })
    .register(plugin, () => () => { })

  instance.addHook('preParsing', function (req, reply, payload, done) {
    t.equal(this[Symbol.for('fastify-caching.registered')], true)
    done(null, payload)
  })

  instance.get('/one', (req, reply) => {
    instance.cache.set('one', { one: true }, 100, (err) => {
      if (err) return reply.send(err)
      reply.redirect('/two')
    })
  })

  instance.get('/two', (req, reply) => {
    instance.cache.get('one', (err, obj) => {
      if (err) t.threw(err)
      t.same(obj.item, { one: true })
      reply.send()
    })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}/one`
    http
      .get(address, (res) => {
        if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
          http.get(`http://127.0.0.1:${portNum}${res.headers.location}`, (res) => { }).on('error', t.threw)
        }
      })
      .on('error', t.threw)
  })
})

test('getting cache item with error returns error', (t) => {
  t.plan(1)
  const mockCache = {
    get: (info, callback) => callback(new Error('cache.get always errors')),
    set: (key, value, ttl, callback) => callback()
  }

  const instance = fastify()
  instance.register(plugin, { cache: mockCache })

  instance.get('/one', (req, reply) => {
    instance.cache.set('one', { one: true }, 1000, (err) => {
      if (err) return reply.send(err)
      return reply
        .etag('123456')
        .send({ hello: 'world' })
    })
  })

  instance.get('/two', (req, reply) => {
    instance.cache.get('one', (err, obj) => {
      t.notOk(err)
      t.notOk(obj)
    })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}/one`

    http
      .get(address, (res) => {
        const opts = {
          host: '127.0.0.1',
          port: portNum,
          path: '/two',
          headers: {
            'if-none-match': '123456'
          }
        }
        http.get(opts, (res) => {
          t.equal(res.statusCode, 500)
        }).on('error', t.threw)
      })
      .on('error', t.threw)
  })
})

test('etags get stored in cache', (t) => {
  t.plan(1)
  const instance = fastify()
  instance.register(plugin)

  instance.get('/one', (req, reply) => {
    reply
      .etag('123456')
      .send({ hello: 'world' })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}/one`
    http
      .get(address, (res) => {
        const opts = {
          host: '127.0.0.1',
          port: portNum,
          path: '/one',
          headers: {
            'if-none-match': '123456'
          }
        }
        http
          .get(opts, (res) => {
            t.equal(res.statusCode, 304)
          })
          .on('error', t.threw)
      })
      .on('error', t.threw)
  })
})

test('etag cache life is customizable', (t) => {
  t.plan(1)
  const instance = fastify()
  instance.register(plugin)

  instance.get('/one', function (req, reply) {
    reply
      .etag('123456', 50)
      .send({ hello: 'world' })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}/one`
    http
      .get(address, (res) => {
        const opts = {
          host: '127.0.0.1',
          port: portNum,
          path: '/one',
          headers: {
            'if-none-match': '123456'
          }
        }
        setTimeout(() => {
          http
            .get(opts, (res) => {
              t.equal(res.statusCode, 200)
            })
            .on('error', t.threw)
        }, 150)
      })
      .on('error', t.threw)
  })
})

test('returns response payload', (t) => {
  t.plan(1)
  const instance = fastify()
  instance.register(plugin)

  instance.get('/one', (req, reply) => {
    reply
      .etag('123456', 300)
      .send({ hello: 'world' })
  })

  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const opts = {
      host: '127.0.0.1',
      port: portNum,
      path: '/one'
    }
    http
      .get(opts, (res) => {
        let payload = ''
        res.on('data', (chunk) => {
          payload += chunk
        }).on('end', () => {
          t.same(JSON.parse(payload), { hello: 'world' })
        }).on('error', t.threw)
      })
      .on('error', t.threw)
  })
})

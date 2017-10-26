'use strict'

const http = require('http')
const test = require('tap').test
const plugin = require('../plugin')
const fastify = require('fastify')

test('decorators get added', (t) => {
  t.plan(2)
  const instance = fastify()
  instance.register(plugin, (err) => {
    if (err) t.threw(err)
  })
  instance.get('/', (req, reply) => {
    t.ok(reply.lastModified)
    t.ok(reply.etag)
    reply.send()
  })
  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}`
    http.get(address, (res) => {}).on('error', (err) => t.threw(err))
  })
})

test('decorators add headers', (t) => {
  t.plan(4)
  const now = new Date()
  const tag = '123456'
  const instance = fastify()
  instance.register(plugin, (err) => {
    if (err) t.threw(err)
  })
  instance.get('/', (req, reply) => {
    reply
      .lastModified(now)
      .etag(tag)
      .send()
  })
  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}`
    http.get(address, (res) => {
      t.ok(res.headers['last-modified'])
      t.is(res.headers['last-modified'], now.toUTCString())
      t.ok(res.headers['etag'])
      t.is(res.headers['etag'], tag)
    }).on('error', (err) => t.threw(err))
  })
})

test('sets no-cache header', (t) => {
  t.plan(2)
  const instance = fastify()
  instance.register(plugin, {privacy: plugin.privacy.NOCACHE}, (err) => {
    if (err) t.threw(err)
  })
  instance.get('/', (req, reply) => {
    reply.send({hello: 'world'})
  })
  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}`

    http.get(address, (res) => {
      t.ok(res.headers['cache-control'])
      t.is(res.headers['cache-control'], 'no-cache')
    }).on('error', (err) => t.threw(err))
  })
})

test('sets private with max-age header', (t) => {
  t.plan(2)
  const instance = fastify()
  const opts = {
    privacy: plugin.privacy.PRIVATE,
    expiresIn: 300
  }
  instance.register(plugin, opts, (err) => {
    if (err) t.threw(err)
  })
  instance.get('/', (req, reply) => {
    reply.send({hello: 'world'})
  })
  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}`

    http.get(address, (res) => {
      t.ok(res.headers['cache-control'])
      t.is(res.headers['cache-control'], 'private, max-age=300')
    }).on('error', (err) => t.threw(err))
  })
})

test('sets no-store with max-age header', (t) => {
  t.plan(2)
  const instance = fastify()
  instance.register(plugin, {privacy: 'no-store', expiresIn: 300}, (err) => {
    if (err) t.threw(err)
  })
  instance.get('/', (req, reply) => {
    reply.send({hello: 'world'})
  })
  instance.listen(0, (err) => {
    if (err) t.threw(err)
    instance.server.unref()
    const portNum = instance.server.address().port
    const address = `http://127.0.0.1:${portNum}`

    http.get(address, (res) => {
      t.ok(res.headers['cache-control'])
      t.is(res.headers['cache-control'], 'no-store, max-age=300')
    }).on('error', (err) => t.threw(err))
  })
})

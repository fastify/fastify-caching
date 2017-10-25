'use strict'

const http = require('http')
const test = require('tap').test
const plugin = require('../plugin')

const fastify = require('fastify')

test('cache property gets added to instance', (t) => {
  t.plan(2)
  const instance = fastify()
  instance.register(plugin, (err) => {
    if (err) t.threw(err)

    t.ok(instance.cache)
    t.ok(instance.cache.set)
  })
})

test('cache is usable', (t) => {
  t.plan(1)
  const instance = fastify()
  instance.register(plugin, (err) => {
    if (err) t.threw(err)
  })

  instance.get('/one', (req, reply) => {
    instance.cache.set('one', {one: true}, 100, (err) => {
      if (err) return reply.send(err)
      reply.redirect('/two')
    })
  })

  instance.get('/two', (req, reply) => {
    instance.cache.get('one', (err, obj) => {
      if (err) t.threw(err)
      t.deepEqual(obj.item, {one: true})
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

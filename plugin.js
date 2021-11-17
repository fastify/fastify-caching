'use strict'

/* eslint no-prototype-builtins: 0 */

const fp = require('fastify-plugin')
const uidSafe = require('uid-safe')
const abstractCache = require('abstract-cache')

const defaultOptions = {
  expiresIn: undefined,
  serverExpiresIn: undefined,
  privacy: undefined,
  cache: undefined,
  cacheSegment: 'fastify-caching'
}

function cachingExpires (date) {
  if (!date) return this
  this.header('Expires', (Date.prototype.isPrototypeOf(date)) ? date.toUTCString() : date)
  return this
}

function etag (value, lifetime) {
  if (value) {
    this.header('ETag', value)
  } else {
    this.header('ETag', uidSafe.sync(18))
  }
  this._etagLife = Number.isInteger(lifetime) ? lifetime : 3600000
  return this
}

function etagHandleRequest (req, res, next) {
  if (!req.headers['if-none-match']) return next()
  const etag = req.headers['if-none-match']
  this.cache.get({ id: etag, segment: this.cacheSegment }, (err, cached) => {
    if (err) return next(err)
    if (cached && cached.item) {
      return res.status(304).send()
    }
    next()
  })
}

function etagOnSend (req, res, payload, next) {
  const etag = res.getHeader('etag')
  if (!etag || !res._etagLife) return next()
  this.cache.set(
    { id: etag, segment: this.cacheSegment },
    true,
    res._etagLife,
    (err) => next(err, payload)
  )
}

function fastifyCachingPlugin (instance, options, next) {
  let _options
  if (Function.prototype.isPrototypeOf(options)) {
    _options = Object.assign({}, defaultOptions)
  } else {
    _options = Object.assign({}, defaultOptions, options)
  }

  if (!_options.cache) _options.cache = abstractCache()

  if (_options.privacy) {
    // https://tools.ietf.org/html/rfc2616#section-14.9.4
    let value = _options.privacy
    if (_options.privacy.toLowerCase() !== 'no-cache' && _options.expiresIn) {
      value = `${_options.privacy}, max-age=${_options.expiresIn}`
    }

    if (_options.privacy !== undefined && _options.privacy.toLowerCase() === 'public' && _options.serverExpiresIn) {
      value += `, s-maxage=${_options.serverExpiresIn}`
    }

    instance.addHook('onRequest', (req, res, next) => {
      res.header('Cache-control', value)
      next()
    })
  }

  instance.decorate('cache', _options.cache)
  instance.decorate('cacheSegment', _options.cacheSegment)
  instance.decorate('etagMaxLife', _options.etagMaxLife)
  instance.decorateReply('etag', etag)
  instance.decorateReply('expires', cachingExpires)
  instance.addHook('onRequest', etagHandleRequest)
  instance.addHook('onSend', etagOnSend)

  instance[Symbol.for('fastify-caching.registered')] = true
  next()
}

module.exports = fp(fastifyCachingPlugin, {
  fastify: '^3.0.0',
  name: 'fastify-caching'
})

module.exports.privacy = {
  NOCACHE: 'no-cache',
  PUBLIC: 'public',
  PRIVATE: 'private'
}

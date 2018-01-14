'use strict'

const fp = require('fastify-plugin')
const uidSafe = require('uid-safe')
const defaultOptions = {
  expiresIn: undefined,
  privacy: undefined,
  cache: require('abstract-cache')(),
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
  this.cache.get({id: etag, segment: this.cacheSegment}, (err, cached) => {
    if (err) return next(err)
    if (cached && cached.item) {
      res.statusCode = 304
      return res.end()
    }
    next()
  })
}

function etagOnSend (fastifyRequest, fastifyReply, payload, next) {
  const etag = fastifyReply.res.getHeader('etag')
  if (!etag || !fastifyReply._etagLife) return next()
  this.cache.set(
    {id: etag, segment: this.cacheSegment},
    true,
    fastifyReply._etagLife,
    next
  )
}

function fastifyCachingPlugin (instance, options, next) {
  let _options
  if (Function.prototype.isPrototypeOf(options)) {
    _options = Object.assign({}, defaultOptions)
  } else {
    _options = Object.assign({}, defaultOptions, options)
  }

  if (!_options.cache) _options.cache = defaultOptions.cache

  if (_options.privacy) {
    // https://tools.ietf.org/html/rfc2616#section-14.9.4
    let value = _options.privacy
    if (_options.privacy.toLowerCase() !== 'no-cache' && _options.expiresIn) {
      value = `${_options.privacy}, max-age=${_options.expiresIn}`
    }

    instance.addHook('preHandler', (fastifyReq, fastifyReply, next) => {
      fastifyReply.header('Cache-control', value)
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

  next()
}

module.exports = fp(fastifyCachingPlugin, {
  fastify: '>=0.39.1',
  name: 'fastify-caching'
})

module.exports.privacy = {
  NOCACHE: 'no-cache',
  PUBLIC: 'public',
  PRIVATE: 'private'
}

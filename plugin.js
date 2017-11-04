'use strict'

const fp = require('fastify-plugin')
const uidSafe = require('uid-safe')
const defaultOptions = {
  expiresIn: undefined,
  privacy: undefined,
  cache: require('@jsumners/memcache')()
}

function plugin (instance, options, next) {
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

  instance.decorateReply('etag', function (value, lifetime) {
    if (value) {
      this.header('ETag', value)
    } else {
      this.header('ETag', uidSafe.sync(18))
    }
    this.res._etagLife = Number.isInteger(lifetime) ? lifetime : 3600000
    return this
  })

  instance.decorateReply('expires', function (date) {
    if (!date) return this
    this.header('Expires', (Date.prototype.isPrototypeOf(date)) ? date.toUTCString() : date)
    return this
  })

  instance.decorate('cache', _options.cache)

  instance.decorate('etagMaxLife', _options.etagMaxLife)

  instance.addHook('onRequest', function (req, res, next) {
    if (!req.headers['if-none-match']) return next()
    const etag = req.headers['if-none-match']
    this.cache.get(etag, (err, cached) => {
      if (err) return next(err)
      if (cached && cached.item) {
        res.statusCode = 304
        return res.end()
      }
      next()
    })
  })

  instance.addHook('onResponse', function (res, next) {
    if (!res.hasHeader('etag') || !res._etagLife) return next()
    this.cache.set(res.getHeader('etag'), true, res._etagLife, next)
  })

  next()
}

module.exports = fp(plugin, '>=0.32.0')

module.exports.privacy = {
  NOCACHE: 'no-cache',
  PUBLIC: 'public',
  PRIVATE: 'private'
}

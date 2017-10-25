'use strict'

const fp = require('fastify-plugin')
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

  if (_options.privacy) {
    // https://tools.ietf.org/html/rfc2616#section-14.9.4
    let value = _options.privacy
    if (_options.privacy.toLowerCase() !== 'no-cache' && _options.expiresIn) {
      value = `${_options.privacy}; max-age=${_options.expiresIn}`
    }

    instance.addHook('preHandler', (fastifyReq, fastifyReply, next) => {
      fastifyReply.header('Cache-control', value)
      next()
    })
  }

  instance.decorateReply('lastModified', function (date) {
    if (!date) return this
    this.header('Last-Modified', (Date.prototype.isPrototypeOf(date)) ? date.toUTCString() : date)
    return this
  })

  // TODO: handle 'If-None-Match' header in request with server caching.
  instance.decorateReply('etag', function (value) {
    this.header('ETag', value)
    return this
  })

  instance.decorate('cache', _options.cache)

  next()
}

module.exports = fp(plugin, '>=0.15.0')

module.exports.privacy = {
  NOCACHE: 'no-cache',
  PUBLIC: 'public',
  PRIVATE: 'private'
}

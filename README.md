# @fastify/caching

[![CI](https://github.com/fastify/fastify-caching/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fastify/fastify-caching/actions/workflows/ci.yml)
[![NPM version](https://img.shields.io/npm/v/@fastify/caching.svg?style=flat)](https://www.npmjs.com/package/@fastify/caching)
[![neostandard javascript style](https://img.shields.io/badge/code_style-neostandard-brightgreen?style=flat)](https://github.com/neostandard/neostandard)

*@fastify/caching* is a plugin for the [Fastify](http://fastify.dev/) framework
that provides server-side caching and mechanisms for manipulating HTTP cache headers according to
[RFC 2616 §14.9](https://tools.ietf.org/html/rfc2616#section-14.9).

This plugin fully supports Fastify's encapsulation. Therefore, routes that
should have differing cache settings should be registered within different
contexts.

In addition to providing header manipulation, the plugin also decorates the
server instance with an object that can be used for caching items. **Note:**
the default cache should not be used in a "production" environment. It is
an LRU, in-memory cache that is capped at 100,000 items. It is *highly*
recommended that a full-featured cache object be supplied, e.g.
[abstract-cache-redis][acache-redis].

[acache-redis]: https://www.npmjs.com/package/abstract-cache-redis

## Install
```
npm i @fastify/caching
```

### Compatibility
| Plugin version | Fastify version |
| ---------------|-----------------|
| `^9.x`         | `^5.x`          |
| `^8.x`         | `^4.x`          |
| `^6.x`         | `^3.x`          |
| `^4.x`         | `^2.x`          |
| `^1.x`         | `^1.x`          |


Please note that if a Fastify version is out of support, then so are the corresponding versions of this plugin
in the table above.
See [Fastify's LTS policy](https://github.com/fastify/fastify/blob/main/docs/Reference/LTS.md) for more details.

## Example

This example shows using the plugin to disable client-side caching of all
routes.

```js
const http = require('node:http')
const fastify = require('fastify')()
const fastifyCaching = require('@fastify/caching')

fastify.register(
  fastifyCaching,
  {privacy: fastifyCaching.privacy.NOCACHE},
  (err) => { if (err) throw err }
)

fastify.get('/', (req, reply) => {
  reply.send({hello: 'world'})
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err

  http.get('http://127.0.0.1:3000/', (res) => {
    console.log(res.headers['cache-control'])
  })
})
```

This example shows how to register the plugin such that it only provides
a server-local cache. It will not set any cache control headers on responses.
It also shows how to retain a reference to the cache object so that it can
be re-used.

```js
const IORedis = require('ioredis')
const redis = new IORedis({host: '127.0.0.1'})
const abcache = require('abstract-cache')({
  useAwait: false,
  driver: {
    name: 'abstract-cache-redis', // must be installed via `npm i`
    options: {client: redis}
  }
})

const fastify = require('fastify')()
fastify
  .register(require('@fastify/redis'), {client: redis})
  .register(require('@fastify/caching'), {cache: abcache})

fastify.get('/', (req, reply) => {
  fastify.cache.set('hello', {hello: 'world'}, 10000, (err) => {
    if (err) return reply.send(err)
    reply.send({hello: 'world'})
  })
})

fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
})
```

## API

### Options

*@fastify/caching* accepts the options object:

```js
{
  privacy: 'value',
  expiresIn: 300,
  cache: {get, set},
  cacheSegment: 'segment-name'
}
```

+ `privacy` (Default: `undefined`): can be set to any string that is valid
for a *cache-response-directive* as defined by RFC 2616.
+ `expiresIn` (Default: `undefined`): a value, in seconds, for the *max-age* the
resource may be cached. When this is set, and `privacy` is not set to `no-cache`,
then `', max-age=<value>'` will be appended to the `cache-control` header.
+ `cache` (Default: `abstract-cache.memclient`): an [abstract-cache][acache]
protocol-compliant cache object. Note: the plugin requires a cache instance to
properly support the ETag mechanism. Therefore, if a falsy value is supplied
the default will be used.
+ `cacheSegment` (Default: `'@fastify/caching'`): segment identifier to use when
communicating with the cache.
+ `serverExpiresIn` (Default: `undefined`): a value, in seconds, for the length of time the resource is fresh and may be held in a shared cache (e.g. a CDN). Shared caches will ignore max-age when this is specified, though browsers will continue to use max-age. Should be used with expiresIn, not in place of it. When this is set, and `privacy` is set to `public`,  then `', s-maxage=<value>'` will be appended to the `cache-control` header.

[acache]: https://www.npmjs.com/package/abstract-cache

### `reply.etag(string, number)`

This method allows setting of the `etag` header. It accepts any arbitrary
string. Be sure to supply a string that is valid for HTTP headers.

If a tag string is not supplied then [uid-safe][uid-safe] will be used to
generate a tag. This operation will be performed ***synchronously***. It is
recommended to always supply a value to this method to avoid this operation.

All incoming requests to paths affected by this plugin will be inspected for
the `if-none-match` header. If the header is present, the value will be used
to lookup the tag within the cache associated with this plugin. If the tag is
found, then the response will end with a 304 status code sent to
the client.

Tags will be cached according to the second parameter. If the second parameter
is supplied, and it is an integer, then it will be used as the time to cache
the etag for generating 304 responses. The time must be specified in
milliseconds. The default lifetime, when the parameter is not specified, is
`3600000`.

[uid-safe]: https://www.npmjs.com/package/uid-safe

### `reply.expires(date)`

This method allows setting of the `expires` header. It accepts a regular `Date`
object or a string that is a valid date string according to
[RFC 2616 §14.21][sec14.21].

[sec14.21]: https://tools.ietf.org/html/rfc2616#section-14.21

## License

Licensed under [MIT](./LICENSE).

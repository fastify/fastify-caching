# fastify-caching

*fastify-caching* is a plugin for the [Fastify](http://fastify.io/) framework
that provides mechanisms for manipulating HTTP cache headers according to
[RFC 2616 §14.9](https://tools.ietf.org/html/rfc2616#section-14.9).

This plugin fully supports Fastify's encapsulation. Therefore, routes that
should have differing cache settings should be registered withing different
contexts.

In addition to providing header manipulation, the plugin also decorates the
server instance with an object that can be used for caching items.

## Example

This example shows using the plugin to disable client side caching of all
routes.

```js
const http = require('http')
const fastify = require('fastify')
const fastifyCaching = require('fastify-caching')

fastify.register(
  fastifyCaching,
  {privacy: fastifyCaching.privacy.NOCACHE},
  (err) => { if (err) throw err }
)

fastify.get('/', (req, reply) => {
  reply
    .lastModified(new Date())
    .send({hello: 'world'})
})

fastify.listen(3000, (err) => {
  if (err) throw err

  http.get('http://127.0.0.1:3000/', (res) => {
    console.log(res.headers['cache-control'])
    console.log(res.headers['last-modified'])
  })
})
```

This example shows how to register the plugin such that it only provides
a server-local cache. It will not set any cache control headers on responses.

```js
const fastify = require('fastify')
const fastifyCaching = require('fastify-caching')

fastify.register(
  fastifyCaching,
  (err) => { if (err) throw err }
)

fastify.get('/', (req, reply) => {
  fastify.cache.set('hello', {hello: 'world'}, 10000, (err) => {
    if (err) return reply.send(err)
    reply.send({hello: 'world'})
  })
})

fastify.listen(3000, (err) => {
  if (err) throw err
})
```

## API

### Options

*fastify-caching* accepts the options object:

```js
{
  privacy: 'value',
  expiresIn: 300,
  cache: {get, set}
}
```

+ `privacy` (Default: `undefined`): can be set to any string that is valid
for a *cache-response-directive* as defined by RFC 2616.
+ `expiresIn` (Default: `undefined`): a value, in seconds, for the *max-age* the
resource may be cached. When this is set, and `privacy` is not set to `no-cache`,
then `'; max-age=<value>'` will be appended to the `cache-control` header.
+ `cache` (Default: instance of [@jsumners/memcache][jsmemcache]): a
[Catbox (v7)][catbox] protocol compliant cache object.

[jsmemcache]: https://www.npmjs.com/package/@jsumners/memcache
[catbox]: https://github.com/hapijs/catbox/tree/v7.1.5

### `reply.lastModified(date)`

This method allows setting of the `last-modified` header. It accepts a regular
`Date` object, or a string that is a valid date string according to the RFC.

### `reply.etag(string)`

This method allows setting of the `etag` header. It accepts any arbitrary
string. Be sure to supply a string that is valid for HTTP headers.

## License

[MIT License](http://jsumners.mit-license.org/)

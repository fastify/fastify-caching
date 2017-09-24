# fastify-caching

*fastify-caching* is a plugin for the [Fastify](http://fastify.io/) framework
that provides mechanisms for manipulating HTTP cache headers according to
[RFC 2616 §14.9](https://tools.ietf.org/html/rfc2616#section-14.9).

This plugin fully supports Fastify's encapsulation. Therefore, routes that
should have differing cache settings should be registered withing different
contexts.

## Example

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

## API

### Options

*fastify-caching* accepts the options object:

```js
{
  privacy: 'value',
  expiresIn: 300
}
```

+ `privacy` (Default: `undefined`): can be set to any string that is valid
for a *cache-response-directive* as defined by RFC 2616.
+ `expiresIn` (Default: `undefined`): a value, in seconds, for the *max-age* the
resource may be cached. When this is set, and `privacy` is not set to `no-cache`,
then `'; max-age=<value>'` will be appended to the `cache-control` header.

### `reply.lastModified(date)`

This method allows setting of the `last-modified` header. It accepts a regular
`Date` object, or a string that is a valid date string according to the RFC.

### `reply.etag(string)`

This method allows setting of the `etag` header. It accepts any arbitrary
string. Be sure to supply a string that is valid for HTTP headers.

## License

[MIT License](http://jsumners.mit-license.org/)

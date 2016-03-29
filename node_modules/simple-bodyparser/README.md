# simple-bodyparser

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

Gets the whole content in the request body as a property to request object

### Install

```sh
$ npm install simple-bodyparser
```

## API

```js
var bodyparser = require('simple-bodyparser');
```

### bodyparser(options)

This middleware adds a `req.body` property which contains the request body with encoding defaulting to UTF-8

#### Options
- `encoding` property sets the encoding type, defaulting to UTF-8.

## Example

```js
var bodyparser = require('simple-bodyparser');
var app = require('express')();

app.use(bodyparser());
app.use(function(req, res, next){
  var body = req.body
});
```

## License

[MIT](LICENSE)


[npm-image]: https://img.shields.io/npm/v/simple-bodyparser.svg?style=flat-square
[npm-url]: https://npmjs.org/package/simple-bodyparser
[github-tag]: http://img.shields.io/github/tag/cosmosgenius/simple-bodyparser.svg?style=flat-square
[github-url]: https://github.com/cosmosgenius/simple-bodyparser/tags
[travis-image]: https://img.shields.io/travis/cosmosgenius/simple-bodyparser.svg?style=flat-square
[travis-url]: https://travis-ci.org/cosmosgenius/simple-bodyparser
[coveralls-image]: https://img.shields.io/coveralls/cosmosgenius/simple-bodyparser.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/cosmosgenius/simple-bodyparser?branch=master
[license-image]: http://img.shields.io/npm/l/simple-bodyparser.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/simple-bodyparser.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/simple-bodyparser

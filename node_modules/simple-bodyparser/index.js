/*jslint node: true */
'use strict';

module.exports = function(options) {
    options = options || {};
    var encoding = options.encoding || 'utf8';

    return function(req, res, next) {
        var data = '';
        req.setEncoding(encoding);
        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            req.body = data ? data : null;
            next();
        });
    };
};
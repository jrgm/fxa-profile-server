/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const url = require('url');
const util = require('util');

const Hapi = require('hapi');
const Boom = Hapi.error;
const gryphon = require('gryphon');

const config = require('./config').root();
const logger = require('./logging').getLogger('fxa.server');
const request = require('./request');

exports.create = function createServer() {
  var server = Hapi.createServer(
    config.server.host,
    config.server.port,
    {
      debug: false
    }
  );

  const PUBLIC_URL = url.parse(config.publicUrl);

  server.auth.scheme('gryphon', function() {
    return {
      authenticate: function(req, reply) {
        var auth = req.headers.authorization;
        var url = config.oauth.url + '/verify';
        logger.verbose('checking auth', auth);
        if (!auth || auth.indexOf('Gryphon') !== 0) {
          return reply(Boom.unauthorized('Gryphon signature missing'));
        }
        var opts = {
          host: PUBLIC_URL.hostname,
          port: PUBLIC_URL.port
        };
        var pubkey = gryphon.authenticate(req.raw.req, opts);
        if (!pubkey) {
          return reply(Boom.unauthorized('Bad Gryphon signature'));
        }
        request.post({
          url: url,
          json: {
            pubkey: pubkey
          }
        }, function(err, resp, body) {
          if (err) {
            return reply(err);
          }
          if (body.code >= 400) {
            return reply(Boom.unauthorized(body.message));
          }
          logger.verbose('Gryphon pubkey valid', body);
          reply(null, {
            credentials: body
          });
        });
      }
    };
  });

  server.auth.strategy('oauth', 'gryphon');

  server.route(require('./routing'));

  server.on('request', function(req, evt, tags) {
    if (tags.error && util.isError(evt.data)) {
      var err = evt.data;
      if (err.isBoom && err.output.statusCode < 500) {
        // a 4xx error, so its not our fault. not an ERROR level log
        logger.warn('%d response: %s', err.output.statusCode, err.message);
      } else {
        logger.critical(err);
      }
    }
  });

  // response logging
  server.on('response', function(req) {
    logger.info(
      '%s %s - %d (%dms)',
      req.method.toUpperCase(),
      req.path,
      req.response.statusCode,
      Date.now() - req.info.received
    );
  });

  return server;
};

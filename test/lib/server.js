/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const url = require('url');

const gryphon = require('gryphon');

const config = require('../../lib/config');
const version = config.get('api.version');
const P = require('../../lib/promise');
const Server = require('../../lib/server');

function request(options) {
  var server = Server.create();
  var deferred = P.defer();
  server.inject(options, deferred.resolve.bind(deferred));
  return deferred.promise;
}

function opts(options) {
  if (typeof options === 'string') {
    options = { url: options };
  }
  return options;
}

exports.post = function post(options) {
  options = opts(options);
  options.method = 'POST';
  return request(options);
};

exports.get = function get(options) {
  options = opts(options);
  options.method = 'GET';
  return request(options);
};

const KEYS = gryphon.keys();
const PUBLIC_URL = url.parse(config.get('publicUrl'));

function sign(req, opts) {
  if (!opts) {
    opts = KEYS;
  }
  console.log(PUBLIC_URL);
  var parts = {};
  parts.path = req.url;
  parts.hostname = PUBLIC_URL.hostname;
  parts.port = PUBLIC_URL.port;
  parts.method = 'POST';
  var header = gryphon.header(parts, opts);
  req.headers = req.headers || {};
  req.headers.authorization = header;
  return req;
}

var api = {};
Object.keys(exports).forEach(function(key) {
  api[key] = function api(req, options) {
    req = opts(req);
    req.url = '/v' + version + req.url;
    return exports[key](sign(req, options));
  };
});

exports.api = api;

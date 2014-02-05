/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

module.exports = {
  method: 'GET',
  path: '/',
  handler: function index(req, reply) {
    reply('ahh');
  }
};
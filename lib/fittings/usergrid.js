/****************************************************************************
 The MIT License (MIT)

 Copyright (c) 2015 Apigee Corporation

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/
'use strict';

var debug = require('debug')('pipes');
var _ = require('lodash');
var UG = require('usergrid-objects');

/*
 (note: attributes are a hash. but for queries, attributes may be a string)
 Available actions:
 all

 delete: attributes (uuid | name)
 find: attributes (uuid | name)

 create: attributes
 update: attributes
 deleteAll: attributes
 destroyAll: attributes
 findBy: attributes, limit
 findOrCreate: attributes
 first: attributes
 */

// defaults output -> url
module.exports = function create(fittingDef) {

  var c = fittingDef.config;
  var config = {
    URI: c.uri,
    orgName: c.organization,
    appName: c.application,
    clientId: c.clientId,
    clientSecret: c.clientSecret,
    logging: c.logging,
    buildCurl: c.buildCurl
  };

  var usergrid = UG(config);
  var definedTypes = {};

  return function http(context, cb) {

    var type = fittingDef.input.type;
    if (!type) { throw new Error('type is a required input'); }

    var actionName = context.input.action;
    if (!actionName) { throw new Error('action is a required input'); }

    var UGClass = definedTypes[type];

    if (!UGClass) {
      var ugClass = {};
      var constructor = function() {};
      usergrid.define(ugClass, constructor, type);
      UGClass = definedTypes[type] = ugClass;
      _.bindAll(UGClass);

      // todo: support attrs, defaults, hasMany, validates?
    }

    // todo: bypass all the wrapping and unwrapping?
    var callback = function(err, result) {
      if (Array.isArray(result)) {
        result = result.map(function(each) { return each.toJSON(); });
      } else if (typeof result === 'object') {
        result = result.toJSON();
      }
      cb(err, result);
    };

    var action = UGClass[context.input.action];
    if (!action) { throw new Error('unknown usergrid action: ' + actionName); }

    var attributes = context.input.attributes;

    switch (actionName) {

      case 'all':
        action(callback);
        break;

      case 'delete':
      case 'find':
        var id = attributes.uuid || attributes.name;
        if (!id) { throw new Error('uuid or name in input.attributes is required'); }
        action(id, callback);
        break;

      case 'create':
      case 'update':
      case 'deleteAll':
      case 'destroyAll':
      case 'findOrCreate':
      case 'first':
        action(attributes, callback);
        break;

      case 'findBy':
        action(attributes, context.input.limit, callback);
        break;

      default:
        throw new Error('unknown usergrid action: ' + actionName);
    }
  }
};

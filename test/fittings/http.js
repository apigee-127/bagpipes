'use strict';

var should = require('should');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var Bagpipes = require('../../lib');
const proxyquire = require('proxyquire');

describe('http', function() {

  var fitting = proxyquire('../../lib/fittings/http', {
    'machinepack-http': {
      sendHttpRequest: function(options, cb) {
        cb(null, options)
      }
    }
  });
  
  it('should override config baseUrl with input baseURL', function(done) {

    var fittingDef = {
      config: {
        baseUrl: 'configBaseURL',
      },
      input: {
        baseUrl: 'inputBaseURL',
        url: 'someURL',
        method: 'get',
        params: {},
        headers: {}
      }
    }

    context = {
      input: fittingDef.input
    }

    var http = fitting(fittingDef)
    http(context, function(err, configured) {
      configured.baseUrl.should.eql(fittingDef.input.baseUrl);
      done()
    })
  })

  it('should use config baseUrl when no input', function(done) {

    var fittingDef = {
      config: {
        baseUrl: 'configBaseURL',
      },
      input: {
        url: 'someURL',
        method: 'get',
        params: {},
        headers: {}
      }
    }

    context = {
      input: fittingDef.input
    }

    var http = fitting(fittingDef)
    http(context, function(err, configured) {
      configured.baseUrl.should.eql(fittingDef.config.baseUrl);
      done()
    })
  })

  it('should use input baseUrl when no config', function(done) {

    var fittingDef = {
      config: {
      },
      input: {
        baseUrl: 'inputBaseURL',
        url: 'someURL',
        method: 'get',
        params: {},
        headers: {}
      }
    }

    context = {
      input: fittingDef.input
    }

    var http = fitting(fittingDef)
    http(context, function(err, output) {
      output.should.eql(context.input);
      done()
    })
  })
});

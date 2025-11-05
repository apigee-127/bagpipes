'use strict'

const Http = require('machinepack-http')

// defaults output -> url
module.exports = function create (fittingDef) {
  const config = Object.assign({ baseUrl: '' }, fittingDef.config)

  return function http (context, cb) {
    const input = (typeof context.input === 'string') ? { url: context.input } : context.input

    const options = Object.assign({ url: context.output }, config, input)

    Http.sendHttpRequest(options, cb)
  }
}

/* input:
 url: '/pets/18',
 baseUrl: 'http://google.com',
 method: 'get',
 params: {},
 headers: {}
 */

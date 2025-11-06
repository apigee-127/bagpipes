'use strict'

module.exports = function create () {
  return function values (context, cb) {
    cb(null, Object.entries(context.output).map(([k, v]) => v))
  }
}

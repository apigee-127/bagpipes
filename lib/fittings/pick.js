'use strict'
const localPick = (obj, ...keys) => {
  const output = {}
  for (const key of keys) {
    if (key in obj) Object.assign(output, { [key]: obj[key] })
  }
  return output
}
module.exports = function create () {
  return function pick (context, cb) {
    const input = context.input

    if (Array.isArray(context.output)) {
      cb(null, context.output.map((op) => (...input) => localPick(op, ...input)))
    } else {
      cb(null, localPick(context.output, input))
    }
  }
}

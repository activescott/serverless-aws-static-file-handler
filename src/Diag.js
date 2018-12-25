"use strict"

// NOTE: the spread arg (...args) causes syntax errors in lambda. They use an old version of node: http://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html & http://node.green/

class Diag {
  constructor(prefix) {
    this._prefix = prefix
  }

  log() {
    // convert arguments to array
    var args = Array.prototype.slice.call(arguments)
    args = sanitizeArgs(args)
    args = [`${this._prefix}:`].concat(args)
    console.log.apply(null, args)
  }

  warn() {
    var args = Array.prototype.slice.call(arguments)
    args = sanitizeArgs(args)
    args = [`${this._prefix}:`].concat(args)
    console.warn.apply(null, args)
  }

  error() {
    var args = Array.prototype.slice.call(arguments)
    args = sanitizeArgs(args)
    args = [`${this._prefix}:`].concat(args)
    console.error.apply(null, args)
  }

  assert() {
    var args = Array.prototype.slice.call(arguments)
    args = [args[0]] // the "test" argument
    args = sanitizeArgs(args)
    args = args.concat([`${this._prefix}:`])
    args = args.concat(args.slice(1))
    console.assert.apply(null, args)
  }
}

function sanitizeArgs(args) {
  const sanitizedArgs = []
  const propsToSanitize = ["access_token", "refresh_token"]

  for (let sourceArg of args) {
    let argCopy
    if (typeof sourceArg === "undefined") {
      argCopy = undefined
    } else if (sourceArg) {
      // deep clone if not null/undefined
      argCopy = JSON.parse(JSON.stringify(sourceArg))
    } else {
      argCopy = null
    }
    if (typeof argCopy === "object") {
      for (let p in argCopy) {
        if (propsToSanitize.includes(p)) {
          argCopy[p] = "<sanitized from logging>"
        }
      }
    }
    sanitizedArgs.push(argCopy)
  }
  return sanitizedArgs
}

module.exports = Diag

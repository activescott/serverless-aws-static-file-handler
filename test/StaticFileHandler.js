/* eslint-env mocha */
/* eslint-disable padded-blocks */
'use strict'
const expect = require('chai').expect

const path = require('path')

const StaticFileHandler = require('../StaticFileHandler.js')
const STATIC_FILES_PATH = path.join(__dirname, '../data/testfiles/')

describe('StaticFileHandler', function () {
  describe('constructor', function () {
    it('should not allow empty arg', function () {
      expect(() => new StaticFileHandler()).to.throw(/clientFilesPath must be specified/)
    })

    it('should accept string arg', function () {
      expect(() => new StaticFileHandler('some/path')).to.not.throw(Error)
    })
  })

  describe('get', function () {
    it('should return index.html', function () {
      let event = { path: 'index.html' }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then(response => {
        expect(response).to.have.property('statusCode', 200)
        expect(response).to.have.property('body').to.match(/^<!DOCTYPE html>/)
        return response
      })
    })

    it('should return a mime/type of application/octet-stream for .map files', function () {
      let event = { path: 'vendor/bootstrap.min.css.map' }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null)
        .then(response => {
          expect(response).to.have.property('headers')
          expect(response.headers).to.have.property('Content-Type')
          expect(response.headers['Content-Type']).to.equal('application/octet-stream')
          return response
        })
    })
    it('should work with non-lambdaproxy requests', function () {
      let event = {
        path: {
          fonts: 'glyphicons-halflings-regular.woff2' }
      }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null)
        .then(response => {
          return expect(response.length).to.equal(24040)
        })
    })
    it('should return text as text', function () {
      let event = { path: 'README.md' }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null)
        .then(response => {
          let expectedContent = 'This directory is not empty. Is it?'
          return expect(response.body).to.equal(expectedContent)
        })
    })
    it('should insert viewdata', function () {
      let event = { path: 'index.html' }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const context = {
        staticFileHandler: {
          viewData: {
            csrftoken: 'MY_FAKE_CSRF_TOKEN'
          }
        }
      }
      return h.get(event, context)
        .then(response => {
          return expect(response.body).to.match(/.*<input id="csrftoken" type="hidden" value="MY_FAKE_CSRF_TOKEN"/)
        })
    })
  })
})

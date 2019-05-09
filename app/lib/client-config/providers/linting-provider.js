/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

'use strict';

const compileConfig = require('bpmnlint/lib/support/compile-config');

const glob = require('glob');

const fs = require('fs');

const log = require('../../log')('app:client-config:linting');


function LintingProvider(options) {

  const defaultPaths = options.paths;

  this.findLintingConfigs = function(searchPaths) {
    var allConfigs = searchPaths.reduce(function(templates, path) {

      var files;

      try {
        files = globLintingConfig(path);
      } catch (err) {
        log.error('glob failed', err);
      }

      return files;
    });

    return allConfigs;
  };

  /**
   * Return linting config
   * @param {Function} done
   */
  this.get = async function(key, diagram, done) {

    if (typeof done !== 'function') {
      throw new Error('expected <done> callback');
    }

    var searchPaths = [
      ...defaultPaths
    ];

    try {

      var files = this.findLintingConfigs(searchPaths);

      // TODO: bundle more configs
      var configFile = files[0];

      var config = JSON.parse((fs.readFileSync(configFile, 'utf8')));

      compileConfig(config).then(res => {
        // TODO: what to do with the generated file content?
        done(res);
      }).catch(err => done(err));

    } catch (err) {
      done(err);
    }
  };

}

module.exports = LintingProvider;

// helpers //////////////////

/**
 * Locate .bpmnlintrc configurations local to given path.
 *
 * @param {String} path
 *
 * @return {Array<String>} found configs.
 */
function globLintingConfig(path) {

  var globOptions = {
    cwd: path,
    nodir: true,
    realpath: true
  };

  return glob.sync('.bpmnlintrc', globOptions);
}
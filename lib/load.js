'use strict';

//dependencies
var path = require('path');
var prepareWork = require(path.join(__dirname, 'work'));


/**
 * @function
 * @description loading seed's data into configured model persistent storage
 * @param {Object} config  seed hook configurations
 * @param {Function} done  a callback to invoke on after seeding
 */
module.exports = function(config, done) {
    //guess current sails environment
    var environment = sails.config.environment || 'test';

    //deduce seeds path to use
    //based on current environment
    var seedsPath =
        path.join(sails.config.appPath, config.path, environment);

    //log seed environment
    sails.log.debug('start seeding %s data', environment);

    //log seed location
    sails.log.debug('seeding from %s', seedsPath);

    //load all seeds available
    //in   `seedsPath`
    var seeds = require('include-all')({
        dirname: seedsPath,
        filter: /(.+Seed)\.js$/,
        excludeDirs: /^\.(git|svn)$/,
        optional: true
    });

    var files = Object.keys(seeds);
    files.sort();

    var modelFunctions = [];

    function modelFunction(work){
        return function (nextModelFunc) {
            sails.log.debug("Seeding model %s, items: ",Object.keys(modelSeed)[0], _.size(work));
            //if there is a work to perform
            if (_.size(work) > 0) {

                async
                    .waterfall([
                            function seedModels(next) {
                                //now lets do the work
                                //in parallel fashion
                                async.parallel(work, next);
                            },
                            function seedAssociations(associationsWork, next) {
                                // flatten lists
                                associationsWork = [].concat.apply([], associationsWork);

                                if (_.size(associationsWork) > 0) {

                                    //seed associations if available
                                    sails.log.debug('load associations');

                                    //TODO what results to log?
                                    async.parallel(associationsWork, next);
                                } else {
                                    next();
                                }
                            }
                        ],
                        function(error, results) {
                            //signal seeding complete
                            sails.log.debug("Done: ",results);
                            sails.log.debug("Done Seeding model %s, items: ",Object.keys(modelSeed)[0], _.size(work));
                            nextModelFunc(null);
                        });
            }
        };
    }

    for (var i = 0, len = files.length; i < len; i++) {
        var seedModelName = files[i].split('-').pop();
        var modelSeed = {};
        modelSeed[seedModelName] = seeds[files[i]];
        //prepare seeding work to perfom
        var work = prepareWork(modelSeed);

        modelFunctions.push(modelFunction(work));
    }

    //running my func
    async.waterfall(modelFunctions, function(error, results) {
        //signal seeding complete
        sails.log.debug('complete seeding %s data', environment);

        done(error, {
            environment: environment,
            data: results
        });
    });
};

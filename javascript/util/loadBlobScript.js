/**
 * Attempt loading a script from the blob store.
 * If runTests == true and the loaded script contains an appropriate runTest() function then execute runTest()
 * Since scripts are typically loaded once when Fusion compiles a stage and then stored in a global runTests()
 * will not execute on every stage unless explicitly called in the client code.
 *
 * minified via https://jscompress.com/ and then pasted into IPL and QPL samplePipeline.js
 * Alternatively via  `curl -X POST -s --data-urlencode 'input@loadBlobScript.js' https://javascript-minifier.com/raw > loadBlobScript.min.js`
 * @param scriptName i.e. utilLib.js
 * @param api server name i.e. localhost
 * @param ctx  context to store script in to avoid extra parsing.  For Index pipeline this is args[1], for query it's args[2]
 * @return the loaded library
 */
function bootstrapLibrary(scriptName,apiServer,ctx,runTests){
    var lib;
    var log = logger;
    var args = Array.prototype.slice.call(arguments);
    //pop off declared params (count should equal the declared params of this function!
    // This leaves original passed from Fusion in args
    args.splice(0, 4);
    log.debug('BLOB_LOAD bootstrapUtil start ' );
    //if (!util ) {
    lib = loadScriptFromBlob.call(this, scriptName, apiServer,ctx);
    ctx.put("loadStatus", BL_ctx);
    log.debug('BLOB_LOAD runTests=' + (runTests));
    if(lib && runTests){
        if(args[1] === ctx && lib.index && typeof(lib.index.runTests) === 'function'){
            lib.index.runTests.apply(this,args);
        }else if(args[2] === ctx && lib.query && typeof(lib.query.runTests) === 'function'){
            lib.query.runTests.apply(this,args);
        }
    }
    log.debug('BLOB_LOAD blob load done');
    return lib;
}

/**
 *
 * @param scriptName
 * @param serverName
 * @param ctx
 * @return the loaded library
 */
function loadScriptFromBlob(scriptName, serverName, ctx) {
    var log = logger;//alias global to aid minify
    var lib = null;
    log.info('BLOB_LOAD: Try to load/get library from: BLOB. ' + scriptName );
    serverName = serverName || 'localhost';
    scriptName = scriptName || 'utilLib.js';
    BL_ctx[scriptName + '_lib'] = "loadBlob Called";

    log.info('BLOB_LOAD: Attempting load from BLOB store ');
    try {
        var url = "http://" + serverName + ":8765/api/v1/blobs/" + scriptName;
        log.debug('BLOB_LOAD: Nashorn load of url: ' + url);
        lib = load(url);// jshint ignore:line
        ctx.put('BLOB_' + scriptName, lib);
        log.debug('BLOB_LOAD loaded script from blobstore');
        BL_ctx[scriptName + '_lib'] = "library loaded from BLOB fetch";
    } catch (error) {
        log.error("Error querying or loading script from blobstore Err: " + error);
        ctx.put('BLOB_' + scriptName + "_ERROR",error.toString())
    }

    return lib;
}
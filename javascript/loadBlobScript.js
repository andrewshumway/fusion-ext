/**
 * minified via https://jscompress.com/ and then pasted into IPL and QPL samplePipeline.js
 * Alternatively via  `curl -X POST -s --data-urlencode 'input@loadBlobScript.js' https://javascript-minifier.com/raw > loadBlobScript.min.js`
 * @param scriptName i.e. utilLib.js
 * @param api server name i.e. localhost
 * @param ctx  context to store script in to avoid extra parsing.  For Index pipeline this is args[1], for query it's args[2]
 */
function bootstrapLibrary(scriptName,apiServer,ctx,runTests){
    var log = logger;
    var args = Array.prototype.slice.call(arguments);
    //pop off declared params (count should equal the declared params of this function!
    // This leaves original passed from Fusion in args
    args.splice(0, 4);
    log.debug('BLOB_LOAD bootstrapUtil start ' );
    if (!util ) {
        loadScriptFromBlob.call(this, scriptName, apiServer,ctx);
        ctx.put("loadStatus", BL_ctx);
        log.info('BLOB_LOAD runTests=' + (runTests));
        if(util && runTests){
            if(args[1] === ctx){
                util.index.runTests.apply(this,args);
            }else if(args[2] === ctx){
                util.query.runTests.apply(this,args);
            }
        }
        log.debug('BLOB_LOAD blob load done');
    }else{
        //Fusion caches the function returned at the bottom of this file.  Apparently, this includes the loaded library
        log.debug('BLOB_LOAD util already set');
    }
}

function loadScriptFromBlob(scriptName, serverName, ctx) {
    var log = logger;//alias global to aid minify
    log.info('BLOB_LOAD: Try to load/get library from: BLOB. Prior attempts=' + BL_TRIED);
    serverName = serverName || 'localhost';
    scriptName = scriptName || 'utilLib.js';
    BL_ctx[scriptName + '_lib'] = "loadBlob Called";
    if (ctx && typeof(ctx.get) === 'function') {
        var lib = ctx.get('BLOB_' + scriptName);
        if (lib) {
            util = lib;//register library in global and context
            BL_ctx[scriptName + '_lib'] = "library set from ctx";
            return;
        }else{
            log.error('BLOB_LOAD: ctx.get(\'BLOB_\' + scriptName) empty. no BLOB_' + scriptName);
        }
    }else{
        log.error('BLOB_LOAD: ctx.get is not a function!!? Unable to check for BLOB script ' + (util?true:false));
    }
    if (!BL_TRIED ) {
        log.info('BLOB_LOAD: Attempting load from BLOB store ');
        try {
            var url = "http://" + serverName + ":8765/api/v1/blobs/" + scriptName;
            log.info('BLOB_LOAD: Nashorn load of url: ' + url);
            lib = load(url);// jshint ignore:line
            ctx.put('BLOB_' + scriptName, lib);
            log.info('BLOB_LOAD loaded script from blobstore');
            BL_ctx[scriptName + '_lib'] = "library loaded from BLOB fetch";
            util = lib; //register library in global
        } catch (error) {log.error("Error querying or loading script from blobstore Err: " + error);}
        finally{
            BL_TRIED = true;
        }
    } else {
        log.info('BLOB_LOAD Blob load already attempted. Skipping');
    }
}

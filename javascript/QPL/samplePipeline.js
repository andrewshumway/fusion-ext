/** Original published as https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js */
// List globals so jshint can validate
/* globals Java, logger*/
(function () {
    "use strict";
    /**
     * see https://doc.lucidworks.com/fusion/3.0/Search/Custom-JavaScript-Query-Stages.html for bad documentation
     * They claim that params and ctx/_context are passed but only ctx is actually passed
     *
     * @param request The Solr query information.
     * @param response The Solr response information.
     * @param ctx A reference to the container which holds a map over the pipeline properties. Used to update or modify this information for downstream pipeline stages.
     * @param collection the name of the Fusion collection being queried
     * @param solrServer  The Solr server instance that manages the pipeline’s default Fusion collection. All indexing and query requests are done by calls to methods on this object. See SolrClient for details.
     * @param solrServerFactory The SolrCluster server used for lookups by collection name which returns a Solr server instance for a that collection, e.g.
     * @returns {*}
     */
    function queryMain (request, response, ctx, collection, solrServer, solrServerFactory) {
        logger.debug('***********JS pipeline script invoked.');
        //TODO:  check for util as needed
        ctx.put("Util library set:", (util?true:false));
        //TODO: add pipeline code
        if(util && response){
            util.query.appendObjectToResponse(response,"ctx",ctx);
        }
    }

    //global variables for loading the util library.
    var BL_ctx = {}, util = undefined;
    function bootstrapLibrary(f,e,a,c){var g;var d=logger;var b=Array.prototype.slice.call(arguments);b.splice(0,4);d.debug("BLOB_LOAD bootstrapUtil start ");g=loadScriptFromBlob.call(this,f,e,a);a.put("loadStatus",BL_ctx);d.debug("BLOB_LOAD runTests="+(c));if(g&&c){if(b[1]===a&&g.index&&typeof(g.index.runTests)==="function"){g.index.runTests.apply(this,b)}else{if(b[2]===a&&g.query&&typeof(g.query.runTests)==="function"){g.query.runTests.apply(this,b)}}}d.debug("BLOB_LOAD blob load done");return g}function loadScriptFromBlob(e,g,a){var d=logger;var f=null;d.info("BLOB_LOAD: Try to load/get library from: BLOB. "+e);g=g||"localhost";e=e||"utilLib.js";BL_ctx[e+"_lib"]="loadBlob Called";d.info("BLOB_LOAD: Attempting load from BLOB store ");try{var c="http://"+g+":8765/api/v1/blobs/"+e;d.debug("BLOB_LOAD: Nashorn load of url: "+c);f=load(c);a.put("BLOB_"+e,f);d.debug("BLOB_LOAD loaded script from blobstore");BL_ctx[e+"_lib"]="library loaded from BLOB fetch"}catch(b){d.error("Error querying or loading script from blobstore Err: "+b);a.put("BLOB_"+e+"_ERROR",b.toString())}return f};
    /**
     return a function which will be called by JavascriptStage.java for each query.  Arguments will be
     * [ doc, context, collectionName, solrServer, solrServerFactory]
     */
    return function () {
        //lazy load util library and delegate to our Main
        if(util == undefined) {
            var args = Array.prototype.slice.call(arguments);
            //push library name, server, ctx, and runTests to front of args list.
            // ctx is args.[1] for index ctx, [2] for query pipelines ctx
            args.unshift("utilLib.js", "localhost", args[2],true)
            logger.debug('BLOB_LOAD calling bootstrpUtil');
            util = bootstrapLibrary.apply(this, args);
        }
        logger.debug('************JS pipeline applying indexMain');
        return queryMain.apply(this, Array.prototype.slice.call(arguments));
    }
})();

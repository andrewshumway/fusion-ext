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
    }

    //global variables for loading the util library.
    var BL_TRIED = false, BL_ctx = {}, util = null;
    function bootstrapLibrary(t,o,r,l){var i=logger,B=Array.prototype.slice.call(arguments);B.splice(0,4),i.debug("BLOB_LOAD bootstrapUtil start "),util?i.debug("BLOB_LOAD util already set"):(loadScriptFromBlob.call(this,t,o,r),r.put("loadStatus",BL_ctx),i.info("BLOB_LOAD runTests="+l),util&&l&&(B[1]===r?util.index.runTests.apply(this,B):B[2]===r&&util.query.runTests.apply(this,B)),i.debug("BLOB_LOAD blob load done"))}function loadScriptFromBlob(t,o,r){var l=logger;if(l.info("BLOB_LOAD: Try to load/get library from: BLOB. Prior attempts="+BL_TRIED),o=o||"localhost",t=t||"utilLib.js",BL_ctx[t+"_lib"]="loadBlob Called",r&&"function"==typeof r.get){var i=r.get("BLOB_"+t);if(i)return util=i,void(BL_ctx[t+"_lib"]="library set from ctx");l.error("BLOB_LOAD: ctx.get('BLOB_' + scriptName) empty. no BLOB_"+t)}else l.error("BLOB_LOAD: ctx.get is not a function!!? Unable to check for BLOB script "+!!util);if(BL_TRIED)l.info("BLOB_LOAD Blob load already attempted. Skipping");else{l.info("BLOB_LOAD: Attempting load from BLOB store ");try{var B="http://"+o+":8765/api/v1/blobs/"+t;l.info("BLOB_LOAD: Nashorn load of url: "+B),i=load(B),r.put("BLOB_"+t,i),l.info("BLOB_LOAD loaded script from blobstore"),BL_ctx[t+"_lib"]="library loaded from BLOB fetch",util=i}catch(t){l.error("Error querying or loading script from blobstore Err: "+t)}finally{BL_TRIED=!0}}}
    /**
     return a function which will be called by JavascriptStage.java for each query.  Arguments will be
     * [ doc, context, collectionName, solrServer, solrServerFactory]
     */
    return function () {
        //lazy load util library and delegate to our Main
        if(!util) {
            var args = Array.prototype.slice.call(arguments);
            //push library name, server, and ctx to front of args list.  args.[1] for index ctx, [2] for query pipelines ctx
            args.unshift("utilLib.js", "localhost", args[2])
            logger.debug('BLOB_LOAD calling bootstrpUtil');
            bootstrapLibrary.apply(this, args);
        }
        logger.debug('************JS pipeline applying indexMain');
        return queryMain.apply(this, Array.prototype.slice.call(arguments));
    }
})();

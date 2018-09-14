/** Modified from https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js */
/* globals Java, logger*/ // List globals so jshint can validate
(function () {
    "use strict";
    /**
     * @param doc :: PipelineDocument
     * @param ctx :: Map<String, Object>
     * @param collection :: String containing the collection name
     * @param solrServer :: org.apache.solr.client.solrj.SolrClient instance pointing at `collection`
     * @param solrServerFactory :: com.lucidworks.apollo.component.SolrClientFactory instance
     * @returns {*}
     */
    function indexMain(doc, ctx, collection, solrServer, solrServerFactory) {
        logger.debug('\n\n************JS pipeline script invoked.');
        //TODO:  check for util as needed
        ctx.put("Util library set:", (util?true:false));
        //TODO: add pipeline code
        return doc;
    }

    //global variables for loading the util library.
    // the results to bootstrapLibrary in the outer function can be set in these variables and reused in each stage
    var BL_ctx = {}, util = undefined;
    function bootstrapLibrary(f,e,a,c){var g;var d=logger;var b=Array.prototype.slice.call(arguments);b.splice(0,4);d.debug("BLOB_LOAD bootstrapUtil start ");g=loadScriptFromBlob.call(this,f,e,a);a.put("loadStatus",BL_ctx);d.debug("BLOB_LOAD runTests="+(c));if(g&&c){if(b[1]===a&&g.index&&typeof(g.index.runTests)==="function"){g.index.runTests.apply(this,b)}else{if(b[2]===a&&g.query&&typeof(g.query.runTests)==="function"){g.query.runTests.apply(this,b)}}}d.debug("BLOB_LOAD blob load done");return g}function loadScriptFromBlob(e,g,a){var d=logger;var f=null;d.info("BLOB_LOAD: Try to load/get library from: BLOB. "+e);g=g||"localhost";e=e||"utilLib.js";BL_ctx[e+"_lib"]="loadBlob Called";d.info("BLOB_LOAD: Attempting load from BLOB store ");try{var c="http://"+g+":8765/api/v1/blobs/"+e;d.debug("BLOB_LOAD: Nashorn load of url: "+c);f=load(c);a.put("BLOB_"+e,f);d.debug("BLOB_LOAD loaded script from blobstore");BL_ctx[e+"_lib"]="library loaded from BLOB fetch"}catch(b){d.error("Error querying or loading script from blobstore Err: "+b);a.put("BLOB_"+e+"_ERROR",b.toString())}return f};

    /**
     return a function which will be called by JavascriptStage.java for each query.  Arguments will be
     * [ doc, context, collectionName, solrServer, solrServerFactory]
     */
    return function () {
        //check global and lazy load util library.  Then call our Main
        if(util === undefined) {
            //push library name, server, ctx and runTests to front of args list.  args.[1] for index ctx, [2] for query pipelines ctx
            var args = Array.prototype.slice.call(arguments);
            args.unshift("utilLib.js", "localhost", args[1],args[1].get('simulate'));
            logger.debug('BLOB_LOAD calling bootstrapUtil');
            util = bootstrapLibrary.apply(this, args);
        }
        return indexMain.apply(this, Array.prototype.slice.call(arguments));//delegate Fusion's call to our Main
    }
})();

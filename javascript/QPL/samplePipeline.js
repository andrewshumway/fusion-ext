/** Original published as https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js */
// List globals so jshint can validate
/* globals Java, logger*/
(function () {
    "use strict";
    //global variables for loading the util library.
    var util = undefined; //local name of the library to load.

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
    function queryMain(request, response, ctx, collection, solrServer, solrServerFactory) {
        logger.debug('***** checking for Util library.');

        if(util && util.query){
          util.query.runTests(request, response,ctx,collection,solrServerFactory);
        }
        //TODO: add pipeline code
    }

    /**
     return a function which will be called by JavascriptStage.java for each query.  Arguments will be
     * [ request, response, context, collectionName, solrServer, solrServerFactory]
     */
    return function () {
        //check global and lazy load util library.  Then call our Main
        var args = Array.prototype.slice.call(arguments);
        if(util === undefined) {
            //push library name, server, ctx and runTests to front of args list.  args.[1] for index ctx, [2] for query pipelines ctx
            var ctx = args[2];
            var libBlobName = ctx.get('_libBlobName') || 'utilLib.js'
            var apiServerName = ctx.get('_apiServerName') || 'localhost'
            try {
                var url = "http://" + apiServerName + ":8765/api/v1/blobs/" + libBlobName;
                logger.debug('BLOB_LOAD: Nashorn load of url: ' + url);
                util = load(url);// jshint ignore:line
                //ctx.put('BLOB_' + libBlobName, lib);
                logger.debug('BLOB_LOAD loaded script from blobstore');
            } catch (error) {
                var message = "BLOB_LOAD Error loading " + libBlobName + " from BlobStore. URL=" + url + "\n";
                var desc = {}
                var props = Object.getOwnPropertyNames(error)
                for(var i=0; i < props.length; i++){
                  desc[props[i]] = String(error[props[i]])
                 }
                 logger.error(message + JSON.stringify(desc,null,2))
            }
        }
        return queryMain.apply(this, args);//delegate Fusion's call to our Main
    }
})();

/** Modified from https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js */
/* globals Java, logger*/ // List globals so jshint can validate
(function () {
    "use strict";
    //global variables for loading the util library.
    var util = undefined; //local name of the library to load.

    /**
     * @param doc :: PipelineDocument
     * @param ctx :: Map<String, Object>
     * @param collection :: String containing the collection name
     * @param solrServer :: org.apache.solr.client.solrj.SolrClient instance pointing at `collection`
     * @param solrServerFactory :: com.lucidworks.apollo.component.SolrClientFactory instance
     * @returns {*}
     */
    function indexMain(doc, ctx, collection, solrServer, solrServerFactory) {
        logger.debug('***** checking for Util library.');

        if(util && util.index){
          util.index.runTests(doc,ctx,collection,solrServerFactory);
        }
        //TODO: add pipeline code
        return doc;
    }

    /**
     return a function which will be called by JavascriptStage.java for each query.  Arguments will be
     * [ doc, context, collectionName, solrServer, solrServerFactory]
     */
    return function () {
        //check global and lazy load util library.  Then call our Main
        if(util === undefined) {
            //push library name, server, ctx and runTests to front of args list.  args.[1] for index ctx, [2] for query pipelines ctx
            var args = Array.prototype.slice.call(arguments);
            var ctx = args[1];
            var libBlobName = ctx.get('_libBlobName') || 'utilLib.js'
            var apiServerName = ctx.get('_apiServerName') || 'localhost'
            try {
                var url = "http://" + apiServerName + ":8765/api/v1/blobs/" + libBlobName;
                logger.debug('BLOB_LOAD: Nashorn load of url: ' + url);
                util = load(url);// jshint ignore:line
                ctx.put('BLOB_' + libBlobName, util);
                logger.debug('BLOB_LOAD loaded script from blobstore');
            } catch (error) {
                logger.error("BLOB_LOAD Error querying or loading " + libBlobName + " script from blobstore via URL=" + url + "  Err: " + error);
            }
        }
        return indexMain.apply(this, Array.prototype.slice.call(arguments));//delegate Fusion's call to our Main
    }
})();

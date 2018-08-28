/** Original published as https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js */
// List globals so jshint can validate
/* globals Java, logger*/
(function () {
    "use strict";
    //global variables used for loading library etc.
    var util=null,_this = {}, loadStatusContext = {};
    /**
     * This is broken out in case there is more than one library script to load e.g. utils and a customer specific one
     */
    var loadLibrary = function (url) {
        var lib = null;
        var prefix = url.substr(url.lastIndexOf('/') + 1);
        try {
            logger.info('\n\n**************\n*Try to library load from: ' + url + '\n******************\n');
            lib = load(url);// jshint ignore:line
            loadStatusContext[prefix + '_lib'] = "loaded";
            logger.info('\n\n**************\n* The library loaded from: ' + url + '\n******************\n');
        } catch (e) {
            loadStatusContext[prefix + '_loadError'] = e;
            logger.error('\n\n**************\n* The utility library at ' + url + ' is missing or invalid\n');
            if (e && e.message) {
                logger.error('Message:' + e.message + '\n******************\n');
            }
        }
        return lib;
    };

    /*****
     *  The scope init function is used to get the util library loaded when the script is evaluated/compiled.
     *  This lets Fusion cache and reuse the script after library load and avoids a reload of the library
     *  with each invocation.
     *
     * IMPORTANT NOTE ABOUT CACHING AND RELOAD
     * Because pipeline stages are evaluated/compile and then cached, the loaded JavaScript library will not be read in
     * unless the pipeline script is re evaluated/compiled and then cached.  This happens (in 3.0) in the following scenarios (at least)
     * 1. Fusion service restart
     * 2. Pipeline saved
     * 3. Workbench test applied or saved (usually)
     *
     * Simply clearing a datasource, changing a datasource run does not trigger a reload of the cached script.
     */
    util = function loadUtilLibrary() {
        logger.info("\nAUTO_LOAD: attempting load of utilLib.js.  util= " + util);
        var url = java.lang.System.getProperty('apollo.home') + '/scripts/utilLib.js';
        loadStatusContext.property = url;
        return loadLibrary(url);
    }();//auto invoke this when the script loads to bootstrap util

    /**
     *  Add more functions as needed _this.functionName = function(){} and call them via this.functionName();
     *
     * @param doc :: PipelineDocument
     * @param ctx :: Map<String, Object>
     * @param collection :: String containing the collection name
     * @param solrServer :: org.apache.solr.client.solrj.SolrClient instance pointing at `collection`
     * @param solrServerFactory :: com.lucidworks.apollo.component.SolrClientFactory instance
     * @returns {*}
     */
    _this.indexMain = function (doc, ctx, collection, solrServer, solrServerFactory) {

        logger.debug('\n\n************JS indexMain script invoked.');
        ctx.put("loadStatus", loadStatusContext);
        //TODO:  add pipeline code here and delete the runTests() call as needed.
        if (util && util.index) {
            util.index.runTests(doc, ctx, collection, solrServerFactory);
        }
        return doc;
    };

    /**
     return a function which will be called by JavascriptStage.java or JavascriptQueryStage.java for each pipeline doc
     */
    return function () {
        //turn the default arguments list passed to all JS functions into an array to avoid
        // complications when passing them to the outer wrapper function
        var args = Array.prototype.slice.call(arguments);
        return _this.indexMain.apply(_this, args);
    }
})();
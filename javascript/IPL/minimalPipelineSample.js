/* globals Java, logger*/
(function () {
    "use strict";

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
    return function(doc, ctx, collection, solrServer, solrServerFactory) {
        logger.debug('\n\n************JS pipeline script invoked.');

        //TODO: add pipeline code
        return doc;
    };

})();

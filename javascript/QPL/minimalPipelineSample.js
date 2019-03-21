/* globals Java, logger*/
(function () {
    "use strict";

    /**
     * see https://doc.lucidworks.com/fusion/3.0/Search/Custom-JavaScript-Query-Stages.html for bad documentation
     * They claim that params and ctx/_context are passed but only ctx is actually passed
     *
     * @param request The com.lucidworks.apollo.pipeline.query.Request object
     * @param response The com.lucidworks.apollo.pipeline.query.Response object (only after Solr query stage)
     * @param ctx A reference to the container which holds a map over the pipeline properties. Used to update or modify this information for downstream pipeline stages.
     * @param collection the name of the Fusion collection being queried
     * @param solrServer  The Solr server instance that manages the pipeline’s default Fusion collection. All indexing and query requests are done by calls to methods on this object. See SolrClient for details.
     * @param solrServerFactory The SolrCluster server used for lookups by collection name which returns a Solr server instance for a that collection, e.g.
     */
    return function(request,response , ctx, collection, solrServer, solrServerFactory) {
        logger.debug('\n\n************JS pipeline script invoked.');



        //TODO: add pipeline code
    };

})();

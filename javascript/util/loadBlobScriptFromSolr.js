/**
 * minified via https://jscompress.com/ and then pasted into samplePipelines.js
 *
 * Query the system_blobs collection for select?fq=name_s:utilLib.js&fq=type_s:part&q=*:*
 * @param scriptName i.e. utilLib.js
 * @param ctx  context to store script in to avoid extra parsing.
 * @param factory SolrFactory
 */
var loadBlobScript = function (scriptName, ctx, factory) {
    logger.info('\nBLOB_LOAD: ******** Try to load/get library from: BLOB ******** Attempted:' + BLOB_LOAD_ATTEMPTED);
    var SolrQuery = Java.type('org.apache.solr.client.solrj.SolrQuery');
    scriptName = scriptName || 'utilLib.js';
    loadStatusContext[scriptName + '_lib'] = "loadBlob Called";
    if (ctx && typeof(ctx.get) === 'function') {
        var lib = ctx.get('BLOB_' + scriptName);
        if (lib) {
            util = lib;//register library in global
            logger.info('\nBLOB_LOAD: Library pulled from Context');
            loadStatusContext[scriptName + '_lib'] = "ContextLoad";
            return;
        }
    }
    if (!BLOB_LOAD_ATTEMPTED ) {
        logger.info('\nBLOB_LOAD: Attempt load from BLOB store');
        BLOB_LOAD_ATTEMPTED = true;
        var solrClient = factory.getSolrServer('system_blobs');
        //fusion 3.x uses name_s but 4.x changes things.  No name on parts but path:'/path/{filename_s}
        //this should work for both: q=*:*&fq=name_s:utilLib.js+OR+path_s:*utilLib.js&sort=modification_time_dt+desc&rows=1&fq=type_s:part&wt=json
        var query = 'name_s:' + scriptName + ' OR path_s:*' + scriptName;
        try {
            var sq = new SolrQuery(query);
            sq.addFilterQuery('type_s:part');//collection has manifest and part records. Get newest part.
            sq.addSort('modification_time_dt',org.apache.solr.client.solrj.SolrQuery.ORDER.desc)
            sq.setRows(1);
            var resp = solrClient.query(sq);
            if (resp) {
                logger.info('\nBLOB_LOAD got solr response for: ' + sq.toString());
                logger.info('\nBLOB_LOAD response from query ' + resp);
                var results = resp.getResults();//SolrDocumentList
                if (results && results.size() > 0) {
                    var solrDoc = results.get(0);//multi-part scripts not supported
                    if (solrDoc) {
                        var data = solrDoc.getFieldValue('rawdata_bin');
                        if (data) {
                            var script = new java.lang.String(data, 'UTF-8');
                            try {
                                logger.info('BLOB_LOAD calling nashorn loader *******');
                                loadStatusContext[scriptName + '_lib'] = "Attempt BLOB Load";
                                lib = load({name: scriptName, script: script});// jshint ignore:line
                                ctx.put('BLOB_' + scriptName, lib);
                                logger.info('BLOB_LOAD loaded script from blob*******');
                                loadStatusContext[scriptName + '_lib'] = "Fresh BLOB Load";
                                util = lib; //register library in global
                            } catch (e) {
                                loadStatusContext[scriptName + '_loadError'] = e;
                                logger.error('\n\n**************\n* The utility library from BLOB ' + scriptName + ' is missing or invalid\nMessage:' + e.message);
                            }
                        }
                    }
                }else{logger.warn("Got empty result for query, no library loaded");}
            }else{logger.warn("BLOB_LOAD: Query to BLOB store did not find library ");}
        } catch (error) {logger.error("Error querying system_blobs for '" + query + "' Err: " + error);}
    } else {logger.info('\nBLOB_LOAD skipped loading because it has been attempted');}
};
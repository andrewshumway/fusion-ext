/**
 * Minify via https://jscompress.com/ if needed
 * Another version of this library was published with a LW blog at https://github.com/andrewshumway/FusionPipelineUtilities/blob/master/utilLib.js
 * Until LW decides on if/how to share this with the PS team this version will be considered the master copy.  Put enhancements here.
 *
 *
 * library of "static" Utility functions useful in index or query pipeline stages.
 *
 */
/* globals  Java,arguments */
(function(){
    "use strict";
    /* TODO: ideas
     Merge two documents
     to and from Base64
     */
    var JavaString = Java.type('java.lang.String');
    var JavaDate = Java.type('java.util.Date');
    var System = Java.type('java.lang.System');
    var StringBuilder = Java.type('java.lang.StringBuilder');
    var FileInputStream = Java.type('java.io.FileInputStream');
    var InputStream = Java.type('java.io.InputStream');
    var Properties = Java.type('java.util.Properties');
    var LinkedHashMap = Java.type('java.util.LinkedHashMap');
    var ArrayList = Java.type('java.util.ArrayList');
    var SimpleDateFormat = Java.type('java.text.SimpleDateFormat');
    var Calendar = Java.type('java.util.Calendar');
    var Base64 = Java.type('java.util.Base64');

    var HttpClientBuilder = Java.type('org.apache.http.impl.client.HttpClientBuilder');
    var HttpGet = Java.type('org.apache.http.client.methods.HttpGet');
    var IOUtils = Java.type('org.apache.commons.io.IOUtils');
    //the default SolrQuery extends ModifiableSolrjParams
    var SolrQuery = Java.type('org.apache.solr.client.solrj.SolrQuery');

    var SecretKeySpec = Java.type('javax.crypto.spec.SecretKeySpec');
    var Cipher = Java.type('javax.crypto.Cipher');

    var PipelineDocument = Java.type('com.lucidworks.apollo.common.pipeline.PipelineDocument');
    var PipelineField = Java.type('com.lucidworks.apollo.common.pipeline.PipelineField');

    /**
     * begin definition of file globals.  Anything not returned at the bottom will
     * be private
     */
    var ISO8601DATEFORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSZ");
    ISO8601DATEFORMAT.setCalendar(Calendar.getInstance(java.util.TimeZone.getTimeZone('UTC')));

    var makeTestContextWrapper = function(globalContext,name){
        var testTag = '_runtime_test_results';
        var mainMap = globalContext.get(testTag);
        if(! mainMap){
            mainMap = new LinkedHashMap();
            globalContext.put(testTag, mainMap);
        }
        var groupMap = getSubMap(mainMap,name);
        return groupMap;
    };
    /**
     * Get, or make and Get, a LinkedHashMap child within map named subMapName
     *
     * @param map  A parent Java Map or {}
     * @param subMapName  The key in map which should store the subMap
     *
     * @return {LinkedHashMap} the submap element
     */
    var getSubMap = function(map,subMapName){
        var submap = map[subMapName];
        if(! submap){
            submap = new LinkedHashMap();
            map[subMapName] = submap;
        }
        return submap;
    };
    /**
     * TODO:  as more html tokens are encountered, add them to this array
     * list of html tokens to include int the search-replace
     * @type {{re: RegExp, rv: string[]}}
     */
    var replacements =  [
        { re:/&nbsp;/g, rv:' ' },{ re:/&ensp;/g, rv:' ' },{ re:/&emsp;/g, rv:' ' },{ re:/&thinsp;/g, rv:' ' },{ re:/&zwnj;/g, rv:' ' },{ re:/&shy;/g, rv:' ' },{ re:/&lrm;/g, rv:' ' },{ re:/&rlm;/g, rv:' ' },{ re:/&zwj;/g, rv:' ' }
        /*
         *  The following are symbols which can be replaced.  This will likely be slow on long Strings.
         *  Making a regex such as "\&[a-z,A-Z]{2,8};" which first finds all of the &xyz; type tokens and then looks them up and just searches for those
         *  would be much better but until someone writes it this is what we've got.
         */
        ,{ re:/&amp;/g, rv:'\u0026' },{ re:/&lt;/g, rv:'\u003C' },{ re:/&gt;/g, rv:'\u003E' },{ re:/&iexcl;/g, rv:'\u00A1' },{ re:/&cent;/g, rv:'\u00A2' }
        ,{ re:/&pound;/g, rv:'\u00A3' },{ re:/&curren;/g, rv:'\u00A4' },{ re:/&yen;/g, rv:'\u00A5' },{ re:/&brvbar;/g, rv:'\u00A6' },{ re:/&sect;/g, rv:'\u00A7' },{ re:/&uml;/g, rv:'\u00A8' }
        ,{ re:/&copy;/g, rv:'\u00A9' },{ re:/&ordf;/g, rv:'\u00AA' },{ re:/&laquo;/g, rv:'\u00AB' },{ re:/&reg;/g, rv:'\u00AE' },{ re:/&macr;/g, rv:'\u00AF' },{ re:/&deg;/g, rv:'\u00B0' }
        ,{ re:/&plusmn;/g, rv:'\u00B1' },{ re:/&sup2;/g, rv:'\u00B2' },{ re:/&sup3;/g, rv:'\u00B3' },{ re:/&acute;/g, rv:'\u00B4' },{ re:/&micro;/g, rv:'\u00B5' },{ re:/&para;/g, rv:'\u00B6' }
        ,{ re:/&middot;/g, rv:'\u00B7' },{ re:/&cedil;/g, rv:'\u00B8' },{ re:/&sup1;/g, rv:'\u00B9' },{ re:/&ordm;/g, rv:'\u00BA' },{ re:/&raquo;/g, rv:'\u00BB' },{ re:/&frac14;/g, rv:'\u00BC' }
        ,{ re:/&frac12;/g, rv:'\u00BD' },{ re:/&frac34;/g, rv:'\u00BE' },{ re:/&iquest;/g, rv:'\u00BF' },{ re:/&Agrave;/g, rv:'\u00C0' },{ re:/&Aacute;/g, rv:'\u00C1' },{ re:/&Acirc;/g, rv:'\u00C2' }
        ,{ re:/&Atilde;/g, rv:'\u00C3' },{ re:/&Auml;/g, rv:'\u00C4' },{ re:/&Aring;/g, rv:'\u00C5' },{ re:/&AElig;/g, rv:'\u00C6' },{ re:/&Ccedil;/g, rv:'\u00C7' },{ re:/&Egrave;/g, rv:'\u00C8' }
        ,{ re:/&Eacute;/g, rv:'\u00C9' },{ re:/&Ecirc;/g, rv:'\u00CA' },{ re:/&Euml;/g, rv:'\u00CB' },{ re:/&Igrave;/g, rv:'\u00CC' },{ re:/&Iacute;/g, rv:'\u00CD' },{ re:/&Icirc;/g, rv:'\u00CE' }
        ,{ re:/&Iuml;/g, rv:'\u00CF' },{ re:/&ETH;/g, rv:'\u00D0' },{ re:/&Ntilde;/g, rv:'\u00D1' },{ re:/&Ograve;/g, rv:'\u00D2' },{ re:/&Oacute;/g, rv:'\u00D3' },{ re:/&Ocirc;/g, rv:'\u00D4' }
        ,{ re:/&Otilde;/g, rv:'\u00D5' },{ re:/&Ouml;/g, rv:'\u00D6' },{ re:/&times;/g, rv:'\u00D7' },{ re:/&Oslash;/g, rv:'\u00D8' },{ re:/&Ugrave;/g, rv:'\u00D9' },{ re:/&Uacute;/g, rv:'\u00DA' }
        ,{ re:/&Ucirc;/g, rv:'\u00DB' },{ re:/&Uuml;/g, rv:'\u00DC' },{ re:/&Yacute;/g, rv:'\u00DD' },{ re:/&THORN;/g, rv:'\u00DE' },{ re:/&szlig;/g, rv:'\u00DF' },{ re:/&agrave;/g, rv:'\u00E0' }
        ,{ re:/&aacute;/g, rv:'\u00E1' },{ re:/&acirc;/g, rv:'\u00E2' },{ re:/&atilde;/g, rv:'\u00E3' },{ re:/&auml;/g, rv:'\u00E4' },{ re:/&aring;/g, rv:'\u00E5' },{ re:/&aelig;/g, rv:'\u00E6' }
        ,{ re:/&ccedil;/g, rv:'\u00E7' },{ re:/&egrave;/g, rv:'\u00E8' },{ re:/&eacute;/g, rv:'\u00E9' },{ re:/&ecirc;/g, rv:'\u00EA' },{ re:/&euml;/g, rv:'\u00EB' },{ re:/&igrave;/g, rv:'\u00EC' }
        ,{ re:/&iacute;/g, rv:'\u00ED' },{ re:/&icirc;/g, rv:'\u00EE' },{ re:/&iuml;/g, rv:'\u00EF' },{ re:/&eth;/g, rv:'\u00F0' },{ re:/&ntilde;/g, rv:'\u00F1' },{ re:/&ograve;/g, rv:'\u00F2' }
        ,{ re:/&oacute;/g, rv:'\u00F3' },{ re:/&ocirc;/g, rv:'\u00F4' },{ re:/&otilde;/g, rv:'\u00F5' },{ re:/&ouml;/g, rv:'\u00F6' },{ re:/&divide;/g, rv:'\u00F7' },{ re:/&oslash;/g, rv:'\u00F8' }
        ,{ re:/&ugrave;/g, rv:'\u00F9' },{ re:/&uacute;/g, rv:'\u00FA' },{ re:/&ucirc;/g, rv:'\u00FB' },{ re:/&uuml;/g, rv:'\u00FC' },{ re:/&yacute;/g, rv:'\u00FD' },{ re:/&thorn;/g, rv:'\u00FE' }
        ,{ re:/&yuml;/g, rv:'\u00FF' },{ re:/&fnof;/g, rv:'\u0192' },{ re:/&Alpha;/g, rv:'\u0391' },{ re:/&Beta;/g, rv:'\u0392' },{ re:/&Gamma;/g, rv:'\u0393' },{ re:/&Delta;/g, rv:'\u0394' }
        ,{ re:/&Epsilon;/g, rv:'\u0395' },{ re:/&Zeta;/g, rv:'\u0396' },{ re:/&Eta;/g, rv:'\u0397' },{ re:/&Theta;/g, rv:'\u0398' },{ re:/&Iota;/g, rv:'\u0399' },{ re:/&Kappa;/g, rv:'\u039A' }
        ,{ re:/&Lambda;/g, rv:'\u039B' },{ re:/&Mu;/g, rv:'\u039C' },{ re:/&Nu;/g, rv:'\u039D' },{ re:/&Xi;/g, rv:'\u039E' },{ re:/&Omicron;/g, rv:'\u039F' },{ re:/&Pi;/g, rv:'\u03A0' }
        ,{ re:/&Rho;/g, rv:'\u03A1' },{ re:/&Sigma;/g, rv:'\u03A3' },{ re:/&Tau;/g, rv:'\u03A4' },{ re:/&Upsilon;/g, rv:'\u03A5' },{ re:/&Phi;/g, rv:'\u03A6' },{ re:/&Chi;/g, rv:'\u03A7' }
        ,{ re:/&Psi;/g, rv:'\u03A8' },{ re:/&Omega;/g, rv:'\u03A9' },{ re:/&alpha;/g, rv:'\u03B1' },{ re:/&beta;/g, rv:'\u03B2' },{ re:/&gamma;/g, rv:'\u03B3' },{ re:/&delta;/g, rv:'\u03B4' }
        ,{ re:/&epsilon;/g, rv:'\u03B5' },{ re:/&zeta;/g, rv:'\u03B6' },{ re:/&eta;/g, rv:'\u03B7' },{ re:/&theta;/g, rv:'\u03B8' },{ re:/&iota;/g, rv:'\u03B9' },{ re:/&kappa;/g, rv:'\u03BA' }
        ,{ re:/&lambda;/g, rv:'\u03BB' },{ re:/&mu;/g, rv:'\u03BC' },{ re:/&nu;/g, rv:'\u03BD' },{ re:/&xi;/g, rv:'\u03BE' },{ re:/&omicron;/g, rv:'\u03BF' },{ re:/&pi;/g, rv:'\u03C0' }
        ,{ re:/&rho;/g, rv:'\u03C1' },{ re:/&sigmaf;/g, rv:'\u03C2' },{ re:/&sigma;/g, rv:'\u03C3' },{ re:/&tau;/g, rv:'\u03C4' },{ re:/&upsilon;/g, rv:'\u03C5' },{ re:/&phi;/g, rv:'\u03C6' }
        ,{ re:/&chi;/g, rv:'\u03C7' },{ re:/&psi;/g, rv:'\u03C8' },{ re:/&omega;/g, rv:'\u03C9' },{ re:/&thetasym;/g, rv:'\u03D1' },{ re:/&upsih;/g, rv:'\u03D2' },{ re:/&piv;/g, rv:'\u03D6' }
        ,{ re:/&bull;/g, rv:'\u2022' },{ re:/&hellip;/g, rv:'\u2026' },{ re:/&prime;/g, rv:'\u2032' },{ re:/&Prime;/g, rv:'\u2033' },{ re:/&oline;/g, rv:'\u203E' },{ re:/&frasl;/g, rv:'\u2044' }
        ,{ re:/&trade;/g, rv:'\u2122' },{ re:/&larr;/g, rv:'\u2190' },{ re:/&uarr;/g, rv:'\u2191' },{ re:/&rarr;/g, rv:'\u2192' },{ re:/&darr;/g, rv:'\u2193' },{ re:/&harr;/g, rv:'\u2194' }
        ,{ re:/&prod;/g, rv:'\u220F' },{ re:/&sum;/g, rv:'\u2211' },{ re:/&minus;/g, rv:'\u2212' },{ re:/&radic;/g, rv:'\u221A' },{ re:/&infin;/g, rv:'\u221E' },{ re:/&asymp;/g, rv:'\u2248' }
        ,{ re:/&ne;/g, rv:'\u2260' },{ re:/&equiv;/g, rv:'\u2261' },{ re:/&le;/g, rv:'\u2264' },{ re:/&ge;/g, rv:'\u2265' },{ re:/&loz;/g, rv:'\u25CA' }
        ,{ re:/&spades;/g, rv:'\u2660' },{ re:/&clubs;/g, rv:'\u2663' },{ re:/&hearts;/g, rv:'\u2665' },{ re:/&diams;/g, rv:'\u2666' }
    ];

    /*****************************************
     * put private functions here
     ****************************************/

    /*
     * construct the module (library) with an index section and a query section.
     */
    var index = {}, query ={};
    var util = { index:index, query:query};

    //end file globals

    /*****************************************************************************************
     * functions in the util.query element are inteded for use in a query pipeline where
     * request, response, context, collectionName, solrServer and solrServerFactory are avaliable
     *
     * @function [query.runTests] run query tests sending output to logger and ctx
     * @param request  The query pipeline's request param
     * @param response the query pipeline's response param
     * @param ctx the query pipeline's context object.  Test results will be added
     * @param collecton the query pipeline's collection name
     * ***************************************************************************************/
    query.runTests = function (request, response, ctx, collection, solrServer, solrServerFactory){
        //do a sanity check on arguments in case they change in some Fusion version
        /*util.logTypeInfo(request,'request');
         util.logTypeInfo(response,'response');
         util.logTypeInfo(ctx,'ctx');
         util.logTypeInfo(collection,'collection');
         util.logTypeInfo(solrServer,'solrServer');
         util.logTypeInfo(solrServerFactory,'solrServerFactory');
         */

        util.runTests(ctx,collection,solrServerFactory);
        var localCtx = makeTestContextWrapper(ctx,'query');

        //TODO: add query specific tests
    };

    /**
     * Append a key:value to the JSONResponse.initialEntity.underlyingObject.fusion as a way to send
     * arbitrary data to the client.
     *
     * JSONResponse (when wt=json) impliments appendObject.  Other AppendableResponses (xml) do not
     * @function
     * @param response a com.lucidworks.apollo.solr.response.JSONResponse object
     * @param key
     * @param value
     */
    query.appendObjectToResponse = function(response, key,value){
        if(response && response.initialEntity && typeof(response.initialEntity.appendObject) === 'function'){
            response.initialEntity.appendObject(key,value);
        }
    };
    /**
     * Append a key:value to the Response.initialEntity as a way to send
     * arbitrary data to the client.
     *
     * @param response a com.lucidworks.apollo.solr.response.AppendableResponse object
     * @param key
     * @param value - String to append
     */
    query.appendStringToResponse = function(response, key,value){
        if(response && response.initialEntity && typeof(response.initialEntity.appendStringList) === 'function'){
            response.initialEntity.appendString(key,value);
        }
    };
    /**
     * Append a key:value to the Response.initialEntity as a way to send
     * arbitrary data to the client.
     *
     * @param response a com.lucidworks.apollo.solr.response.AppendableResponse object
     * @param key
     * @param value - List<String> to append
     */
    query.appendStringsToResponse = function(response, key,value){
        if(response && response.initialEntity && typeof(response.initialEntity.appendStringList) === 'function'){
            response.initialEntity.appendStringList(key,value);
        }
    };

    /**
    *  if using wt=json, Fusion's response object should be a JSONResponse
    *  Depending on the version of Fusion, the returned map will need to be traversed in different ways.
    *  Prior to 4.2 tree.get(response.initialEntity) would get the actual response Map which could be traversed via map.get('response').get('docs')
    *  4.2 uses response.getUnderlyingObject()
    *
    *  on older platforms only the JSONResponse tree Map type is supported.  On newer platforms you get the actual underlying object which is
    *  Map<String, Object> for JSON responses, Document for xml responses etc.
    *
    *  @return the response tree or null if one can't be found
    */
    query.getUnderlyingObject = function(response){
        var rv = null;

        // 4.2 style
        if(response && typeof(response.getUnderlyingObject) === 'function'){
          rv = response.getUnderlyingObject();
        }
        //old style
        else if(response && response.initialEntity && util.getTypeOf(response.initialEntity) == 'JSONResponse' ){
            var tree = com.lucidworks.apollo.solr.response.JSONResponse.class.getDeclaredField("tree");
            tree.setAccessible(true);
            rv = tree.get(response.initialEntity)
        }
        return rv;
    }
    /***************************************************************************************************
     * functions in the util.index element are intended for use in an index pipeline where
     * doc, context, collectionName, and solrServerFactory are available.
     * ************************************************************************************************/
    index.runTests = function(doc,ctx,collection,solrServerFactory){

        util.runTests(ctx,collection,solrServerFactory);
        var localCtx = makeTestContextWrapper(ctx,'index');
        //make a fake doc to test with.
        var tester = PipelineDocument.newDocument("TestRecord_ID_0");
        var fv = new ArrayList();
        fv.add("   this ");
        fv.add(' \nfield ');
        fv.add('  has      whitespace   ');
        tester.addFields('whitespace_ss',fv);
        fv.clear();
        fv.add('this ');
        fv.add('is a ');
        fv.add('multivalued string');
        tester.addFields('mvstring_ss',fv);

        var clone = index.clonePipelineDoc(tester,"newIDValue");

        tester.addField('mvstring_ss',' noClone');

        //do tests

        //Test 1: index.getFieldNames(tester,'__test_field__')
        var params = [tester,'__test_field__'];
        tester.addField('__test_field__','test_field');
        util.doTest( localCtx, 'getFieldNames', params,  index.getFieldNames, "__test_field__");

        //Test 2: index.concatMV(tester,'mvstring_ss','/')
        var params = [tester, 'mvstring_ss','/'];
        util.doTest(localCtx, 'concatMV', params, index.concatMV,'this /is a /multivalued string/ noClone');

        //Test 3: index.trimField(tester,'whitespace_ss')
        var params = [tester,'whitespace_ss'];
        var formatter = function(result){
            var fv = tester.getFieldValues('whitespace_ss');
            //logger.info('\n*********\n* formatter result is ' + fv);
            return fv.toString();
        };
        util.doTest(localCtx, 'trimField',params,index.trimField, '[this, field, has whitespace]', formatter);

        //Test 4: clone.getFirstFieldValue('whitespace_ss');
        var params = ['mvstring_ss'];
        util.doTest(localCtx, 'get_clone_mvstring_ss',params,function(field){return clone.getFieldValues(field);}, '[this , is a , multivalued string]');

        //Test 5: index.trimField(clone,'whitespace_ss');
        var params = [clone,'whitespace_ss'];
        var formatter = function(result){
            var fv = clone.getFieldValues('whitespace_ss');
            //logger.info('\n*********\n* formatter result is ' + fv);
            return fv.toString();
        };
        util.doTest(localCtx, 'trimField(clone)',params,index.trimField, '[this, field, has whitespace]', formatter);

        //Test 6: index.rawField2String(tester, '_raw_content_');
        tester.addField('_raw_content_', new JavaString('byte[] to String').getBytes('UTF-8'));
        var params = [tester,'_raw_content_'];
        util.doTest(localCtx, 'rawField2String', params, index.rawField2String,'byte[] to String');

        //Test 7: map SolrDocument fields into tester
        //test the mapping of a solr doc into tester
        var fieldMap = {
            'fromSolr_s': 'toDoc_s'
        };
        var solrDoc = new org.apache.solr.common.SolrDocument();
        solrDoc.addField('fromSolr_s', 'value from solr document');
        var params = [tester,solrDoc,fieldMap];
        formatter = function(result){
            var fv = tester.getFieldValues('toDoc_s');
            //logger.info('\n*********\n* formatter result is ' + fv);
            return fv ? fv.toString() : null;
        };
        util.doTest(localCtx, 'copyFieldsFromSolr',params,index.copyFieldsFromSolr, '[value from solr document]', formatter);


        //end of index tests
    };
    /**
     * Clone a PipelineDocument
     * @param pipelineDoc
     * @param id  optional id.  If valued, the clone will have this set
     */
    index.clonePipelineDoc = function(pipelineDoc, id){
        var clone = new PipelineDocument(pipelineDoc);
        if(id){
            clone.setId(id);
        }
        return clone;
    };
    /**
     * Transfer fields from an org.apache.solr.common.SolrDocument into a PipelineDocument
     *
     * TODO: write test case and debug??
     *
     * @param doc {PipelineDocument}
     * @param solrDoc {org.apache.solr.common.SolrDocument}
     * @param fieldMap a hash {} of solrDoc fieldNames : pipelineDocument fieldnames.
     */
    index.copyFieldsFromSolr = function(doc, solrDoc, fieldMap){
        for( var solrFieldName in fieldMap){
            var pipelineFieldName = fieldMap[solrFieldName] || solrFieldName;
            //logger.info('\n\n************\n* copying Solr field:"' + solrFieldName + '" to: "' + pipelineFieldName+ '" \n*****************************\n\n');

            if(solrDoc.containsKey(solrFieldName)){
              doc.addField(pipelineFieldName, solrDoc.get(solrFieldName));
                //logger.info('\n\n************\n* added "' + pipelineFieldName + '" : "' + solrDoc.get(solrFieldName) + '" \n*****************************\n\n');
            }else{
                logger.warn('Could not find field "' + solrFieldName + '" in solrDocument with fields: ' + solrDoc.getFieldNames());
            }
        }
    };

    /**
     *
     * call this via 'util._stubLogger.call(this)' to set this.logger to an object which uses the nashor print method instead
     * of calls to logger.  This is useful in a test harness where the logger global has not been set.
     * @private
     */
    util._stubLogger = function(){
        if (! this.logger){
            var logger = {};
            var localPrint = function(arg){print(arg);}
            logger.debug = logger.info = logger.warn = logger.erro = localPrint;
            this.logger = logger;
        }
    };
    /**
     * Log with a Prefix to make grep issolation easy
     * @param prefix
     * @param line
     * @param level optional (info)
     * @param lgger optional (logger)
     */
    util.log4grep = function(prefix,line,level,lgger){
        lgger = lgger || logger;
        level = level || 'info';
        level = level.toLowerCase();
        if(level != 'debug' && level != 'info' && level != 'warn' && level != 'error'){
            level = 'info';
        }
        prefix = prefix || '';

        var f = lgger[level];
        if(typeof(f) === 'function'){
            lgger[level]('\n ' + prefix + ' ' + line);
        }
    };
    /**
     * Take a JavaScript array [], Java Array or Java Collection and turn it into a JavaScript array.
     * While this is often not needed it can help to unify types and provide input flexibility.
     *
     * Note: Nashorn allows collection.length and collection[i] accesses as if it were an array but push, pop, shift etc are not translated.
     *
     * @param collection  a Javascript array, Java Array or Java Collection
     * @return a shallow copy of collection as a JavaScript array [].  or collection if collection was not a valid input type
     */
    util.toJSArray = function(collection){

        if( util.isJavaCollection(collection) || util.isJavaArray(collection)){
            collection = Java.from(collection);
        }
        return collection;
    };
    /**
     * convert a raw field i.e. _raw_content_ byteArray into a Java String
     *
     * @param byteArray
     * @param charset
     * @return {*}
     */
    util.raw2String = function(byteArray,charset){
        charset = charset || 'UTF-8';
        if(byteArray) {
            return new JavaString(byteArray,charset);
        }
    };
    /**
     *
     * @param doc PipelineDocument
     * @param fieldname fieldname containing byte[] e.g. _raw_content_
     * @param charset  optional charset encoding name.  Default 'UTF-8'
     * @return {string} Java String object or, if doc[fieldname] is empty, ''.
     */
    index.rawField2String = function(doc,fieldname, charset){
        var bytes = doc.getFirstFieldValue(fieldname); //this should be a byte array
        var s = '';
        if(bytes){
            s = util.raw2String(bytes,charset);
        }
        return s;
    };
    /** spin thru all field names and return the ones matching the pattern
     * For example, parsers which handle document nesting sometimes produce lists of fields such as
     * email.0.name="work", email.1.name="personal"... and
     * email.0.value='jsmith@corp.com', email.1.value='jsmith@yahoo.com' etc.
     *
     * Calling this function with a pattern such as 'email.*value' will return ['email.0.value','email.1.value']
     * In effect it extracts the field names of interest.
     *
     * @param doc  The index PipelineDocument
     * @param pattern a regex used to find field names default = '.*'
     */
    index.getFieldNames = function(doc, pattern){
        pattern = pattern || '.*';
        var fNames = doc.getFieldNames(); // ::Set<String>
        var matched = [];
        fNames.forEach(function (key){
            //logger.info('checking field ' + key + ' against pattern ' + pattern );
            if(key.matches(pattern)){
                // logger.info('matched! ' + key );
                matched.push(key);
            }
        });
        return matched;
    };

    /**
     * concatenate all elements of a multi-valued field named 'name' separated by a delimiter string
     * So if a doc has name_ss containing ['joe','jose','joseph','joe'] this function will
     * return the String "joe, jose, joseph".
     *
     * @param doc - the doc who's field values will be concatenated
     * @param name - the name of the multi-valued field with the values to concatenate
     * @param delim - optional delimiter default == ', '
     */
    index.concatMV = function(doc,name, delim){
        delim = delim || ', ';
        var concat = [];
        doc.getFieldValues(name).forEach(function (val){
            concat.push(val);
        });
        return util.dedup( concat).join(delim);
    };
    /**
     * catenate values of an array of fields separated by a delimiter and added to a destination field
     *
     * This uses the .toString() value of each field so it can give odd results on non-string or multivalued fields
     * @param doc (required_
     * @param fieldNames (required) array of field names
     * @param destinationFieldName (required)
     * @param delim (default '')
     * @param requireAll  - if true then destination field will only be created if all fields are valued
     */
    index.combineFieldValues =  function(doc, fieldNames,destinationFieldName,delim,requireAll){
        var fld;
        delim = delim || "";
        var fieldVals = [];

        //first get an array of field values
        if(fieldNames && fieldNames.length){
            for(var i = 0; i < fieldNames.length; i++){
                fld = doc.getFirstFieldValue(fieldNames[i]);
                if(fld ){
                    //logger.info("FIELD_COMBINE field val:type is " + fld + ":" + util.getTypeOf(fld));
                    fieldVals.push(fld.toString());
                }else if( requireAll){
                    //logger.info("FIELD_COMBINE skipping because requireAll = true and field is empty");
                    return;
                }
            }
        }

        if(fieldVals.length){
            var value = fieldVals.join(delim);
            logger.debug('Combining fieldVals: ' + fieldVals + ' into "' + value + '"');
            doc.addField(destinationFieldName,value);
        }
    };

    index.copyField = function(doc, sourcefield, targetField){
        var fieldVal = doc.getFirstField(sourcefield)
        if(fieldVal){
            doc.addField(targetField,fieldVal);
        }
    };
    /**
     *  Remove whitespace from all elements of the field called fieldName.  Beginning and trailing whitespace is trimmed
     *  and redundant internal whitespace is reduced to ' '.
     * @param doc
     * @param fieldName
     */
    index.trimField = function(pdoc, fieldName){
        var fa = new ArrayList();
        var field;
        var fields = pdoc.getFieldValues(fieldName);
        logger.info('got fields '+ fields);
        for(var i in fields){
            field = fields[i];
            var typ = util.getTypeOf(field);
            if("string" === typ  || 'String' === typ){
                field = util.trimWhitespace(field);
                fa.add(field);
                //logger.info('\n********\n* pushing type  '+ typ + ' trimmed val: ' + field);
            }else {
                //logger.info('\n******\n* pushing type  '+ typ + ' val: ' + field);
                fa.add(field);
            }
        }
        logger.info('replacing '+ fieldName + ' with: ' + fa);
        if(! fa.isEmpty()) {
            pdoc.setFields(fieldName,fa);
        }
    };

    /**********************************************************************************************************
     *            UTIL functions.  These should not require doc, request, response or other pipeline specific objects
     *********************************************************************************************************/
    util.logTypeInfo = function(obj,name){
        var type = util.getTypeOf(obj);
        logger.info('Variable called "' + name + '" IS A "' + type + '"');
    };

    /**
     * Remove whitespace from start and end of str.  Also remove redundant whitespace (set to space).
     * @param str
     * @return {string}
     */
    util.trimWhitespace = function(str){
        var val = null !=str?str.toString().trim():"";
        //now remove the redundant inner whitespace
        val = val.replace(/\s+/g, " ");
        return val;
    };

    /**
     *
     * @param varargs  One or more arguments which can be String or String[].  These will all be concatenated together
     * into a single String[] and returned
     */
    util.concat = function(varargs){
        var invocationArgs = Array.prototype.slice.call(arguments);
        //logger.debug("\n********\n* concat args: " + invocationArgs);
        var a = [];
        for(var i = 0; i < invocationArgs.length; i++){
            var arg = invocationArgs[i];
            if(Array.isArray(arg)){
                a = a.concat(arg);
            }else if(typeof(arg) === typeof(String())){
                a.push(arg);
            }else if(util.isJavaType(arg)){
                a.push(arg.toString());
            }
        }
        return a.join('');
    };
    /**
     * Turn a JS or Java Date object into an ISO 8601 formatted String (YYYY-MM-DDTHH:mm:ss.sssZ)
     *
     * @param d
     */
    util.dateToISOString = function(d){

        if(util.isJavaType(d) && 'java.util.date' == d.getClass().getName() ){
            return ISO8601DATEFORMAT.format();
        }else if( util.getTypeOf(d) === 'date' ){
            return d.toISOString();
        }
        return null;
    };
    /**
     * turn an ISO8601 formatted String into a Java Date( YYYY-MM-DDTHH:mm:ss.sssZ)
     * @param s
     */
    util.isoStringToDate = function(s){
        if(s ){
            return ISO8601DATEFORMAT.parse(s);
        }
    };
    util.runTests = function(ctx){
        var localCtx = makeTestContextWrapper(ctx,'util');
        var params = [['a','b','c','a','b']];
        util.doTest(localCtx, 'dedup', params,  util.dedup, 'a,b,c');

        params = ["<span data-attr='one'>inner &nbsp;text </span>"];
        util.doTest(localCtx, 'stripTags', params,  util.stripTags,' inner  text ');

        params = ["Lorem Ipsum text",
            10,true
        ];
        util.doTest(localCtx, 'truncateString', params,  util.truncateString,"Lorem");
        params[2] = false;
        util.doTest(localCtx, 'truncateString2', params,  util.truncateString,"Lorem Ips");

        //don't assume an open internet connection.  Perhaps use localhost:8764/api
        //params = ["http://ip.jsontest.com"];
        //util.doTest(localCtx, 'queryHttp2Json', params,  util.queryHttp2Json,'{"ip":"63.238.47.2"}', JSON.stringify);

        params = ['P@$$w0rd'];
        util.doTest(localCtx, 'encrypt String', params,  util.encrypt,'pWwEhTKVSiqXWd06oAs5Sw==');

        params = [util.encrypt('P@$$w0rd')];
        util.doTest(localCtx, 'decrypt String', params,  util.decrypt,'P@$$w0rd');

        params = ['this',',',new JavaString(' is'),[' a', ' test']];
        util.doTest(localCtx, 'concat', params,  util.concat,'this, is a test');

        params = ['   the   string  \n  has \r\n whitespace   ' ];
        util.doTest(localCtx, 'trimWhitespace', params,  util.trimWhitespace,'the string has whitespace');

        params = [ "quoted string" ,true];
        util.doTest(localCtx, 'getTypeOf', params,  util.getTypeOf,'java.lang.String' );

        params = [new JavaString("Java string") ,true];
        util.doTest(localCtx, 'getTypeOf', params,  util.getTypeOf,'java.lang.String');

        params = [1.001 ,true];
        util.doTest(localCtx, 'getTypeOf', params,  util.getTypeOf,'java.lang.Double');
        params = [1 ,true];
        util.doTest(localCtx, 'getTypeOf', params,  util.getTypeOf,'java.lang.Integer');
    };
    /**
     * run a test function and send results to the ctx object
     * @param outCtxObj  The context object onto which results are added.
     * @param testName  String name of the test
     * @param params    Array of parameters to pass to the testFunction
     * @param testFunc  testFunction callback
     * @param expected  expected result from testFunction
     * @param formatter optional formatter callback to format result into human-readable result
     *
     * @return void but results will be added to coutCtxObj[testName]
     */
    util.doTest = function( outCtxObj, testName, params, testFunc, expected,formatter) {
        if (typeof formatter !== 'function') {
            formatter = function (testResult) {
                return new JavaString(testResult.toString());
            };
        }

        try {
            params = params || [];
            var pString = params.toString();
            if(pString.length() > 35){
                pString = util.truncateString(pString,35) + '... ';
            }
            var testDesc = new JavaString( testName + "(" + pString + ")='");
            var result = testFunc.apply(this, params);
            result = formatter(result);
        }catch(e){
            result = "ERROR: " + e;
        }
        var resultMap = {
            'testName':testName
            , 'expectedResult': expected
            , "actualResult":result
            , 'params' : params.toString()
        }
        var passed = result == expected;
        if( passed || !expected ) {
            logger.info('Utility test passed: ' + testDesc + result );
            getSubMap(outCtxObj,'passed').put(testDesc,resultMap);
        }else{
            logger.error('Utility test ' + testName + ' Failed.\n* Actual  : "' + result + '"\n* Expected: "' + expected + '"');
            getSubMap(outCtxObj,'failed').put(testDesc, resultMap);
        }
    };

    /**
     * Test an object to see if it looks like a Java Object
     * @param obj
     * @return true if the object is valued and contains getClass, notify and hashCode functions.
     */
    util.isJavaType = function(obj){
        return (obj && typeof obj.getClass === 'function' && typeof obj.notify === 'function' && typeof obj.hashCode === 'function');
    };

    util.isJavaArray = function(obj){
      return (obj && util.isJavaType(obj) && util.getTypeOf(obj).endsWith('[]'));
    };
    util.isJavaCollection = function(collection){
        //.class notation causes YUI minify to error out.
      return util.isJavaType(collection) && java.util.Collection['class'].isInstance( collection );
    };
    /**
     * For Java objects return the simplified version of their classname e.g. 'String' for a java.lang.String
     * Java naming conventions call for upper case in the first character.
     *
     * For JavaScript objects, the type will be a lower case string e.g. 'string' for a javascript String
     *
     */
    util.getTypeOf = function getTypeOf(obj, verbose){
        'use strict';
        var typ = 'unknown';
        var isJava = util.isJavaType(obj);
        //this.log4grep("UTIL getTypeOf:called with verbose: ",verbose);
        //test for java objects
        if( isJava && verbose ){
            typ = obj.getClass().getName();
            //this.log4grep("UTIL getTypeOf:inverbose block, type:: ",typ);
        }else if( isJava ){
            typ = obj.getClass().getSimpleName();
        }else if (obj === null){
            typ = 'null';
        }else if (typeof(obj) === typeof(undefined)){
            typ = 'undefined';
        }else if (typeof(obj) === typeof(String())){
            typ = 'string';
        }else if (Array.isArray(obj)) {
            typ = 'array';
        }
        else if (Object.prototype.toString.call(obj) === '[object Date]'){
            typ = 'date';
        }else {
            typ = obj ? typeof(obj) :typ;
        }
        return typ;
    };

    /**
     * dedup an array by pushing each value into a map and then pulling them back.
     * @param a the JavaScript array to dedup
     */
    util.dedup = function(arr){

        var set = {};
        var dedup = [];
        for(var i = 0; i < arr.length; i++){
            set[arr[i]]='';
        }
        //logger.info('\n\nDEDUP set is' + set +  '\n\n');
        //turn deduped set to array
        for (var p in set) {
            if( set.hasOwnProperty(p) ) {
                dedup.push(p);
            }
        }
        return dedup;
    };
    /**
     * Strip out HTML tags
     * @param value
     * @returns {XML|void|string}
     */
    util.stripTags = function(value){
        var stripped = value.replace(/[<][^>]*[>]/ig, ' ');
        //replace duplicate white space
        stripped = stripped.replace(/\s+/g, ' ');

        for(var i = 0; i < replacements.length; i++){
            var rp = replacements[i];
            stripped = stripped.replace(rp.re,rp.rv);
        }
        return stripped;
    };
    /**
     * chop a string to n characters
     * @param s
     * @param n
     * @param useWordBoundary
     * @returns {string}
     */
    util.truncateString = function(s, n, useWordBoundary){
        s = s || '';
        var s_;
        var isTooLong = s.length > n;
        s_ = isTooLong ? s.substr(0, n - 1) : s;
        s_ = (useWordBoundary && isTooLong) ? s_.substr(0, s_.lastIndexOf(' ')) : s_;
        return s_;
    };

    util.queryHttp = function (url){

        logger.debug('BUILDING HTTP REQUEST : ' );
        var client = HttpClientBuilder.create().build();
        var request = new HttpGet(url);
        logger.debug('SUBMITTING HTTP REQUEST : ' + request);
        var rsp = client.execute(request);

        return rsp;
    };
    /**
     * Perform an HTTP GET and if text or json is returned, read it as a String
     *
     * @param url
     * @param charSetName (default=UTF-8)
     * @return {string}
     */
    util.queryHttp2String = function(url,charSetName) {
        charSetName = charSetName || 'UTF-8';
        var responseString = "";
        var rsp = this.queryHttp(url);
        logger.debug('MESSAGE got resp: ' + rsp );
        if (rsp && rsp.getEntity()) {
            var entity = rsp.getEntity();
            var contentType = rsp.getEntity().getContentType();
            if(contentType && (
                contentType.getValue() == 'application/json' ||
                contentType.getValue().startsWith('text')
                ))
            {
                responseString = IOUtils.toString(entity.getContent(), charSetName);
            }
        }
        return responseString
    };
    /**
     * Perform an HTTP GET request for a URL and parse the results to JSON.
     */
    util.queryHttp2Json =function(url, charSetName){
        charSetName = charsetName || 'UTF-8'
        var responseString = this.queryHttp2String(url,charSetName);
        logger.debug('MESSAGE HTTP_GET resp: ' + responseString );
        return JSON.parse(responseString);
    };

    /**
     *
     * @param collectionName  name of the collection being queried by Solr
     * @param solrServerFactory  The factory used to create/get the SolrClient object.  This is a pipeline stage parameter
     * @returns solrClient
     */
    util.makeSolrClient = function(collectionName, solrServerFactory){
        //logger.info('solrServerFactory isa: ' + util.getTypeOf(solrServerFactory));
        var solrClient = solrServerFactory.getSolrServer(collectionName);
        return solrClient;
    };
    /**
     * Delete a known document from Solr.
     *
     * Note:  unless you call some form of client.commit()  you may not see this for a while.
     *
     * @param solrClient The SolrJ client AKA solrServer
     * @param id
     * @return  the org.apache.solr.client.solrj.response.UpdateResponse
     */
    util.deleteById = function(id,solrClient){
        var response;
        try {
            if(solrClient) {
                response = solrClient.deleteById(id);
                //check response
                if(response.getStatus() != 200){
                    logger.warn("got not 200 status (" + response.getStatus() + ")when attempting to delete Solr document " + id);
                }
            }
        }catch (error) {
            logger.error("Error deleting from Solr for id:'" + id + "'" + error);
        }
        return response;
    };
    /**
    * Make a PipelineDocument holding a Delete command
    * @param id  - the id of the document to be deleted from Solr
    * @return PipelineDocument.newDelete(id)
    */
    util.makeDeleteCommand = function(id){
        return PipelineDocument.newDelete(id, true);

    }
    index.makeDeleteCommand = function(doc){
       return util.makeDeleteCommand(doc.getId());
    }

    /**
     * sample function intended for copy-paste reuse
     *
     * @param query Solr query i.e. '*:*'
     * @param solrClient
     * @return  the org.apache.solr.client.solrj.response.UpdateResponse
     */
    util.querySolr = function(query, solrClient) {
        var q = query || '*:*';
        try {
            var sq = new SolrQuery(q);
            //
            var resp = solrClient.query(sq);
            /*
             var cnt = 0;
             var message = '';
             resp.getResults().forEach(function (respDoc) {
             message += ('\n\tmessage_t for result ' + (cnt++) + ' is: ' + respDoc.getFirstValue('message_t') );
             });
             logger.info('\n\nMessages: ' + message);
             */
            return resp;
        } catch (error) {
            logger.error("Error querying solr for '" + query + "' Err: " + error);
        }
        return null;
    };

    /**
     *
     * @returns path of $FUSION_HOME
     */
    util.getFusionHomeDir = function(){
        // should we be using java.lang.System.getProperty('apollo.home')??
        //This is set in the environment of the java process which launches Fusion
        var fh = java.lang.System.getProperty('apollo.home');
        // var fh = null;
        // if(env){
        //     fh = env.get('FUSION_HOME');
        // }
        return fh;
    };
    /**
     *
     * @returns Properties object holding the $FUSION_HOME/conf/fusion.properties
     */
    util.getFusionConfigProperties = function(){
        var HOME = util.getFusionHomeDir();
        var S = System.getProperty('file.separator');
        var configFilePath = HOME + S + 'conf' + S + 'fusion.properties';
        return util.readPropFile(configFilePath);
    };
    /**
     * @param filename as a String
     * @return Properties
     */
    util.readPropFile = function(filename){
        var prop = new Properties();
        var input = null;
        try{
            input = new FileInputStream(filename);
            // load a properties file
            prop.load(input);
        }
        catch(ex){
            logger.error('*** could not read ' + filename );
            logger.error(ex);
        }
        finally{
            if(input){
                input.close();
            }
        }
        return prop;
    };
    /**
     *
     * @param toEncrypt string to encrypt
     * @param cipherKey  cipher key of 16, 24, or 32 bytes in length (8, 12 or 16 chars)
     * @returns encrypted string
     */
    util.encrypt = function(toEncrypt, cipherKey){
        cipherKey = cipherKey || 'Unkn0wnK3y$trlng';
        var text = new JavaString(toEncrypt);
        var key = new JavaString(cipherKey);
        var aesKey = new SecretKeySpec(key.getBytes(),'AES');
        var cipher = Cipher.getInstance('AES');
        cipher.init(Cipher.ENCRYPT_MODE, aesKey);
        var encryptedBytes = cipher.doFinal(text.getBytes());
        var encoder = Base64.getEncoder();
        var encryptedString = encoder.encodeToString(encryptedBytes);
        logger.debug('encrypted ' + toEncrypt + ' as ' + encryptedString);
        return encryptedString;
    };
    /**
     * @param toDecrypt
     * @param cipherKey  cipher key of 16, 24, or 32 bytes in length (8, 12 or 16 chars)
     * @return decrypted string
     */
    util.decrypt = function(toDecrypt, cipherKey){
        cipherKey = cipherKey || 'Unkn0wnK3y$trlng';
        var key = new JavaString(cipherKey);
        var aesKey = new SecretKeySpec(key.getBytes(),'AES');
        var encryptedString = new JavaString(toDecrypt);
        var decoder = Base64.getDecoder();
        var cipher = Cipher.getInstance('AES');
        cipher.init(Cipher.DECRYPT_MODE, aesKey);
        var decrypted = new JavaString(cipher.doFinal(decoder.decode(encryptedString)));
        logger.debug('decrypted ' + toDecrypt + ' as ' + decrypted);
        return decrypted;
    };

    util.tikaParseFileToString = function(javaFile, logErrorCB){
        try
        {
            var tikaText = new org.apache.tika.Tika;
            var tikaTextParsed = tikaText.parseToString(javaFile);
        }catch(err){
            if(logErrorCB && typeof logErrorCB === 'function'){
                logErrorCB.call(this,javaFile,err);
            }else {
                logger.error('could not tika-parse File:' + javaFile + ' Message: ' + err);
            }
        }
        return tikaTextParsed
    };
    util.tikaParseURLToString = function(javaURL, logErrorCB){
        try
        {
            var tikaText = new org.apache.tika.Tika;
            var tikaTextParsed = tikaText.parseToString(javaURL);
        }catch(err){
            if(logErrorCB && typeof logErrorCB === 'function'){
                logErrorCB.call(this,javaURL,err);
            }else {
                logger.error('could not tika-parse URL:' + javaURL + ' Message: ' + err);
            }
        }
        return tikaTextParsed
    }

    /**
     * Execute a command via Runtime.exec() a
     * @param cmd Process
     */
    util.exec = function(cmd){
        try{
            var proc = java.lang.Runtime.getRuntime().exec(cmd);
            return proc;
        }catch(e){
            throw e;
        }
    }

    /**
     * Read an InputStream to a String (UTF-8 assumed)
     * @private
     */
    util._readToBuffer = function (is,buffer){
        while(is.available()){
            buffer.append(IOUtils.toString(is,"UTF-8"))
        }
    };
    /**
     * Check a Process object to see if it is done.  If the process is long-running and
     * @private
     * @param process
     * @return exit code if complete, null if still running.
     */
    util._checkProcessExit = function(process){
        var ev = null;
        try{
            ev = process.exitValue();
        }catch(e){
            //IllegalThreadStateException is thrown if the process is still running
            if(! (e instanceof Java.type("java.lang.IllegalThreadStateException") )){
                throw e;
            }
        }
        return ev;
    };
    /**
     * Execute a command-line process, buffering the stdout and stderr.
     * If run as part of a Fusion pipeline, long-running processes will cause a pipeline timeout.
     * If the buffered output is large it can affect heap.
     *
     * The HTTP timeout for pipeline operations is configurable via:
     * ui.jvmOptions = -Dcom.lucidworks.apollo.admin.proxy.socket.timeout=TIMEOUT_MS
     *
     * @return array[0]=exit code, [0] = stdout buffer (String) and [1] = stderr buffer (String)
     */
    util.execAndBuffer = function(cmd){

        var EXIT = 0;
        var OUT = 1;
        var ERR = 2;
        var rv = [null,new StringBuilder(),new StringBuilder()];
        var inReader,errReader;
        try{
            var proc = util.exec(cmd)
            var stdIn = proc.getInputStream();
            var stdErr = proc.getErrorStream();
            do{
                //read in output while it's there then check to see if we have an exit
                rv[EXIT] = util._checkProcessExit(proc);
                for(var i = 0; i < 10; i++){
                    util._readToBuffer(stdIn,rv[OUT]);
                    util._readToBuffer(stdErr,rv[ERR]);
                }

            }while(rv[EXIT] == null);
        }catch(e){
            throw e
        }finally{
            if(proc && proc.getInputStream()){
                proc.getInputStream().close();
            }
            if(proc && proc.getErrorStream()){
                proc.getErrorStream().close();
            }
        }
        //convert StringBuilder to String
        rv[OUT] = rv[OUT].toString();
        rv[ERR] = rv[ERR].toString();
        return rv;
    }

    //by returning util, it (as well as util.index and util.query) will be accessible/public.
    util.getSubMap = getSubMap;//expose private getSubMap
    return util;
}).call(this); // jshint ignore: line

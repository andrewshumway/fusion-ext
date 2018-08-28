# Overview
The sample scripts and utilLib.js are an updated version of contents
described in the Aug 2017 blog post https://lucidworks.com/2017/08/16/fusion-javascript-shared-scripts-utility-functions-unit-tests/

This version has updated utilities and is loaded from the Fusion Blob API
rather than off of the server file system.

### ./IPL
The IPL directory contains sample Index pipelines.  Of note is the samplePipeline.js which can be used as a template for 
any script which loads the shared code in utilLib.js.  

### ./QPL
The QPL directory contains sample Query pipelines.  Of note is the samplePipeline.js which can be used as a template for 
any script which loads the shared code in utilLib.js.


### IF API and CONNECTOR SERVICE ARE ON SEPARATE MACHINES!
 
 The ` var loadBlobScript` function in either of the two `samplePipeline.js` examples contain a function near the top called `loadBlobScript`.  The contents of this 
can be replaced with any of the following:

1. A minified copy of `loadBlobScript.js` (default).
2. `./loadBlobScript.js`: This loads the shared script from the blob store via the API service which greatly simplifies loading and caching.
    1. This only works if the name/IP of the API server is known.  
    2. This defaults to `localhost` which is correct most of the time.
    3. On topologies where `connectors-classic` and `api` services do not run on the same machine, loading the blob directly from Solr may be best
2. `./loadBlobScriptFromSolr.js`:  This loads the blob from Solr rather than from the API service.  While convenient, it 
walks the blob structure used by Fusion and so can be brittle.

### to "install"

1. load `utilLib.js` into the blob store on the target instance.  
2. Use one of the samplePipeline.js scripts as a starter template
3. Check log messages which start with `BLOB_LOAD` via banana to see the status.  
4. Double check that the `utilLib.js` loads and parses successfully on all nodes and threads.

    
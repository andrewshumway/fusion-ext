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

 The ` var loadBlobScript` function in either of the two `samplePipeline.js` examples contain two functions near the top called 
 `bootstrapLibrary` and `loadBlobScript` (they may be minimized to the same line).  The contents of these can be replaced with any of the following:

1. Minified copies of `bootstrapLibrary` and `loadBlobScript.js` (default).
2. The contents of the `./loadBlobScript.js` file: This loads the shared script from the blob store via the API service 
which greatly simplifies loading and caching.
    1. only works if the name/IP of the API server is known (default of localhost).  
    3. On topologies where `connectors-classic` and `api` services do not run on the same machine, passing the api server IP or name
    instead of `localhost` is needed.
2. `./loadBlobScriptFromSolr.js`:  This loads the blob from Solr rather than from the API service.  While this does not require pre-knowledge of
the API server name it does require the Solr server name.  Also, because it walks the blob structure used by Fusion it can be brittle.

### "Installation"

1. load `utilLib.js` into the blob store on the target instance.  
2. Use one of the samplePipeline.js scripts as a starter template
3. Check log messages which start with `BLOB_LOAD` via banana to see the status.  
4. Double check that the `utilLib.js` loads and parses successfully on all nodes and threads.
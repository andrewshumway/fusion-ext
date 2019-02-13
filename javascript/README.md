# Overview
The sample scripts and utilLib.js are an updated version of contents
described in the Aug 2017 blog post https://lucidworks.com/2017/08/16/fusion-javascript-shared-scripts-utility-functions-unit-tests/

This version has updated utilities and is loaded from the Fusion Blob API
rather than off of the server file system.

### ./IPL
The IPL directory contains sample Index pipelines.  Of note is the samplePipeline.js which can be used as a template for 
any script which loads the shared code in utilLib.js.  Alternatively, minimalPipelineSample.js can be used for stages which 
do not load a shared library.  

### ./QPL
The QPL directory contains sample Query pipelines.  Of note is the samplePipeline.js which can be used as a template for 
any script which loads the shared code in utilLib.js.

## General issues
Both the minimalPipelineSample and the samplePipeline.js use the Immediately Invoked Function Expression (IIFE) common in client-side JavaScript.
One key advantage of this is that a single `use-script` at the top makes it easier to spot errors early.  Another advantage is that the code
outside of the `return function(...` block executes once performing initialization of static data structures can be done without having
to pay the initialization penalty with every pipeline invocation.

As needed, adjust the `libBlob` and `apiServerName` values in the lazy load block of the `return function(...` section.

* `libBlobName` is the name of the blob containing the library script you wish to load, default=utilLib.js.
* `apiServerName` is a network name or IP address of a node in your Fusion Cluster which is running the API service, default=localhost.

### "Installation" or how to Use in Fusion

1. load `utilLib.js` into the blob store on the target instance.  
2. Use one of the samplePipeline.js scripts as a starter template.
3. First get your stage working as local JavaScript and then move it to the Blob store as a Managed JavaScript Stage if desired (Fusion version 4.1.2+).
4. Check log messages which start with `BLOB_LOAD` via banana to see the status.  
5. Double check that the `utilLib.js` loads and parses successfully on all nodes and threads.
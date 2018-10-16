# fusion-ext
This project contains utilities and tools intended for use with Lucidworks Fusion.


### ./getPut
The getPut directory contains utilities useful when getting or putting objects and artifacts from/to Fusion.
It can be used to back up, restore, or migrate a Fusion App.

#### Release Notes:
15 Oct 2018 - Add the `relatedObjects=false` flag when using PUT on collections in order to avoid extra Profile and Pipeline creation.  Also add `--ignoreExternal` arg to `putApp.py` allowing an import to skip external collection config.  This is handy for environments where external collections are not created and maintained by Fusion.
29 Aug 2018 Initial release

### ./javascript
The javascript directory contains sample Index and Query Pipeline JavaScript stages
along with a set of shared utility functions intended to be accessed via Fusion's blob store and used by
JavaScript stages.

#### Release Notes:
25 Sep 2018 - Add mime-type checks in `util.queryHtp2String()` and (implicitly) `util.queryHttp2Json()`. Mime-Typs of `application/json` or starting with `text` are processed by `util.queryHttp2String()`  
14 Sep 2018 - Wire in Maven to minify `utilLib.js` and `loadBlobScript.js`.  Note, the minified loadBlobScript functions still need to be copy/pasted into `utilLib.js` if modified.
10 Sep 2018 -  Add `util.exec()` and `util.execAndBuffer()` for executing shell process via stage script.
29 Aug 2018 - Initial release

### acknowledgements
The ideas for the getPut scripts originated with the import-export scripts 
at https://github.com/lucidworks/fusion-examples.  The need to simplify 
just what got exported lead to the prefixing paradigm in the 3.x based
`getProject` and `putProject` scripts.  At the same time, Python was used 
instead of bash for ease of use in processing .json results and debug capability.

The sharable utilLib.js and pipeline templates grew out of a Blog post I made
in late 2017. https://lucidworks.com/2017/08/16/fusion-javascript-shared-scripts-utility-functions-unit-tests/

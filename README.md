# fusion-ext
Project: `getPut` for import/export, `javascript` for examples and utilities.  Both for use with Lucidworks Fusion. 


### ./getPut
The getPut directory contains utilities useful when getting or putting objects and artifacts from/to Fusion.
It can be used to back up, restore, or migrate a Fusion App.

#### Release Notes:
 * 29 Aug 2018 Initial release
 * 25 Sep 2018 - Add mime-type checks in `util.queryHtp2String()` and (implicitly) `util.queryHttp2Json()`. Mime-Typs of `application/json` or starting with `text` are processed by `util.queryHttp2String()`
 * 14 Sep 2018 - Wire in Maven to minify `utilLib.js` and `loadBlobScript.js`.  Note, the minified loadBlobScript functions still need to be copy/pasted into `utilLib.js` if modified.
 * 10 Sep 2018 -  Add `util.exec()` and `util.execAndBuffer()` for executing shell process via stage script.
 * 29 Aug 2018 - Initial release
 * 18 Oct 2018 - Add contact info
 * 24 Oct 2018 - Add --keep param to `getApp.py`.  This allows export of selected signals collections.
  * 15 Oct 2018 - Add the `relatedObjects=false` flag when using PUT on collections in order to avoid extra Profile and Pipeline creation.
Also add `--ignoreExternal` arg to `putApp.py` allowing an import to skip external collection config.  This can be used to
avoid creation and configset update for external collections which may not be maintained via Fusion.
 * 15 Nov 2018  Add support in `putApp` for declaring a varFile containing replacement tokens useful in password injection.
 * 13 June 2019 With the advent of the query_rewrite collections a "
   backup" of rules was added to app exports.  
   This caused significant bloating of the zip file but did provide for rules portability.  Unfortunately, the format is 
   not compatible with putApp.ps. The `--doRewrite` flag now provides some porting of rules although it has not been well tested.
 * 24 July 2020  updates for Fusion 4.2 changes to the objects.json structure
 * 13 Oct 2020 and Mar 17 2021  add the `--f5` flag to specify the use of urls compatible with Fusion 5 API changes.  This will be made the default at some point
 * 23 Aug 2021 Stop support for Python 2.7 (tag v1.3) and change to Python 3. (tested with Python 3.9)

### ./javascript (deprecated)
The javascript directory contains sample Index and Query Pipeline JavaScript stages
along with a set of shared utility functions intended to be accessed via Fusion's blob store and used by
JavaScript stages. THE TECHNIQUES DEMONSTRATED IN THE ./javascript DIRECTORY ARE SOMEWHAT OUTDATED HAVE BEEN
DEPRECATED IN PREFERENCE TO PLACING FUNCTION REFERENCES IN THE PIPELINE CONTEXT.  

THE JAVASCRIPT EXAMPLES ARE NO LONGER UNDER ACTIVE DEVELOPMENT AND CAN EFFECTIVELY BE IGNORED.

### acknowledgements
The ideas for the getPut scripts originated with the import-export scripts 
at https://github.com/lucidworks/fusion-examples.  The need to simplify 
just what got exported lead to the prefixing paradigm in the 3.x based
`getProject` and `putProject` scripts.  At the same time, Python was used 
instead of bash for ease of use in processing .json results and debug capability.

The sharable utilLib.js and pipeline templates grew out of a Blog post I made
in late 2017. https://lucidworks.com/2017/08/16/fusion-javascript-shared-scripts-utility-functions-unit-tests/

### Contact
If you would like more information about the content on this site, contact:
- Patrick Hoeffel, patrick.hoeffel@lucidworks.com (no longer active on this project)
- Andrew Shumway, andrew.shumway@lucidworks.com

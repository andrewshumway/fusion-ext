# fusion-ext
This project contains utilities and tools intended for use with Lucidworks Fusion.


### ./getPut
The getPut directory contains utilities usefull when getting or putting objects and artifacts from/to Fusion.
It can be used to back up, restore, or migrate a Fusion App.

### ./javascript
The javascript directory contains sample Index and Query Pipeline JavaScript stages
along with a set of shared utility functions intended to be accessed via Fusion's blob store and used by
JavaScript stages.

### acknowledgements
The ideas for the getPut scripts originated with the import-export scripts 
at https://github.com/lucidworks/fusion-examples.  The need to simplify 
just what got exported lead to the prefixing paradigm in the 3.x based
`getProject` and `putProject` scripts.  At the same time, Python was used 
instead of bash for debugability and ease of use in processing .json results.

The sharable utilLib.js and pipeline templates grew out of a Blog post I made
in late 2017. https://lucidworks.com/2017/08/16/fusion-javascript-shared-scripts-utility-functions-unit-tests/

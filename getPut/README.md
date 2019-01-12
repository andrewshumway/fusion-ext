# Overview

Utilities for getting or putting a 4.x Fusion App or a set of objects in Fusion 3.x which share a common name prefix.

This set of utilities can be used to import and export, tier migration, or backup.
Other utilities for renaming projects and performing rudimentary search/replace operations
are also included.

This  can be download or cloned onto a customer's machine but using it locally is often easier.

##  Tools and conventions

##### Environment variables from `bin/lw.env.sh` file

Several variable defaults are contained in the 'lw.env.sh' script. Most of the bash scripts in Quickstart invoke this to set these defaults in the local environment.  
To override, either edit your copy of the script or `export KEY=VALUE` in the parent bash environment.  
 1. lw_PREFIX - (for Fusion 3.x i.e. `getProject` and `putProject` only) A prefix value used to identify collections, and pipelines which constitute a project.  
 All fusion objects belonging to the same project need to start with this value or else `getProject.sh` will not be 
 able to find them.
 2. lw_PROTOCOL - http (default) or https
 3. lw_OUT_SERVER - the server name or IP used for exporting (default localhost)
 4. lw_IN_SERVER - the server name or IP used for importing (default localhost) 
 5. lw_PORT - the fusion port i.e. 8764
 6. lw_USERNAME - the name of the fusion user performing operations (default admin)
 7. lw_PASSWORD - the password of the fusion user performing operations (default password123)
 
#### Utility Scripts

* `getApp.sh` or `getApp.ph`  An App aware version of `getProject.sh` used to export an app.  Run with the `--help` option to see syntax.
`getApp.sh` peforms an App export but then breaks up the resulting `.zip` output into separate files and,for configsets and blobs, directories.
  * Non-data i.e. system collections and configsets are not exported.
  * Supported object types include Blobs, Collections, DataSources, Pipelines, Profiles, Parsers, jobs, and sparkJobs. 
  * Non-supported object types include features, links, and objectGroups.  
  However, whenever possible the `putApp` script will use the `/api/apps/APP_NAME/...` APIs
  which will automatically link the imported object to the specified Fusion App.
* `putApp.sh` or `putApp.ph`  An App aware version of `putProject.sh` used import an app.  Run with the `--help` option to see syntax.
  * if using the `--varFile` option please structure the variables replacement file json so that
  the object key correlates to the key in the `_DS.json`file which contains the redacted passwords.

```
{ 
    "secret.1.password":"password123",
    "secret.2.thing":"23de34df3ca1998702"
  }
```

See https://doc.lucidworks.com/fusion-server/4.1/reference-guides/api/objects-api.html#encrypted-passwords
* `getProject.sh` or `getProject.ph`  When run with the `--list` option, this script will fetch all Collections, Datasources, Index Pipelines, and Query Pipelines on a given Fusion instance with names starting with the `PREFIX` value.  When run without the `--list` option (default), this script will use the Objects API to get separate exports of each Collection, Datasources, Index Pipelines, and Query Pipeline etc. and save them in a directory specified by `--dir`.
   * both `schema.xml` and `managed-schema` are fetched from the server but typically only one will exist.  This results in a spurious 404 error.
   * Intended for use in Fusion 3.x  Simple collections work in 4.x but are not fully compatible with putApp.  However, after using `getProject.py`, 
   an `*APP.json` file can be manually created and used with `putApp.py` to migrate a 3.x set of objects to 4.x.  This typically requires some editing of 
   the `*.json` files to remove version numbers and illegal/deprecated key-value pairs.    
* `putProject.sh` or `putProject.ph`  This script will upload each Collections, Datasources, Index Pipelines, Query Pipeline, etc. from the directory specified by `--dir` to a Fusion instance.
  * If objects exist in the target Fusion instance i.e. overwriting a project, Fusion will issue ValidationWarnings and claim "There are conflicts". However, because this tool is destructive i.e. `.../import?importPolicy=overwrite` this conflict is handled.
  * If you get messages such as `variablesErrors : Missing value for secret.1.f.jira_password` or `validationErrors : Datasource <PREFIX>_Jira : field='f.jira_password', value='${secret.1.f.jira_password}', error='Invalid password, error message: Unknow URL: https://localhost/rest/api/2/project/SS' Unknow URL: https://localhost/rest/api/2/project/SS`, then make sure you supply a valid `--varFile`.
  * Intended for use in Fusion 3.x  Simple collections will work in 4.x if the collection is created in Fusion first but even then objects will not be linked to an app.
* `getBlob` This script will fetch a blob from the fusion Blob service.
* `renameProject.sh` $DIR_NAME $OLD_PREFIX $NEW_PREFIX will do a global search of "$OLD_PREFIX values in *.json and replace matches with "$NEW_PREFIX.  Files and directories are renamed as well.  This can be used to `get` a project, `renameProject` and `put` a project back to the same Fusion instance. 
* `copyPipeline.sh`  This script can be used to copy an Index or Query Pipeline. For example: `bin/copyPipeline.ph --type Query -n existingQueryPipeline -c nameOfNewPipeline` would export `existingQueryPipeline` from fusion, replace the Ids and other tags in the json with `nameOfNewPipeline` and POST the results back to Fusion thus making a copy of the pipeline.
* `replaceTokens.sh` This script can be used to do multiple global search/replace operations on a directory of .json files.
  * Parameters: 
    * -d DIR  The directory containing *.json files to be searched/replaced
    * -t TokenFile  A text file in which each line contains SEARCH_TOKEN|REPLACE_TOKEN values to be search/replaced
    * -s Suffix (optional default=.orig)  Before performing a search/replace operations the *.json files will be backed up with this suffix value added to the end of the filenames. 
  * Example: ./hackathon3 contains contents from `putProject.sh` and mnt2optReplacement.txt contains a single line `/mnt/data/opt/fusion/|/opt/fusion/`. 
    * bin/replaceTokens.sh -d hackathon3 -t mnt2optReplacement.txt -s .fromSbdev04

### Installation Notes:

These scripts require Python verion 2.7. and have been tested both in CentOS 7, and on a Windows git-bash shell. 
Some clients such as Windows, do not have a standard Python interpreter so one will need to be installed (https://www.python.org/).  and added to the PATH.
Some clients ship with the `requests` package from http://python-requests.org. Many however will need to install this via 
`pip install requests`.  Pip itself may need installation as well via `yum install`, `brew install`, etc.
 
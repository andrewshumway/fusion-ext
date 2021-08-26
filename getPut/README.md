# Overview

Utilities for getting or putting a 4.x Fusion App or a set of objects in Fusion 3.x which share a common name prefix.

This set of utilities can be used to import and export, tier migration, or backup.
Other utilities for renaming projects and performing rudimentary search/replace operations
are also included.

This  can be download or cloned onto a customer's machine but using it locally is often easier.

##  Import or Export Fusion Apps

Use `getApp.sh` to export a Fusion App and store it as files in an output directory.
```bash
$ getApp.sh --help

usage: getApp.py [-h] [-a APP] [-d DIR] [-s SVR] [-z ZIP] [-u USER]
                 [--password PASSWORD] [--protocol PROTOCOL] [--port PORT]
                 [-v] [--keep KEEP] [--debug]

______________________________________________________________________________
Get artifacts associated with a Fusion app and store them together in a folder 
as flat files, .json, and .zip files. These can later be pushed back into the same, 
or different, Fusion instance as needed. NOTE: if launching from getApp.sh, 
defaults will be pulled from the bash environment plus values from bin/lw.env.sh
______________________________________________________________________________

optional arguments:
  -h, --help            show this help message and exit
  -a APP, --app APP     App to export
  -d DIR, --dir DIR     Output directory, default: '${app}_ccyymmddhhmm'.
  -s SVR, --server SVR  Name or IP of server to fetch data from, 
                        default: ${lw_IN_SERVER} or 'localhost'.
  -z ZIP, --zip ZIP     Path and name of the Zip file to read from rather than using an export from --server, 
                        default: None.
  -u USER, --user USER  Fusion user name, default: ${lw_USER} or 'admin'.
  --password PASSWORD   Fusion Password,  default: ${lw_PASSWORD} or 'password123'.
  --protocol PROTOCOL   REST Protocol,  default: ${lw_PROTOCOL} or 'http'.
  --port PORT           Fusion Port, default: ${lw_PORT} or 8764
  -v, --verbose         Print details, default: False.
  --f5                  Remove the /apollo/ section of request urls as required by 5.2: (default False)."
  --keep KEEP           Comma delimited list of signals collections to keep, default=None.
  --debug               Print debug messages while running, default: False.

```
Use `putApp` to import a Fusion App from files in an input directory.

```bash
$ putApp.sh --help

usage: putApp.py [-h] -d DIR [--protocol PROTOCOL] [-s SVR] [--port PORT]
                 [-u USER] [--password PASSWORD] [--ignoreExternal] [-v]
                 [--humanReadable] [--varFile VARFILE] [--makeAppCollections]
                 [--doRewrite DOREWRITE] [--f5] [--keepCollAlias] [--debug]
                 [--noVerify]

______________________________________________________________________________
Take a folder containing .json files (produced by getApp.py) and POST the contents 
to a Fusion instance.  App and Collections will be created/altered as needed, 
as will Pipelines, Parsers, Profiles and Datasources. NOTE: if launching from 
putProject.sh, defaults will be pulled from the bash environment plus values 
set in bin/lw.env.sh
______________________________________________________________________________

optional arguments:
  -h, --help            show this help message and exit
  -d DIR, --dir DIR     Input directory, required.
  --protocol PROTOCOL   Protocol,  Default: ${lw_PROTOCOL} or 'http'.
  -s SVR, --server SVR  Fusion server to send data to. 
                        Default: ${lw_OUT_SERVER} or 'localhost'.
  --port PORT           Port, Default: ${lw_PORT} or 8764
  -u USER, --user USER  Fusion user, default: ${lw_USER} or 'admin'.
  --password PASSWORD   Fusion password,  default: ${lw_PASSWORD} or 'password123'.
  --ignoreExternal      Ignore (do not process) configurations for external Solr clusters (*_SC.json) and their associated collections (*_COL.json). default: False
  -v, --verbose         Print details, default: False.
  --humanReadable       Named for consistency with getApp.  This param reverses the getApp mutations by copying human readable script to the script element of pipeline stages, default: False.
  --varFile VARFILE     Protected variables file used for password replacement (if needed) default: None.
  --makeAppCollections  Do create the default collections named after the App default: False.
  --doRewrite DOREWRITE
                        Import query rewrite objects (if any), default: False.
  --f5                  Remove the /apollo/ section of request urls as required by 5.3: False.
  --keepCollAlias       Do not create Solr collection when the Fusion Collection name does not match the Solr collection. Instead, fail if the collection does not exist.  default: True.
  --debug               Print debug messages while running, default: False.
  --noVerify            Do not verify SSL certificates if using https, default: False.

```

 
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

See https://doc.lucidworks.com/fusion-server/4.1/reference-guides/api/objects-api.html#encrypted-passwords
* `getProject.sh` or `getProject.ph` is the Fusion 3.x versions of `getApp`. Run this with the `--help` option to see the syntax. 
This script will fetch all Collections, Datasources, Index Pipelines, and Query Pipelines on a given Fusion instance which have names starting
 with a given `PREFIX` value.  This script will use the Objects API to get separate exports of each Collection, Datasources, Index Pipelines, and Query Pipeline etc. and save them in a directory specified by `--dir`.
   * both `schema.xml` and `managed-schema` are fetched from the server but typically only one will exist.  This results in a spurious 404 error.
   * Intended for use in Fusion 3.x  Simple collections work in 4.x but are not fully compatible with putApp.  However, after using running `getProject`, 
   an `*APP.json` file can be manually created and used with `putApp` to migrate a 3.x set of objects to 4.x.  This typically requires some editing of 
   the `*.json` files to remove version numbers and illegal/deprecated key-value pairs.    
* `putProject.sh` or `putProject.ph` is the Fusion 3.x version of `putApp`.  This script will upload each Collections, Datasources, Index Pipelines, Query Pipeline, etc. from the directory specified by `--dir` to a Fusion instance.
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

Prior to v1.3, these scripts used Python version 2.7. From tag v1.3 onward, Python 3 is needed (developed against 3.9+).
Some clients such as Windows, do not have a standard Python interpreter so one will need to be installed (https://www.python.org/) and added to the PATH.
Some clients ship with the `requests` package (from http://python-requests.org). Many however will need to install this via 
`pip install requests` (CentOS, MacOS).  Pip itself may need installation as well via `yum install`, `brew install`, etc.
 
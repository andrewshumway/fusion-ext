#!/usr/bin/env python
"""
Use at your own risk.  No compatibility or maintenance or other assurance of suitability is expressed or implied.
Update or modify as needed
Copyright Polaris Alpha i.e. Parsons Corp.  All rights reserved
"""

#
# query Fusion for all datasources, index pipelines and query pipelines.  Then make lists of names
# which start with the $PREFIX so that they can all be exported.

#  Requires a python 2.7.5+ interpreter

import json, sys, argparse, os, subprocess, sys, requests, datetime, re, urllib
from argparse import RawTextHelpFormatter

# get current dir of this script
cwd = os.path.dirname(os.path.realpath(sys.argv[0]))

appName = None

fusionVersion = '4.0.0'

# this still leaves features, objectGroups, links ignored from the the objects.json export
OBJ_TYPES = {
    "fusionApps": { "ext": "APP"  , "filelist": [] }
    ,"index-pipelines": { "ext": "IPL" , "filelist": [] }
    ,"query-pipelines": { "ext": "QPL" , "filelist": [] }
    ,"index-profiles": { "ext": "IPF" , "filelist": [] }
    ,"query-profiles": { "ext": "QPF" , "filelist": [] }
    ,"parsers": { "ext": "PS" , "filelist": [] }
    ,"datasources": { "ext": "DS" , "api": "connectors/datasources","filelist": [], "substitute": True}
    ,"collections": { "ext": "COL" , "filelist": [] }
    ,"jobs": { "ext": "JOB" , "filelist": [] }
    ,"tasks": { "ext": 'TSK' , "filelist": [] }
    ,"spark/jobs": { "ext": 'SPRK' , "filelist": [] , "versionedApi" : {
        "4.0.1": "spark/jobs"
        ,"4.0.2": "spark/configurations"
        ,"default": "spark/configurations"
    }}
    ,"blobs": { "ext": "BLOB" , "filelist": [] }
    ,"searchCluster": { "ext": "SC" , "filelist": [] }

}

varReplacements = None
replacePattern = r"^\$\{(.*)\}$"
# array of ext =  [ OBJ_TYPES[k]['ext'] for k in OBJ_TYPES.keys() ] or [v['ext'] for v in OBJ_TYPES.values() if 'ext' in v]
# rework above to be keyed by extension v[1]['ext'] contining value of {type, filelist}
EXT_FILES_MAP = dict((v[1]['ext'],{'type':v[0],'filelist':v[1]['filelist']}) for v in [v for v in OBJ_TYPES.items() ])

def getSuffix(type):
    if type in OBJ_TYPES:
        return '_' + OBJ_TYPES[type]['ext'] + '.json'
    else:
        eprint("ERROR: No object Suffix of '" + type + "' is registered in OBJ_TYPES. ")

def isSubstitutionType(type):
    if type in OBJ_TYPES and 'substitute' in OBJ_TYPES[type] and OBJ_TYPES[type]:
        return True
    return False
def getFileListForType(type):
    if type in OBJ_TYPES:
        return OBJ_TYPES[type]['filelist']
    else:
        eprint("ERROR: No object Suffix of '" + type + "' is registered in OBJ_TYPES. ")

def getApiForType(type):
    api = None
    if type in OBJ_TYPES:
        typeObj = OBJ_TYPES[type]
        api = type # default api the same name as type
        if 'api' in typeObj:
            api = typeObj['api']
        if 'versionedApi' in typeObj:
            api = getVersionedApi(type,typeObj, api)
    else:
        eprint("ERROR: No object Suffix of '" + type + "' is registered in OBJ_TYPES. ")
    return api

# lookup the type of object based on the _SUFFIX.json SUFFIX from a file
def inferTypeFromFile(filename):
    type = None
    path = filename.split('/')
    extension = os.path.splitext(path[-1])
    file = extension[0]
    ext = extension[-1]

    underLoc = file.rfind('_')
    if underLoc > 0 and underLoc < len(file):
        tExt = file[underLoc + 1 :]
        if tExt in EXT_FILES_MAP:
            type = EXT_FILES_MAP[tExt]['type']
    return type

# called when the OBJ_TYPES element for a given type uses a version specific api i.e. when needed api is different for 4.0.1 vs 4.0.2
# typeObj will contain the OBJ_TYPES element for the given type and typObj must contain a versionedApi element.  Depending on the
# version of the target Fusion machine, an api will be selected.  In the target version is not listed the default will be returned;
def getVersionedApi(type, typeObj, default):
    api = default
    vapi = typeObj['versionedApi']
    if fusionVersion in vapi:
        api = vapi[fusionVersion]
    elif 'default' in vapi:
        api = vapi['default']
    return api

def initArgs():
    global varReplacements
    debug('initArgs top')
    env = {} #some day we may get better environment passing

    #setting come from command line but if not set then pull from environment
    if args.protocol == None:
        args.protocol = initArgsFromMaps("lw_PROTOCOL","http",os.environ,env)

    if args.server == None:
        args.server = initArgsFromMaps("lw_OUT_SERVER","localhost",os.environ,env)

    if args.port == None:
        args.port =  initArgsFromMaps("lw_PORT","8764",os.environ,env)

    if args.user == None:
        args.user = initArgsFromMaps("lw_USERNAME","admin",os.environ,env)

    if args.password == None:
        args.password = initArgsFromMaps("lw_PASSWORD","password123",os.environ,env)

    if not os.path.isdir(args.dir):
        sys.exit( "Can not find or access the " + args.dir + " directory. Process aborted. ")

    if args.varFile != None:
        if os.path.isfile(args.varFile):
            with open(args.varFile, 'r') as jfile:
                varReplacements = json.load(jfile);
        else:
            sys.exit( "Cannot find or access the " + args.varFile + " file.  Process aborted.")


def initArgsFromMaps(key, default, penv,env):
    if penv.has_key(key):
        debug("penv has_key" + key + " : " + penv[key])
        return penv[key]
    else:
        if env.has_key(key):
            debug("eenv has_key" + key + " : " + env[key])
            return env[key]
        else:
            debug("default setting for " + key + " : " + default)
            return default

# if we are exporting an app then use the /apps/appname bas uri so that exported elements will be linked to the app
def makeBaseUri(forceLegacy=False):
    base = args.protocol + "://" + args.server + ":" + args.port + "/api/apollo"
    if not appName or forceLegacy:
        uri = base
    else:
        uri = base + "/apps/" + appName
    return uri

def getDefOrVal(val,default):
    if val==None:
        return default
    return val
def substituteVariable(obj, objName, varMap):
    if varMap and isinstance(obj, basestring) and re.search(replacePattern, obj):
        match = re.search(replacePattern, obj)
        group = match.group(1)
        var = varMap[group]
        if var:
            if args.verbose:
                sprint("Substituting value in object " + objName + " for key: " + group)
            obj = var
    return obj;

def traverseAndReplace(obj, objName, varMap = None, path=None):
    # short circuit if we have no mappings
    if isinstance(varMap, dict):
        if path is None:
            path = []

        if isinstance(obj, dict):
            value = {k: traverseAndReplace(v, objName, varMap, path + [k])
                     for k, v in obj.items()}
        elif isinstance(obj, list):
            value = [traverseAndReplace(elem, objName, varMap, path + [[]])
                     for elem in obj]
        else:
            #search and see if our path is a ${var} match and if so replace with value from varFile
            value = substituteVariable(obj, objName, varMap)
    else:
        value = obj;

    return value

def doHttpPostPut(url,dataFile, isPut,headers=None, usr=None, pswd=None):
    usr = getDefOrVal(usr,args.user)
    pswd = getDefOrVal(pswd,args.password)
    extension = os.path.splitext(dataFile)[1]
    if headers is None:
        headers = {}
        if extension == '.xml' or dataFile.endswith('managed-schema'):
            headers['Content-Type']="application/xml"
        elif extension == '.json':
            headers['Content-Type'] = "application/json"
        else:
            headers['Content-Type'] = "text/plain"

    files = None
    try:
        if os.path.isfile(dataFile):
            with open(dataFile,'rb') as payload:
                if isPut:
                    response = requests.put(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=payload)
                else:
                    response = requests.post(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=payload)

                return response
        else:
            eprint("File '" + dataFile + "' does not exist.  PUT/POST not performed.")
    except requests.ConnectionError as e:
        eprint(e)

#  POST the given payload to apiUrl.  If it already exists then tack on the id to the URL and try a PUT
def doPostByIdThenPut(apiUrl, payload, type, putParams=None, idField='id', usr=None, pswd=None, existsChecker=None):
    if existsChecker == None:
        existsChecker = lambda response,payload: response.status_code == 409
    usr = getDefOrVal(usr,args.user)
    pswd = getDefOrVal(pswd,args.password)
    id = payload[idField]
    headers = {}
    if args.verbose:
        sprint("\nAttempting POST of " + type + " definition for '" + id + "' to Fusion.")
    headers['Content-Type'] = "application/json"
    url = apiUrl

    response = requests.post(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=json.dumps(payload))
    if existsChecker(response,payload):
        if args.verbose:
            sprint("The " + type + " definition for '" + id + "' exists.  Attempting PUT.")

        url = apiUrl + "/" + id
        if putParams:
            url += "?" + putParams

        response = requests.put(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=json.dumps(payload))

    if response.status_code == 200 and args.verbose:
        sprint( "Element " + type + " id: " + id + " PUT/POSTed successfully")
    elif response.status_code != 200:
        if args.verbose:
            print "...Failure."
        eprint("Non OK response of " + str(response.status_code) + " when doing PUT/POST to: " + apiUrl + '/' + id + ' response.text: ' + response.text)

    return response


def putBlobs():

    blobdir = os.path.join(args.dir,"blobs")
    for f in getFileListForType("blobs"):
        resourceType = None
        path = None
        contentType = None
        blobId = None

        # read in json and figure out path and resourceType
        with open(os.path.join(args.dir,f), 'r') as jfile:
            blobj = json.load(jfile);
            resourceType = None
            blobId = blobj['id']
            meta = blobj["metadata"]
            if meta:
                if 'resourceType' in meta:
                    resourceType = meta['resourceType']
                elif 'type' in meta:
                    resourceType = meta['type']

            contentType = blobj["contentType"]
            path = blobj["path"]

        url = makeBaseUri(True) + "/blobs" + path;
        if resourceType:
            url += "?resourceType=" + resourceType

        headers = {};
        if contentType:
            headers['Content-Type'] = contentType

        # convert unix path from json to os path which may be windows
        fullpath = blobdir + path.replace('/',os.sep)
        # now PUT blob
        if args.verbose:
            sprint("Uploading blob " + f)

        response = doHttpPostPut(url,fullpath, True,headers )
        if response and response.status_code >= 200 and response.status_code <= 250:
            if args.verbose:
                sprint("Uploaded " + path + " payload successfully")
                # makeBaseUri(True) is used for Fusion 4.0.1 compatibility but this requires us to make the link
                lurl = makeBaseUri(True) + "/links"
                # {"subject":"blob:lucid.googledrive-4.0.1.zip","object":"app:EnterpriseSearch","linkType":"inContextOf"}
                payload = {"subject":"","object":"","linkType":"inContextOf"}
                payload['subject'] = 'blob:' + blobId
                payload['object'] = 'app:' + appName
                lresponse = requests.put(lurl, auth=requests.auth.HTTPBasicAuth(args.user, args.password),headers={"Content-Type": "application/json"}, data=json.dumps(payload))
                if lresponse and lresponse.status_code < 200 or lresponse.status_code > 250:
                    eprint("Non OK response: " + str(lresponse.status_code) + " when linking Blob " + blobId + " to App " + appName)

        elif response and response.status_code:
            eprint("Non OK response: " + str(response.status_code) + " when processing " + f)

def putApps():
    global appName
    appFiles = getFileListForType("fusionApps")
    #check and make sure we have no more than one app
    if len(appFiles) == 1 :
        # put the the name of the app in a global
        f = appFiles[0]
        with open(os.path.join(args.dir,f), 'r') as jfile:
            #Capture the id in the global so that /apps/APP_ID type urls can be used to maintain APP links
            payload = json.load(jfile);
            appName = payload['id']

    elif len(appFiles) == 1 :
        eprint("No " + getSuffix("fusionApps") + " files found in " + args.dir + ".  Imported objects will not be linked to an App!")
        return
    elif len(appFiles)> 0:
        sys.exit("Multiple " + getSuffix("fusionApps") + " files found in " + args.dir + ". Maximum of one is allowed.")


    # GET from /api/apollo/apps/NAME to check for existence
    # POST to /api/apollo/apps?relatedObjects=false to write

    for f in appFiles:
        appsURL = args.protocol + "://" + args.server + ":" + args.port + "/api/apollo/apps"
        postUrl = appsURL + "?relatedObjects=false"
        putUrl = appsURL + "/" + appName + "?relatedObjects=false"
        response = doHttp(putUrl)
        isPut = response and response.status_code == 200;
        url = putUrl if isPut else postUrl

        response = doHttpPostPut(url, os.path.join(args.dir,f), isPut)

        if response.status_code == 200:
            if args.verbose:
                sprint( "Created App " + appName)
        elif response.status_code != 200:
            if args.verbose:
                print "...Failure."
            eprint("Non OK response of " + str(response.status_code) + " when POSTing: " + f)


def putCollections():

    apiUrl = makeBaseUri() + "/collections"
    for f in getFileListForType("collections"):
        with open(os.path.join(args.dir,f), 'r') as jfile:
            payload = json.load(jfile);
            # pop off name for collections pointing at "default".  That way the local collections get created in Solr.
            # keep the name for external (non-default) collections since those only need the Fusion reference created.
            if payload["solrParams"] and payload["searchClusterId"] == "default":
                payload["solrParams"].pop('name', None)
            # if args.ignoreExternal then don't process any collections in an external cluster
            if not args.ignoreExternal or payload["searchClusterId"] == "default":
                response = doPostByIdThenPut(apiUrl, payload, 'Collection','relatedObjects=false')
                if response.status_code == 200:
                    putSchema(payload['id'])

def doHttp(url,usr=None, pswd=None):
    usr = getDefOrVal(usr,args.user)
    pswd = getDefOrVal(pswd,args.password)
    response = None
    try:
        response = requests.get(url, auth=requests.auth.HTTPBasicAuth(usr, pswd))
        return response
    except requests.ConnectionError as e:
        eprint(e)

def doHttpJsonGet(url):
    response = doHttp(url)
    if response.status_code == 200:
        j = json.loads(response.content)
        return j
    else:
        if response.status_code == 401 and 'unauthorized' in response.text:
            eprint("Non OK response of " + str(response.status_code) + " for URL: " + url + "\nCheck your password\n")
        else:
            eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)


def getFileListing(path,fileList=[],pathPrefix=''):
    for root, dirs, files in os.walk(path):
        for directory in dirs:
            getFileListing(os.path.join(path,directory),fileList,directory)
        for file in files:
            fileList.append(os.path.join(pathPrefix,file));
    return fileList

def putSchema(colName):
    schemaUrl = args.protocol + "://" + args.server + ":" + args.port + "/api/apollo/collections/" + colName + "/solr-config"
    currentZkFiles = []
    # get a listing of current files via Fusion's solr-config api. This prevents uploading directories which don't exist (unsupported)
    zkFilesJson = doHttpJsonGet(schemaUrl + "?recursive=true")
    if zkFilesJson and len(zkFilesJson) > 0:
        for obj in zkFilesJson:
            if not obj['isDir']:
                currentZkFiles.append(obj['name'])
            else:
                for child in obj['children']:
                    if not child['isDir']:
                        currentZkFiles.append(os.path.join(obj['name'],child['name']))


    dir = os.path.join(args.dir, "configsets", colName )
    files = getFileListing(dir)
    counter = 0;

    if args.verbose and len(files) > 0:
        sprint("\nUploading Solr config for collection: " + colName)
    for file in files:
        #if the file is part of the current configset and is avaliable for upload, upload it.
        if os.path.isfile(os.path.join(dir,file)):
            counter += 1
            isLast = len(files) == counter
        # see if the file exists and PUT or POST accordingly
            url = schemaUrl + '/' + file.replace(os.sep,'/')
            if isLast:
                url += '?reload=true'
            #PUT to update, POST to add
            response = doHttpPostPut(url,os.path.join(dir,file), (file in currentZkFiles))
            if response and response.status_code >= 200 and response.status_code <= 250:
                if args.verbose:
                    sprint("\tUploaded " + file + " successfully")
            elif response and response.status_code:
                eprint("Non OK response: " + str(response.status_code) + " when uploading " + file)


def eprint(msg):
    # change inputs to *args, **kwargs in python 3
    #print(*args, file=sys.stderr, **kwargs)
    print >> sys.stderr, msg

def sprint(msg):
    # change inputs to *args, **kwargs in python 3
    #print(*args, file=sys.stderr, **kwargs)
    print(msg)
    sys.stdout.flush()

def debug(msg):
    if args.debug:
        sprint(msg)


# populate the fileList global with arrays of files to put
def findFiles():
    files = os.listdir(args.dir)
    for f in files:
        inferType = inferTypeFromFile(f)
        if inferType:
            flist = getFileListForType(inferType)
            if isinstance( flist, (list )):
                flist.append(f)


def putJobSchedules():
    type = "jobs"
    apiUrl = makeBaseUri() + "/" + getApiForType(type) + "/"
    for f in getFileListForType(type):
        with open(os.path.join(args.dir,f), 'r') as jfile:
            payload = json.load(jfile)
            url = apiUrl + payload['resource'] + '/schedule'
            response = doHttpPostPut(url, os.path.join(args.dir,f), True)
            if response.status_code == 200:
                if args.verbose:
                    sprint( "Created/updated Job from " + f)
            # allow a 404 since we are using the /apollo/apps/{collection} endpoint but the export gives us global jobs as well
            elif response.status_code != 200 and response.status_code != 404:
                eprint("Non OK response of " + str(response.status_code) + " when PUTing: " + url)

def putFileForType(type,forceLegacy=False, idField=None, existsChecker=None ):
    if not idField:
        idField = 'id'
    apiUrl = makeBaseUri(forceLegacy) + "/" + getApiForType(type)
    for f in getFileListForType(type):
        with open(os.path.join(args.dir,f), 'r') as jfile:
            payload = json.load(jfile)
            if isSubstitutionType(type):
                payload = traverseAndReplace(payload,f, varReplacements)
            #doPostByIdThenPut(apiUrl, payload, type,None, idField)
            doPostByIdThenPut(apiUrl, payload, type,None,idField,None,None,existsChecker)


def fetchFusionVersion():
    global fusionVersion
    url = makeBaseUri() + "/configurations"
    configurations = doHttpJsonGet(url)
    if configurations and configurations["app.version"]:
        fusionVersion = configurations["app.version"]

def main():
    initArgs()
    fetchFusionVersion()
    # fetch collections first
    if args.verbose:
        sprint("Uploading objects found under '" + args.dir + "' to Fusion.")

    findFiles()
    # putApps must be the first export, clusters next.  blobs and collections in either order then pipelines
    putApps()

    # do not update external searchCluster config if ignoreExternal=True
    if not args.ignoreExternal:
        putFileForType('searchCluster',True)
    putCollections()
    putBlobs()
    putFileForType('index-pipelines')
    putFileForType('query-pipelines')
    putFileForType('parsers')
    putFileForType('index-profiles')
    putFileForType('query-profiles')

    putJobSchedules()
    putFileForType('tasks')
    putFileForType('spark/jobs',None,None,lambda r,p: r.status_code == 409 or ((r.status_code == 500 or r.status_code == 400) and r.text.find( p['id'] +" already exists") > 0))

    putFileForType("datasources",None,None,lambda r,p: r.status_code == 409 or (r.status_code == 500 and r.text.find("Data source id '" + p['id'] +"' already exists") > 0))


if __name__ == "__main__":
    scriptName = os.path.basename(__file__)
    # sample line: 'usage: getProject.py [-h] [-l] [--protocol PROTOCOL] [-s SERVER] [--port PORT]'
    description = ('______________________________________________________________________________\n'
                'Take a folder containing .json files (produced by getApp.py) and POST the contents \n'
                'to a Fusion instance.  App and Collections will be created/altered as needed, \n'
                'as will Pipelines, Parsers, Profiles and Datasources. NOTE: if launching from \n'
                'putProject.sh, defaults will be pulled from the bash environment plus values \n'
                'set in bin/lw.env.sh\n'
                '______________________________________________________________________________'
                   )

    parser = argparse.ArgumentParser(description=description, formatter_class=RawTextHelpFormatter )

    parser.add_argument("-d","--dir", help="Input directory, required.", required=True)#,default="default"
    parser.add_argument("--protocol", help="Protocol,  Default: ${lw_PROTOCOL} or 'http'.")
    parser.add_argument("-s","--server", metavar="SVR", help="Fusion server to send data to. \nDefault: ${lw_OUT_SERVER} or 'localhost'.") # default="localhost"
    parser.add_argument("--port", help="Port, Default: ${lw_PORT} or 8764") #,default="8764"
    parser.add_argument("-u","--user", help="Fusion user, default: ${lw_USER} or 'admin'.") #,default="admin"
    parser.add_argument("--password", help="Fusion password,  default: ${lw_PASSWORD} or 'password123'.") #,default="password123"
    parser.add_argument("--ignoreExternal", help="Ignore (do not process) configurations for external Solr clusters (*_SC.json) and their associated collections (*_COL.json). default: False",default=False,action="store_true")
    parser.add_argument("-v","--verbose",help="Print details, default: False.",default=False,action="store_true")# default=False
    parser.add_argument("--varFile",help="Protected variables file used for password replacement (if needed) default: None.",default=None)
    parser.add_argument("--debug",help="Print debug messages while running, default: False.",default=False,action="store_true")# default=False


    args = parser.parse_args()

    main()

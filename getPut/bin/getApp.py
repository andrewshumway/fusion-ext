#!/usr/bin/env python

"""
Use at your own risk.  No compatibility or maintenance or other assurance of suitability is expressed or implied.
Update or modify as needed
Copyright Polaris Alpha i.e. Parsons Corp.  All rights reserved
"""

# 4.x notes. Trying new approach.  Fetch zip and unpack various object elements.
# rather than use export/import I'll use the base APIs because they support /api/apollo/apps/[appname]/[objecttype]
# endpoints because that will (hopefully) simplify linking things together
#
# assumptions
# 1. only one app will be imported or exported at a time
# 2. signals and signals_aggr collections will be skipped
# 3. only collections in the 'default' cluster will be processed
#
# initially supported object types
# App
# collection
# pipelines
# profiles
# datasources
#
# todo
# schedules
# jobs
# sparkJobs

# Types with UNKNOWN affect
# features
# links
# objectGroups

#
# query Fusion for all datasources, index pipelines and query pipelines.  Then make lists of names
# which start with the $PREFIX so that they can all be exported.

#  Requires a python 2.7.5+ interpeter

import json, sys, argparse, os, subprocess, sys, requests, datetime, re, shutil,types
from io import BytesIO
from StringIO import StringIO
from zipfile import ZipFile
from argparse import RawTextHelpFormatter

# get current dir of this script
cwd = os.path.dirname(os.path.realpath(sys.argv[0]))

OBJ_TYPES = {
    "fusionApps": "APP"
    ,"indexPipelines": "IPL"
    ,"queryPipelines": "QPL"
    ,"indexProfiles": "IPF"
    ,"queryProfiles": "QPF"
    ,"parsers": "PS"
    ,"dataSources": "DS"
    ,"collections": "COL"
    ,"jobs": "JOB"
    ,"tasks": 'TSK'
    ,"sparkJobs": 'SPRK'
    ,"blobs": "BLOB"
    ,"searchCluster": "SC"
}

searchClusters = {}
collections = []

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

def getSuffix(type):
    return '_' + OBJ_TYPES[type] + '.json'

def applySuffix(f,type):
    suf = OBJ_TYPES[type]
    if not f.endswith(suf):
        return f + getSuffix(type);
    return f + ".json"


def initArgs():
    env = {} #some day we may get better environment passing
    debug( 'initArgs start')

    #setting come from command line but if not set then pull from environment
    if args.protocol == None:
        args.protocol = initArgsFromMaps("lw_PROTOCOL","http",os.environ,env)

    if args.server == None:
        args.server = initArgsFromMaps("lw_IN_SERVER","localhost",os.environ,env)

    if args.port == None:
        args.port =  initArgsFromMaps("lw_PORT","8764",os.environ,env)

    if args.user == None:
        args.user = initArgsFromMaps("lw_USERNAME","admin",os.environ,env)

    if args.password == None:
        args.password = initArgsFromMaps("lw_PASSWORD","password123",os.environ,env)

    if args.app == None:
        args.app = initArgsFromMaps("lw_APP","lwes_",os.environ,env)

    if args.dir == None:
        # make default dir name
        defDir = args.app + "_" + datetime.datetime.now().strftime('%Y%m%d_%H%M')
        args.dir = defDir
    elif os.sep not in args.dir:
        defDir = args.dir
        args.dir = defDir
    if args.keep == None:
        args.keep = []
    else:
        args.keep = args.keep.split(',')



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


def makeBaseUri():
    uri = args.protocol + "://" + args.server + ":" + args.port + "/api/apollo"
    return uri

def doHttp(url,usr=None,pswd=None,headers={}):
    response = None
    if not usr:
        usr = args.user
    if not pswd:
        pswd = args.password
    try:
        debug("calling requests.get url:" +url + " usr:" + usr + " pswd:" + pswd + " headers:" + str(headers))
        response = requests.get(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers)
        return response
    except requests.ConnectionError as e:
        eprint(e)

def doHttpJsonGet(url, usr=None,pswd=None):
    response = None
    response = doHttp(url, usr, pswd)
    if response and response.status_code == 200:
        contentType = response.headers['Content-Type']
        debug("contentType of response is " + contentType)
        # use a contains check since the contentType may be 'application/json; utf-8' or multi-valued
        if "application/json" in contentType:
            j = json.loads(response.content)
            return j
    else:
        if response and response.status_code == 401 and 'unauthorized' in response.text:
            eprint("Non OK response of " + str(response.status_code) + " for URL: " + url + "\nCheck your password\n")
        elif response and response.status_code:
            eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)


def doHttpZipGet(url, usr=None, pswd=None):
    response = None
    response = doHttp(url, usr, pswd)
    if response and response.status_code == 200:
        contentType = response.headers['Content-Type']
        debug("contentType of response is " + contentType)
        # use a contains check since the contentType may be 'application/json; utf-8' or multi-valued
        if "application/zip" in contentType:
            content = response.content
            zipfile = ZipFile(StringIO(content))
            return zipfile
        else:
            eprint("Non Zip content type of '" + contentType + "' for url:'" + url + "'" )
    else:
        eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)

def gatherSearchClusters():
    url = makeBaseUri() + "/searchCluster"
    objects = doHttpJsonGet(url)
    if objects:
        for obj in objects:
            if 'id' in obj and obj['id'] != "default":
                searchClusters[obj['id']] = obj

def extractClusterForCollection(collection):
    clusterId = collection['searchClusterId']
    if clusterId in searchClusters:
        # some jobs have : searchClusters the id, some blobs have a path.  Remove problem characters in filename
        filename = applySuffix(clusterId.replace(':','_').replace('/','_'),'searchCluster')
        jsonToFile(searchClusters[clusterId], filename)
        del searchClusters[ clusterId ] # only collect once

def extractProject():
    # go thru each valued array and export them

    baseUrl = makeBaseUri() + "/objects/export?filterPolicy=system&app.ids=" + args.app
    objects = None;
    zipfile = doHttpZipGet(baseUrl)
    filelist = zipfile.namelist()
    #first process objects, then extract blobs and configsets
    if not "objects.json" in filelist:
        sys.exit("Exported zip does not contain objects.json.  Can not proceed.")
    jstr = zipfile.open("objects.json").read()
    objects = json.loads(jstr)
    # check to be sure that the requested application exsists and give error if not
    if not objects or \
        (not len(objects['objects']) > 0) or \
        (not objects['objects']['fusionApps']) or \
        (not objects['objects']['fusionApps'][0]['id']) or \
        (not objects['objects']['fusionApps'][0]['id'] == args.app):
        sys.exit("No Fusion app called '" + args.app + "' found on server '" + args.server + "'.  Can not proceed.")

    # sorting ensures that collections are known when other elements are extracted
    for type in sorted(objects['objects'].iterkeys()):
        #obj will be the name of the object type just under objects i.e. objects.collections, indexPipelines etc.
        doObjectTypeSwitch(objects['objects'][type],type)

    # global collections[] will hold exported collection names.  Get the configsets for those and write them out as well
    for filename in filelist:
        if shouldExtractFile(filename):
            extractFromZip(filename,zipfile)
        elif shouldExtractEmbeddedZip(filename):
            extractZip(filename,zipfile)


    zipfile.close()

# check for blob zips which should be extracted intact or non-zipped configsets
def shouldExtractFile(filename):
    path = filename.split('/')
    extension = os.path.splitext(path[-1])
    file = extension[0]
    ext = extension[-1]
    if path[0] == 'blobs':
        return True
    # in 4.0.2 configsets are already unzip so each file can be extracted.  this block should catch 4.0.2 case
    # and shouldExtractConfig will catch the 4.0.1 case
    elif len(path) > 2 and path[0] == 'configsets' and ext != '.zip' and path[1] in collections:
        return True
    return False

# check for embeded and zipped configsets in need of extraction
def shouldExtractEmbeddedZip(filename):
    path = filename.split('/')
    extension = os.path.splitext(path[-1])
    file = extension[0]
    ext = extension[-1]
    if path[0] == 'configsets' and ext == '.zip' and file in collections:
        return True
    return False


def extractFromZip(filename,zip):
    #there seems to be a bug in the creation of the zip by the export routine and some files are zero length
    # don't save these since they would produce an empty file which would overwrite the blob on import
    if zip.getinfo(filename).file_size > 0:
        zip.extract(filename, args.dir)
    else:
        eprint("File " + filename + " in archive is zero length. Extraction skipped.")

def extractZip( filename,zip):
    path = filename.split('/')
    path[-1] = os.path.splitext(path[-1])[0]
    outputDir = os.path.join(args.dir,*path)
    zfiledata = BytesIO(zip.read(filename))
    with ZipFile(zfiledata) as zf:
        zf.extractall(outputDir)
#
# do something with some json based on the type of the json array
def doObjectTypeSwitch(elements, type):
    switcher={
        "fusionApps":collectById
        ,"collections":lambda l_elements,l_type:collectCollections(l_elements,l_type)
        ,"indexPipelines":collectById
        ,"queryPipelines":collectById
        ,"indexProfiles":collectProfileById
        ,"queryProfiles":collectProfileById
        ,"parsers":collectById
        ,"dataSources":collectById
        ,"tasks":collectById
        ,"jobs":collectById
        ,"sparkJobs":collectById
        ,"blobs":lambda l_elements,l_type:collectById(l_elements,l_type,"filename")

    }
    # get the function matchng the type or a noop
    processTypedElementFunc = switcher.get( type, lambda *args: None)
    # call the function passing elements and type
    processTypedElementFunc(elements,type)


def jsonToFile(jData,filename):
    with open(os.path.join(args.dir, filename), 'w') as outfile:
        outfile.write(json.dumps(jData,indent=4))

def collectById(elements,type,keyField='id'):
    for e in elements:
        if keyField not in e and "resource" in e:
            keyField = "resource"
        id = e[keyField]
        if args.verbose:
            sprint("Processing '" + type + "' object: " + id)
        # some jobs have : in the id, some blobs have a path.  Remove problem characters in filename
        filename = applySuffix(id.replace(':','_').replace('/','_'),type)
        jsonToFile(e,filename);

def collectProfileById(elements,type):
    # this code is tentative.  The pipeline elements contains a sub object called 'ALL' which then contains the list we want
    #  update: looks like 4.1 gets rid of the ALL
    mylist = []
    if isinstance(elements,dict) and ('ALL' in elements.keys()):
        mylist = elements['ALL']
    elif isinstance(elements,list):
        mylist = elements
    if mylist:
        collectById(mylist,type )
    elif len(elements) > 1:
        eprint("Green code expects a single ALL element or array of Profiles but found " + len(elements) + " code needs attention")

def collectCollections(elements,type="collections"):
    keep = []
    for e in elements:
        id = e['id']
        if shouldKeepCollection(id, e):
            keep.append(e)
            #make sure associated clusters are exported
            extractClusterForCollection(e)
            # keep track of the default collections we are exporting so that schema can be exported as well
            # do not export schema for collections on non-default clusters.  Best to not mess with remote config
            if e['searchClusterId'] == 'default':
                collections.append(id)
    collectById(keep,type )


def shouldKeepCollection(id,e):
    if id.endswith("_signals") or id.endswith("_signals_aggr"):
        return id in args.keep
    return True

def collectIndexPipelines(elements):
    collectById(elements,"indexPipelines")

def main():
    initArgs()
    # create if missing
    if not os.path.isdir(args.dir):
        os.makedirs(args.dir)
    # Fetch solr clusters map so we can export if needed
    gatherSearchClusters()
    sprint( "Geting export zip for app '" + args.app + "' from server '" + args.server + "'.")
    extractProject()

if __name__ == "__main__":
    scriptName = os.path.basename(__file__)
    # sample line: 'usage: getProject.py [-h] [-l] [--protocol PROTOCOL] [-s SERVER] [--port PORT]'
    description = ('______________________________________________________________________________\n'
                'Get artifacts associated with a Fusion app and store them in together in a folder \n'
                'as flat files, .json, and .zip files. These can later be pushed back into the same, \n'
                'or different, Fusion instance as needed. NOTE: if launching from getApp.sh, \n'
                'defaults will be pulled from the bash environment plus values from bin/lw.env.sh\n'
                '______________________________________________________________________________'
                   )
    parser = argparse.ArgumentParser(description=description, formatter_class=RawTextHelpFormatter )

    #parser.add_argument_group('bla bla bla instruction go here and they are really long \t and \n have tabs and\n newlines')
    parser.add_argument("-a","--app", help="App to export", required=True) #,default="lwes_"
    parser.add_argument("-d","--dir", help="Output directory, default: '${app}_ccyymmddhhmm'.")#,default="default"
    parser.add_argument("-s","--server", metavar="SVR", help="Name or IP of server to fetch data from, \ndefault: ${lw_IN_SERVER} or 'localhost'.") # default="localhost"
    parser.add_argument("-u","--user", help="Fusion user name, default: ${lw_USER} or 'admin'.") #,default="admin"
    parser.add_argument("--password", help="Fusion Password,  default: ${lw_PASSWORD} or 'password123'.") #,default="password123"
    parser.add_argument("--protocol", help="REST Protocol,  default: ${lw_PROTOCOL} or 'http'.")
    parser.add_argument("--port", help="Fusion Port, default: ${lw_PORT} or 8764") #,default="8764"
    parser.add_argument("-v","--verbose",help="Print details, default: False.",default=False,action="store_true")# default=False
    parser.add_argument("--keep", help="Comma delimited list of signals collections to keep, default=None.",default=None) #,default="password123"
    parser.add_argument("--debug",help="Print debug messages while running, default: False.",default=False,action="store_true")# default=False

    #print("args: " + str(sys.argv))
    args = parser.parse_args()

    main()

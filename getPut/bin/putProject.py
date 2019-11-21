#!/usr/bin/env python
#
# query Fusion for all datasources, index pipelines and query pipelines.  Then make lists of names
# which start with the $PREFIX so that they can all be exported.

#  Requires a python 2.7.5+ interpeter

import json, sys, argparse, os, subprocess, sys, requests, datetime, re
# get current dir of this script
cwd = os.path.dirname(os.path.realpath(sys.argv[0]))

fileList = {"collections": []
    , "qpipelines": []
    , "ipipelines": []
    , "parsers": []
    , "datasources": []
    }
blobList = []

OBJ_TYPES = {
    "ipipelines": "IPL"
    ,"qpipelines": "QPL"
    ,"parsers": "PS"
    ,"datasources": "DS"
    ,"collections": "COL"
    ,"jobs": "JOB"
    ,"task": 'TSK'
    ,"spark": 'SPRK'
}

COLLECTION_SUFFIX = '_' + OBJ_TYPES["collections"] + '.json'
baseUrl = None
IMPORT_POLICY = 'overwrite'

def getSuffix(type):
    return '_' + OBJ_TYPES[type] + '.json'

def initArgs():
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

    global baseUrl
    baseUrl = makeBaseUri() + "/objects/import?importPolicy=" + IMPORT_POLICY


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

def getDefOrVal(val,default):
    if val==None:
        return default
    return val
def doMultipartPost(url,dataFile, usr=None, pswd=None):
    usr = getDefOrVal(usr,args.user)
    pswd = getDefOrVal(pswd,args.password)

    response = None

    #,('variableValues', ('bar.png', open('bar.png', 'rb'), 'image/png'))
    multiple_files = [('importData', (dataFile, open(os.path.join(args.dir,dataFile), 'rb'), 'text/json')) ]
    if args.varFile:
        multiple_files.append(('variableValues', (args.varFile, open(args.varFile, 'rb'), 'text/json')))

    try:
        response = requests.post(url, auth=requests.auth.HTTPBasicAuth(usr, pswd), files=multiple_files)
        return response
    except requests.ConnectionError as e:
        eprint(e)

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


    response = None
    files = None
    try:
        with open(dataFile,'rb') as payload:
            if isPut:
                response = requests.put(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=payload)
            else:
                response = requests.post(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers, data=payload)

            return response
    except requests.ConnectionError as e:
        eprint(e)


def collectPrefix(url,collection):
    try:
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None:
            for e in j:
                id = e['id']
                if id.startswith(args.prefix):
                    collection.append(id)
    except requests.ConnectionError as e:
        eprint(e)


def printResponseJsonErrors(file,type,j,keys):
    bannerPrinted = False
    for prob in keys:
        e = j[prob]
        if e and len(e):
            if not bannerPrinted:
                eprint("Error(s) encountered when uploading " + type + " from " + file)
                bannerPrinted = True
            for line in e:
                eprint("\t" + prob + ' : ' + line)

def printResponseJsonWarnings(file,type,j,keys):
    if not args.verbose:
        return

    bannerPrinted = False
    for prob in keys:
        e = j[prob]
        if e and len(e):
            if not bannerPrinted:
                sprint("Warning(s) encountered when uploading " + type + " from " + file)
                bannerPrinted = True
                for line in e:
                    # conflicts are not important when overwriting
                    if IMPORT_POLICY == "overwrite" and prob == "validationWarnings" and line == "There are conflicts":
                        continue
                    sprint("\t" + prob + ' : ' + line)


def printPostResponse(f,type,response):
    j = None
    try:
        j = json.loads(response.content)
        if args.verbose:
            sprint( "... Reported Status: " + str(j['status']))
            if j['importActions'] and len(j['importActions']):
                for ia in j['importActions']:
                    sprint("\tAction: " + ia)
    except:
        if args.verbose:
            sprint("... Successful POST response but details are unavailable.")

    if j:
        printResponseJsonErrors(f,type,j,['importErrors','variablesErrors','validationErrors'])
        printResponseJsonWarnings(f,type,j,['variablesWarnings','validationWarnings','conflicts'])


def doPost(baseUrl, f,type):
    if args.verbose:
        sprint("\nUploading " + type + " definition for '" + f + "' to Fusion.")
    response = doMultipartPost(baseUrl,f)
    if response and response.status_code == 200:
        printPostResponse(f,type,response)
    elif response and response.status_code != 200:
        if args.verbose:
            sprint("...Failure.")
            eprint("Non OK response of " + str(response.status_code) + " when importing: " + f)
    else:
        eprint("No HTTP response when attempting import of : " + f)
    return response;

def putTaskAndSpark():
    dir = os.path.join(args.dir,"jobs")
    if not os.path.isdir(dir):
        return
    files = os.listdir(dir)
    taskP = re.compile('(.*)(' + getSuffix("task") + ')')
    sparkP = re.compile('(.*)(' + getSuffix("spark") + ')')

    for file in files:
        # get the manifest
        fileName = os.path.join(args.dir,"jobs", file)
        name = os.path.basename(fileName).split('.')[0]
        # reverse filename munging. replace _-_ with : and remove _JOB
        tm = taskP.match(file)
        sm = sparkP.match(file)
        url = None
        if (not tm is None) and tm.lastindex >= 1:
            name = tm.group(1)
            url = makeBaseUri() + '/tasks/' + name
        elif (not sm is None) and sm.lastindex >= 1:
            name = sm.group(1)
            url = makeBaseUri() + '/spark/configurations/' + name

        if (not url is None):
            response = doHttpPostPut(url,fileName, True)
            if response and response.status_code >= 200 and response.status_code <= 250:
                if args.verbose:
                    sprint("Uploaded " + fileName + " payload successfully")
            elif response and response.status_code:
                eprint("Non OK response: " + str(response.status_code) + " when uploading " + file)

def putJobs():

    dir = os.path.join(args.dir,"jobs")
    if not os.path.isdir(dir):
        return
    files = os.listdir(dir)
    jobP = re.compile('(.*)(_-_)(.*)(' + getSuffix("jobs") + ')')

    for file in files:
        # get the manifest
        fileName = os.path.join(args.dir,"jobs", file)
        name = os.path.basename(fileName).split('.')[0]
        # reverse filename munging. replace _-_ with : and remove _JOB
        m = jobP.match(file)
        if (not m is None) and m.lastindex >= 3:
            name = m.group(1) + ':' + m.group(3)
            url = makeBaseUri() + '/jobs/' + name +"/schedule"
            response = doHttpPostPut(url,fileName, True)
            if response and response.status_code >= 200 and response.status_code <= 250:
                if args.verbose:
                    sprint("Uploaded " + fileName + " payload successfully")
            elif response and response.status_code:
                eprint("Non OK response: " + str(response.status_code) + " when uploading " + file)


def putBlobs():
    blobdir = os.path.join(args.dir,"blobs")
    if not os.path.isdir(blobdir):
        return
    files = os.listdir(blobdir)
    #curl -u user:pass -X PUT --data-binary @mysql-connector-java-5.1.42-bin.jar
    # -H 'Content-length: 996444' -H 'Content-Type: application/zip'
    # http://localhost:8764/api/apollo/blobs/good/to/go/mysql-connector-java-5.1.42-bin.jar
    # ?resourceType=driver:jdbc

    for file in files:
        # get the manifest
        basePath = os.path.join(args.dir,"blobs", file)
        with open(os.path.join(basePath,"manifest.json"), 'r') as jfile:
            manifest = json.load(jfile);
            headers = {};
            name = manifest['name']
            headers["Content-Type"] = str(manifest["contentType"])
            type = str(manifest["metadata"]["resourceType"])
            url = makeBaseUri() + '/blobs/' + name +"?resourceType=" + type
            # now PUT blob

            response = doHttpPostPut(url,os.path.join(basePath,name), True,headers )
            if response and response.status_code >= 200 and response.status_code <= 250:
                if args.verbose:
                    sprint("Uploaded " + basePath + " payload successfully")
            elif response and response.status_code:
                eprint("Non OK response: " + str(response.status_code) + " when uploading " + file)


def putCollections():

    for f in fileList["collections"]:
        response = doPost(baseUrl, f, 'Collection')
        if response.status_code == 200:
            printPostResponse(f,"Collection",response)
            putSchema(f)
        elif response.status_code != 200:
            if args.verbose:
                print "...Failure."
            eprint("Non OK response of " + str(response.status_code) + " when importing: " + f)

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
    response = None
    response = doHttp(url)
    if response.status_code == 200:
        j = json.loads(response.content)
        return j
    else:
        eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)


def putSchema(collection):
    # now go thru the schema files for this collection and send them off
    colName = collection[:collection.find(getSuffix("collections"))]

    schemaUrl = makeBaseUri() + '/collections/' + colName + '/solr-config/'

    currentZkFiles = []
    # get a listing of current files
    zkFilesJson = doHttpJsonGet(schemaUrl)
    if zkFilesJson and len(zkFilesJson) > 0:
        for obj in zkFilesJson:
            if not obj['isDir']:
                currentZkFiles.append(obj['name']);


    dir = os.path.join(args.dir, colName + "_schema")
    if os.path.isdir(dir):
        files = os.listdir(dir)
        counter = 0;
        for file in files:
            counter += 1
            isLast = len(files) == counter
        # see if the file exists and PUT or POST accordingly
            url = schemaUrl + file
            if isLast:
                url += '?reload=true'
            #PUT to update, POST to add
            response = doHttpPostPut(url,os.path.join(dir,file), (file in currentZkFiles))
            if response and response.status_code >= 200 and response.status_code <= 250:
                if args.verbose:
                    sprint("\Uploaded " + file + " successfully")
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
        if f.endswith(getSuffix("ipipelines")):
            fileList["ipipelines"].append(f)
        elif f.endswith(getSuffix("qpipelines")):
            fileList["qpipelines"].append(f)
        elif f.endswith(getSuffix("parsers")):
            fileList["parsers"].append(f)
        elif f.endswith(getSuffix("datasources")):
            fileList["datasources"].append(f)
        elif f.endswith(getSuffix("collections")):
            fileList["collections"].append(f)

def main():
    initArgs()
    # fetch collections first
    if args.verbose:
        sprint("Uploading objects found under '" + args.dir + "' to Fusion.")

    findFiles()

    # blobs go first since other things can be dependent on them
    putBlobs()

    #PUT pipelines first, then collections (because profiles depend on pipelines and collections)
    #then parsers and finally datasources and job schedules.
    for f in fileList["ipipelines"]:
        response = doPost(baseUrl, f, 'Index Pipeline')

    for f in fileList["qpipelines"]:
        response = doPost(baseUrl, f, 'Query Pipeline')

    putCollections()

    for f in fileList["parsers"]:
        response = doPost(baseUrl, f, 'Parser')

    for f in fileList["datasources"]:
        response = doPost(baseUrl, f, 'Datasource')

    # job schedules are not in Import/export format so are not in fileList
    putTaskAndSpark()
    putJobs()

if __name__ == "__main__":
    scriptName = os.path.basename(__file__)
    # sample line: 'usage: getProject.py [-h] [-l] [--protocol PROTOCOL] [-s SERVER] [--port PORT]'
    description = ('______________________________________________________________________________'
                'Take a folder containing .json files (produced by getProject.py) and POST the '
                'contents to a Fusion instance.  Collections will be created/altered as needed, '
                'as will Pipelines, Parsers, Profiles and Datasources. NOTE: if launching from '
                'putProject.sh, defaults will be pulled from the bash environment plus values '
                'set in bin/lw.env.sh\n'
                '______________________________________________________________________________'
                   )

    varFileHelp = ('Key value mapping for variable replacement in json format.  For example:  '
                   '{"secret.1.bindPassword" : "abc", "secret.2.bindPassword" : "def"}.  '
                    'This is avoids validationErrors when uploading DataSources containing redacted '
                   'passwords i.e. ${secret.1.f.jira_password} entries.'
                   )
    parser = argparse.ArgumentParser(description=description)

    parser.add_argument("--protocol", help="Protocol,  Default: 'http'.")
    parser.add_argument("-s","--server", help="Server to send (Outbound) data to, Default: 'localhost'.") # default="localhost"
    parser.add_argument("--port", help="Port, Default: 8764") #,default="8764"
    parser.add_argument("-u","--user", help="User, Default: 'admin'.") #,default="admin"
    parser.add_argument("--password", help="Password,  Default: 'password123'.") #,default="password123"
    #parser.add_argument("dir", help="Input directory, required.")#,default="default"
    parser.add_argument("-d","--dir", help="Input directory, required.", required=True)#,default="default"
    parser.add_argument("--varFile", help=varFileHelp)
    #parser.add_argument("-p","--prefix", help="Prefix for identifying pipelines, default: 'lwes_'.") #,default="lwes_"
    parser.add_argument("-v","--verbose",help="Print details, default: False.",default=False,action="store_true")# default=False
    parser.add_argument("--debug",help="Print debug messages while running, default: False.",default=False,action="store_true")# default=False

    args = parser.parse_args()

    main()

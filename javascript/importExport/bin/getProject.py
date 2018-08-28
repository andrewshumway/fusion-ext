#!/usr/bin/env python
#
# query Fusion for all datasources, index pipelines and query pipelines.  Then make lists of names
# which start with the $PREFIX so that they can all be exported.

#  Requires a python 2.7.5+ interpeter

import json, sys, argparse, os, subprocess, sys, requests, datetime, re, shutil
from StringIO import StringIO
from zipfile import ZipFile

# get current dir of this script
cwd = os.path.dirname(os.path.realpath(sys.argv[0]))

OBJ_TYPES = {
    "ipipelines": "IPL"
    ,"qpipelines": "QPL"
    ,"parsers": "PS"
    ,"datasources": "DS"
    ,"collections": "COL"
    ,"job": "JOB"
    ,"task": 'TSK'
    ,"spark": 'SPRK'
}

datasources = []
ipipelines = []
qpipelines = []
collections = []
parsers = []
schedules = {}
schema_files = ["schema.xml","solrconfig.xml","stopwords.txt","synonyms.txt","managed-schema"]



def getSuffix(type):
    return '_' + OBJ_TYPES[type] + '.json'

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


    if args.prefix == None:
        args.prefix = initArgsFromMaps("lw_PREFIX","lwes_",os.environ,env)

    if args.dir == None:
        # make default dir name
        defDir = args.prefix + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        args.dir = defDir
    elif os.sep not in args.dir:
        defDir = args.dir
        args.dir = defDir



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


def get_script_path():
    return os.path.dirname(os.path.realpath(sys.argv[0]))

def http(uri,qs):
    url = args.protocol + ":"

def makeBaseUri():
    uri = args.protocol + "://" + args.server + ":" + args.port + "/api/apollo"
    return uri

def doHttp(url,usr,pswd,headers={}):
    response = None
    try:
        debug("calling requests.get url:" +url + " usr:" + usr + " pswd:" + pswd + " headers:" + str(headers))
        response = requests.get(url, auth=requests.auth.HTTPBasicAuth(usr, pswd),headers=headers)
        return response
    except requests.ConnectionError as e:
        eprint(e)
def doHttpJsonGet(url, usr, pswd, ignoreEmbeddedZip = True):
    response = None
    response = doHttp(url, usr, pswd)
    if response and response.status_code == 200:
        contentType = response.headers['Content-Type']
        debug("contentType of response is " + contentType)
        # use a contains check since the contentType may be 'application/json; utf-8' or multi-valued
        if "application/json" in contentType:
            j = json.loads(response.content)
            return j
        elif "application/zip" in contentType:
            content = response.content
            zipfile = ZipFile(StringIO(content))
            filelist = zipfile.namelist()
            if ignoreEmbeddedZip:
                filelist = [f for f in filelist if not str(f).endswith(".zip")]

            if len(filelist) == 1:
                filename = filelist[0] # do we assume len(filelist) = 1?
                jstr = zipfile.open(filename).read()
                zipfile.close()
                j = json.loads(jstr)
                return j
            else:
                eprint("Zip encoded content contains more than one file, url skipped: " + url)


    else:
        eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)

def doHttpGet(url, usr, pswd, headers):
    response = doHttp(url, usr, pswd,headers)
    if response.status_code == 200:
        return response.content
    else:
        eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)


# fetch a set of objects from fusion and stuff the values starting with args.prefix into
# the things array
def collectPrefix(url,things):
    try:
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None:
            for e in j:
                id = e['id']
                if id.startswith(args.prefix):
                    things.append(id)
    except requests.ConnectionError as e:
        eprint(e)

def collectJobPrefix(url,things):
    try:
        pattern = re.compile('^(datasource|task|spark):' + args.prefix + '.*');
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None:
            for e in j:
                resource = e['resource']
                if pattern.match(resource):
                    things.append(resource)
    except requests.ConnectionError as e:
        eprint(e)



def collectSchedules(url, job, schedules):
    try:
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None and len(j['triggers']) :
            schedules[job] = j
    except requests.ConnectionError as e:
        eprint(e)

def getQuery():

    if args.verbose:
        sprint( "\tgetting query-pipelines")
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/query-pipelines
    url = makeBaseUri() + "/query-pipelines"
    collectPrefix(url,qpipelines)

def getIndex():

    if args.verbose:
        sprint( "\tgetting index-pipelines")
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/index-pipelines
    url = makeBaseUri() + "/index-pipelines"
    collectPrefix(url,ipipelines)


def getParsers():

    if args.verbose:
        sprint( "\tgetting Parsers")
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/index-pipelines
    url = makeBaseUri() + "/parsers"
    collectPrefix(url,parsers)

def getJobs():

    # https://doc.lucidworks.com/fusion/3.1/REST_API_Reference/Jobs-API.html#job-types
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/index-pipelines
    url = makeBaseUri() + "/jobs"
    jobs = []
    if args.verbose:
        sprint( "\tgetting jobs for project " + args.prefix + ". (This is slow...)")

    collectJobPrefix(url, jobs )

    if args.verbose:
        sprint( "\tfound " + str(len(jobs)) + " Jobs.  Getting schedules")

    for job in jobs:
        turl = url + "/" + job + "/schedule"
        collectSchedules(turl, job, schedules)


def getDatasources():
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/connectors/datasources?collection=default
    if args.verbose:
        sprint( "\tgetting Datasources")
    for col in collections:
        url = makeBaseUri() + "/connectors/datasources?collection=" + col
        collectPrefix(url,datasources)

def getCollections():
    #{{p}}{{s}}:{{FusionPort}}/api/apollo/collections
    url = makeBaseUri() + "/collections"
    if args.verbose:
        sprint( "\tgetting Collections")
    try:
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None:
            for e in j:
                id = e['id']
                if id.startswith(args.prefix) and e['type'] == 'DATA':
                    collections.append(id)
    except requests.ConnectionError as e:
        eprint(e)


def listProject():

    prefix = "Collection: "
    for e in collections:
        print prefix + e

    prefix = "Datasource: "
    for e in datasources:
        print prefix + e

    # prefix = "Parser: "
    # for e in parsers:
    #     print prefix + e

    #if args.quiet == False:
    prefix = "IndexPipeline: "
    for e in ipipelines:
        print prefix + e

    #if args.quiet == False:
    prefix = "QueryPipeline: "
    for e in qpipelines:
        print prefix + e

   # collect job schedules
    prefix = "Scheduled Jobs: "
    for e in schedules:
        print prefix + e



    sys.stdout.flush()

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

def doExport(url, outfileName):
    f = None
    try:

        # 4.0 embeds configsetconfigsets/name.zip but we fetch them separately for backward compatibility
        j = doHttpJsonGet(url, args.user, args.password)
        if j != None:
            # make backup
            if os.path.isfile(outfileName):
                #os.system('cp ' + outfileName + ' ' + outfileName + ".bak")
                shutil.copy(outfileName, outfileName + ".bak")

            f = open(outfileName, mode="w")
            f.write(json.dumps(j, indent=2, sort_keys=True))

    except requests.ConnectionError as e:
        eprint(e)

    finally:
        if f != None:
            f.close()

def exportJob(resourceName, job,pattern):
    try:
        m = pattern.match(resourceName)
        type = m.group(1)
        name = m.group(2)
        filename = type + '_-_' + name + getSuffix("job")
        outfileName = os.path.join(args.dir,"jobs",filename)
        if args.verbose:
            sprint( "Exporting Job: " + filename)
        if os.path.isfile(outfileName):
            #os.system('cp ' + outfileName + ' ' + outfileName + ".bak")
            shutil.copy(outfileName, outfileName + ".bak")

        f = open(outfileName, mode="w")
        f.write(json.dumps(job, indent=2))
        # if type is spark or job then export the spark or job definition as well
        if type == 'spark':
            exportSpark(name)
        elif type == 'task':
            exportTask(name)

    except IOError as e:
        eprint(e)

def exportSpark(name):
    if args.verbose:
        sprint( "Exporting Spark: " + name)
    url = makeBaseUri() + '/spark/configurations/' + name
    filename = name + getSuffix('spark')
    outfilename = os.path.join(args.dir,"jobs",filename)
    doExport(url,outfilename)

def exportTask(name):
    if args.verbose:
        sprint( "Exporting Task: " + name)
    url = makeBaseUri() + '/tasks/' + name
    filename = name + getSuffix('task')
    outfilename = os.path.join(args.dir,"jobs",filename)
    doExport(url,outfilename)

def doSchemaExport(url, outfileName):
    f = None
    headers = {"Accept": "text/plain"}
    try:
        j = doHttpGet(url, args.user, args.password, headers)
        if j != None:
            # make backup
            if os.path.isfile(outfileName):
                #os.system('cp ' + outfileName + ' ' + outfileName + ".bak")
                shutil.copy(outfileName, outfileName + ".bak")
            f = open(outfileName, mode="w")
            f.write(j)

    except requests.ConnectionError as e:
        eprint(e)

    finally:
        if f != None:
            f.close()


def fetchProject():
    # go thru each valued array and export them

    baseUrl = makeBaseUri() + "/objects/export?filterPolicy=system"

    # create if missing
    if not os.path.isdir(args.dir):
        os.makedirs(args.dir)


    # qpipelines = []
    # collections = []
    # parsers = []
    if len(datasources) > 0:
        url = baseUrl + "&datasource.ids="
        for e in datasources:
            if args.verbose:
                sprint( "Exporting Datasource: " + str(e))
            qurl = url + e
            doExport(qurl,os.path.join(args.dir,e + getSuffix('datasources')))

    if len(ipipelines) > 0:
        url = baseUrl + "&index-pipeline.ids="
        for e in ipipelines:
            if args.verbose:
                sprint( "Exporting Index Pipeline: " + e)
            qurl = url + e
            doExport(qurl,os.path.join(args.dir,e + getSuffix("ipipelines")))

    if len(qpipelines) > 0:
        url = baseUrl + "&query-pipeline.ids="
        for e in qpipelines:
            if args.verbose:
                sprint( "Exporting Query Pipeline: " + e)
            qurl = url + e
            doExport(qurl,os.path.join(args.dir,e + getSuffix("qpipelines")))

    if len(parsers) > 0:
        url = baseUrl + "&parser.ids="
        for e in parsers:
            if args.verbose:
                sprint( "Exporting Parser: " + e)
            qurl = url + e
            doExport(qurl,os.path.join(args.dir,e + getSuffix("parsers")))

    if len(schedules) > 0:
        if not os.path.isdir(os.path.join(args.dir,"jobs")):
            os.makedirs(os.path.join(args.dir,"jobs"))
        url = baseUrl
        # export api doesn't work for datasource triggers.  use jobs API

        pattern = re.compile('^(datasource|task|spark):(' + args.prefix + '.*)')
        for key in schedules:
            exportJob(key, schedules[key], pattern)


    if len(collections) > 0:
        url = baseUrl + "&collection.ids="

        for e in collections:
            if args.verbose:
                sprint( "Exporting Collection: " + e)
            qurl = url + e
            doExport(qurl,os.path.join(args.dir, e + getSuffix("collections") ))
            # also export schema into a dir under
            dirname = os.path.join(args.dir,e + '_schema')
            if not os.path.isdir(dirname):
                os.makedirs(dirname)
            for f in schema_files:
                schemaUrl = makeBaseUri() + "/collections/" + e + "/solr-config/" + f + '?expand=true'
                doSchemaExport(schemaUrl, os.path.join(dirname,f))


def main():
    initArgs()
    # fetch collections first
    sprint( "Getting list of objects prefixed with '" + args.prefix + "' from server '" + args.server + "'.")
    getCollections()
    getDatasources()
    getIndex()
    getQuery()
    getParsers()
    getJobs()

    #either list or export  The List option is so that this can be used as a listing/filtering utility
    if args.list:
        listProject()
    else:
        fetchProject()


if __name__ == "__main__":
    scriptName = os.path.basename(__file__)
    # sample line: 'usage: getProject.py [-h] [-l] [--protocol PROTOCOL] [-s SERVER] [--port PORT]'
    description = ('______________________________________________________________________________'
                'Get the commonly used configuration artifacts from Fusion and store them in '
                'a folder as .json files.  These can later be pushed back into the same, '
                'or different, Fusion instance as needed. NOTE: if launching from getProject.sh, '
                'defaults will be pulled from the bash environment plus values from bin/lw.env.sh\n'
                '______________________________________________________________________________'
                   )
    parser = argparse.ArgumentParser(description=description)

    #parser.add_argument_group('bla bla bla instruction go here and they are really long \t and \n have tabs and\n newlines')
    parser.add_argument("-l","--list", help="Only list prefixed elements ( do no fetch them),  Default: False", default=False, action="store_true")
    parser.add_argument("--protocol", help="Protocol,  Default: 'http'.")
    parser.add_argument("-s","--server", help="Server to fetch from (inbound data) name, Default: 'localhost'.") # default="localhost"
    parser.add_argument("--port", help="Port, Default: 8764") #,default="8764"
    parser.add_argument("-u","--user", help="User, Default: 'admin'.") #,default="admin"
    parser.add_argument("--password", help="Password,  Default: 'password123'.") #,default="password123"
    parser.add_argument("-d","--dir", help="Output directory, default: '$(prefix)_ccyymmddhhmmss'.")#,default="default"
    parser.add_argument("-p","--prefix", help="Prefix for identifying pipelines, default: 'lwes_'.") #,default="lwes_"
    parser.add_argument("-v","--verbose",help="Print details, default: False.",default=False,action="store_true")# default=False
    parser.add_argument("--debug",help="Print debug messages while running, default: False.",default=False,action="store_true")# default=False

    #print("args: " + str(sys.argv))
    args = parser.parse_args()

    main()

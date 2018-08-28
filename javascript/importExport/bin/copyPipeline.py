#!/usr/bin/env python
#
# Copy a Fusion pipeline

#  Requires a python 2.7.5+ interpeter

import json, sys, argparse, os, subprocess, sys, requests
# get current dir of this script
cwd = os.path.dirname(os.path.realpath(sys.argv[0]))

def initArgs(script):
    env = {} #some day we may get better environment passing

    #setting come from command line but if not set then pull from environment
    if args.protocol == None:
        args.protocol = initArgsFromMaps("lw_PROTOCOL","http",os.environ,env)

    if args.iserver == None:
        args.iserver = initArgsFromMaps("lw_IN_SERVER","localhost",os.environ,env)
    if args.oserver == None:
        args.oserver = initArgsFromMaps("lw_OUT_SERVER",args.iserver,os.environ,env)

    if args.port == None:
        args.port =  initArgsFromMaps("lw_PORT","8764",os.environ,env)

    if args.user == None:
        args.user = initArgsFromMaps("lw_USERNAME","admin",os.environ,env)

    if args.password == None:
        args.password = initArgsFromMaps("lw_PASSWORD","password123",os.environ,env)
    if args.opassword == None:
        args.opassword = initArgsFromMaps("lw_PASSWORD",args.password,os.environ,env)


def initArgsFromMaps(key, default, penv,env):
    if penv.has_key(key):
        return penv[key]
    else:
        if env.has_key(key):
            return env[key]
        else:
            return default


def get_script_path():
    return os.path.dirname(os.path.realpath(sys.argv[0]))

def http(uri,qs):
    url = args.protocol + ":"

def makeBaseInboundUri():
    uri = args.protocol + "://" + args.iserver + ":" + args.port + "/api/apollo"
    return uri

def makeBaseOutboundUri():
    uri = args.protocol + "://" + args.oserver + ":" + args.port + "/api/apollo"
    return uri


def doHttpGet(url,usr,pswd):
    try:
        response = requests.get(url, auth=requests.auth.HTTPBasicAuth(usr, pswd))
        if response.status_code == 200:
            j = json.loads(response.content)
            return j;
        else:
            eprint("Non OK response of " + str(response.status_code) + " for URL: " + url)
    except requests.ConnectionError as e:
        eprint(e)


def doHttpPost(url, data,usr,pswd):
    response = None
    try:
        headers = {'Content-Type': 'application/json'}
        response = requests.post(url, auth=requests.auth.HTTPBasicAuth(usr, pswd), headers=headers, data=data)

        if response.status_code != 200:
            msg = "Non OK response of " + str(response.status_code) + " for URL: " + url
            if response.content is not None:
                j = json.loads(response.content)
                if j is not None:
                    msg += '\nMessage: ' + j['message']
            eprint(msg)
    except requests.ConnectionError as e:
        eprint(e)

    return response

def copyPipeline(uriPart):

    #{{p}}{{s}}:{{FusionPort}}/api/apollo/index-pipelines
    posturl = makeBaseOutboundUri() + "/" + uriPart
    geturl = makeBaseInboundUri + "/" + args.name
    try:
        j = doHttpGet(geturl, args.user, args.password)
        if j != None:
            # set ID tonew name and post
            j['id'] = args.create
            for s in j['stages']:
                del s['id']
                del s['secretSourceStageId']
            del j['properties']
            #now post this back

            response = doHttpPost(posturl,json.dumps(j),args.user,args.opassword)
            response.content

    except requests.ConnectionError as e:
        eprint(e)

def eprint(msg):
    # change inputs to *args, **kwargs in python 3
    #print(*args, file=sys.stderr, **kwargs)
    print >> sys.stderr, msg


def main():
    initArgs(os.path.join(cwd ,'lw.env.sh'))
    # fetch datasources
    if args.type == "Index":
        copyPipeline('index-pipelines')
    elif args.type == "Query":
        copyPipeline('query-pipelines')



if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    description = ('______________________________________________________________________________'
                   'Export a pipeline from Fusion, strip out or change id and name fields, copy to'
                   'a different server etc.  Key parameters are the inbound and outbound server, '
                   'type, name and create parameters.'
                   '______________________________________________________________________________'
                   )
    parser = argparse.ArgumentParser(description=description)

    parser.add_argument("--protocol", help="Protocol,  Default: http")
    parser.add_argument("-s","--iserver Server", help="Inbound Server name (inbound ), Default: localhost.")
    parser.add_argument("-o","--oserver", help="Outbound Server name, Default: <InboundServer>.")
    parser.add_argument("--port", help="Port, Default: 8764")
    parser.add_argument("-u","--user", help="User, default admin")
    parser.add_argument("--password", help="Password for inbound servers,  Default: password123")
    parser.add_argument("--opassword", help="Password for outbound server,  Default: <InboundPassword>")
    parser.add_argument("-t","--type", help="One of [Index | Query] Default: Index", default="Index")
    parser.add_argument("-n", "--name", help="Required; The name (id) of the pipeline to copy from InboundServer", required=True)
    parser.add_argument("-c", "--create", help="Required; The name (id) of the pipeline to create", required=True)

    args = parser.parse_args()
    main()

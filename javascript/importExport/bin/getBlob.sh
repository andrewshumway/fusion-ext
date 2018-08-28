#!/usr/bin/env bash

CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f $CWD/lw.env.sh ]; then
  source $CWD/lw.env.sh
fi
ORIG_ONE=$1
# getBlob needs
# OUT_DIR, BLOB_ID, SERVER, User, PSWD
#
function getBlob(){

   OUT_DIR=${BASE_DIR}/${BLOB_ID}

    echo "getting blob ${BLOB_ID} manifest"
    #get the manifest of the utilLib.js blob
    mkdir -p $OUT_DIR
    curl -s -u ${USER}:${PSWD} http://${SERVER}:${PORT}/api/apollo/blobs/${BLOB_ID}/manifest \
      -H 'Accept: application/json' \
      -o "${OUT_DIR}/manifest.json"
    # get blob itself
    echo "getting blob ${BLOB_ID} payload"
    RESPONSE=$(curl --write-out %{http_code} -s -u ${USER}:${PSWD} http://${SERVER}:${PORT}/api/apollo/blobs/${BLOB_ID} \
      -o "${OUT_DIR}/${BLOB_ID}")

    if [ "200" != "$RESPONSE" ];then
        >&2 echo "non OK response of ${RESPONSE} when fetching ${BLOB_ID}"
    fi
}
function usage(){
    ## Usage

  echo 'Usage:'
  echo ''
  echo '  -d | --dir <output_dir> (Required)'
  echo '  -i | --id <blob_id> (Required)'
  echo '  -s | --server <fusion Server IP> (default $lw_IN_SERVER)'
  echo '  -u | --user <user> (default $lw_USERNAME)'
  echo '  -p | --password <password> (default $lw_PASSWORD)'
  echo '  --port <fusion API port> (default $lw_PORT)'
  echo '  --help'
  echo ''
  echo 'Example:'
  echo "./${0##*/} -d projX -b blob.zip -s localhost"
}
function getOpts(){

    #Set defaults
    SERVER=$lw_IN_SERVER
    PORT=$lw_PORT
    USER=$lw_USERNAME
    PSWD=$lw_PASSWORD
    ## Process input parameters
    if [[ "$ORIG_ONE" =~ ^((-{1,2})([Hh]$|[Hh][Ee][Ll][Pp])|)$ ]]; then
    usage; exit 1
  else
    while [[ $# -gt 0 ]]; do
      opt="$1"
      shift;
      current_arg="$1"
      if [[ "$current_arg" =~ ^-{1,2}.* ]]; then
        echo "WARNING: You may have left an argument blank. Double check your command."
      fi
      #echo process opt:$opt
      case "$opt" in
        "-d"|"--dir"      ) BASE_DIR="$1"; shift;;
        "-i"|"--id"       ) BLOB_ID="$1"; shift;;
        "-s"|"--server"   ) SERVER="$1"; shift;;
        "--port"          ) PORT="$1"; shift;;
        "-u"|"--user"     ) USER="$1"; shift;;
        "-p"|"--password" ) PASS="$1"; shift;;
        * )
            echo "ERROR: Invalid option: \""$opt"\"" >&2
            usage
            exit 1;;
      esac
    done
  fi
  if [ -z "$BASE_DIR" ];then
      echo "missing output_dir" >&2
      usage
      exit 1
    fi
    # enforce
    if [ -z "$BLOB_ID" ];then
       echo "missing blob_id" >&2
      usage
      exit 1
    fi
    if [ -z "$SERVER" ];then
      echo "missing Fusion Server" >&2
      usage
      exit 1
    fi
    if [ -z "$PORT" ];then
      echo "missing Fusion Port" >&2
      usage
      exit 1
    fi
    if [ -z "$USER" ];then
      echo "missing User" >&2
      usage
      exit 1
    fi
    if [ -z "$PWD" ];then
      echo "missing Password" >&2
      usage
      exit 1
    fi
}
getOpts $@
getBlob
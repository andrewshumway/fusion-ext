#!/usr/bin/env bash

getOpts(){
    # default suffix
    SUFFIX=".orig"
    while :
    do
        case "$1" in
          -d | --dir)
              DIR="$2"   # You may want to check validity of $2
              if [ -d $2 ]; then
                DIR="$2"
                shift 2
              else
                echo "Error: $2 is not a valid data directory." >&2
                syntax
                exit 1
              fi
          ;;
          -h | --help)
              syntax
              exit 0
          ;;
          -s)
            SUFFIX="$2" # You may want to check validity of $2
            shift 2
          ;;
          -t | --tokenfile)
              if [ -f $2 ]; then
                TOKENFILE="$2" # You may want to check validity of $2
                shift 2
              else
                echo "Error: $2 tokenfile not found." >&2
                syntax
                exit 1
              fi
          ;;
          -*)
              echo "Error: Unknown option: $1" >&2
              syntax
              exit 1
          ;;
          *)  # No more options
            break
          ;;
        esac
    done
    if [ -z $DIR ];then
        echo "Error: No --dir set" >&2
        syntax
        exit 1
    fi
    if [ -z $TOKENFILE ];then
        echo "Error: No --tokenFile set" >&2
        syntax
        exit 1
    fi
}

syntax(){
  echo "usage: $SCRIPT_NAME [-d|--dir DataDirectory] [-t|--tokenfile TokenFile] [-s suffix] [-h|--help]"
  echo
  echo "DataDirectory and TokenFile are required.  Suffix, used when making backup, is optional"
  echo "Each line in the TokenFile should contain a SEARCH_STRING|REPLACE_STRING"
  echo "Each SEARCH_STRING will be globally replaced with REPACE_STRING in each "
  echo "*.json file within the DataDirectory."

}
main() {
  SCRIPT_NAME=`basename "$0"`
  getOpts ${@%/}

 # make backup files
 for f in $(ls ${DIR}/*.json); do cp ${f} ${f}${SUFFIX};done

 # now replace from any tokens set in the replacementTokens.txt file
 while IFS='' read -r line || [[ -n "$line" ]]; do
     #extract fields to KEY and Val.
     #echo "get Key and Val from \"$line\""
     KEY=$(echo $line | awk -F "[ \t]*[|][ \t]*" '{print $1}')
     VAL=$(echo $line | awk -F "[ \t]*[|][ \t]*" '{print $2}')
     if [ -n "$KEY" ];then
         #wrapping key in an additional ${} may be needed for embedded quotes???
         #KEYTOKEN=\${${KEY}}
         KEYTOKEN=${KEY}
         echo "Replacing all \"${KEYTOKEN}\" with \"${VAL}\" within $DIR/*.json"
          for DATAFILE in $(ls $DIR/*.json)
          do
          #echo KEYTOKEN:${KEYTOKEN} VAL:$VAL
            sed -i "s|${KEYTOKEN}|$VAL|g" ${DATAFILE}
          done
     fi
 done < $TOKENFILE

}

main ${@%/}

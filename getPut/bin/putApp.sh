#!/usr/bin/env bash

#hacked script used to let python inherit environment
CWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [ -f $CWD/lw.env.sh ]; then
  source $CWD/lw.env.sh
fi
CSN=$(basename "$0")

bash -c "$CWD/putApp.py ${*:1}"
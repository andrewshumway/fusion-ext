#!/usr/bin/env bash

CSN=$(basename "$0")
#
if [ "$#" -ne 3 ]; then
    echo "${CSN} is used to rename files and config fetched via getProject.py"
    echo "Syntax: ${CSN} <directory_of_files> <originalPrefix> <newPrefix>"
    echo
    echo 'Example: To change the results of `getProject.py -p gdelt -d gdelt_config` to a project'
    echo "configuration prefixed by 'tledg', do the following:"
    echo "./${CSN} gdelt_config gdelt tledg"
    exit 1
fi
#
#  test with
# for json in $(ls $DIR/*.json|grep -v JOB); do echo $json ;sed "s|\"$OLDP|\"$NEWP|g" $json |diff -w -d -y $json - |grep '|';read -n1 -r -p "Press space to continue..." key;done
#

DIR=$1
OLDP=$2
NEWP=$3

#echo $DIR $OLDP $NEWP
if [ -d "$DIR" ]; then

  # first search and replace "OLDP with "NEWP inside all json files.  The quote keeps the changes to
  # JSON parameter prefix values.  do normal files first and then schedules
  for json in $(ls ${DIR}/*.json |grep -v JOB); do sed -i "s|\"${OLDP}|\"${NEWP}|g" $json;done
  # now do the JOB schedules
  for json in $(ls ${DIR}/jobs/*.json ); do sed -i "s|\:${OLDP}|\:${NEWP}|g" $json;done

  # next do some magic to rename all the files.  This is needed so putProject.py can find
  # the schema subdirectories.  There are easier ways but this even works with git-bash on windows.
  $(ls -d ${DIR}/${OLDP}* |awk '{print("mv "$1" "$1)}' |sed "s/${OLDP}/${NEWP}/2" | /bin/sh)
  $(ls -d ${DIR}/jobs/*.json |awk '{print("mv "$1" "$1)}' |sed "s/${OLDP}/${NEWP}/2" | /bin/sh)
else
  echo "Can not find a directory named '$DIR'."
fi
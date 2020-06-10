#
#
# this is just a dump of loops using jq to convert 3.1.x format from ./export into 4.x format in ./export2
# mods will be needed

# process COL
$ for f in $(ls export/*_COL.json);do echo $f;bash -c "jq '.objects.collections[0]' $f > export2/$(basename $f)" ;done
# process IPL
for f in $(ls export/*_IPL.json);do echo $f;bash -c "jq '.objects.indexPipelines[0]' $f > export2/$(basename $f)" ;done
# process QPL
for f in $(ls export/*_QPL.json);do echo $f;bash -c "jq '.objects.queryPipelines[0]' $f > export2/$(basename $f)" ;done


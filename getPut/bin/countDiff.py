#!/usr/bin/env python

"""
Use at your own risk.  No compatibility or maintenance or other assurance of suitability is expressed or implied.
Update or modify as needed
Copyright Polaris Alpha i.e. Parsons Corp.  All rights reserved
"""

#  Requires a python 2.7.5+ interpeter

import sys, argparse, os, sets
from io import BytesIO
from StringIO import StringIO
from argparse import RawTextHelpFormatter

def eprint(msg):
    # change inputs to *args, **kwargs in python 3
    #print(*args, file=sys.stderr, **kwargs)
    print >> sys.stderr, msg

def sprint(msg):
    # change inputs to *args, **kwargs in python 3
    #print(*args, file=sys.stderr, **kwargs)
    print(msg)
    sys.stdout.flush()
def file2set(file):

    s = sets.Set()
    with open(file, 'r') as infile:
        for line in infile:
            line = line.rstrip() # remove newline and trailing whitespace
            s.add(line)
    return s

def main():
  s1 = file2set(args.FILE1)
  s2 = file2set(args.FILE2)

  common = s1.intersection(s2)
  uniq1 = s1.difference(s2)
  uniq2 = s2.difference(s1)

  #print output
  if args.verbose:
      sprint(str(len(common)) +" Common lines: \n\t" + str(common) + "\n")
      sprint(str(len(uniq1)) + " Lines unique to " + args.FILE1 + "\n\n\t" + str(uniq1) + "\n")
      sprint(str(len(uniq1)) +" Lines unique to " + args.FILE2 + "\n\n\t" + str(uniq2))

  else:
      sprint("\t" + str(len(common)) + "\t" + str(len(uniq1)) + "\t" + str(len(uniq2)))


if __name__ == "__main__":
    scriptName = os.path.basename(__file__)
    # sample line: 'usage: getProject.py [-h] [-l] [--protocol PROTOCOL] [-s SERVER] [--port PORT]'
    description = ('______________________________________________________________________________\n'
                'Compare lines in file A and B, listing counts for Common, A-Unique, and B-Unique\n'
                'non-verbose output lists three values separated by tabs as follows:\n'
                '  -Count of items common to both files\n'
                '  -Count of items unique to File 1\n'
                '  -Count of items unique to File 2\n\n'
                'Example showing 4 common, 10 unique to File1, and 1 unique to File2.\n'
                '$ ./countDiff.py f1 f2\n'
                '\t4\t 10\t0\n'
                '______________________________________________________________________________'
                   )
    parser = argparse.ArgumentParser(description=description, formatter_class=RawTextHelpFormatter )

    #parser.add_argument_group('bla bla bla instruction go here and they are really long \t and \n have tabs and\n newlines')
    parser.add_argument("FILE1",help="File 1") #,default="lwes_"
    parser.add_argument("FILE2",help="File 2") #,default="lwes_"
    parser.add_argument("-v","--verbose",help="Print details, default: False.",default=False,action="store_true")# default=False


#print("args: " + str(sys.argv))
    args = parser.parse_args()

    main()

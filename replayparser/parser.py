import sys
import os
import zlib
import zipfile
import json

#with open("data.zjson", "rb") as f:
#	d =f.read()#.decode('utf-8')
#	print(d)
CHUNKSIZE=1024
d = zlib.decompressobj(16+zlib.MAX_WBITS)
f = open('data.zjson', 'rb')
replaydata = open("replay.txt","w")
blah = f.read(CHUNKSIZE)
while blah:
	outstr = d.decompress(blah)
	blah=f.read(CHUNKSIZE)
	outstr = d.flush()
	replaydata.write(outstr)
f.close()
replaydata.close()

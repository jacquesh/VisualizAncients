import sys
import os
import zlib
import json

PRE_CREEP_TIME = 90

def parseMatchData(aggregate, matchFileName):
    matchFile = open(matchFileName, "rb")
    matchData = matchFile.read()
    matchFile.close()
    matchBytes = zlib.decompress(matchData)
    matchString = matchBytes.decode("ascii")
    match = json.loads(matchString)
    startTime = match["startTime"]

    for tick in match["snapshots"]:
        timeIndex = int(tick["time"] - startTime) + PRE_CREEP_TIME
        if (timeIndex < 0) or (timeIndex >= 3600 + PRE_CREEP_TIME):
            continue
        for hero in tick["heroData"]:
            isValid = hero["alive"]
            if not isValid:
                continue
            xIndex = (int(hero["x"]) - 64)//2
            yIndex = (int(hero["y"]) - 64)//2
            locIndex = yIndex*64 + xIndex
            aggregate["positionData"][timeIndex][locIndex] += 1


    for ward in match["wardEvents"]:
        timeIndex = int(ward["time"] - startTime) + PRE_CREEP_TIME
        if (timeIndex < 0) or (timeIndex >= 3600 + PRE_CREEP_TIME):
            continue
        isValid = (not ward["isSentry"]) and (not ward["died"])
        if not isValid:
            continue
        xIndex = (int(ward["x"]) - 64)//2
        yIndex = (int(ward["y"]) - 64)//2
        locIndex = yIndex*64+ xIndex
        aggregate["wardData"][timeIndex][locIndex] += 1

    for smoke in match["smokeUses"]:
        timeIndex = int(smoke["time"] - startTime) + PRE_CREEP_TIME
        if (timeIndex < 0) or (timeIndex >= 3600 + PRE_CREEP_TIME):
            continue
        xIndex = (int(smoke["x"]) - 64)//2
        yIndex = (int(smoke["y"]) - 64)//2
        locIndex = yIndex*64 + xIndex
        aggregate["smokeData"][timeIndex][locIndex] += 1


def run(dirName):
    aggregate = {}
    # NOTE: We allow for single-unit precision of events any time from -90s to 1hr
    #       We just ignore any events that happen outside of that range (< -90s shouldnt be possible)
    spatialBuckets = 64*64 # This is the resolution of m_cellX/Y
    temporalBuckets = (60*60) + PRE_CREEP_TIME
    aggregate["positionData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]
    aggregate["wardData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]
    aggregate["smokeData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]

    for fileName in os.listdir(dirName):
        if fileName.endswith(".zjson"):
            filePath = os.path.join(dirName, fileName)
            parseMatchData(aggregate, filePath)

    outputString = json.dumps(aggregate).encode("ascii")
    outputBytes = zlib.compress(outputString)
    outputFileName = os.path.join(dirName, "aggregate.zjson")
    outputFile = open(outputFileName, "wb")
    outputFile.write(outputBytes)
    outputFile.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("No directory given, exiting")
    else:
        targetDir = sys.argv[1]
        if os.path.isdir(targetDir):
            run(targetDir)
        else:
            print("%s is not a valid directory, exiting" % targetDir)

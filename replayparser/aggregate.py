import sys
import os
import zlib
import json

# NOTE: Pre-creep time in AP games is 75s (compared to the usual 90s)
#       This is 75 so that all our timeIndices are consistent,
#       so events at startTime should always be at index 75
PRE_CREEP_TIME =75 

def parseMatchData(aggregate, matchFileName):
    print("Parse %s" % matchFileName)
    matchFile = open(matchFileName, "rb")
    matchData = matchFile.read()
    matchFile.close()
    matchBytes = zlib.decompress(matchData)
    matchString = matchBytes.decode("ascii")
    match = json.loads(matchString)
    startTime = match["startTime"]

    for tickIndex, tick in enumerate(match["snapshots"]):
        timeIndex = int(tick["time"] - startTime) + PRE_CREEP_TIME
        if (timeIndex < 0) or (timeIndex >= 3600 + PRE_CREEP_TIME):
            continue
        for heroIndex, hero in enumerate(tick["heroData"]):
            died = False
            if (tickIndex > 0) and (not hero["alive"]):
                previousHero = match["snapshots"][tickIndex-1]["heroData"][heroIndex]
                if previousHero["alive"]:
                    died = True
            isValid = (hero["alive"] or died)
            if not isValid:
                continue
            xIndex = (int(hero["x"]) - 64)//2
            yIndex = (int(hero["y"]) - 64)//2
            locIndex = yIndex*64 + xIndex
            aggregate["positionData"][timeIndex][locIndex] += 1
            if died:
                aggregate["deathData"][timeIndex][locIndex] += 1
                minuteIndex = 0
                if tick["time"] >= startTime:
                    minuteIndex = int(tick["time"] - startTime)//60 + 1
                aggregate["deathCounts"][minuteIndex] += 1


    for ward in match["wardEvents"]:
        timeIndex = int(ward["time"] - startTime) + PRE_CREEP_TIME
        if (timeIndex < 0) or (timeIndex >= 3600 + PRE_CREEP_TIME):
            continue
        isValid = (not ward["died"])
        if not isValid:
            continue
        xIndex = (int(ward["x"]) - 64)//2
        yIndex = (int(ward["y"]) - 64)//2
        locIndex = yIndex*64+ xIndex
        wardType = "sentryData" if ward["isSentry"] else "wardData"
        aggregate[wardType][timeIndex][locIndex] += 1

        minuteIndex = 0
        if ward["time"] >= startTime:
            minuteIndex = int(ward["time"] - startTime)//60 + 1
        wardType = "sentryCounts" if ward["isSentry"] else "wardCounts"
        aggregate[wardType][minuteIndex] += 1

    for rosh in match["roshEvents"]:
        if not rosh["died"]:
            continue
        minuteIndex = 0
        if rosh["time"] >= startTime:
            minuteIndex = int(rosh["time"] - startTime)//60 + 1
        if minuteIndex >= 60:
            continue
        aggregate["roshCounts"][minuteIndex] += 1

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
    aggregate["deathData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]
    aggregate["wardData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]
    aggregate["sentryData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]
    aggregate["smokeData"] = [[0]*spatialBuckets for i in range(temporalBuckets)]

    graphBuckets = 60 + 1 # Put all the pre-creep events in a single bucket, and then 1 bucket/minute
    aggregate["roshCounts"] = [0]*graphBuckets
    aggregate["wardCounts"] = [0]*graphBuckets
    aggregate["sentryCounts"] = [0]*graphBuckets
    aggregate["deathCounts"] = [0]*graphBuckets

    for fileName in os.listdir(dirName):
        if (fileName != "aggregate.zjson") and fileName.endswith(".zjson"):
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

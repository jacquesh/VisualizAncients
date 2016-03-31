import requests

dirName = "replays"
inFile = open("urls.txt", "r")
for line in inFile:
    url = line.strip()
    filename = url[url.rfind('/')+1:]
    print("Downloading " +filename)
    filepath = dirName+"/"+filename
    response = requests.get(url, stream=True)
    repFile = open(filepath, 'wb')
    for chunk in response.iter_content(1024):
        if chunk:
            repFile.write(chunk)
    repFile.close()
inFile.close()

import matplotlib.pyplot as mpl

inFile = open("out.log")
vals = []
for line in inFile:
    newVals = [float(v) for v in line.split(' ')]
    vals.append(newVals)

xVals, yVals = zip(*vals)

fig = mpl.figure()
ax = mpl.axes()
ax.plot(xVals, yVals)
#mpl.show()
mpl.savefig('hero.png')


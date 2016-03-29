import java.util.ArrayList;
import java.io.OutputStreamWriter;
import java.io.IOException;

public class Snapshot
{
    private final float[][][] BARRACKS_POSITIONS = {
        {{80.375244f, 142.366455f},{80.000244f, 121.491455f},{76.250244f, 101.999268f},{115.348145f, 116.250000f},{100.566895f, 106.304688f},{92.004395f, 96.000000f},{166.492432f, 80.482178f},{123.639893f, 80.366699f},{97.749268f, 80.249512f},{83.629395f, 89.875000f},{85.879395f, 87.625000f}},
        {{91.000000f, 174.999756f},{128.000000f, 174.999756f},{155.375000f, 173.124756f},{135.999756f, 130.499756f},{147.500000f, 144.499756f},{161.000000f, 156.991943f},{176.500000f, 114.999756f},{177.000000f, 130.999756f},{177.031250f, 151.312256f},{166.765625f, 165.374756f},{169.250000f, 162.624756f}}
    };
    private final float[][][] TOWER_POSITIONS = {
        {{80.375244f, 142.366455f},{80.000244f, 121.491455f},{76.250244f, 101.999268f},{115.348145f, 116.250000f},{100.566895f, 106.304688f},{92.004395f, 96.000000f},{166.492432f, 80.482178f},{123.639893f, 80.366699f},{97.749268f, 80.249512f},{83.629395f, 89.875000f},{85.879395f, 87.625000f}},
        {{91.000000f, 174.999756f},{128.000000f, 174.999756f},{155.375000f, 173.124756f},{135.999756f, 130.499756f},{147.500000f, 144.499756f},{161.000000f, 156.991943f},{176.500000f, 114.999756f},{177.000000f, 130.999756f},{177.031250f, 151.312256f},{166.765625f, 165.374756f},{169.250000f, 162.624756f}}
    };

    public float time;

    public TeamData[] teams;
    public HeroState[] heroes;
    public CourierState[] couriers;
    public ArrayList<LaneCreepData> laneCreeps;
    public int[] runes;

    private int[] presenceTotals;

    public Snapshot(int courierCount)
    {
        teams = new TeamData[2];
        teams[0] = new TeamData();
        teams[1] = new TeamData();

        heroes = new HeroState[10];
        for(int i=0; i<10; ++i)
        {
            heroes[i] = new HeroState();
        }

        couriers = new CourierState[courierCount];
        for(int i=0; i<courierCount; ++i)
        {
            couriers[i] = new CourierState();
        }

        runes = new int[2];
        presenceTotals = new int[2];
    }

    private void applyPresence(float[] presenceVals, int x, int y,
                               float newPresence, int radius, int teamMultiplier)
    {
        for(int yOff=-radius; yOff<radius; ++yOff)
        {
            int cellY = y + yOff;
            if((cellY < 0) || (cellY >= 64))
                continue;

            for(int xOff=-radius; xOff<radius; ++xOff)
            {
                int cellX = x + xOff;
                if((cellX < 0) || (cellX >= 64))
                    continue;

                float distance = (float)Math.sqrt(xOff*xOff + yOff*yOff);
                float cellPresence = newPresence - (newPresence/radius)*distance;
                if(cellPresence < 0.0f)
                    cellPresence = 0.0f;

                int cellIndex = cellY*64 + cellX;
                presenceVals[cellIndex] += teamMultiplier*cellPresence;
            }
        }
    }

    public void computePresence(int[] presence, ArrayList<WardEvent> activeWards,
            ArrayList<TowerEvent> activeTowers)
    {
        float[] presenceVals = new float[64*64];
        int teamMultiplier;

        float heroPresence = 10.0f;
        int heroPresenceRadius = 16;
        teamMultiplier = 1;
        for(int heroIndex=0; heroIndex<10; ++heroIndex)
        {
            if(heroIndex == 5)
                teamMultiplier = -1;
            int heroX = (int)Math.round((heroes[heroIndex].x - 64.0f)/2.0f);
            int heroY = (int)Math.round((heroes[heroIndex].y - 64.0f)/2.0f);
            applyPresence(presenceVals, heroX, heroY,
                    heroPresence, heroPresenceRadius, teamMultiplier);
        }

        float creepPresence = 5.0f;
        int creepPresenceRadius = 8;
        for(int creepIndex=0; creepIndex<laneCreeps.size(); ++creepIndex)
        {
            LaneCreepData creep = laneCreeps.get(creepIndex);
            teamMultiplier = creep.isDire ? -1 : 1;
            int creepX = (int)Math.round((creep.x - 64.0f)/2.0f);
            int creepY = (int)Math.round((creep.y - 64.0f)/2.0f);
            applyPresence(presenceVals, creepX, creepY,
                    creepPresence, creepPresenceRadius, teamMultiplier);
        }

        float wardPresence = 7.0f;
        int wardPresenceRadius = 8;
        for(WardEvent ward : activeWards)
        {
            if(ward.isSentry)
                continue;
            teamMultiplier = ward.isDire ? -1 : 1;
            int wardX = (int)Math.round((ward.x - 64.0f)/2.0f);
            int wardY = (int)Math.round((ward.y - 64.0f)/2.0f);
            applyPresence(presenceVals, wardX, wardY,
                    wardPresence, wardPresenceRadius, teamMultiplier);
        }

        float towerPresence = 15.0f;
        int towerPresenceRadius = 16;
        int teamIndex = 0;
        for(TowerEvent tower : activeTowers)
        {
            float[][][] positions;
            if(tower.isBarracks)
                positions = BARRACKS_POSITIONS;
            else
                positions = TOWER_POSITIONS;
            teamMultiplier = 1 - (tower.teamIndex*2);
            int towerX = (int)Math.round((positions[tower.teamIndex][tower.towerIndex][0] - 64.0f)/2);
            int towerY = (int)Math.round((positions[tower.teamIndex][tower.towerIndex][1] - 64.0f)/2);
            applyPresence(presenceVals, towerX, towerY,
                    towerPresence, towerPresenceRadius, teamMultiplier);
        }

        /*
         * Presence key:
         * 0 = 0b000 = Neutral
         * 2 = 0b010 = Radiant
         * 3 = 0b011 = Radiant border
         * 4 = 0b100 = Dire
         * 5 = 0b101 = Dire border
         */
        presenceTotals[0] = 0;
        presenceTotals[1] = 0;
        for(int i=0; i<4096; ++i)
        {
            if(presenceVals[i] == 0.0f)
            {
                presence[i] = 0;
            }
            if(presenceVals[i] > 0.0f)
            {
                presenceTotals[0] += 1;
                presence[i] = 2;
            }
            else if(presenceVals[i] < 0.0f)
            {
                presenceTotals[1] += 1;
                presence[i] = 4;
            }
        }

        // Post-process the data for border detection
        for(int i=0; i<4096; ++i)
        {
            int val = presence[i];
            if(val == 0)
                continue; // No borders for neutral regions

            // We need to bound the x-offset here so that we don't check across horizontal
            // map edges (IE wrap from the end of one row to the start of the next)
            int xOffMin = -1;
            int xOffMax = 1;
            if(i%64 == 0)
                xOffMin = 0;
            else if(i%64 == 63)
                xOffMax = 0;

            for(int yOff=-1; yOff<=1; ++yOff)
            {
                for(int xOff=xOffMin; xOff<=xOffMax; ++xOff)
                {
                    if((xOff == 0) && (yOff == 0))
                        continue; // Don't compare to yourself
                    int tempIndex = i + (64*yOff + xOff);
                    if((tempIndex < 0) || (tempIndex >= 4096))
                        continue; // Don't run off the map
                    int tempVal = presence[tempIndex];
                    if((tempVal & val) == 0)
                    {
                        presence[i] |= 1;
                    }
                }
            }
        }
    }

    public void write(OutputStreamWriter out, ArrayList<WardEvent> activeWards,
            ArrayList<TowerEvent> activeTowers) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));

        out.write("\"teamStats\": [");
        teams[0].write(out);
        out.write(",");
        teams[1].write(out);
        out.write("],");

        out.write("\"heroData\":[");
        for(int i=0; i<10; ++i)
        {
            heroes[i].write(out);
            if(i < 9)
            {
                out.write(",");
            }
        }
        out.write("],");

        out.write("\"courierData\":[");
        for(int i=0; i<couriers.length; ++i)
        {
            couriers[i].write(out);
            if(i < couriers.length-1)
            {
                out.write(",");
            }
        }
        out.write("],");

        out.write("\"laneCreepData\": [");
        for(int i=0; i<laneCreeps.size(); ++i)
        {
            laneCreeps.get(i).write(out);
            if(i < laneCreeps.size()-1)
                out.write(",");
        }
        out.write("],");

        out.write("\"runeData\":["+runes[0]+","+runes[1]+"],");

        int[] presence = new int[64*64];
        computePresence(presence, activeWards, activeTowers);
        out.write("\"presenceData\":{");
        out.write("\"percentages\":");
        out.write(String.format("[%d,%d],",
                    (int)Math.round(100.0f*((float)presenceTotals[0])/4096.0f),
                    (int)Math.round(100.0f*((float)presenceTotals[1])/4096.0f)));
        out.write("\"map\":[");
        for(int i=0; i<4096; ++i)
        {
            if(i > 0)
                out.write(",");
            out.write(""+presence[i]);
        }
        out.write("]}");


        out.write("}");
    }
}

import java.util.ArrayList;
import java.io.OutputStreamWriter;
import java.io.IOException;

public class Snapshot
{
    public float time;

    public TeamData[] teams;
    public HeroState[] heroes;
    public CourierState[] couriers;
    public ArrayList<LaneCreepData> laneCreeps;
    public int[] runes;

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

                float distance = xOff*xOff + yOff*yOff;
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
                positions = Reparser.barracksPositions;
            else
                positions = Reparser.towerPositions;
            teamMultiplier = (tower.teamIndex*2) - 1;
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
        for(int i=0; i<4096; ++i)
        {
            if(presenceVals[i] == 0.0f)
            {
                presence[i] = 0;
            }
            if(presenceVals[i] > 0.0f)
            {
                presence[i] = 2;
            }
            else if(presenceVals[i] < 0.0f)
            {
                presence[i] = 4;
            }
        }

        // Post-process the data for border detection
        for(int i=0; i<4096; ++i)
        {
            int val = presence[i];
            if(val == 0)
                continue; // No borders for neutral regions

            for(int yOff=-1; yOff<=1; ++yOff)
            {
                for(int xOff=-1; xOff<=1; ++xOff)
                {
                    if((xOff == 0) && (yOff == 0))
                        continue;
                    int tempVal = presence[i + (64*yOff + xOff)];
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
        out.write("\"presenceData\":[");
        for(int i=0; i<4096; ++i)
        {
            if(i > 0)
                out.write(",");
            out.write(""+presence[i]);
        }
        out.write("]");


        out.write("}");
    }
}

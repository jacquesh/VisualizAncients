import java.util.ArrayList;
import java.io.FileWriter;
import java.io.IOException;

public class Snapshot
{
    public float time;

    public TeamData[] teams;
    public HeroState[] heroes;
    public CourierState[] couriers;
    public ArrayList<LaneCreepData> laneCreeps;

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
    }

    public void write(FileWriter out) throws IOException
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

        out.write("\"laneCreepData\": [],"); // TODO
        out.write("\"runeData\": []"); // TODO

        out.write("}");
    }
}

import java.io.FileWriter;
import java.io.IOException;

class HeroState
{
    public boolean alive;
    public float x;
    public float y;
    public boolean invisible;
    public String[] items;

    public HeroState()
    {
        alive = true;
        x = 0;
        y = 0;
        invisible = false;
        items = new String[6];
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"alive\":%b,", alive));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f,", x, y));
        out.write(String.format("\"invis\":%b,", invisible));
        out.write(String.format("\"items\":[\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"]",
                    items[0], items[1], items[2], items[3], items[4], items[5]));
        out.write("}");
    }
}

class CourierState
{
    public boolean alive;
    public float x;
    public float y;

    public CourierState()
    {
        alive = true;
        x = 0.0f;
        y = 0.0f;
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"alive\":%b,", alive));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f", x,y));
        out.write("}");
    }
}

class WardState
{
    public float x;
    public float y;
    public boolean isSentry;

    public WardState()
    {
        x = 0.0f;
        y = 0.0f;
        isSentry = false;
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"x\":%.2f,\"y\":%.2f", x,y));
        out.write(String.format("\"isSentry\":%b,", isSentry));
        out.write("}");
    }
}

public class Snapshot
{
    public float time;

    public HeroState[] heroes;
    public CourierState[] couriers;

    public Snapshot(int courierCount)
    {
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

        out.write("\"teamStats\": [],"); // TODO

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

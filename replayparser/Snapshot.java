import java.io.FileWriter;
import java.io.IOException;

class HeroState
{
    public boolean alive;
    public float x;
    public float y;
    public boolean invisible;

    public HeroState()
    {
        alive = true;
        x = 0;
        y = 0;
        invisible = false;
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"alive\":%b,", alive));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f,", x, y));
        out.write(String.format("\"invis\":%b", invisible));
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

public class Snapshot
{
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

    public void copyFrom(Snapshot old)
    {
        for(int i=0; i<10; ++i)
        {
            heroes[i].alive = old.heroes[i].alive;
            heroes[i].x = old.heroes[i].x;
            heroes[i].y = old.heroes[i].y;
        }
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");

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
        out.write("]");

        out.write("}");
    }
}

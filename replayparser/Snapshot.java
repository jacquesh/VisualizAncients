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
        if(!alive)
        {
            out.write("\"x\":64.00, \"y\":64.00");
        }
        else
        {
            out.write(String.format("\"x\":%.2f, \"y\":%.2f", x, y));
        }
    }
}

public class Snapshot
{
    public HeroState[] heroes;

    public Snapshot()
    {
        heroes = new HeroState[10];
        for(int i=0; i<10; ++i)
        {
            heroes[i] = new HeroState();
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
        for(int i=0; i<10; ++i)
        {
            heroes[i].write(out);
        }
        out.write("}");
    }
}

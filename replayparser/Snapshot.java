import java.io.FileWriter;
import java.io.IOException;

public class Snapshot
{
    public float[] heroX;
    public float[] heroY;

    public Snapshot()
    {
        heroX = new float[10];
        heroY = new float[10];
    }
    // TODO: We probably want to keep the state from the last tick, so that we don't dump a unit at 0 if it just stands still and does nothing

    public void write(FileWriter out) throws IOException
    {
        for(int i=0; i<10; ++i)
        {
            if(heroX[i] > 0)
            {
                out.write(String.format("%.2f %.2f\n", heroX[i], heroY[i]));
            }
        }
    }
}

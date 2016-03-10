import java.io.OutputStreamWriter;
import java.io.IOException;

public class TowerEvent
{
    public float time;
    public int teamIndex;
    public int towerIndex;
    public boolean isBarracks;

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"teamIndex\":%d,", teamIndex));
        out.write(String.format("\"towerIndex\":%d,", towerIndex));
        out.write(String.format("\"isBarracks\":%b", isBarracks));
        out.write("}");
    }
}

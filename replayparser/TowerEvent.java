import java.io.FileWriter;
import java.io.IOException;

public class TowerEvent
{
    public float time;
    public int teamIndex;
    public int towerIndex;
    public boolean isBarracks;

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"teamIndex\":%d,", teamIndex));
        out.write(String.format("\"towerIndex\":%d,", towerIndex));
        out.write(String.format("\"isBarracks\":%b", isBarracks));
        out.write("}");
    }
}

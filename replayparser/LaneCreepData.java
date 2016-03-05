import java.io.FileWriter;
import java.io.IOException;

class LaneCreepData
{
    public float x;
    public float y;
    public int creepCount;
    public boolean isDire;

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"x\":%.2f,\"y\":%.2f", x,y));
        out.write(String.format("\"creepCount\":%d,", creepCount));
        out.write(String.format("\"isDire\":%b", isDire));
        out.write("}");
    }
}

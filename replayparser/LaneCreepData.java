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
        out.write("\"x\":"+String.format("%.2f",x)+",\"y\":"+String.format("%.2f,",y));
        out.write("\"creepCount\":"+creepCount+",");
        out.write("\"isDire\":"+isDire);
        out.write("}");
    }
}

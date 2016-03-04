import java.io.FileWriter;
import java.io.IOException;

class WardEvent
{
    public float time;
    public float x;
    public float y;
    public boolean isSentry;
    public boolean died;

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f,", x, y));
        out.write(String.format("\"isSentry\":%b,", isSentry));
        out.write(String.format("\"died\":%b", died));
        out.write("}");
    }
}

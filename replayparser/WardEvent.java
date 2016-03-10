import java.io.OutputStreamWriter;
import java.io.IOException;

class WardEvent
{
    public float time;
    public float x;
    public float y;
    public int entityHandle;
    public boolean isSentry;
    public boolean died;

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f,", x, y));
        out.write(String.format("\"entityHandle\":%d,", entityHandle));
        out.write(String.format("\"isSentry\":%b,", isSentry));
        out.write(String.format("\"died\":%b", died));
        out.write("}");
    }
}

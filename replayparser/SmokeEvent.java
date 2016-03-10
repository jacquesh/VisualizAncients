import java.io.OutputStreamWriter;
import java.io.IOException;

public class SmokeEvent
{
    public float time;
    public float x;
    public float y;

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f", x, y));
        out.write("}");
    }
}

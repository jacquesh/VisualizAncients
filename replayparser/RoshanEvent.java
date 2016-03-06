import java.io.OutputStreamWriter;
import java.io.IOException;

public class RoshanEvent
{
    public float time;
    public boolean died;

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"time\":%.1f,", time));
        out.write(String.format("\"died\":%b", died));
        out.write("}");
    }
}

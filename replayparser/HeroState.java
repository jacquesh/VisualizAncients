import java.io.FileWriter;
import java.io.IOException;

class HeroState
{
    public boolean alive;
    public float x;
    public float y;
    public boolean invisible;
    public String[] items;

    public HeroState()
    {
        items = new String[6];
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"alive\":%b,", alive));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f,", x, y));
        out.write(String.format("\"invis\":%b,", invisible));
        out.write(String.format("\"items\":[\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"]",
                    items[0], items[1], items[2], items[3], items[4], items[5]));
        out.write("}");
    }
}

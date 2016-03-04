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
        out.write("\"items\":[");
        for(int i=0; i<6; ++i)
        {
            if(items[i] == null)
                out.write("\"\"");
            else
                out.write(String.format("\"%s\"", items[i]));

            if(i < 5)
                out.write(",");
        }
        out.write("]");
        out.write("}");
    }
}

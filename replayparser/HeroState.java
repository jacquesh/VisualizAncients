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
        out.write("\"alive\":"+alive+",");
        out.write("\"x\":"+String.format("%.2f",x)+",\"y\":"+String.format("%.2f,",y));
        out.write("\"invis\":"+invisible+",");
        out.write("\"items\":[");
        for(int i=0; i<6; ++i)
        {
            if(items[i] == null)
                out.write("\"\"");
            else
                out.write("\""+items[i]+"\"");

            if(i < 5)
                out.write(",");
        }
        out.write("]");
        out.write("}");
    }
}

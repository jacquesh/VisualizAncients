import java.io.FileWriter;
import java.io.IOException;

class CourierState
{
    public boolean alive;
    public float x;
    public float y;

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write("\"alive\":"+alive+",");
        out.write("\"x\":"+String.format("%.2f",x)+",\"y\":"+String.format("%.2f",y));
        out.write("}");
    }
}

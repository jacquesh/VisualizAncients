import java.io.OutputStreamWriter;
import java.io.IOException;

class CourierState
{
    public boolean alive;
    public float x;
    public float y;

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write("\"alive\":"+alive+",");
        out.write("\"x\":"+String.format("%.2f",x)+",\"y\":"+String.format("%.2f",y));
        out.write("}");
    }
}

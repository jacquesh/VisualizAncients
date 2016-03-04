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
        out.write(String.format("\"alive\":%b,", alive));
        out.write(String.format("\"x\":%.2f,\"y\":%.2f", x,y));
        out.write("}");
    }
}

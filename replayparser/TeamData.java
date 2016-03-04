import java.io.FileWriter;
import java.io.IOException;

class TeamData
{
    public int netWorth;
    public int totalXP;
    public int score;

    public TeamData()
    {
        netWorth = 0;
        totalXP = 0;
    }

    public void write(FileWriter out) throws IOException
    {
        out.write("{");
        out.write(String.format("\"netWorth\":%d,", netWorth));
        out.write(String.format("\"totalXp\":%d,", totalXP));
        out.write(String.format("\"score\":%d", score));
        out.write("}");
    }
}

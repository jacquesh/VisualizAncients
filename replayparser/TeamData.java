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
        out.write("\"netWorth\":"+netWorth+",");
        out.write("\"totalXp\":"+totalXP+",");
        out.write("\"score\":"+score);
        out.write("}");
    }
}

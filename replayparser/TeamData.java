import java.io.OutputStreamWriter;
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

    public void write(OutputStreamWriter out) throws IOException
    {
        out.write("{");
        out.write("\"netWorth\":"+netWorth+",");
        out.write("\"totalXp\":"+totalXP+",");
        out.write("\"score\":"+score);
        out.write("}");
    }
}

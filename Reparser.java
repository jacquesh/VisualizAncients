import skadistats.clarity.Clarity;
import skadistats.clarity.wire.common.proto.Demo.CDemoFileInfo;

public class Reparser
{
    public static void main(String[] args) throws Exception
    {
        String inputFile = "test.dem";
        CDemoFileInfo info = Clarity.infoForFile(inputFile);
        System.out.println(info);
    }
}

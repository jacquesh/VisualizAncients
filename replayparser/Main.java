import java.io.File;
import java.io.IOException;

public class Main
{
    private static void processReplayFile(String fileName) throws IOException
    {
        System.out.printf("Parsing %s\n", fileName);
        Reparser parser = new Reparser();
        long startTime;
        long endTime;

        startTime = System.currentTimeMillis();
        parser.load(fileName);
        parser.parse();
        endTime = System.currentTimeMillis();
        System.out.printf("Processing took %fs\n", (endTime-startTime)/1000.0f);

        startTime = System.currentTimeMillis();
        int fileNameExtensionIndex = fileName.lastIndexOf('.');
        String outFileName = fileName.substring(0, fileNameExtensionIndex) + ".json";
        parser.write(outFileName);
        endTime = System.currentTimeMillis();
        System.out.printf("Writing took %fs\n", (endTime-startTime)/1000.0f);
    }

    public static void main(String[] args) throws IOException
    {
        if(args.length < 1)
        {
            System.out.println("No input file given, exiting...");
            return;
        }

        String inFileName = args[0];
        File inFile = new File(inFileName);
        if(!inFile.exists())
        {
            System.out.println("Given filename does not exist, exiting...");
            return;
        }

        if(inFile.isDirectory())
        {
            File[] contents = inFile.listFiles();
            System.out.printf("Found %d files in directory %s:\n", contents.length, inFileName);
            for(int i=0; i<contents.length; ++i)
            {
                String contentName = contents[i].getName();
                String contentPath = inFile.getName()+"/"+contentName;
                if(contents[i].isFile() && contentName.endsWith(".dem"))
                {
                    System.out.printf("\n%d/%d: %s\n", i+1, contents.length, contentPath);
                    processReplayFile(contentPath);
                }
                else
                {
                    System.out.printf("\n%d/%d: %s is not a valid input file, ignoring\n",
                            i+1, contents.length, contentPath);
                }
            }
        }
        else if(inFile.isFile())
        {
            processReplayFile(inFileName);
        }
        else
        {
            System.out.println("Given filename is not a directory or file, confusedly exiting...");
        }
    }
}

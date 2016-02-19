import skadistats.clarity.Clarity;
import skadistats.clarity.source.MappedFileSource;

import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.SimpleRunner;

import skadistats.clarity.processor.gameevents.OnGameEvent;
import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.entities.OnEntityCreated;
import skadistats.clarity.processor.entities.OnEntityUpdated;
import skadistats.clarity.processor.entities.OnEntityDeleted;
import skadistats.clarity.model.GameEvent;
import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;

public class Reparser
{
    private boolean hasPrinted = false;

    @OnGameEvent
    public void onGameEvent(Context ctx, GameEvent evt)
    {
        //System.out.println(evt.toString());
    }

    @OnTickStart
    public void onTickStart(Context ctx, boolean something)
    {
    }

    /*
    @OnEntityCreated
    public void onEntityCreated(Context ctx, Entity ent)
    {
        if(!hasPrinted)
        {
            System.out.printf("Created entity %s\n", ent.toString());
            hasPrinted = true;
        }
    }*/

    @OnEntityUpdated
    public void onEntityUpdated(Context ctx, Entity ent, FieldPath[] something, int somethingElse)
    {
        String entName = ent.getDtClass().getDtName();
        System.out.printf("Entity %s updated\n", entName);
        if(entName.equals("CDOTA_Unit_Hero_Lion"))
        {
            System.out.println(ent.toString());
        }
    }

    /*
    @OnEntityDeleted
    public void onEntityDeleted(Context ctx, Entity ent)
    {
        //System.out.printf("Deleted entity %d\n", ent.getSerial());
    }*/


    public static void main(String[] args) throws Exception
    {
        long tStart = System.currentTimeMillis();
        String inputFile = "test.dem";
        MappedFileSource source = new MappedFileSource(inputFile);
        SimpleRunner runner = new SimpleRunner(source);
        Reparser parser = new Reparser();
        runner.runWith(parser);
        long tEnd = System.currentTimeMillis();
        System.out.printf("Total time taken: %f", (tEnd-tStart)/1000.0f);
    }
}

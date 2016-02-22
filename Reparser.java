import java.util.List;
import java.util.ArrayList;

import skadistats.clarity.Clarity;
import skadistats.clarity.source.MappedFileSource;
import skadistats.clarity.wire.common.proto.Demo.CDemoFileInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo.CPlayerInfo;

import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.SimpleRunner;

import skadistats.clarity.processor.gameevents.OnGameEvent;
import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.reader.OnTickEnd;
import skadistats.clarity.processor.entities.OnEntityCreated;
import skadistats.clarity.processor.entities.OnEntityUpdated;
import skadistats.clarity.processor.entities.OnEntityDeleted;
import skadistats.clarity.model.GameEvent;
import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;

public class Reparser
{
    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private int coordCounter;

    private int updatesThisTick;

    public Reparser()
    {
        snapshotList = new ArrayList<Snapshot>(1024);
        coordCounter = 0;
    }

    @OnGameEvent
    public void onGameEvent(Context ctx, GameEvent evt)
    {
        //System.out.println(evt.toString());
    }

    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic)
    {
        updatesThisTick = 0;
        currentSnapshot = new Snapshot();
    }

    @OnTickEnd
    public void onTickEnd(Context ctx, boolean synthetic)
    {
        if(updatesThisTick > 0)
        {
            snapshotList.add(currentSnapshot);
        }

        //System.out.printf("We parsed %d updates this tick\n", updatesThisTick);
        updatesThisTick = 0;
        //TODO: Write out the data for this tick
    }

    // TODO: Does this run only once per frame? Can we get multiple runs of this for each updated property?
    // The point is really that we need some sort of correlation in time between the updates on different entities
    // If we can't do that like this then we need some other way of running through time and collecting data
    @OnEntityUpdated
    public void onEntityUpdated(Context ctx, Entity ent, FieldPath[] something, int somethingElse)
    {
        int currentTick = ctx.getTick();

        String entName = ent.getDtClass().getDtName();
        //System.out.printf("Entity %s updated\n", entName);
        if(entName.startsWith("CDOTA_Unit_Hero"))
        {
            //System.out.printf("Hero DTName: %s\n", entName);
        }
        if(entName.equals("CDOTA_Unit_Hero_Lion"))
        {
            updatesThisTick += 1;
            //System.out.println(ent.toString());
            int playerID = ent.getProperty("m_iPlayerID");

            //System.out.printf("Lion: %d\n", something.length);
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            float subCellX = ent.getProperty("CBodyComponent.m_vecX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            float subCellY = ent.getProperty("CBodyComponent.m_vecY");

            float xLoc = (float)cellX + subCellX/128.0f;
            float yLoc = (float)cellY + subCellY/128.0f;

            coordCounter += 1;
            if(coordCounter == 1)
            {
                currentSnapshot.heroX[0] = xLoc;
                currentSnapshot.heroY[0] = yLoc;
                coordCounter = 0;
            }
        }
    }

    public static void main(String[] args) throws Exception
    {
        String inputFile = "test.dem";
        MappedFileSource source = new MappedFileSource(inputFile);
        CDemoFileInfo info = Clarity.infoForSource(source);
        System.out.println(info);
        CDotaGameInfo dota = info.getGameInfo().getDota();

        int endTime = dota.getEndTime();
        System.out.printf("Game ends at time %d\n", endTime);

        List<CPlayerInfo> playerList = dota.getPlayerInfoList();
        for(CPlayerInfo player : playerList)
        {
            System.out.println(player);
            System.out.printf("%s is playing %s on %s\n", player.getPlayerName(), player.getHeroName(), player.getGameTeam());
        }
        source.setPosition(0); // Reset the source buffer to the beginning so we can read through it again

        SimpleRunner runner = new SimpleRunner(source);
        Reparser parser = new Reparser();
        runner.runWith(parser);

        java.io.File outFile = new java.io.File("out.log");
        java.io.FileWriter out = new java.io.FileWriter(outFile);
        for(int i=0; i<parser.snapshotList.size(); ++i)
        {
            parser.snapshotList.get(i).write(out);
        }
        out.close();
    }
}

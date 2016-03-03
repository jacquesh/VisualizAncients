import java.io.File;
import java.io.FileWriter;
import java.util.List;
import java.util.ArrayList;

import skadistats.clarity.Clarity;
import skadistats.clarity.source.MappedFileSource;
import skadistats.clarity.wire.common.proto.DotaUserMessages;
import skadistats.clarity.wire.common.proto.Demo.CDemoFileInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo;
import skadistats.clarity.wire.common.proto.Demo.CGameInfo.CDotaGameInfo.CPlayerInfo;

import skadistats.clarity.processor.runner.Context;
import skadistats.clarity.processor.runner.SimpleRunner;

import skadistats.clarity.processor.reader.OnTickStart;
import skadistats.clarity.processor.reader.OnTickEnd;
import skadistats.clarity.processor.entities.Entities;
import skadistats.clarity.processor.entities.UsesEntities;
import skadistats.clarity.processor.entities.OnEntityCreated;
import skadistats.clarity.processor.entities.OnEntityUpdated;
import skadistats.clarity.processor.entities.OnEntityDeleted;
import skadistats.clarity.processor.gameevents.OnCombatLogEntry;
import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;
import skadistats.clarity.model.CombatLogEntry;

// TODO: Lane creeps
// TODO: Smoke uses
// TODO: Towers
// TODO: Runes
// TODO: Gold/XP Advantage
// TODO: Heroes/items

public class Reparser
{
    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private Entity gameRules;
    private Entity playerResource;

    public String[] playerHeroes;
    private Entity[] heroEntities;
    private ArrayList<Entity> courierList;
    private ArrayList<Entity> wardList;

    private int heroCount;
    private float startTime;
    private boolean roshAlive;

    public Reparser(int numHeroes)
    {
        heroCount = numHeroes;
        startTime = 0.0f;
        roshAlive = false;

        snapshotList = new ArrayList<Snapshot>(1024);
        currentSnapshot = new Snapshot(0, 0);

        gameRules = null;
        playerResource = null;

        playerHeroes = new String[heroCount];
        heroEntities = new Entity[heroCount];
        courierList = new ArrayList<Entity>(2);
        wardList = new ArrayList<Entity>(10);
    }

    @UsesEntities
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic)
    {
        Snapshot newSnapshot = new Snapshot(courierList.size(), wardList.size());
        //newSnapshot.copyFrom(currentSnapshot);
        currentSnapshot = newSnapshot;

        if(playerResource == null)
        {
            playerResource = ctx.getProcessor(Entities.class).getByDtName("CDOTA_PlayerResource");
            if(playerResource == null)
                return;
        }
        if(gameRules == null)
        {
            gameRules = ctx.getProcessor(Entities.class).getByDtName("CDOTAGamerulesProxy");
            if(gameRules == null)
                return;
        }
        float gameTime = gameRules.getProperty("m_pGameRules.m_fGameTime");
        currentSnapshot.time = gameTime - startTime;
        if(startTime == 0.0f)
        {
            // When we find out what the start time is, we need to go through and adjust
            // the timestamp on all the previous snapshots
            float startTimeCheck = gameRules.getProperty("m_pGameRules.m_flGameStartTime");
            if(startTimeCheck > 0.0f)
            {
                startTime = startTimeCheck;
                for(int i=0; i<snapshotList.size(); ++i)
                {
                    snapshotList.get(i).time -= startTime;
                }
                currentSnapshot.time -= startTime;
            }
        }
        currentSnapshot.roshAlive = roshAlive;

        for(int heroIndex=0; heroIndex<heroCount; ++heroIndex)
        {
            Entity hero = heroEntities[heroIndex];
            if(hero == null)
            {
                String handlePropName = String.format("m_vecPlayerTeamData.%04d.m_hSelectedHero", heroIndex);
                int heroHandle = playerResource.getProperty(handlePropName);
                hero = ctx.getProcessor(Entities.class).getByHandle(heroHandle);

                if(hero != null)
                {
                    heroEntities[heroIndex] = hero;
                    playerHeroes[heroIndex] = hero.getDtClass().getDtName();
                }
            }

            if(hero != null)
            {
                int lifeState = hero.getProperty("m_lifeState");
                boolean isAlive = (lifeState == 0);
                if(lifeState > 2)
                {
                    System.out.printf("ERROR: Unexpected lifeState: %d\n", lifeState);
                }

                int cellX = hero.getProperty("CBodyComponent.m_cellX");
                int cellY = hero.getProperty("CBodyComponent.m_cellY");
                float subCellX = hero.getProperty("CBodyComponent.m_vecX");
                float subCellY = hero.getProperty("CBodyComponent.m_vecY");

                // TODO: Check that this is correct from:
                //       https://github.com/skadistats/skadi/wiki/DT_DOTA_BaseNPC
                long unitState = hero.getProperty("m_nUnitState64");
                boolean isInvis = ((unitState & (1 << 8)) != 0);

                currentSnapshot.heroes[heroIndex].alive = isAlive;
                currentSnapshot.heroes[heroIndex].x = (float)cellX + (subCellX/128.0f);
                currentSnapshot.heroes[heroIndex].y = (float)cellY + (subCellY/128.0f);
                currentSnapshot.heroes[heroIndex].invisible = isInvis;

                for(int itemIndex=0; itemIndex<6; itemIndex++)
                {
                    String itemPropName = String.format("m_hItems.%04d", itemIndex);
                    int itemHandle = hero.getProperty(itemPropName);
                    if(itemHandle != 16777215)
                    {
                        Entity item = ctx.getProcessor(Entities.class).getByHandle(itemHandle);
                        //System.out.println(item);
                        currentSnapshot.heroes[heroIndex].items[itemIndex] = item.getDtClass().getDtName();
                    }
                }
            }
        }

        // NOTE: Couriers get added to the list by the onEntityCreated event,
        //       we assume here that all events trigger between onTickStart and onTickEnd,
        //       so courierList will have the same size as the array in the currentSnapshot
        for(int i=0; i<courierList.size(); ++i)
        {
            Entity courier = courierList.get(i);

            // TODO: Check that this actually works for couriers
            int lifeState = courier.getProperty("m_lifeState");
            boolean isAlive = (lifeState == 0);

            int cellX = courier.getProperty("CBodyComponent.m_cellX");
            int cellY = courier.getProperty("CBodyComponent.m_cellY");
            float subCellX = courier.getProperty("CBodyComponent.m_vecX");
            float subCellY = courier.getProperty("CBodyComponent.m_vecY");

            currentSnapshot.couriers[i].alive = isAlive;
            currentSnapshot.couriers[i].x = (float)cellX + (subCellX/128.0f);
            currentSnapshot.couriers[i].y = (float)cellY + (subCellY/128.0f);
        }

        ArrayList<Integer> deadWards = new ArrayList<Integer>();
        for(int i=0; i<wardList.size(); ++i)
        {
            Entity ward = wardList.get(i);

            int lifeState = ward.getProperty("m_lifeState");
            boolean isAlive = (lifeState == 0);
            if(!isAlive)
            {
                deadWards.add(i);
            }

            int cellX = ward.getProperty("CBodyComponent.m_cellX");
            int cellY = ward.getProperty("CBodyComponent.m_cellY");
            float subCellX = ward.getProperty("CBodyComponent.m_vecX");
            float subCellY = ward.getProperty("CBodyComponent.m_vecY");
            boolean isSentry = ward.getDtClass().getDtName().endsWith("TrueSight");

            currentSnapshot.wards[i].x = (float)cellX + (subCellX/128.0f);
            currentSnapshot.wards[i].y = (float)cellY + (subCellY/128.0f);
            currentSnapshot.wards[i].isSentry = isSentry;
        }
        for(int i=deadWards.size()-1; i>=0; --i)
        {
            wardList.remove(deadWards.get(i));
        }

    }

    @OnTickEnd
    public void onTickEnd(Context ctx, boolean synthetic)
    {
        snapshotList.add(currentSnapshot);
    }

    @OnEntityCreated
    public void onEntityCreated(Context ctx, Entity ent)
    {
        String className = ent.getDtClass().getDtName();
        if(className.equals("CDOTA_Unit_Courier"))
        {
            for(int i=0; i<courierList.size(); ++i)
            {
                if(courierList.get(i).getHandle() == ent.getHandle())
                {
                    return;
                }
            }
            courierList.add(ent);
        }
        else if(className.equals("CDOTA_NPC_Observer_Ward")
                || className.equals("CDOTA_NPC_Observer_Ward_TrueSight"))
        {
            wardList.add(ent);
        }
        else if(className.equals("CDOTA_Unit_Roshan"))
        {
            roshAlive = true;
        }
    }

    @OnEntityDeleted
    public void onEntityDeleted(Context ctx, Entity ent)
    {
        String className = ent.getDtClass().getDtName();
        if(className.equals("CDOTA_Unit_Roshan"))
        {
            roshAlive = false;
        }
        else if(className.equals("CDOTA_BaseNPC_Tower"))
        {
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");

            int teamNumber = ent.getProperty("m_iTeamNum");
            String teamName = (teamNumber == 2) ? "Radiant" : "Dire";
            int towerIndex = (teamNumber-2)*11; // TODO

            System.out.printf("%s lost a tower at (%d, %d)\n", teamName, cellX, cellY);
        }
    }

    @OnCombatLogEntry
    public void onCombatLogEntry(Context ctx, CombatLogEntry entry)
    {
    }

    public void write(String fileName) throws Exception
    {
        for(int i=0; i<heroCount; ++i)
        {
            System.out.println(playerHeroes[i]);
        }
        File outFile = new File(fileName);
        FileWriter out = new java.io.FileWriter(outFile);
        out.write("[\n");
        for(int i=0; i<snapshotList.size(); ++i)
        {
            snapshotList.get(i).write(out);
            if(i < snapshotList.size()-1)
            {
                out.write(",");
            }
            out.write("\n");
        }
        out.write("]\n");
        out.close();
    }

    public static void main(String[] args) throws Exception
    {
        // TODO: Maybe we should just add some sort of check for the consistency of the playerID
        //       that is reported by entity updates/creations etc, so that we can just ignore matches
        //       where its inconsistent
        String inputFile = "testdedtowers-dire.dem";
        MappedFileSource source = new MappedFileSource(inputFile);
        CDemoFileInfo info = Clarity.infoForSource(source);
        CDotaGameInfo dota = info.getGameInfo().getDota();

        List<CPlayerInfo> playerList = dota.getPlayerInfoList();
        int heroCount = playerList.size();
        Reparser parser = new Reparser(heroCount);
        if(heroCount != 10)
        {
            System.out.println("ERROR: Expected 10 players, got "+playerList.size());
        }
        source.setPosition(0); // Reset the source buffer to the beginning so we can read through it again

        long startTime = System.currentTimeMillis();
        SimpleRunner runner = new SimpleRunner(source);
        runner.runWith(parser);
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        System.out.printf("Processing took %fs\n", duration/1000.0f);

        startTime = System.currentTimeMillis();
        parser.write("out.visdata");
        endTime = System.currentTimeMillis();
        duration = endTime - startTime;
        System.out.printf("Writing took %fs\n", duration/1000.0f);
    }
}

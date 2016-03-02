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

public class Reparser
{
    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private Entity gameRules;
    private Entity playerResource;
    private Entity[] heroEntities;
    private ArrayList<Entity> courierList;
    private ArrayList<Entity> wardList;

    private float startTime;

    public Reparser()
    {
        snapshotList = new ArrayList<Snapshot>(1024);
        currentSnapshot = new Snapshot(0, 0);

        playerResource = null;
        heroEntities = new Entity[10];
        courierList = new ArrayList<Entity>(2);

        startTime = 0.0f;
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

        for(int i=0; i<10; ++i)
        {
            Entity hero = heroEntities[i];
            if(hero == null)
            {
                String handlePropName = String.format("m_vecPlayerTeamData.%04d.m_hSelectedHero", i);
                int heroHandle = playerResource.getProperty(handlePropName);
                hero = ctx.getProcessor(Entities.class).getByHandle(heroHandle);

                if(hero != null)
                {
                    heroEntities[i] = hero;
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

                currentSnapshot.heroes[i].alive = isAlive;
                currentSnapshot.heroes[i].x = (float)cellX + (subCellX/128.0f);
                currentSnapshot.heroes[i].y = (float)cellY + (subCellY/128.0f);
                currentSnapshot.heroes[i].invisible = isInvis;
            }
        }

        // TODO: Lane creeps
        // TODO: Roshan
        // TODO: Smoke uses
        // TODO: Towers
        // TODO: Runes

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
    }

    @OnCombatLogEntry
    public void onCombatLogEntry(Context ctx, CombatLogEntry entry)
    {
    }

    public static void main(String[] args) throws Exception
    {
        // TODO: Maybe we should just add some sort of check for the consistency of the playerID
        //       that is reported by entity updates/creations etc, so that we can just ignore matches
        //       where its inconsistent
        String inputFile = "test2.dem";
        MappedFileSource source = new MappedFileSource(inputFile);
        CDemoFileInfo info = Clarity.infoForSource(source);
        CDotaGameInfo dota = info.getGameInfo().getDota();

        List<CPlayerInfo> playerList = dota.getPlayerInfoList();
        if(playerList.size() != 10)
        {
            System.out.println("ERROR: Expected 10 players, got "+playerList.size());
        }
        for(int playerIndex=0; playerIndex<10; playerIndex++)
        {
            CPlayerInfo player = playerList.get(playerIndex);
            if(playerIndex == 0)
            {
                System.out.printf("Radiant:\n");
            }
            else if(playerIndex == 5)
            {
                System.out.printf("Dire:\n");
            }
            System.out.printf("Player %d - %s is playing %s\n", playerIndex, player.getPlayerName(), player.getHeroName());
        }
        source.setPosition(0); // Reset the source buffer to the beginning so we can read through it again

        long startTime = System.currentTimeMillis();
        SimpleRunner runner = new SimpleRunner(source);
        Reparser parser = new Reparser();
        runner.runWith(parser);
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        System.out.printf("Processing took %fs\n", duration/1000.0f);

        startTime = System.currentTimeMillis();
        java.io.File outFile = new java.io.File("out.visdata");
        java.io.FileWriter out = new java.io.FileWriter(outFile);
        out.write("[\n");
        for(int i=0; i<parser.snapshotList.size(); ++i)
        {
            parser.snapshotList.get(i).write(out);
            if(i < parser.snapshotList.size()-1)
            {
                out.write(",");
            }
            out.write("\n");
        }
        out.write("]\n");
        out.close();
        endTime = System.currentTimeMillis();
        duration = endTime - startTime;
        System.out.printf("Writing took %fs\n", duration/1000.0f);
    }
}

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
import skadistats.clarity.processor.stringtables.StringTables;
import skadistats.clarity.processor.stringtables.UsesStringTable;
import skadistats.clarity.processor.stringtables.OnStringTableCreated;

import skadistats.clarity.model.Entity;
import skadistats.clarity.model.FieldPath;
import skadistats.clarity.model.CombatLogEntry;
import skadistats.clarity.model.StringTable;

// TODO: Lane creeps
// TODO: Towers
// TODO: Runes
// TODO: Gold/XP Advantage

class Hero
{
    public Entity entity;
    public String heroName;
    public String className;
}

public class Reparser
{
    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private Entity gameRules;
    private Entity playerResource;
    private Entity dataSpectator;
    private Entity[] teamEntities;
    private StringTable entityNames;

    public Hero[] heroes;
    private ArrayList<Entity> courierList;

    private ArrayList<WardEvent> wardEvents;
    private ArrayList<RoshanEvent> roshEvents;
    private ArrayList<TowerEvent> towerDeaths;
    private ArrayList<SmokeEvent> smokeUses;

    private int heroCount;
    private float startTime;

    public Reparser(int numHeroes)
    {
        heroCount = numHeroes;
        startTime = 0.0f;

        snapshotList = new ArrayList<Snapshot>(1024);
        currentSnapshot = new Snapshot(0);

        gameRules = null;
        playerResource = null;
        dataSpectator = null;
        teamEntities = new Entity[2];

        heroes = new Hero[heroCount];
        courierList = new ArrayList<Entity>(2);

        wardEvents = new ArrayList<WardEvent>();
        roshEvents = new ArrayList<RoshanEvent>();
        towerDeaths = new ArrayList<TowerEvent>();
        smokeUses = new ArrayList<SmokeEvent>();

        for(int i=0; i<heroCount; ++i)
            heroes[i] = new Hero();
    }

    @UsesEntities
    @UsesStringTable("EntityNames")
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic)
    {
        Snapshot newSnapshot = new Snapshot(courierList.size());
        currentSnapshot = newSnapshot;

        if((playerResource == null) || (gameRules == null) || (dataSpectator == null)
                || (teamEntities[0] == null) || (teamEntities[1] == null))
            return;

        if(startTime == 0.0f)
        {
            float startTimeCheck = gameRules.getProperty("m_pGameRules.m_flGameStartTime");
            if(startTimeCheck > 0.0f)
            {
                startTime = startTimeCheck;
            }
        }

        float gameTime = gameRules.getProperty("m_pGameRules.m_fGameTime");
        currentSnapshot.time = gameTime;

        int teamIndex = 0;
        for(int i=0; i<10; ++i)
        {
            if(i == 5)
                teamIndex += 1;

            // TODO: This is VERY wrong
            String netWorthName = String.format("m_iNetWorth.%04d", i);
            int playerNetWorth = dataSpectator.getProperty(netWorthName);
            int playerXP = 0;
            if(heroes[i].entity != null)
                playerXP = heroes[i].entity.getProperty("m_iCurrentXP");
            currentSnapshot.teams[teamIndex].netWorth += playerNetWorth;
            currentSnapshot.teams[teamIndex].totalXP += playerXP;
        }
        currentSnapshot.teams[0].score = teamEntities[0].getProperty("m_iScore");
        currentSnapshot.teams[1].score = teamEntities[1].getProperty("m_iScore");

        for(int heroIndex=0; heroIndex<heroCount; ++heroIndex)
        {
            Entity hero = heroes[heroIndex].entity;
            if(hero == null)
            {
                String handlePropName = String.format("m_vecPlayerTeamData.%04d.m_hSelectedHero", heroIndex);
                int heroHandle = playerResource.getProperty(handlePropName);
                hero = ctx.getProcessor(Entities.class).getByHandle(heroHandle);

                if(hero != null)
                {
                    heroes[heroIndex].entity = hero;
                    heroes[heroIndex].className = hero.getDtClass().getDtName();
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
                        int itemStrTableIndex = item.getProperty("m_pEntity.m_nameStringableIndex");
                        String itemName = entityNames.getNameByIndex(itemStrTableIndex);
                        currentSnapshot.heroes[heroIndex].items[itemIndex] = itemName;
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
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            float subCellX = ent.getProperty("CBodyComponent.m_vecX");
            float subCellY = ent.getProperty("CBodyComponent.m_vecY");

            float x = (float)cellX + (subCellX/128.0f);
            float y = (float)cellY + (subCellY/128.0f);
            boolean isSentry = className.endsWith("TrueSight");

            WardEvent evt = new WardEvent();
            evt.time = currentSnapshot.time;
            evt.x = x;
            evt.y = y;
            evt.entityHandle = ent.getHandle();
            evt.isSentry = isSentry;
            evt.died = false;
            wardEvents.add(evt);
        }
        else if(className.equals("CDOTA_Unit_Roshan"))
        {
            RoshanEvent evt = new RoshanEvent();
            evt.time = currentSnapshot.time;
            evt.died = false;
            roshEvents.add(evt);
        }
        else if(className.equals("CDOTA_PlayerResource"))
        {
            playerResource = ent;
        }
        else if(className.equals("CDOTAGamerulesProxy"))
        {
            gameRules = ent;
        }
        else if(className.equals("CDOTA_DataSpectator"))
        {
            dataSpectator = ent;
            // TODO: "CDOTA_DataSpectator" (has "PrimaryRune", "SecondaryRune", "NetWorth"
        }
        else if(className.equals("CDOTATeam"))
        {
            int teamNumber = ent.getProperty("m_iTeamNum");
            if(teamNumber == 2)
                teamEntities[0] = ent;
            else if(teamNumber == 3)
                teamEntities[1] = ent;
        }
    }

    @OnEntityDeleted
    public void onEntityDeleted(Context ctx, Entity ent)
    {
        String className = ent.getDtClass().getDtName();
        if(className.equals("CDOTA_Unit_Roshan"))
        {
            RoshanEvent evt = new RoshanEvent();
            evt.time = currentSnapshot.time;
            evt.died = true;
            roshEvents.add(evt);
        }
        else if(className.equals("CDOTA_NPC_Observer_Ward")
                || className.equals("CDOTA_NPC_Observer_Ward_TrueSight"))
        {
            boolean isSentry = className.endsWith("TrueSight");

            WardEvent evt = new WardEvent();
            evt.time = currentSnapshot.time;
            evt.x = 0.0f;
            evt.y = 0.0f;
            evt.entityHandle = ent.getHandle();
            evt.isSentry = isSentry;
            evt.died = true;
            wardEvents.add(evt);
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

    @OnStringTableCreated
    public void onStringTableCreated(Context ctx, int intArg, StringTable newTable)
    {
        //System.out.printf("Created %d:\n%s\n", intArg, newTable.toString());
        if(newTable.getName().equals("EntityNames"))
        {
            entityNames = newTable;
        }
    }

    @OnCombatLogEntry
    public void onCombatLogEntry(Context ctx, CombatLogEntry entry)
    {
        if(entry.getType() == DotaUserMessages.DOTA_COMBATLOG_TYPES.DOTA_COMBATLOG_ITEM)
        {
            String heroName = entry.getAttackerName();
            String itemName = entry.getInflictorName();
            int playerIndex = -1;
            if(itemName.equals("item_smoke_of_deceit"))
            {
                for(int i=0; i<heroCount; ++i)
                {
                    if(heroName.equals(heroes[i].heroName))
                    {
                        playerIndex = i;
                        break;
                    }
                }

                if(playerIndex == -1)
                {
                    System.out.printf("ERROR: Unable to find hero %s that used smoke\n", heroName);
                    return;
                }

                SmokeEvent evt = new SmokeEvent();
                evt.time = currentSnapshot.time;
                evt.x = currentSnapshot.heroes[playerIndex].x;
                evt.y = currentSnapshot.heroes[playerIndex].y;
                smokeUses.add(evt);
            }
        }
    }

    public void write(String fileName) throws Exception
    {
        File outFile = new File(fileName);
        FileWriter out = new java.io.FileWriter(outFile);
        out.write("{\n");

        out.write(String.format("\"startTime\":%.1f,\n", startTime));
        out.write("\"playerHeroes\":[");
        for(int i=0; i<heroCount; ++i)
        {
            out.write(String.format("\"%s\"", heroes[i].className));
            if(i < heroCount-1)
                out.write(",");
        }
        out.write("],\n");

        out.write("\"wardEvents\":[");
        for(int i=0; i<wardEvents.size(); ++i)
        {
            wardEvents.get(i).write(out);
            if(i < wardEvents.size()-1)
                out.write(",");
        }
        out.write("],\n");

        out.write("\"roshEvents\":[");
        for(int i=0; i<roshEvents.size(); ++i)
        {
            roshEvents.get(i).write(out);
            if(i < roshEvents.size()-1)
                out.write(",");
        }
        out.write("],\n");

        out.write("\"towerDeaths\":[],\n"); // TODO

        out.write("\"smokeUses\":[");
        for(int i=0; i<smokeUses.size(); ++i)
        {
            smokeUses.get(i).write(out);
            if(i < smokeUses.size()-1)
                out.write(",");
        }
        out.write("],\n");

        out.write("\"snapshots\":[\n");
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

        out.write("}");
        out.close();
    }

    public static void main(String[] args) throws Exception
    {
        // TODO: Maybe we should just add some sort of check for the consistency of the playerID
        //       that is reported by entity updates/creations etc, so that we can just ignore matches
        //       where its inconsistent
        String inputFile = "testdedtowers-dire.dem";
        inputFile = "test2.dem";
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
        for(int playerIndex=0; playerIndex<heroCount; playerIndex++)
        {
            CPlayerInfo player = playerList.get(playerIndex);
            parser.heroes[playerIndex].heroName = player.getHeroName();
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

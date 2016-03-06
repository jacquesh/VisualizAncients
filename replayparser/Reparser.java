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

// TODO: Runes

class Hero
{
    public Entity entity;
    public String heroName;
    public String className;
}

public class Reparser
{
    private final int NULL_HANDLE = 16777215;

    private final float[][][] towerPositions = {
        {{97.749268f,80.249512f},{92.004395f,96.000000f},{76.250244f,101.999268f},{123.639893f,80.366699f},{166.492432f,80.482178f},{100.566895f,106.304688f},{80.000244f,121.491455f},{80.375244f,142.366455f},{83.629395f,89.875000f},{85.879395f,87.625000f},{115.348145f,116.250000f}},
        {{166.765625f,165.374756f},{128.000000f,174.999756f},{91.000000f,174.999756f},{147.500000f,144.499756f},{135.999756f,130.499756f},{176.500000f,114.999756f},{177.000000f,130.999756f},{177.031250f,151.312256f},{155.375000f,173.124756f},{161.000000f,156.991943f},{169.250000f,162.624756f}}
    };

    private final float[][][] barracksPositions = {
        {{91.375000f, 92.632568f},{88.593750f, 95.390381f},{94.937500f, 78.281006f},{94.945068f, 82.241943f},{78.250000f, 99.015625f},{74.281250f, 99.007568f}},
        {{179.062256f, 154.125000f},{174.937500f, 153.999756f},{161.499756f, 160.304443f},{164.359375f, 157.500000f},{158.078125f, 171.062256f},{158.046875f, 175.195068f}}
    };

    // String.format is slow, but StringBuilder is fast and javac optimizes String+ to StringBuilder code, so we precompute these and just use +
    private final String[] int4Str = {"0000", "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009"}; 

    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private Entity gameRules;
    private Entity playerResource;
    private Entity dataSpectator;
    private Entity[] teamEntities;
    private StringTable entityNames;

    public Hero[] heroes;
    private ArrayList<Entity> courierList;
    private ArrayList<Entity> laneCreepList;

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
        laneCreepList = new ArrayList<Entity>(64);

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
        {
            // Initialize any snapshot data that would otherwise only be initialized further down, to prevent special cases in the snapshot writing code
            currentSnapshot.laneCreeps = new ArrayList<LaneCreepData>();
            return;
        }

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
            String netWorthName = "m_iNetWorth." + int4Str[i];
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
                String handlePropName = "m_vecPlayerTeamData."+int4Str[heroIndex]+".m_hSelectedHero";
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
                    String itemPropName = "m_hItems."+int4Str[itemIndex];
                    int itemHandle = hero.getProperty(itemPropName);
                    if(itemHandle != NULL_HANDLE)
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

        //System.out.printf("There are currently %d lane creeps\n", laneCreepList.size());
        ArrayList<LaneCreepData> creepData = new ArrayList<LaneCreepData>(100);
        for(int i=0; i<laneCreepList.size(); ++i)
        {
            Entity creep = laneCreepList.get(i);
            int cellX = creep.getProperty("CBodyComponent.m_cellX");
            int cellY = creep.getProperty("CBodyComponent.m_cellY");
            float subCellX = creep.getProperty("CBodyComponent.m_vecX");
            float subCellY = creep.getProperty("CBodyComponent.m_vecY");
            float creepX = (float)cellX + (subCellX/128.0f);
            float creepY = (float)cellY + (subCellY/128.0f);
            boolean isDire = (creep.getProperty("m_iTeamNum") == 3);

            boolean newDataNeeded = true;
            for(int dataIndex=0; dataIndex<creepData.size(); ++dataIndex)
            {
                LaneCreepData lcd = creepData.get(dataIndex);
                float dx = creepX - lcd.x;
                float dy = creepY - lcd.y;

                float searchRadius = 6.0f;
                if((dx*dx + dy*dy < searchRadius*searchRadius) && (isDire == lcd.isDire))
                {
                    newDataNeeded = false;
                    lcd.creepCount += 1;
                    break;
                }
            }
            if(newDataNeeded)
            {
                LaneCreepData lcd = new LaneCreepData();
                lcd.x = creepX;
                lcd.y = creepY;
                lcd.creepCount = 1;
                lcd.isDire = isDire;
                creepData.add(lcd);
            }
        }
        currentSnapshot.laneCreeps = creepData;

        // TODO: "CDOTA_DataSpectator" (has "PrimaryRune", "SecondaryRune", "NetWorth"
        int primaryRuneHandle = dataSpectator.getProperty("m_hPrimaryRune");
        int secondaryRuneHandle = dataSpectator.getProperty("m_hSecondaryRune");
        //System.out.printf("Runes are %d and %d\n", primaryRuneHandle, secondaryRuneHandle);
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
        if(className.equals("CDOTA_BaseNPC_Creep_Lane")
                || className.equals("CDOTA_BaseNPC_Creep_Siege"))
        {
            laneCreepList.add(ent);
        }
        else if(className.equals("CDOTA_Item_Rune"))
        {
            //System.out.println(ent);
            int runeType = ent.getProperty("m_iRuneType");
            System.out.println("Created rune %d\n", runeType);
        }
        else if(className.equals("CDOTA_Unit_Courier"))
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
        if(className.equals("CDOTA_BaseNPC_Creep_Lane")
                || className.equals("CDOTA_BaseNPC_Creep_Siege"))
        {
            int entityHandle = ent.getHandle();
            for(int i=0; i<laneCreepList.size(); ++i)
            {
                if(laneCreepList.get(i).getHandle() == entityHandle)
                {
                    laneCreepList.remove(i);
                    break;
                }
            }
        }
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
        else if(className.equals("CDOTA_BaseNPC_Tower")
                || className.equals("CDOTA_BaseNPC_Barracks"))
        {
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            float subCellX = ent.getProperty("CBodyComponent.m_vecX");
            float subCellY = ent.getProperty("CBodyComponent.m_vecY");
            float x = (float)cellX + (subCellX/128.0f);
            float y = (float)cellY + (subCellY/128.0f);
            boolean isRax = className.equals("CDOTA_BaseNPC_Barracks");
            float[][][] buildings = towerPositions;
            if(isRax)
                buildings = barracksPositions;

            int teamNumber = ent.getProperty("m_iTeamNum");
            int teamIndex = teamNumber - 2;
            int towerIndex = -1;
            for(int i=0; i<buildings[teamIndex].length; ++i)
            {
                float dx = buildings[teamIndex][i][0] - x;
                float dy = buildings[teamIndex][i][1] - y;
                if(dx*dx + dy*dy < 0.1f)
                {
                    towerIndex = i;
                    break;
                }
            }
            if(towerIndex == -1)
            {
                System.out.printf("ERROR: Unknown tower at (%f,%f)\n", x,y);
            }

            TowerEvent evt = new TowerEvent();
            evt.time = currentSnapshot.time;
            evt.teamIndex = teamIndex;
            evt.towerIndex = towerIndex;
            evt.isBarracks = isRax;
            towerDeaths.add(evt);
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

        out.write("\"startTime\":"+String.format("%.1f", startTime)+",\n");
        out.write("\"playerHeroes\":[");
        for(int i=0; i<heroCount; ++i)
        {
            out.write("\""+heroes[i].className+"\"");
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

        out.write("\"towerDeaths\":[");
        for(int i=0; i<towerDeaths.size(); ++i)
        {
            towerDeaths.get(i).write(out);
            if(i < towerDeaths.size()-1)
                out.write(",");
        }
        out.write("],\n");

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

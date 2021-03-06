import java.io.File;
import java.io.IOException;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.util.List;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.zip.DeflaterOutputStream;

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

class Hero
{
    public Entity entity;
    public String heroName;
    public String className;
}

class Rune
{
    public int entityHandle;
    public int type;
}

public class Reparser
{
    private final int NULL_HANDLE = 16777215;

    // String.format is slow, but StringBuilder is fast and javac optimizes String+ to StringBuilder code, so we precompute these and just use +
    private final String[] int4Str = {"0000", "0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009"};

    private MappedFileSource dataSource;

    private ArrayList<Snapshot> snapshotList;
    private Snapshot currentSnapshot;

    private Entity gameRules;
    private Entity playerResource;
    private Entity dataSpectator;
    private Entity[] teamEntities;
    private StringTable entityNames;
    private Entity[] tier4Towers;

    private Rune topRune;
    private Rune botRune;

    public Hero[] heroes;
    private ArrayList<Entity> courierList;
    private ArrayList<Entity> laneCreepList;

    private HashSet<Integer> seenWards;
    private ArrayList<WardEvent> wardEvents;
    private ArrayList<RoshanEvent> roshEvents;
    private ArrayList<TowerEvent> towerDeaths;
    private ArrayList<SmokeEvent> smokeUses;

    private int heroCount;
    private float startTime;
    private int firstHeroSpawnTick;
    private int ancientDeathTick;

    public Reparser()
    {
        heroCount = 0;
        startTime = 0.0f;
        firstHeroSpawnTick = 0;
        ancientDeathTick = 0;

        snapshotList = new ArrayList<Snapshot>(1024);
        currentSnapshot = new Snapshot(0);

        gameRules = null;
        playerResource = null;
        dataSpectator = null;
        teamEntities = new Entity[2];
        tier4Towers = new Entity[]{null, null, null, null};

        topRune = new Rune();
        topRune.entityHandle = NULL_HANDLE;
        topRune.type = -1;
        botRune = new Rune();
        botRune.entityHandle = NULL_HANDLE;
        botRune.type = -1;

        heroes = new Hero[10];
        courierList = new ArrayList<Entity>(2);
        laneCreepList = new ArrayList<Entity>(64);

        seenWards = new HashSet<Integer>();
        wardEvents = new ArrayList<WardEvent>();
        roshEvents = new ArrayList<RoshanEvent>();
        towerDeaths = new ArrayList<TowerEvent>();
        smokeUses = new ArrayList<SmokeEvent>();

        for(int i=0; i<10; ++i)
            heroes[i] = new Hero();
    }

    public void load(String inputFileName) throws IOException
    {
        // TODO: Maybe we should just add some sort of check for the consistency of the playerID
        //       that is reported by entity updates/creations etc, so that we can just ignore matches
        //       where its inconsistent
        dataSource = new MappedFileSource(inputFileName);
        CDemoFileInfo info = Clarity.infoForSource(dataSource);
        CDotaGameInfo dota = info.getGameInfo().getDota();
        System.out.println("Match ID: "+dota.getMatchId());

        List<CPlayerInfo> playerList = dota.getPlayerInfoList();
        heroCount = playerList.size();
        if(heroCount != 10)
        {
            System.out.println("WARNING: Expected 10 players, got "+playerList.size());
        }

        for(int playerIndex=0; playerIndex<heroCount; playerIndex++)
        {
            CPlayerInfo player = playerList.get(playerIndex);
            heroes[playerIndex].heroName = player.getHeroName();
        }
        // Reset the source buffer to the beginning so we can read through it again
        dataSource.setPosition(0);
    }

    public void parse() throws IOException
    {
        SimpleRunner runner = new SimpleRunner(dataSource);
        runner.runWith(this);
    }

    @UsesEntities
    @UsesStringTable("EntityNames")
    @OnTickStart
    public void onTickStart(Context ctx, boolean synthetic)
    {
        Snapshot newSnapshot = new Snapshot(courierList.size());
        for(int i=0; i<10; ++i)
        {
            newSnapshot.heroes[i].smoked = currentSnapshot.heroes[i].smoked;
        }

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
        for(int i=0; i<heroCount; ++i)
        {
            if(i == 5)
                teamIndex += 1;

            String playerKillsName = "m_vecPlayerTeamData." + int4Str[i] + ".m_iKills";
            String netWorthName = "m_iNetWorth." + int4Str[i];
            int playerKills = playerResource.getProperty(playerKillsName);
            int playerNetWorth = dataSpectator.getProperty(netWorthName);
            int playerXP = 0;
            if(heroes[i].entity != null)
                playerXP = heroes[i].entity.getProperty("m_iCurrentXP");
            currentSnapshot.teams[teamIndex].score += playerKills;
            currentSnapshot.teams[teamIndex].netWorth += playerNetWorth;
            currentSnapshot.teams[teamIndex].totalXP += playerXP;
        }

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
            int lifeState = creep.getProperty("m_lifeState");
            if(lifeState != 0)
            {
                laneCreepList.remove(i);
                i -= 1;
                continue;
            }
            boolean waitingToSpawn = creep.getProperty("m_bIsWaitingToSpawn");
            if(waitingToSpawn)
            {
                continue;
            }

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

        currentSnapshot.runes[0] = topRune.type;
        currentSnapshot.runes[1] = botRune.type;
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
            int runeType = ent.getProperty("m_iRuneType");
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            int handle = ent.getHandle();
            if(cellX == 110)
            {
                topRune.entityHandle = handle;
                topRune.type = runeType;
            }
            else if(cellX == 148)
            {
                botRune.entityHandle = handle;
                botRune.type = runeType;
            }
            else
                System.out.printf("ERROR: Unrecognised rune spawn location: (%d,%d)\n", cellX, cellY);
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
            boolean isDire = (ent.getProperty("m_iTeamNum") == 3);

            WardEvent evt = new WardEvent();
            evt.time = currentSnapshot.time;
            evt.x = x;
            evt.y = y;
            evt.entityHandle = ent.getHandle();
            evt.isDire = isDire;
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
        else if(className.equals("CDOTA_BaseNPC_Tower"))
        {
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            if((cellX == 82) && (cellY == 88)) // Radiant Top T4
                tier4Towers[0] = ent;
            else if((cellX == 84) && (cellY == 86)) // Radiant Bot T4
                tier4Towers[1] = ent;
            else if((cellX == 166) && (cellY == 164)) // Dire Top T4
                tier4Towers[2] = ent;
            else if((cellX == 168) && (cellY == 162)) // Dire Bot T4
                tier4Towers[3] = ent;
        }
        else if(className.startsWith("CDOTA_Unit_Hero"))
        {
            if(firstHeroSpawnTick == 0)
            {
                firstHeroSpawnTick = snapshotList.size();
            }
        }
    }

    @OnEntityUpdated
    public void onEntityUpdated(Context ctx, Entity ent, FieldPath[] fields, int num)
    {
        String className = ent.getDtClass().getDtName();
        boolean isWard = className.equals("CDOTA_NPC_Observer_Ward");
        boolean isSentry = className.equals("CDOTA_NPC_Observer_Ward_TrueSight");
        if(isWard || isSentry)
        {
            int handle = ent.getHandle();
            int lifeState = ent.getProperty("m_lifeState");
            if(lifeState != 0)
            {
                if(!seenWards.contains(handle))
                {
                    seenWards.add(handle);

                    boolean isDire = (ent.getProperty("m_iTeamNum") == 3);
                    WardEvent evt = new WardEvent();
                    evt.time = currentSnapshot.time;
                    evt.x = 0.0f;
                    evt.y = 0.0f;
                    evt.entityHandle = handle;
                    evt.isDire = isDire;
                    evt.isSentry = isSentry;
                    evt.died = true;
                    wardEvents.add(evt);
                }
            }
        }
    }

    @OnEntityDeleted
    public void onEntityDeleted(Context ctx, Entity ent)
    {
        String className = ent.getDtClass().getDtName();
        if(className.equals("CDOTA_Item_Rune"))
        {
            int cellX = ent.getProperty("CBodyComponent.m_cellX");
            int cellY = ent.getProperty("CBodyComponent.m_cellY");
            int handle = ent.getHandle();
            // NOTE: We need to check what the handle of the current rune is because if a rune spawn
            //       replaces an existing rune, the new rune spawns before the old one dies, so we
            //       want to make sure we don't accidentally set the rune to null if it gets replaced
            if(cellX == 110)
            {
                if(topRune.entityHandle == handle)
                {
                    topRune.entityHandle = NULL_HANDLE;
                    topRune.type = -1;
                }
            }
            else if(cellX == 148)
            {
                if(botRune.entityHandle == handle)
                {
                    botRune.entityHandle = NULL_HANDLE;
                    botRune.type = -1;
                }
            }
            else
                System.out.printf("ERROR: Unrecognised rune spawn location: (%d,%d)\n", cellX, cellY);
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
        else if(entry.getType() == DotaUserMessages.DOTA_COMBATLOG_TYPES.DOTA_COMBATLOG_MODIFIER_ADD)
        {
            String inflictorName = entry.getInflictorName();
            if(inflictorName.equals("modifier_smoke_of_deceit"))
            {
                String targetName = entry.getTargetName();
                for(int i=0; i<10; ++i)
                {
                    if(heroes[i].heroName.equals(targetName))
                    {
                        currentSnapshot.heroes[i].smoked = true;
                        break;
                    }
                }
            }
        }
        else if(entry.getType() == DotaUserMessages.DOTA_COMBATLOG_TYPES.DOTA_COMBATLOG_MODIFIER_REMOVE)
        {
            String inflictorName = entry.getInflictorName();
            if(inflictorName.equals("modifier_smoke_of_deceit"))
            {
                String targetName = entry.getTargetName();
                for(int i=0; i<10; ++i)
                {
                    if(heroes[i].heroName.equals(targetName))
                    {
                        currentSnapshot.heroes[i].smoked = false;
                        break;
                    }
                }
            }
        }
        else if(entry.getType() == DotaUserMessages.DOTA_COMBATLOG_TYPES.DOTA_COMBATLOG_TEAM_BUILDING_KILL)
        {
            String deadName = entry.getTargetName();
            boolean isTower = deadName.contains("_tower");
            boolean isRax = deadName.contains("_rax");
            boolean isAncient = deadName.endsWith("_fort");
            if(isTower || isRax)
            {
                TowerEvent evt = new TowerEvent();
                evt.time = currentSnapshot.time;
                evt.isBarracks = isRax;
                if(deadName.startsWith("npc_dota_goodguys_"))
                {
                    evt.teamIndex = 0;
                    deadName = deadName.substring(18);
                }
                else if(deadName.startsWith("npc_dota_badguys_"))
                {
                    evt.teamIndex = 1;
                    deadName = deadName.substring(17);
                }
                if(isRax)
                {
                    if(deadName.equals("melee_rax_bot"))
                        evt.towerIndex = 0;
                    else if(deadName.equals("range_rax_bot"))
                        evt.towerIndex = 1;
                    else if(deadName.equals("melee_rax_mid"))
                        evt.towerIndex = 2;
                    else if(deadName.equals("range_rax_mid"))
                        evt.towerIndex = 3;
                    else if(deadName.equals("melee_rax_top"))
                        evt.towerIndex = 4;
                    else if(deadName.equals("range_rax_top"))
                        evt.towerIndex = 5;
                }
                else
                {
                    if(deadName.equals("tower1_top"))
                        evt.towerIndex = 0;
                    else if(deadName.equals("tower2_top"))
                        evt.towerIndex = 1;
                    else if(deadName.equals("tower3_top"))
                        evt.towerIndex = 2;

                    else if(deadName.equals("tower1_mid"))
                        evt.towerIndex = 3;
                    else if(deadName.equals("tower2_mid"))
                        evt.towerIndex = 4;
                    else if(deadName.equals("tower3_mid"))
                        evt.towerIndex = 5;

                    else if(deadName.equals("tower1_bot"))
                        evt.towerIndex = 6;
                    else if(deadName.equals("tower2_bot"))
                        evt.towerIndex = 7;
                    else if(deadName.equals("tower3_bot"))
                        evt.towerIndex = 8;

                    else if(deadName.equals("tower4"))
                    {
                        evt.towerIndex = -1;
                        for(int i=0; i<2; i++)
                        {
                            int towerIndex = (2*evt.teamIndex) + i;
                            if(tier4Towers[towerIndex] != null)
                            {
                                int lifeState = tier4Towers[towerIndex].getProperty("m_lifeState");
                                if(lifeState != 0)
                                {
                                    // All tower lists are arranged [top,bot], so index 9 is the top t4
                                    // and because our t4Towers list has the same arrangement we can just
                                    // use the index into that to get our tower index
                                    tier4Towers[towerIndex] = null;
                                    evt.towerIndex = 9+i;
                                    break;
                                }
                            }
                        }
                        if(evt.towerIndex == -1)
                        {
                            System.out.println("ERROR: Unrecognized Tier 4 tower death");
                        }
                    }
                }
                towerDeaths.add(evt);
            }
            else if(isAncient)
            {
                if(ancientDeathTick == 0)
                {
                    ancientDeathTick = snapshotList.size();
                }
            }
        }
        else if(entry.getType() == DotaUserMessages.DOTA_COMBATLOG_TYPES.DOTA_COMBATLOG_DEATH)
        {
            String deadName = entry.getTargetName();
            boolean isRosh = deadName.equals("npc_dota_roshan");
            if(isRosh)
            {
                RoshanEvent evt = new RoshanEvent();
                evt.time = currentSnapshot.time;
                evt.died = true;
                roshEvents.add(evt);
            }
        }
    }

    public void write(String fileName) throws IOException
    {
        int snapshotInterval = 15; // NOTE: The game runs at 30 ticks/s

        File outFile = new File(fileName);
        FileOutputStream outStream = new FileOutputStream(outFile);
        DeflaterOutputStream zipOutStream = new DeflaterOutputStream(outStream);
        OutputStreamWriter out = new OutputStreamWriter(zipOutStream);
        out.write("{\n");

        out.write("\"startTime\":"+String.format("%.1f", startTime)+",\n");
        out.write("\"playerHeroes\":[");
        for(int i=0; i<heroCount; ++i)
        {
            out.write("\""+heroes[i].heroName+"\"");
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

        ArrayList<WardEvent> activeWards = new ArrayList<WardEvent>();
        int nextWardEventIndex = 0;
        WardEvent nextWardEvent = wardEvents.get(0);
        ArrayList<TowerEvent> activeTowers = new ArrayList<TowerEvent>();
        int nextTowerEventIndex = 0;
        TowerEvent nextTowerEvent = towerDeaths.get(0);
        for(int i=0; i<11; ++i)
        {
            for(int team=0; team<2; ++team)
            {
                TowerEvent towerEvt = new TowerEvent();
                towerEvt.teamIndex = team;
                towerEvt.towerIndex = i;
                towerEvt.isBarracks = false;
                activeTowers.add(towerEvt);
            }
            if(i < 6)
            {
                for(int team=0; team<2; ++team)
                {
                    TowerEvent towerEvt = new TowerEvent();
                    towerEvt.teamIndex = team;
                    towerEvt.towerIndex = i;
                    towerEvt.isBarracks = true;
                    activeTowers.add(towerEvt);
                }
            }
        }
        out.write("\"snapshots\":[\n");
        int firstTick = firstHeroSpawnTick - 1;
        int lastTick = ancientDeathTick + snapshotInterval;
        for(int i=firstTick; i<lastTick; i+=snapshotInterval)
        {
            if(i > firstTick)
            {
                out.write(",");
            }

            Snapshot ss = snapshotList.get(i);
            while(nextWardEvent.time < ss.time)
            {
                if(nextWardEvent.died)
                {
                    for(int j=0; j<activeWards.size(); ++j)
                    {
                        if(nextWardEvent.entityHandle == activeWards.get(j).entityHandle)
                        {
                            activeWards.remove(j);
                            break;
                        }
                    }
                }
                else
                {
                    activeWards.add(nextWardEvent);
                }
                nextWardEventIndex++;
                if(nextWardEventIndex < wardEvents.size())
                {
                    nextWardEvent = wardEvents.get(nextWardEventIndex);
                }
                else
                {
                    nextWardEvent.time = snapshotList.get(snapshotList.size()-1).time + 1;
                }
            }

            while(nextTowerEvent.time < ss.time)
            {
                for(int j=0; j<activeTowers.size(); ++j)
                {
                    TowerEvent evt = activeTowers.get(j);
                    if((nextTowerEvent.teamIndex == evt.teamIndex) &&
                            (nextTowerEvent.towerIndex == evt.towerIndex) &&
                            (nextTowerEvent.isBarracks == evt.isBarracks))
                    {
                        activeTowers.remove(j);
                        break;
                    }
                }
                nextTowerEventIndex++;
                if(nextTowerEventIndex < towerDeaths.size())
                {
                    nextTowerEvent = towerDeaths.get(nextTowerEventIndex);
                }
                else
                {
                    nextTowerEvent.time = snapshotList.get(snapshotList.size()-1).time + 1;
                }
            }

            ss.write(out, activeWards, activeTowers);
            out.write("\n");
        }
        out.write("]\n}");

        out.close();
        zipOutStream.finish();
        zipOutStream.close();
        outStream.close();
    }

}

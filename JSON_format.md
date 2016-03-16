# JSON Data interchange format
## Single match
```
{
    "startTime": float,
    "playerHeroes": [string, ...],
    "wardEvents": [
        {
            "time": float,
            "x": float,
            "y": float,
            "entityHandle": int,
            "isSentry": bool,
            "isDire": bool,
            "died": bool
        },
        ...
    ],
    "roshEvents": [
        {
            "time": float,
            "died": bool
        },
        ...
    ],
    "towerDeaths": [
        {
            "time": float,
            "teamIndex": int,
            "towerIndex": int,
            "isBarracks": boolean
        },
        ...
    ],
    "smokeUses": [
        {
            "time": float,
            "x": float,
            "y": float
        },
        ...
    ],
    "snapshots": [
        {
            "time": float,
            "teamStats" [
                {
                    "netWorth": int,
                    "totalXP": int,
                    "score": int,
                }
            ],
            "heroData": [
                {
                    "alive": bool,
                    "x": float,
                    "y": float,
                    "invis": bool,
                    "items": [String, ...]
                }
                ,
                ...
            ],
            "courierData": [
                {
                    "alive": bool,
                    "x": float,
                    "y": float
                },
                ...
            ],
            "laneCreepData": [
                {
                    "x": float,
                    "y": float,
                    "creepCount": int,
                    "isDire": bool
                },
                ...
            ],
            "runeData": [int, int]
        },
        ...
    ]
}
```

## Multi-match
The aggregate format for multiple matches consists of a bunch of fields each of the same form, so the overal structure is the following:
```
{
    // These all have the positional format explained below
    "positionData": [...],
    "deathData": [...],
    "wardData": [...],
    "sentryData": [...],
    "smokeData": [...],

    // These all have the graph format explained below
    "roshCounts": [...],
    "wardCounts": [...],
    "sentryCounts": [...],
    "deathCounts": [...]
}
```
then the positional format is as follows:
```
[ // Has 60*60 + 75 = 3675 elements, one per second
    [ // Has 64*64 = 4096 elements, one per in-game cell (matches each entity's m_cellX/Y
        0, // This is the number of times we've had an event at this time at this location
        ...
    ],
    ...
]
```
and the graph format is:
```
[ // Has 60 + 1 elements, 1 per minute +1 for anything before creeps spawn
    0, // This is the number of times we've had an event at this time
    ...
]
```

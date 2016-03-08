# JSON Data interchange format
## Single match
```json
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
```json
{
    "positionData": [...]
    "killData" TODO
    "wardData": [...]
    "sentryData" TODO? (Pretty easy to get the data for, possibly interesting to see if there's a difference between wards/sentries?)
    "smokeData": [...]
}
```
and then each of those is a list of items that have the following format:
```json
[ // Has 60*60 + 90 = 3690 elements, one per second
    [ // Has 64*64 = 4096 elements, one per in-game cell (matches each entity's m_cellX/Y
        0, // This is the number of times we've had an event at this time at this location
        ...
    ],
    ...
]
```

## TODO
- Graph data (multi-match...also single-match?)

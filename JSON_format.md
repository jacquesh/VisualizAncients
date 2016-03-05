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
                    "invis": bool
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
            "runeData" TODO
        },
        ...
    ]
}
```

## Multi-match
```json
{
    "positionData" TODO
    "deathData" TODO
    "killData" TODO
    "wardData" TODO
    "smokeData" TODO
}
```

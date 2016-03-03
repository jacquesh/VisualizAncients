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
            "towerIndex": int
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
                    "gold": int,
                    "xp": int,
                    "deaths": int,
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

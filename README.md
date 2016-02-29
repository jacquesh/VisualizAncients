### Info sources:
- https://github.com/skadistats/clarity
- https://github.com/skadistats/clarity/issues/18
- https://github.com/skadistats/skadi/wiki/Hero-Names-and-IDs
- https://github.com/dschleck/edith
- https://andersdrachen.files.wordpress.com/2014/07/ieee-gem2014_submission_72.pdf
- http://www.lighti.de/projects/dotalys-2/

### Literature review sources
- Dota 2
    - dotabuff.com (specifically any match here: http://www.dotabuff.com/esports/leagues/2733 because they have the sign/kills visualization on the map, which is worth thinking/talking about)
    - https://yasp.co/players/57934473
    - http://www.datdota.com/blog/?p=1146
    - http://stats.noxville.co.za/
    - http://www.datdota.com/
- League of Legends
    - leageofgraphs.com (they actually have a heatmap on each champion's page, which is not very common)
    - champion.gg
    - http://www.lolking.net/summoner/euw/35217009#profile
    - http://www.nytimes.com/interactive/2014/10/10/technology/league-of-legends-graphic.html?_r=0
- Not-(computer)-games
    - http://charles.perin.free.fr/data/pub/soccerstories.pdf
    - http://map.norsecorp.com/

### Stuff we want to show
- Hero positions
- Couriers position
- Lane creeps
- Roshan?
- Neutrals? (probably not? I dunno)
- Wards
- Smoke locations
- Runes?
- Some hero state (e.g are they invis? what items do they have etc)
- Towers
- Runes

### TODO THINGS:
- Check that we ignore illusions
- Check that we dont break things with meepo
- Check how the invis state interacts with invis/smoke (check buffs?)
- 

### Actual Visual Queries
An actually used list of the things we actually want to actually know
- Where are heroes standing/running generally?
- What ward spots are most effective?
- Is this hero out of position or not at this time in this match?
- How effective are counter-wards (or similarly, how frequently do wards in a particular position get dewarded vs how frequently do they timeout)
- How does the presence of wards affect player's positioning? IE is there a noticeable difference in where a player tends to move when they do/don't have wards in a particular location?
- What are common routes that people take while smoked or, similarly, where are the common locations for people to pop smokes
- Are heroes carrying a TP (or TP boots) significantly more likely to move further out than those that are not?
- Are heroes moving forward with creep waves early game. (show creep wave positions (aprox): can be less accurate than heroe positions)
- Does Rosh being up affect team/ward positioning (show if rosh is up)
- How often are runes being used (show these when present)

### Visual Queries
This is currently a prospective list and may contain some really bad (or really good!) ideas, but for now its essentially just a list of possibilities.
- Where are heroes standing/running generally?
- What ward spots are most effective?
- Is this hero out of position or not at this time in this match?
- Are there are areas that should be necessarily avoided by players who wish not to feed?
- Is there an area of the map that provides significantly higher potential for gold/xp gain? (And by extension, is jungle or lane a more lucrative place to farm?)
- How effective are counter-wards (or similarly, how frequently do wards in a particular position get dewarded vs how frequently do they timeout)
- How does gold/xp difference relate to general hero/ward locations (e.g how does the usual positioning change as teams fall further behind?)
- How does the positioning of "globally-present" heroes (e.g Nature's Prophet, Ancient Apparition, Zues, Spectre) differ from other heroes?
- How does the presence of wards affect player's positioning? IE is there a noticeable difference in where a player tends to move when they do/don't have wards in a particular location?
- What are common routes that people take while smoked or, similarly, where are the common locations for people to pop smokes
- Where do courier's die generally?
- How does the positioning of roaming heroes (such as Bounty Hunter or Nyx, who might be particularly likely to kill couriers) differ from that of normal heroes and where might be a good ward spot to catch them?
- What are common positions for people to stand just before a teamfight (e.g in Dire jungle just before fighting at Dire's top t2 tower)
- Is there some relation between TPs and kills? Or carrying of TPs and positioning? IE are heroes carrying a TP significantly more likely to move further out than those that are not?
- Does stacking jungle lead to more aggressive warding. (show stacked jungle creeps)
- Are heroes moving forward with creep waves early game. (show creep wave positions (aprox): can be less accurate than heroe positions)
- Does Rosh being up affect team/ward positioning (show if rosh is up)
- Do certain items influence team positioning (eg. boots of travel, gem of truesight)
- Not a query specifically but need to show whether towers are up. let's people check for tower diving etc.
- How often are runes being used (show these when present)
- Linked to the smoke thing, a way in general to show if a heroe is invis since this sort of clouds map control.


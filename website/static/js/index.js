(function ($) {
  'use strict';

  var replayData = undefined;
  var $map = $('#dota-map');

  var mapManager = {
    width: $map.width(),
    scalef: $map.width() / 127,
    layers: ['rad-1', 'rad-2', 'rad-3', 'rad-4', 'rad-5',
             'dir-1', 'dir-2', 'dir-3', 'dir-4', 'dir-5'],
    couriersHidden: false,
    deathsHidden: false,
    creepHidden: false,
    smokeHidden: false,
    presence: Array(4096), //64*64
    presenceTotals: [0,0],

    getX: function(data_x) {
      return (data_x - 64) * this.scalef;
    },

    getY: function(data_y) {
      return this.width - ((data_y - 64) * this.scalef);
    },

    handleHoverOn: function(layer) {
      var assignImage = function(selector, prefix, name) {
        var imgLink = '/static/img/' + prefix + '/' + name + '.jpg';
        $(selector).html('<img src="' + imgLink + '">');
      };

      $('#character-name').text(layer.data.heroName).removeClass('hidden-text');
      var team = layer.name[0] === 'r' ? 'radiant' : 'dire';
      $('#player-info').addClass(team);
      $('#items').find('.table-cell').each(function(index, elem) {
        if (layer.data.items[index] !== '') {
          assignImage(elem, 'items', layer.data.items[index].replace('item_', ''));
        }
      });
      assignImage('#hero-icon', 'heroes', layer.data.imgName);
    },

    handleHoverOff: function(layer) {
      $('#character-name').addClass('hidden-text');
      var team = layer.name[0] === 'r' ? 'radiant' : 'dire';
      $('#player-info').removeClass(team);
      $('#items').find('.table-cell').html('');
      $('#hero-icon').html('');
    },

    setupLayers: function(playerHeroes) {
      for(var i=0; i<10; i++) {
        var layerName = this.layers[i];
        var col = '';
        var team = '';

        if (i < 5) {
          this.drawMapCircle(0, 0, '#097FE6', 'radiant', layerName);
          col = '#097FE6';
          team = 'radiant';
        } else {
          this.drawMapRect(0, 0, '#E65609', 'dire', layerName);
          col = '#E65609';
          team = 'dire';
        }

        $map.setLayer(layerName, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff,
          data: {
            color: col,
            heroName: heroNameMap[playerHeroes[i]],
            imgName: playerHeroes[i].replace('npc_dota_hero_', ''),
            items: [],
            alive: false
          }
        });

        var path = '/static/img/icons/' + team + '_death.png';
        var deathName = layerName + '-dead';
        this.drawMapIcon(0, 0, 0.7, path, team, deathName);
        $map.setLayer(deathName, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff,
          visible: false,
          data: {
            heroName: heroNameMap[playerHeroes[i]],
            imgName: playerHeroes[i].replace('npc_dota_hero_', ''),
            items: [],
            alive: false
          }
        }).moveLayer(deathName, 0);
      }

      var courierPath = '/static/img/courier.png';
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'rad-courier');
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'dir-courier');
    },

    updateHeroLayers: function(heroData) {
      for (var i=0; i<10; i++) {
        var layerId = this.layers[i];
        var layer = $map.getLayer(layerId);
        var hero = heroData[i];

        layer.data.items = hero.items;

        if (hero.alive) {
          $map.setLayer(layerId, {
            x: this.getX(hero.x),
            y: this.getY(hero.y),
            data: layer.data
          });
        } else {
          $map.setLayer(layerId + '-dead', {
            x: this.getX(hero.x),
            y: this.getY(hero.y),
            data: layer.data
          });
        }

        if (hero.alive && !layer.data.alive) {
          layer.data.alive = true;
          $map.setLayer(layerId, {
            visible: true,
            data: layer.data
          });
          $map.setLayer(layerId + '-dead', {visible: false});
        } else if (!hero.alive) {
          layer.data.alive = false;
          $map.setLayer(layerId, {
            visible: false,
            data: layer.data
          });

          $map.setLayer(layerId + '-dead', {
            x: layer.x, y: layer.y,
            visible: true,
            data: layer.data
          });
        }
        if (this.deathsHidden) {
          $map.setLayer(layerId + '-dead', {visible: false});
        }
      }
    },

    updateCouriers: function(courierData) {
      var radData = courierData[0];
      var dirData = courierData[1];

      if (radData) {
        $map.setLayer('rad-courier', {
          x: this.getX(radData.x),
          y: this.getY(radData.y)
        });
      }

      if (dirData) {
        $map.setLayer('dir-courier', {
          x: this.getX(dirData.x),
          y: this.getY(dirData.y)
        });
      }
    },

    updateCreep: function(laneCreepData) {
      $map.removeLayerGroup('creep');
      if (!this.creepHidden) {
        for (var i = 0; i < laneCreepData.length; i++) {
          var group = laneCreepData[i];
          var colour = group.isDire ? '#E65609' : '#097FE6';
          this.drawMapPolygon(group.x, group.y, colour, 'creep', 'creep-' + i, 3 + Math.round(group.creepCount / 2));
          $map.moveLayer('creep-' + i, 0);
        }
      }
    },

    // TODO: Change the time window here so that it shows for longer than 1s of game time (which is a basically just 1 tick
    updateSmokes: function(smokeData, time) {
      $map.removeLayerGroup('smoke');
      if (!this.smokeHidden) {
        var colour = 'rgba(97, 29, 216, 0.51)';
        for (var i = 0; i < smokeData.length; i++) {
          var smoke = smokeData[i];
          var timeDiff = time - smoke.time;
          if ((0 < timeDiff) && (timeDiff < 1)) {
            this.drawMapCircle(smoke.x, smoke.y, colour, 'smoke', 'smoke-' + i, 15);
          }
        }
      }
    },

    drawMapCircle: function(x, y, colour, group, name, radius) {
      radius = radius === undefined ? 8 : radius;
      group = group === undefined ? 'radiant' : group;

      $map.drawArc({
        name: name,
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: this.getX(x), y: this.getY(y),
        radius: radius
      });
    },

    drawMapPolygon: function(x, y, colour, group, name, radius, sides) {
      radius = radius === undefined ? 8 : radius;
      sides = sides === undefined ? 6 : sides;

      $map.drawPolygon({
        name: name,
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: this.getX(x), y: this.getY(y),
        radius: radius,
        sides: sides
      });
    },

    drawMapRect: function(x, y, colour, group, name) {
      group = group === undefined ? 'dire' : group;

      $map.drawRect({
        name: name,
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: this.getX(x), y: this.getY(y),
        width: 14, height:14
      });
    },

    drawMapIcon: function(x, y, scale, path, group, name) {
      group = group === undefined ? 'icons' : group;

      $map.drawImage({
        layer: true,
        name: name,
        groups: [group],
        source: path,
        x: this.getX(x), y: this.getY(y),
        scale: scale
      });
    },

    applyPresence: function(entityX, entityY, presenceValue, radius, teamSign) {
      for(var y=-radius; y<radius; y++)
      {
        for(var x=-radius; x<radius; x++)
        {
          var cellX = entityX + x;
          var cellY = entityY + y;
          if((cellX < 0) || (cellX >= 64) || (cellY < 0) || (cellY >= 64))
          {
            continue;
          }
          var distance = Math.sqrt(x*x + y*y);
          var cellPresence = presenceValue - (presenceValue/radius)*distance;
          if(cellPresence < 0) cellPresence = 0;
          var cellIndex = cellY*64 + cellX;
          this.presence[cellIndex] += cellPresence*teamSign;
        }
      }
    },

    resetMap: function() {
      $map.clearCanvas();
    },

    renderMap: function(snapshot) {
      this.presenceTotals[0] = 0;
      this.presenceTotals[1] = 0;
      for(var i=0; i<4096; i++)
      {
          this.presence[i] = 0;
      }

      var heroData = snapshot.heroData;
      var teamMultiplier = 1;
      var heroPresence = 10;
      var heroPresenceRadius = 16;
      for(var heroIndex=0; heroIndex<10; heroIndex++)
      {
        if(heroIndex == 5) teamMultiplier = -1;
        var heroX = Math.round((heroData[heroIndex].x - 64)/2);
        var heroY = Math.round((heroData[heroIndex].y - 64)/2);
        this.applyPresence(heroX, heroY, heroPresence, heroPresenceRadius, teamMultiplier);
      }

      var creepPresence = 5;
      var creepPresenceRadius = 8;
      for(var creepIndex=0; creepIndex<snapshot.laneCreepData.length; creepIndex++)
      {
        var creep = snapshot.laneCreepData[creepIndex];
        var creepX = Math.round((creep.x - 64)/2);
        var creepY = Math.round((creep.y - 64)/2);
        if(creep.isDire)
          teamMultiplier = -1;
        else
          teamMultiplier = 1;
        this.applyPresence(creepX, creepY, creepPresence, creepPresenceRadius, teamMultiplier);
      }

      var wardPresence = 7;
      var wardPresenceRadius = 8;
      for(var wardName in wardManager.wards)
      {
        var ward = wardManager.wards[wardName];
        if((snapshot.time < ward.start) || (snapshot.time >= ward.end))
          continue;
        if(ward.sentry)
          continue;
        var wardX = Math.round((ward.x - 64)/2);
        var wardY = Math.round((ward.y - 64)/2);
        if(ward.dire)
          teamMultiplier = -1;
        else
          teamMultiplier = 1;
        this.applyPresence(wardX, wardY, wardPresence, wardPresenceRadius, teamMultiplier);
      }

      var towerPresence = 15;
      var towerPresenceRadius = 16;
      var applyTowerPresence = function(index, tower) {
        if(snapshot.time >= tower.data.deadTime)
          return;
        var towerX = Math.round((tower.data.position.x - 64)/2);
        var towerY = Math.round((tower.data.position.y - 64)/2);
        mapManager.applyPresence(towerX, towerY, towerPresence, towerPresenceRadius, teamMultiplier);
      };
      teamMultiplier = 1;
      $.each($map.getLayerGroup('radiant-buildings'), applyTowerPresence);
      teamMultiplier = -1;
      $.each($map.getLayerGroup('dire-buildings'), applyTowerPresence);

      var pxX = 0;
      var pxY = 0;
      $map.setPixels({
        x:0, y:0,
        width:420, height:420,
        fromCenter: false,
        each: function(px) {
          var sign = function(x) {
            if(x > 0)
              return 1;
            else if(x < 0)
              return -1;
            return 0;
          };
          var cellX = Math.round((pxX/420)*64);
          var cellY = 64 - Math.round((pxY/420)*64);
          var cellIndex = cellY*64 + cellX;
          var presenceVal = mapManager.presence[cellIndex];
          var isEdge = false;
          var cellSign = sign(mapManager.presence[cellIndex]);
          for(var yOff=-1; yOff<=1; ++yOff) {
            for(var xOff=-1; xOff<=1; ++xOff) {
              if((xOff == 0) && (yOff == 0))
                continue;

              var x = cellX + xOff;
              var y = cellY + yOff;
              if((x < 0) || (x >= 64) || (y < 0) || (y >= 64))
                continue;
              var index = y*64 + x;
              if(sign(mapManager.presence[index]) != cellSign) {
                isEdge = true;
              }
            }
          }

          if(presenceVal > 0) {
            mapManager.presenceTotals[0] += 1;
            if(isEdge) {
              px.r = 7;
              px.g = 101;
              px.b = 178;
              px.a = 255;
            }
            else {
              px.r = 9;
              px.g = 127;
              px.b = 230;
              px.a = 128;
            }
          }
          else if(presenceVal < 0) {
            mapManager.presenceTotals[1] += 1;
            if(isEdge) {
              px.r = 178;
              px.g = 64;
              px.b = 7;
              px.a = 255;
            }
            else {
              px.r = 230;
              px.g = 86;
              px.b = 9;
              px.a = 128;
            }
          }
          else {
            var greyVal = 255;
            px.r = greyVal;
            px.g = greyVal;
            px.b = greyVal;
            px.a = 128;
          }

          pxX++;
          if(pxX >= 420) {
            pxX = 0;
            pxY++;
          }
        }
      });

      // NOTE: drawLayers clears first, drawLayer does not
      //       We need to not clear in order to not lose the presence data
      var renderLayers = $map.getLayers();
      for(var i=0; i<renderLayers.length; ++i) {
        $map.drawLayer(i);
      }

      var presenceMax = this.width*this.width; // The map is a square, so we don't need height
      var radiantPresence = Math.round(100*(this.presenceTotals[0]/presenceMax));
      var direPresence = Math.round(100*(this.presenceTotals[1]/presenceMax));
      $('#radiant-presence').text(radiantPresence+"%");
      $('#dire-presence').text(direPresence+"%");
    },

    toggleCouriers: function() {
      this.couriersHidden = !this.couriersHidden;
      $map.setLayerGroup('courier', {visible: !this.couriersHidden});
    },

    toggleSmokes: function() {
      this.smokeHidden = !this.smokeHidden;
    },

    showDeaths: function() {
      this.deathsHidden = false;
    },

    hideDeaths: function() {
      this.deathsHidden = true;
    },

    showCreep: function() {
      this.creepHidden = false;
    },

    hideCreep: function() {
      this.creepHidden = true;
    }
  };

  var wardManager = {
    wards: {},
    hidden: false,

    setupWards: function(wardEvents) {
      for (var i=0; i<wardEvents.length; i++) {
        var event = wardEvents[i];
        var handle = 'w' + event.entityHandle;

        if (!event.died) {
          this.wards[handle] = {
            start: event.time,
            end: 10000,
            x: event.x,
            y: event.y,
            dire: event.isDire,
            sentry: event.isSentry
          };

          var team = event.isDire ? 'dire' : 'radiant';
          this.addWard(event.x, event.y, team, handle);
          $map.setLayer(handle, {visible: false}).moveLayer(handle, 0);
        } else {
          this.wards[handle].end = event.time;
        }
      }
    },

    updateWards: function(time) {
      if (this.hidden) {
        return;
      }

      var map = $map;
      $.each(this.wards, function(handle, ward) {
        if ((ward.start < time) && (time < ward.end)) {
          map.setLayer(handle, {visible: true});
        } else {
          map.setLayer(handle, {visible: false});
        }
      });
    },

    addWard: function(x, y, team, handle) {
      var wardType = this.wards[handle].sentry ? 'sentry' : 'ward';
      var iconPath = '/static/img/icons/' + team + '_' + wardType + '.png';
      mapManager.drawMapIcon(x, y, 0.5, iconPath, team + '-wards', handle);
    },

    hideWards: function() {
      this.hidden = true;
      $map.setLayerGroup('radiant-wards', {
        visible: false
      });
      $map.setLayerGroup('dire-wards', {
        visible: false
      });
    },

    showWards: function() {
      this.hidden = false;
    }
  };

  var roshanManager = {
    roshanEvents: [],
    hidden: false,

    setupRoshanEvents: function(roshanData) {
      var roshanPath = '/static/img/icons/roshan.png';
      mapManager.drawMapIcon(160, 113, 0.75, roshanPath, 'roshan', 'roshan');
      $map.setLayer('roshan', {visible: false});

      var eventIndex = 0;
      for (var i=0; i < roshanData.length; i++) {
        var event = roshanData[i];

        if (!event.died) {
          this.roshanEvents.push({
            start: event.time,
            end: 10000
          });
        } else {
          this.roshanEvents[eventIndex].end = event.time;
          eventIndex += 1;
        }
      }
    },

    updateRoshan: function(time) {
      if (this.hidden) {
        return;
      }

      var showRosh = false;
      for (var i=0; i < this.roshanEvents.length; i++) {
        if (!showRosh) {
          var event = this.roshanEvents[i];
          showRosh = ((event.start < time) && (time < event.end));
        } else {
          break;
        }
      }
      $map.setLayer('roshan', {visible: showRosh});
    },

    hideRoshan: function() {
      this.hidden = true;
      $map.setLayer('roshan', {visible: false});
    },

    showRoshan: function() {
      this.hidden = false;
    }
  };

  var runeManager = {
    runeMap: ['dd', 'haste', 'illusion', 'invis', 'regen', 'bounty', 'arcane'],
    hidden: false,

    setupRunes: function() {
      this.addRuneSpot(110, 140, 0.7, 'rune-top');
      this.addRuneSpot(150, 110, 0.7, 'rune-bot');
    },

    addRuneSpot: function(x, y, scale, name) {
      var runeBasePath = '/static/img/icons/runes/';

      mapManager.drawMapIcon(x, y, scale, '', 'runes', name);
      $map.setLayer(name, {
        data: {
          basePath: runeBasePath,
          type: ''
        }
      });
    },

    updateRunes: function(runesState) {
      if (this.hidden) {
        return;
      }

      var names = ['rune-top', 'rune-bot'];

      for (var i=0; i < runesState.length; i++) {
        if (runesState[i] !== -1) {
          var layer = $map.getLayer(names[i]);
          if (layer.data.type === '' || layer.data.type !== runesState[i]) {
            var runeName = this.runeMap[runesState[i]];
            layer.data.type = runesState[i];

            $map.setLayer(names[i], {
              source: layer.data.basePath + runeName + '_rune.png',
              visible: true,
              data: layer.data
            });
          } else if (!layer.visible) {
            $map.setLayer(names[i], {visible: true});
          }
        } else {
          $map.setLayer(names[i], {visible: false});
        }
      }
    },

    hideRunes: function() {
      this.hidden = true;
      $map.setLayerGroup('runes', {visible: false});
    },

    showRunes: function() {
      this.hidden = false;
    }
  };

  var buildingManager = {
    hidden: false,
    setupBuildings: function(towerEvents) {
      // Make barracks for both teams
      for (var i=0; i < 2; i++) {
        var team = (i == 0) ? 'radiant' : 'dire';
        for (var j=0; j < 6; j++) {
          var pos = barracksPositions[i][j];
          var layerName = team + '-' + j + '-' + 'barracks';
          this.addBuilding(pos.x, pos.y, team, true, team + '-buildings', layerName);
          $map.setLayer(layerName, {
            data: {
              position: pos,
              deadTime: 10000
            }
          });
        }
      }

      // Make towers for both teams
      for (var i=0; i < 2; i++) {
        var team = (i == 0) ? 'radiant' : 'dire';
        for (var j=0; j < 11; j++) {
          var pos = towerPositions[i][j];
          var layerName = team + '-' + j + '-' + 'tower';
          this.addBuilding(pos.x, pos.y, team, false, team + '-buildings', layerName);
          $map.setLayer(layerName, {
            data: {
              position: pos,
              deadTime: 10000
            }
          });
        }
      }

      for (var i=0; i < towerEvents.length; i++) {
        var event = towerEvents[i];
        var team = event.teamIndex == 0 ? 'radiant' : 'dire';
        var type = event.isBarracks ? 'barracks' : 'tower';

        var layerName = team + '-' + event.towerIndex + '-' + type;
        var layer = $map.getLayer(layerName);
        $map.setLayer(layerName, {
          data: {
            position: layer.data.position,
            deadTime: event.time
          }
        });
      }
    },

    updateBuildings: function(time) {
      var setDead = function(index, layer) {
        var deadTime = layer.data.deadTime;
        var dead = (deadTime <= time);

        $map.setLayer(layer.name, {
          visible: !dead
        });
      };

      if (!this.hidden) {
        $.each($map.getLayerGroup('radiant-buildings'), setDead);
        $.each($map.getLayerGroup('dire-buildings'), setDead);
      }
    },

    addBuilding: function(x, y, team, barracks, group, name) {
      var type = barracks ? 'barracks.png' : 'tower.png';
      var path = '/static/img/icons/' + type;
      mapManager.drawMapIcon(x, y, 0.25, path, group, name);
    },

    hideBuildings: function() {
      this.hidden = true;
      $map.setLayerGroup('radiant-buildings', {visible: false});
      $map.setLayerGroup('dire-buildings', {visible: false});
    },

    showBuildings: function() {
      this.hidden = false;
    }
  };

  var statsManager = {
    biggestVal:0,

    setMaxStats: function(stats) {
      var maxGold = Math.max(stats[0].netWorth, stats[1].netWorth);
      var maxXP = Math.max(stats[0].totalXp, stats[1].totalXp);
      this.biggestVal = Math.max(maxGold, maxXP);
    },

    updateTeamScores: function(team, stats) {
      var $team = $(team);
      $team.find('.kills').find('.count').text(stats.score);
      var $teamStats = $team.find('.team-stats');
      var $netWorth = $teamStats.find('.net-worth');
      var $totalXp = $teamStats.find('.total-xp');

      $netWorth.find('span').text(stats.netWorth);
      $netWorth.width('calc('+ (stats.netWorth/this.biggestVal) * 100 +'% - 9%)');

      $totalXp.find('span').text(stats.totalXp);
      $totalXp.width('calc('+ (stats.totalXp/this.biggestVal) * 100 +'% - 9%)');
    }
  };

  var charArr2Str = function(charArr) {
    var chunkSize = 0x8000;
    var outputArr = [];
    for(var i=0; i<charArr.length; i+=chunkSize) {
        outputArr.push(String.fromCharCode.apply(null, charArr.subarray(i, i+chunkSize)));
    }
    return outputArr.join("");
  };

  var setupPlayerData = function (data) {
    var inflater = new pako.Inflate();
    inflater.push(data, true);
    var dataCharArr = inflater.result;
    var dataStr = charArr2Str(dataCharArr);
    replayData = JSON.parse(dataStr);

    var snapshots = replayData.snapshots;

    buildingManager.setupBuildings(replayData.towerDeaths);
    mapManager.setupLayers(replayData.playerHeroes);
    roshanManager.setupRoshanEvents(replayData.roshEvents);
    wardManager.setupWards(replayData.wardEvents);
    runeManager.setupRunes();

    mapManager.renderMap(snapshots[0]);

    statsManager.setMaxStats(snapshots[snapshots.length-1].teamStats);

    var $timeSlider = $('#time-slider');
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 1,
      slide: function(event, ui) {
        $('#amount').text(ui.value );

        mapManager.resetMap();

        var snapshot = snapshots[ui.value];
        var heroData = snapshot.heroData;
        mapManager.updateHeroLayers(heroData);

        var courierData = snapshot.courierData;
        if (courierData.length) {
          mapManager.updateCouriers(courierData);
        }

        mapManager.updateCreep(snapshot.laneCreepData);
        runeManager.updateRunes(snapshot.runeData);
        roshanManager.updateRoshan(snapshot.time);
        wardManager.updateWards(snapshot.time);
        buildingManager.updateBuildings(snapshot.time);
        mapManager.updateSmokes(replayData.smokeUses, snapshot.time);

        statsManager.updateTeamScores('#radiant', snapshot.teamStats[0]);
        statsManager.updateTeamScores('#dire', snapshot.teamStats[1]);

        mapManager.renderMap(snapshot);
      }
    });
    //$timeSlider.slider('option', 'slide').call($timeSlider);
    $('#amount').text($timeSlider.slider('value'));

    var time = replayData.snapshots[replayData.snapshots.length - 1].time;
    $('#end-time').text(Math.round(time / 60) + ':' + Math.round(time % 60));
  };

  var loadPlayerData = function() {
    var req = new XMLHttpRequest();
    req.open("GET", "/static/data.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function(event) {
        var bytes = new Uint8Array(req.response);
        setupPlayerData(bytes);
    };
    req.send();
  };

  var setupCheckboxes = function () {
    var $toggleBox = $('#toggle-box');
    $toggleBox.find('input').altCheckbox();
    $toggleBox.find('.alt-checkbox').addClass('checked');

    $('#death-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        mapManager.showDeaths();
      } else {
        mapManager.hideDeaths();
      }
      var snapshot = replayData.snapshots[time];
      mapManager.updateHeroLayers(snapshot.heroData);
      mapManager.renderMap(snapshot);
    });

    $('#wards-box').prev().click(function () {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        wardManager.showWards();
      } else {
        wardManager.hideWards();
      }
      var snapshot = replayData.snapshots[time];
      wardManager.updateWards(snapshot.time);
      mapManager.renderMap(snapshot);
    });

    $('#creep-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        mapManager.showCreep();
      } else {
        mapManager.hideCreep();
      }
      var snapshot = replayData.snapshots[time];
      mapManager.updateCreep(snapshot.laneCreepData);
      mapManager.renderMap(snapshot);
    });

    $('#roshan-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        roshanManager.showRoshan();
      } else {
        roshanManager.hideRoshan();
      }
      var snapshot = replayData.snapshots[time];
      roshanManager.updateRoshan(snapshot.time);
      mapManager.renderMap(snapshot);
    });

    $('#courier-box').prev().click(function() {
      var time = +$('#amount').text();
      mapManager.toggleCouriers();
      var courierData = replayData.snapshots[time].courierData;
      if (courierData.length) {
        mapManager.updateCouriers(courierData);
      }
      var snapshot = replayData.snapshots[time];
      mapManager.renderMap(snapshot);
    });

    $('#towers-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        buildingManager.showBuildings();
      } else {
        buildingManager.hideBuildings();
      }
      var snapshot = replayData.snapshots[time];
      buildingManager.updateBuildings(snapshot.time);
      mapManager.renderMap(snapshot);
    });

    $('#smokes-box').prev().click(function() {
      var time = +$('#amount').text();
      mapManager.toggleSmokes();

      var snapshot = replayData.snapshots[time];
      mapManager.updateSmokes(replayData.smokeUses, snapshot.time);
      mapManager.renderMap(snapshot);
    });

    $('#runes-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        runeManager.showRunes();
      } else {
        runeManager.hideRunes();
      }
      var snapshot = replayData.snapshots[time];
      runeManager.updateRunes(snapshot.runeData);
      mapManager.renderMap(snapshot);
    });
  };

  $(document).ready(function() {
    setupCheckboxes();
    loadPlayerData();
  });

})(jQuery);

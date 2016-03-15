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

    resetMap: function() {
      $map.clearCanvas();
    },

    toggleCouriers: function() {
      this.couriersHidden = !this.couriersHidden;
      $map.setLayerGroup('courier', {visible: !this.couriersHidden});
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

    setupWards: function(wardEvents, firstTickTime) {
      for (var i=0; i<wardEvents.length; i++) {
        var event = wardEvents[i];
        var handle = 'w' + event.entityHandle;

        if (!event.died) {
          this.wards[handle] = {
            start: Math.round((event.time - firstTickTime) * 2) + 1,
            sentry: event.isSentry
          };

          var team = event.isDire ? 'dire' : 'radiant';
          this.addWard(event.x, event.y, team, handle);
          $map.setLayer(handle, {visible: false}).moveLayer(handle, 0);
        } else {
          this.wards[handle].end = Math.round((event.time - firstTickTime) * 2) + 1;
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

    setupRoshanEvents: function(roshanData, firstTickTime) {
      var roshanPath = '/static/img/icons/roshan.png';
      mapManager.drawMapIcon(160, 113, 0.75, roshanPath, 'roshan', 'roshan');
      $map.setLayer('roshan', {visible: false});

      var eventIndex = 0;
      for (var i=0; i < roshanData.length; i++) {
        var event = roshanData[i];

        if (!event.died) {
          this.roshanEvents.push({
            start: Math.round((event.time - firstTickTime) * 2) + 1,
            end: -1
          });
        } else {
          this.roshanEvents[eventIndex].end = Math.round((event.time - firstTickTime) * 2) + 1;
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

          var neverKilled = ((event.end === -1) && (event.start < time));
          var aliveTime = ((event.start < time) && (time < event.end));
          showRosh = neverKilled || aliveTime;
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
    setupBuildings: function(towerEvents, firstTickTime) {
      // Make barracks for both teams
      for (var i=0; i < 2; i++) {
        var team = (i == 0) ? 'radiant' : 'dire';
        for (var j=0; j < 6; j++) {
          var pos = barracksPositions[i][j];
          var layerName = team + '-' + j + '-' + 'barracks';
          this.addBuilding(pos.x, pos.y, team, true, team + '-buildings', layerName);
          $map.setLayer(layerName, {
            data: {
              deadTime: -1
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
              deadTime: -1
            }
          });
        }
      }

      for (var i=0; i < towerEvents.length; i++) {
        var event = towerEvents[i];
        var team = event.teamIndex == 0 ? 'radiant' : 'dire';
        var type = event.isBarracks ? 'barracks' : 'tower';

        var layerName = team + '-' + event.towerIndex + '-' + type;
        $map.setLayer(layerName, {
          data: {
            deadTime: Math.round((event.time - firstTickTime) * 2) + 1
          }
        });
      }
    },

    updateBuildings: function(tick) {
      var setDead = function(index, layer) {
        var deadTime = layer.data.deadTime;
        var dead = (deadTime <= tick) && (deadTime !== -1);

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

      $netWorth.text(stats.netWorth);
      //$netWorth.width('calc('+ (stats.netWorth/this.biggestVal) * 100 +'% - 9%)');

      $totalXp.text(stats.totalXp);
      //$totalXp.width('calc('+ (stats.totalXp/this.big) * 100 +'% - 9%)');
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
    var firstTickTime = snapshots[1].time;

    buildingManager.setupBuildings(replayData.towerDeaths, firstTickTime);
    mapManager.setupLayers(replayData.playerHeroes);
    roshanManager.setupRoshanEvents(replayData.roshEvents, firstTickTime);
    wardManager.setupWards(replayData.wardEvents, firstTickTime);
    runeManager.setupRunes();

    $map.drawLayers();

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
        roshanManager.updateRoshan(ui.value);
        wardManager.updateWards(ui.value);
        buildingManager.updateBuildings(ui.value);

        statsManager.updateTeamScores('#radiant', snapshot.teamStats[0]);
        statsManager.updateTeamScores('#dire', snapshot.teamStats[1]);

        $map.drawLayers();
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
      mapManager.updateHeroLayers(replayData.snapshots[time].heroData);
      $map.drawLayers();
    });

    $('#wards-box').prev().click(function () {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        wardManager.showWards();
      } else {
        wardManager.hideWards();
      }
      wardManager.updateWards(time);
      $map.drawLayers();
    });

    $('#creep-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        mapManager.showCreep();
      } else {
        mapManager.hideCreep();
      }
      mapManager.updateCreep(replayData.snapshots[time].laneCreepData);
      $map.drawLayers();
    });

    $('#roshan-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        roshanManager.showRoshan();
      } else {
        roshanManager.hideRoshan();
      }
      roshanManager.updateRoshan(time);
      $map.drawLayers();
    });

    $('#courier-box').prev().click(function() {
      var time = +$('#amount').text();
      mapManager.toggleCouriers();
      var courierData = replayData.snapshots[time].courierData;
      if (courierData.length) {
        mapManager.updateCouriers(courierData);
      }
      $map.drawLayers();
    });

    $('#towers-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        buildingManager.showBuildings();
      } else {
        buildingManager.hideBuildings();
      }

      buildingManager.updateBuildings(time);
      $map.drawLayers();
    });

    $('#runes-box').prev().click(function() {
      var time = +$('#amount').text();
      if ($(this).next().prop('checked')) {
        runeManager.showRunes();
      } else {
        runeManager.hideRunes();
      }

      runeManager.updateRunes(replayData.snapshots[time].runeData);
      $map.drawLayers();
    });
  };

  $(document).ready(function() {
    setupCheckboxes();
    loadPlayerData();
  });

})(jQuery);

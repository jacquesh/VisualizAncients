var replayData = undefined;
var endTime = 0;

var lerp = function(from, to, t) {
  return from*(1-t) + to*t;
};

(function ($) {
  'use strict';

  //var replayData = undefined;
  var $map = $('#dota-map');
  var cursorSettings = {
    mouseover: 'pointer',
    mouseup: 'pointer'
  };
  var lineLayerNo = -1;
  var deadLayer = -1;

  var mapManager = {
    width: $map.width(),
    scalef: $map.width() / 127,
    layers: ['rad-1', 'rad-2', 'rad-3', 'rad-4', 'rad-5',
             'dir-1', 'dir-2', 'dir-3', 'dir-4', 'dir-5'],
    couriersHidden: false,
    deathsHidden: false,
    creepHidden: false,
    smokeHidden: false,
    showPresence: false,
    showHeatmap: false,
    radiantLinesHidden: false,
    direLinesHidden: false,
    selectedHero: '',
    hoverHero: '',

    getX: function(data_x) {
      return (data_x - 64) * this.scalef;
    },

    getY: function(data_y) {
      return this.width - ((data_y - 64) * this.scalef);
    },

    handleHoverOn: function(layer) {
      var $items = $('#items');
      var assignImage = function(selector, prefix, name) {
        var imgLink = '/static/img/' + prefix + '/' + name + '.jpg';
        var $img = $(selector).children('img');
        $img.prop('src', imgLink);
        $img.show();
      };

      $('#entity-name').text(layer.data.entityName).removeClass('hidden-text');
      var team = layer.name[0] === 'r' ? 'radiant' : 'dire';

      $('#player-info').addClass(team);
      if(layer.data.hasOwnProperty('items')) {
        $('#status-bar').css('opacity', 1);
        $items.css("visibility", "visible");
        $items.find('.table-cell').each(function(index, elem) {
          if (layer.data.items[index] !== '') {
            var itemName = layer.data.items[index].replace('item_', '');
            if (itemName.startsWith('recipe')) {
              itemName = 'recipe';
            }
            assignImage(elem, 'items', itemName);
          } else {
            $(elem).children('img').hide();
          }
        });

        if (layer.data.invis) {
          $('#entity-invis').css('opacity', 1.0);
        } else {
          $('#entity-invis').css('opacity', 0.2);
        }
        if (!layer.data.alive) {
          $('#entity-dead').css('opacity', 1.0);
        } else {
          $('#entity-dead').css('opacity', 0.2);
        }
        mapManager.hoverHero = layer.name;
      } else {
        $('#status-bar').css('opacity', 0);
        $items.css("visibility", "hidden");
      }
      assignImage('#entity-icon', 'heroes', layer.data.imgName);

      if ($('#time-range-slider').is(':visible') && layer.data.items) {
        var lineLayer = layer.name.replace('-dead', '') + '-line';
        $map.setLayerGroup('all-lines', {
          strokeStyle: 'rgba(0, 0, 0, 0.8)'
        }).setLayer(lineLayer, {
          strokeStyle: '#FFF500'
        });
        $map.moveLayer(lineLayer, lineLayerNo);
        $map.drawLayers();
      }
    },

    handleHoverOff: function(layer) {
      mapManager.hoverHero = '';
      if (mapManager.selectedHero !== layer.name) {
        $('#entity-name').addClass('hidden-text');
        mapManager.resetPlayerInfoPanel();

        if ($('#time-range-slider').is(':visible')) {
          $map.setLayerGroup('radiant-lines', {strokeStyle: '#097FE6'});
          $map.setLayerGroup('dire-lines', {strokeStyle: '#E65609'});
          $map.drawLayers();
        }
      }

      if (mapManager.selectedHero) {
        mapManager.updateSelected();
      }
    },

    updateSelected: function () {
      var heroLayer = $map.getLayer(mapManager.selectedHero);
      this.handleHoverOn(heroLayer);
    },

    resetPlayerInfoPanel: function() {
      var $items = $('#items');
      $('#entity-name').addClass('hidden-text');
      $('#player-info').removeClass('radiant').removeClass('dire');
      $items.find('.table-cell').children('img').hide();
      $items.css('visibility', 'visible');
      $('#entity-icon').children('img').hide();

      $('#status-bar').css('opacity', 0);
      $('#entity-dead').css('opacity', 0.2);
      $('#entity-invis').css('opacity', 0.2);
    },

    setupLayers: function(playerHeroes) {
      deadLayer = $map.getLayers().length;
      lineLayerNo = deadLayer + 10;
      for(var i=0; i<10; i++) {
        var layerName = this.layers[i];
        var col = '';
        var team = '';

        if (i < 5) {
          this.drawMapCircle(0, 0, '#097FE6', 'radiant', layerName, 8, true);
          col = '#097FE6';
          team = 'radiant';
        } else {
          this.drawMapRect(194, 194, '#E65609', 'dire', layerName);
          col = '#E65609';
          team = 'dire';
        }

        $map.setLayer(layerName, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff,
          click: function(layer) {
            layer.event.stopPropagation();

            if (mapManager.selectedHero) {
              var old = $map.getLayer(mapManager.selectedHero);
              if (old.data.alive) {
                old.fillStyle = old.data.color;
              } else {
                var team = old.name[0] === 'r' ? 'radiant' : 'dire';
                var layerName = (old.name.endsWith('-dead')) ? old.name : old.name + '-dead';

                $map.setLayer(layerName, {
                  source: '/static/img/icons/' + team + '_death.png'
                });
              }
            }

            if (mapManager.selectedHero !== layer.name) {
              mapManager.selectedHero = layer.name;
              layer.fillStyle = '#FFFF00';
              mapManager.updateSelected();
            } else {
              mapManager.selectedHero = '';
            }
          },
          data: {
            color: col,
            entityName: heroNameMap[playerHeroes[i]],
            imgName: playerHeroes[i].replace('npc_dota_hero_', ''),
            items: [],
            alive: false,
            invis: false
          }
        });

        var path = '/static/img/icons/' + team + '_death.png';
        var deathName = layerName + '-dead';
        this.drawMapIcon(0, 0, 0.7, path, team, deathName);
        $map.setLayer(deathName, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff,
          click: function(layer) {
            layer.event.stopPropagation();

            if (mapManager.selectedHero) {
              var old = $map.getLayer(mapManager.selectedHero);
              if (old.data.alive) {
                old.fillStyle = old.data.color;
              } else {
                var team = old.name[0] === 'r' ? 'radiant' : 'dire';
                var layerName = (old.name.endsWith('-dead')) ? old.name : old.name + '-dead';

                $map.setLayer(layerName, {
                  source: '/static/img/icons/' + team + '_death.png'
                });
              }
            }

            var heroName = layer.name.replace('-dead', '');
            mapManager.selectedHero = heroName;

            $map.setLayer(heroName, {fillStyle: '#FFFF00'});
            $map.setLayer(layer, {source: '/static/img/icons/selected_death.png'});

            mapManager.updateSelected();
            $map.drawLayer(layer);
          },
          visible: false,
          data: {
            entityName: heroNameMap[playerHeroes[i]],
            imgName: playerHeroes[i].replace('npc_dota_hero_', ''),
            items: [],
            alive: false,
            invis: false
          }
        }).moveLayer(deathName, deadLayer);
      }

      var courierPath = '/static/img/courier.png';
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'rad-courier');
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'dir-courier');
    },

    drawHeroPaths: function(t0, t1, snapshots) {
      $map.removeLayerGroup('radiant-lines');
      $map.removeLayerGroup('dire-lines');

      for (var i=0; i<10; i++) {
        var points = [];
        for (var j=t0; j <= t1; j++) {
          var hero = snapshots[j].heroData[i];
          points.push([hero.x, hero.y]);
        }

        var colour = '';
        var dashed = true;
        var group = '-lines';
        var name = this.layers[i] + '-line';
        var draw = false;
        var layer = lineLayerNo;

        if (i < 5) {
          colour = '#097FE6';
          group = 'radiant' + group;
          draw = !this.radiantLinesHidden;
        } else {
          colour = '#E65609';
          group = 'dire' + group;
          dashed = false;
          draw = !this.direLinesHidden;
        }

        if (mapManager.selectedHero === this.layers[i]) {
          colour = '#FFFF00';
          layer = 21;
        } else if (mapManager.selectedHero) {
          colour = 'rgba(0, 0, 0, 0.8)'
        }

        if (draw) {
          this.drawMapLine(points, colour, dashed, group, name);
          $map.moveLayer(name, layer);
        }
      }
    },

    drawPresenceMap: function(snapshot) {
      var $presence = $('#presence');
      if (this.showPresence) {
        var pxX = 0;
        var pxY = 0;
        var colours = [{r:255, g:255, b:255, a:128},
                       {},
                       {r:9, g:127, b:230, a:128},
                       {r:7, g:101, b:178, a:255},
                       {r:230, g:86, b:9, a:128},
                       {r:178, g:64, b:7, a:255}];
        $presence.setPixels({
          x:0, y:0,
          width:420, height:420,
          fromCenter: false,
          each: function(px) {
            var cellX = Math.floor((pxX/420)*64);
            var cellY = 63 - Math.floor((pxY/420)*64);
            var cellIndex = cellY*64 + cellX;
            var presenceVal = snapshot.presenceData.map[cellIndex];
            px.r = colours[presenceVal].r;
            px.g = colours[presenceVal].g;
            px.b = colours[presenceVal].b;
            px.a = colours[presenceVal].a;

            pxX++;
            if(pxX >= 420) {
              pxX = 0;
              pxY++;
            }
          }
        });

        $presence.find('img').prop('src', $presence.getCanvasImage());
      }
    },

    drawHeatmap: function(tick, snapshots) {
      if (this.showHeatmap) {
        var rangeEndSnapshot = snapshots[tick];
        var dataEndIndex = Math.round(rangeEndSnapshot.time - replayData.startTime) + 75;

        var $heatmap = $('#heatmap');
        var pxX = 0;
        var pxY = 0;
        var heatmapAlpha = 255;
        var dataSource = aggregateData.positionData;

        $heatmap.setPixels({
          x:0, y:0,
          width:420, height:420,
          fromCenter: false,
          each: function(px) {
            var cellX = Math.floor((pxX/420)*64);
            var cellY = 63 - Math.floor((pxY/420)*64);
            var cellIndex = cellY*64 + cellX;
            var heatmapVal = dataSource[dataEndIndex][cellIndex];

            px.b = 0;
            var baseVal = 0;
            var midpoint = lerp(baseVal, 100, 0.3);
            var maxPoint = lerp(baseVal, 100, 0.8);
            if(heatmapVal > baseVal) {
              px.a = heatmapAlpha;
              if(heatmapVal > midpoint) {
                // R=255, G=255->0 as heatmapVal=midpoint->100
                var t = (heatmapVal - midpoint)/(maxPoint - midpoint);
                if(t > 1.0) {
                  t = 1.0;
                }
                px.r = 255;
                px.g = lerp(255, 0, t);
              }
              else {
                // R=255->0, G=255 as heatmapVal=baseVal->midpoint
                var t = (heatmapVal - baseVal)/(midpoint - baseVal);
                px.r = lerp(0,255, t);
                px.g = 255;

                var aScale = lerp(0, 2, 3*t);
                if(aScale > 1.0) {
                  aScale = 1.0
                }
                px.a = heatmapAlpha*aScale;
              }
            }
            else {
              px.a = 0;
            }

            pxX++;
            if(pxX >= 420) {
              pxX = 0;
              pxY++;
            }
          }
        });

        $heatmap.find('img').prop('src', $heatmap.getCanvasImage());
      }
    },

    drawMapLine: function(points, colour, dashed, group, name) {
      var lineSettings = {
        name: name,
        strokeStyle: colour,
        strokeWidth: 4,
        strokeCap: 'round',
        layer: true,
        groups: ['all-lines', group],
        closed: false
      };

      if (dashed) {
        lineSettings.strokeDash = [20, 8];
      }

      // Add the points from the array to the object
      for (var p=0; p < points.length; p++) {
        lineSettings['x'+(p+1)] = this.getX(points[p][0]);
        lineSettings['y'+(p+1)] = this.getY(points[p][1]);
      }
      $map.drawLine(lineSettings);
    },

    updateHeroLayers: function(heroData) {
      for (var i=0; i<10; i++) {
        var layerId = this.layers[i];
        var layer = $map.getLayer(layerId);
        var hero = heroData[i];

        layer.data.items = hero.items;
        layer.data.invis = hero.invis || hero.smoked;

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

          var selectedDead = '/static/img/icons/selected_death.png';
          var opts = {
            x: this.getX(hero.x), y: this.getY(hero.y),
            visible: true,
            data: layer.data
          };

          if (layer.name === mapManager.selectedHero) {
            opts.source = selectedDead;
          }

          $map.setLayer(layerId + '-dead', opts);
        }
        if (this.deathsHidden) {
          $map.setLayer(layerId + '-dead', {visible: false});
        }
      }

      if (mapManager.selectedHero) {
        mapManager.updateSelected();
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
          var teamName = group.isDire ? 'dire' : 'radiant';
          var layerName = teamName + '-creep-' + i;
          this.drawMapPolygon(group.x, group.y, colour, 'creep', layerName, 3 + Math.round(group.creepCount / 2));
          $map.moveLayer(layerName, 3);
          $map.setLayer(layerName, {
            mouseover: mapManager.handleHoverOn,
            mouseout: mapManager.handleHoverOff,
            data: {
              color: colour,
              entityName: 'Creep Wave',
              imgName: 'creep_'+teamName,
            }
          });
        }
      }
    },

    setupSmokeEvents: function(smokeData) {
      for (var i = 0; i < smokeData.length; i++) {
        var smoke = smokeData[i];
        addEvent(false, 'smoke-' + i, 'smoke', smoke.time, 'Smoke used at ' + ('' + (smoke.time  - replayData.snapshots[0].time)).toHHMMSS());
      }
    },

    updateSmokes: function(smokeData, time) {
      $map.removeLayerGroup('smoke');
      if (!this.smokeHidden) {
        var colour = 'rgba(97, 29, 216, 0.51)';
        for (var i = 0; i < smokeData.length; i++) {
          var smoke = smokeData[i];
          var timeDiff = time - smoke.time;
          if ((0 < timeDiff) && (timeDiff < 5)) {
            this.drawMapCircle(smoke.x, smoke.y, colour, 'smoke', 'smoke-' + i, 15);
          }
        }
      }
    },

    drawMapCircle: function(x, y, colour, group, name, radius, player) {
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

      if (player) {
        $map.setLayer(name, {cursors: cursorSettings});
      } else {
        $map.setLayer(name, {intangible: true});
      }
    },

    drawMapPolygon: function(x, y, colour, group, name, radius, sides) {
      radius = radius === undefined ? 8 : radius;
      sides = sides === undefined ? 5 : sides;

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
        width: 14, height:14,
        cursors: cursorSettings
      });
    },

    drawMapIcon: function(x, y, scale, path, group, name) {
      group = group === undefined ? 'icons' : group;
      var opts = {
        layer: true,
        name: name,
        groups: [group],
        source: path,
        x: this.getX(x), y: this.getY(y),
        scale: scale
      };

      if (name.endsWith('-dead')) {
        opts.cursors = cursorSettings
      }

      $map.drawImage(opts);
    },

    resetMap: function() {
      $map.clearCanvas();
    },

    toggleCouriers: function() {
      this.couriersHidden = !this.couriersHidden;
      $map.setLayerGroup('courier', {visible: !this.couriersHidden});
    },

    toggleDireLines: function() {
      this.direLinesHidden = !this.direLinesHidden;
      $map.setLayerGroup('dire-lines', {visible: !this.direLinesHidden});
    },

    toggleRadiantLines: function() {
      this.radiantLinesHidden = !this.radiantLinesHidden;
      $map.setLayerGroup('radiant-lines', {visible: !this.radiantLinesHidden});
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
            sentry: event.isSentry
          };

          var team = event.isDire ? 'dire' : 'radiant';
          this.addWard(event.x, event.y, team, handle);
          $map.setLayer(handle, {visible: false}).moveLayer(handle, 3);
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
      $map.setLayer('roshan', {
          visible: false,
          mouseover: mapManager.handleHoverOn,
          mouseout: mapManager.handleHoverOff,
          data: {
              color: '#FFFFFF',
              entityName: 'Roshan',
              imgName: 'roshan',
          }
      });

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
          addEvent(false, 'rosh'+ eventIndex, 'roshan', event.time, 'Roshan killed at ' + ('' + (event.time  - replayData.snapshots[0].time)).toHHMMSS());
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

  var addEvent = function(top, eventId, eventClass, time, tooltip) {
    var place = top ? '#top-events' : '#bottom-events';
    $(place).append(
      '<div id="' + eventId + '" class="event ' + eventClass + '"></div>'
    );

    html5tooltips({contentText: tooltip, targetSelector: '#' + eventId});

    var startTime = replayData.snapshots[0].time;
    var endTime = replayData.snapshots[replayData.snapshots.length-1].time;
    var totalTime = endTime - startTime;
    var barLength = $('#time').width();
    var timeFraction =  (time-startTime)/totalTime;
    var eventTimeLoc = timeFraction * 100;

    $('#' + eventId).css('left', 'calc(' + eventTimeLoc + '% - 7px)');
  };

  var buildingManager = {
    hidden: false,
    setupBuildings: function(towerEvents) {
      // Make team ancients
      for (var i=0; i < 2; i++) {
        var team = (i == 0) ? 'radiant' : 'dire';
        var pos = ancientPositions[i][0];
        var layerName = team + '-' + j + '-' + 'ancients';
        this.addBuilding(pos.x, pos.y, team, true, team + '-buildings', layerName);
        $map.setLayer(layerName, {
          mouseover: mapManager.handleHoverOn,
          mouseout: mapManager.handleHoverOff,
          data: {
            entityName: 'Ancient',
            imgName: 'tower_' + team
          }
        });
      }

      // Make barracks for both teams
      for (var i=0; i < 2; i++) {
        var team = (i == 0) ? 'radiant' : 'dire';
        for (var j=0; j < 6; j++) {
          var pos = barracksPositions[i][j];
          var layerName = team + '-' + j + '-' + 'barracks';
          this.addBuilding(pos.x, pos.y, team, true, team + '-buildings', layerName);
          $map.setLayer(layerName, {
            mouseover: mapManager.handleHoverOn,
            mouseout: mapManager.handleHoverOff,
            data: {
              entityName: 'Barracks',
              imgName: 'tower_'+team,
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
            mouseover: mapManager.handleHoverOn,
            mouseout: mapManager.handleHoverOff,
            data: {
              entityName: 'Tower',
              imgName: 'tower_'+team,
              deadTime: 10000
            }
          });
        }
      }

      for (var i=0; i < towerEvents.length; i++) {
        var event = towerEvents[i];
        var team = event.teamIndex == 0 ? 'Radiant' : 'Dire';
        var type = event.isBarracks ? 'barracks' : 'tower';

        var eventId = team.toLowerCase() + '-' + event.towerIndex + '-' + type + '-' + i;
        var eventClass = team.toLowerCase() + ' ' + type;

        addEvent(true, eventId, eventClass, event.time, team + ' ' + type + ' destroyed at ' + ('' + (event.time  - replayData.snapshots[0].time)).toHHMMSS());

        var layerName = team.toLowerCase() + '-' + event.towerIndex + '-' + type;
        $map.getLayer(layerName).data.deadTime = event.time;
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
    biggestVal: 0,
    runTime: 0,

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

  var getTime = function(tick) {
    var snapshot = replayData.snapshots[tick];
    var gameTime = snapshot.time - replayData.startTime;

    if(gameTime >= 0) {
      return ('' + gameTime).toHHMMSS();
    } else {
      return '-' + ('' + -gameTime).toHHMMSS();
    }
  };

  var sliderHover = {
    hoverOn: function(event) { // mouse enter
      if (!$(event.target).hasClass('ui-slider-handle')) {
        var $hoverLabel = $('#hover-label');
        var leftOffset = Math.floor($(this).offset().left);

        $hoverLabel.css('left', (((Math.round(event.pageX) - leftOffset) / $(this).width()) * 100) + '%');
        $hoverLabel.show();
      }
    },

    hoverOff: function(event) { // mouse exit
      $('#hover-label').hide();
    },

    mouseMove: function () { // while hovering
      var $hoverLabel = $('#hover-label');

      if (!$(event.target).hasClass('ui-slider-handle')) {
        var width = $(this).outerWidth();
        var leftOffset = Math.floor($(this).offset().left);
        var value = Math.floor(((Math.round(event.pageX) - leftOffset) / width) * (replayData.snapshots.length - 1));

        $hoverLabel.css('left', (((Math.round(event.pageX) - leftOffset) / $(this).width()) * 100)+'%');
        $hoverLabel.text(getTime(value));
        $hoverLabel.show();
      } else {
        $hoverLabel.hide();
      }
    }
  };

  var singleSlide = function(tick) {
    var $timeSlider = $('#time-slider');
    var snapshots = replayData.snapshots;

    $('#amount').text(tick);

    mapManager.resetMap();

    var snapshot = snapshots[tick];

    mapManager.drawHeatmap(tick, snapshots);

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

    if (mapManager.hoverHero) {
      mapManager.handleHoverOn($map.getLayer(mapManager.hoverHero));
    }

    statsManager.updateTeamScores('#radiant', snapshot.teamStats[0]);
    statsManager.updateTeamScores('#dire', snapshot.teamStats[1]);
    $('#radiant-presence').text(snapshot.presenceData.percentages[0]+"%");
    $('#dire-presence').text(snapshot.presenceData.percentages[1]+"%");

    mapManager.drawPresenceMap(snapshot);
    $map.drawLayers();

    $timeSlider.find('.label').text(getTime(tick));
  };

  var rangeSlide = function(event, ui) {
    var $timeSlider = $('#time-slider');
    var $rangeSlider = $('#time-range-slider');
    var snapshots = replayData.snapshots;

    var tick0 = ui.values[0];
    var tick1 = ui.values[1];

    singleSlide(tick1);
    mapManager.drawHeroPaths(tick0, tick1, snapshots);

    $map.drawLayers();

    $rangeSlider.find('.label.l0').text(getTime(tick0));
    $rangeSlider.find('.label.l1').text(getTime(tick1));

    // Update single slider
    $timeSlider.slider("option", "value", ui.values[1]);
    $timeSlider.find('.label').text(getTime(tick0));
  };

  var setupPlayerData = function (data) {
    var inflater = new pako.Inflate();
    inflater.push(data, true);
    var dataCharArr = inflater.result;
    var dataStr = charArr2Str(dataCharArr);
    replayData = JSON.parse(dataStr);

    // LOADING UPDATE
    $('#match-data').removeClass('fa-cog fa-spin').addClass('fa-check');

    // Main setup code
    var snapshots = replayData.snapshots;

    statsManager.runTime = snapshots[snapshots.length - 1].time - snapshots[0].time;
    endTime = Math.ceil(statsManager.runTime / 60);

    var $presence = $('#presence');
    var presenceImg = $presence.find('img');
    presenceImg.prop('src', $presence.getCanvasImage());
    $map.drawImage({
      layer: true,
      name: 'presence',
      groups: ['overlay'],
      source: presenceImg[0],
      x: 0, y: 0,
      scale: 1,
      fromCenter: false
    });

    var $heatmap = $('#heatmap');
    var heatmapImg = $heatmap.find('img');

    heatmapImg.prop('src', $presence.getCanvasImage());
    $map.drawImage({
      layer: true,
      name: 'heatmap',
      groups: ['overlay'],
      source: heatmapImg[0],
      x:0, y:0,
      scale: 1,
      fromCenter: false
    });

    $map.drawRect({
      layer: true,
      fillStyle: 'rgba(0, 0, 0, 0)',
      name: 'deselect',
      x: 0, y:0,
      width: 420, height: 420,
      fromCenter: false,
      click: function() {
        if (mapManager.selectedHero) {
          var old = $map.getLayer(mapManager.selectedHero);
          if (old.data.alive) {
            old.fillStyle = old.data.color;
          } else {
            var team = old.name[0] === 'r' ? 'radiant' : 'dire';
            var layerName = (old.name.endsWith('-dead')) ? old.name : old.name + '-dead';

            $map.setLayer(layerName, {
              source: '/static/img/icons/' + team + '_death.png'
            });
          }
          mapManager.selectedHero = '';
          mapManager.resetPlayerInfoPanel();
        }
      }
    });

    buildingManager.setupBuildings(replayData.towerDeaths);
    roshanManager.setupRoshanEvents(replayData.roshEvents);
    wardManager.setupWards(replayData.wardEvents);
    mapManager.setupSmokeEvents(replayData.smokeUses);
    runeManager.setupRunes();
    mapManager.setupLayers(replayData.playerHeroes);
    $map.drawLayers();

    statsManager.setMaxStats(snapshots[snapshots.length-1].teamStats);

    var $timeSlider = $('#time-slider');
    var $rangeSlider = $('#time-range-slider');
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 1,
      slide: function(event, ui) {
        singleSlide(ui.value);
      }
    });

    // Time slider hover
    $timeSlider.hover(sliderHover.hoverOn, sliderHover.hoverOff);
    $timeSlider.mousemove(sliderHover.mouseMove);

    $('#overlay-dropdown').selectmenu({
      width: '100%',
      change: function(event, ui) {
        var selection = event.target.selectedIndex;

        showHeatmap(false);
        showPresence(false);
        showPaths(false);

        mapManager.resetMap();

        if (selection === 1) { // Presence
          showPresence(true);
        } else if (selection === 2) { // Paths
          showPaths(true);
        } else if (selection === 3) { // Heatmap
          showHeatmap(true);
        }

        $map.drawLayers();
      }
    });
    $rangeSlider.slider({
      range: true,
      values: [0, 250],
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 1,
      slide: rangeSlide
    });

    // Range slider hover
    $rangeSlider.hover(sliderHover.hoverOn, sliderHover.hoverOff);
    $rangeSlider.mousemove(sliderHover.mouseMove);

    $('#amount').text($timeSlider.slider('value'));

    var firstTime = replayData.snapshots[0].time - replayData.startTime;
    $('#start-time').text('-'+(''+ -firstTime).toHHMMSS());
    var lastTime = replayData.snapshots[replayData.snapshots.length - 1].time - replayData.startTime;
    $('#end-time').text((''+lastTime).toHHMMSS());

    // LOADING UPDATE
    $('#generate-map').removeClass('fa-cog fa-spin').addClass('fa-check');
    smallGraphs($);
  };

  String.prototype.toHHMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);
    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    if (hours == "00") {
      return minutes + ':' + seconds;
    }
    return hours + ':' + minutes + ':' + seconds;
  };

  var loadPlayerData = function() {
    var req = new XMLHttpRequest();
    req.open("GET", "/static/data.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function(event) {
      var bytes = new Uint8Array(req.response);
      setupPlayerData(bytes);
      setupLabel();
    };
    req.send();
  };

  var showPaths = function(show) {
    var $timeSlider = $('#time-slider');
    var $rangeSlider = $('#time-range-slider');

    var value = $timeSlider.slider("option", "value");

    if (show) {
      $rangeSlider.slider("option", "values", [value, value + 250]);

      $rangeSlider.find('.label.l0').text(getTime(value));
      $rangeSlider.find('.label.l1').text(getTime(value+250));

      $timeSlider.hide();
      $rangeSlider.show();

      mapManager.drawHeroPaths(value, value + 250, replayData.snapshots);
    } else {
      $map.setLayer('heatmap', {visible: false});
      $timeSlider.show();
      $rangeSlider.hide();

      $map.removeLayerGroup('radiant-lines');
      $map.removeLayerGroup('dire-lines');
      singleSlide(value);
    }
  };

  var showPresence = function(show) {
    mapManager.showPresence = show;
    $map.setLayer('presence', {visible: show});

    var value = $('#time-slider').slider("option", "value");
    singleSlide(value);
  };

  var showHeatmap = function(show) {
    mapManager.showHeatmap = show;
    $map.setLayer('heatmap', {visible: show});

    var value = $('#time-slider').slider("option", "value");
    singleSlide(value);
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
      $map.drawLayers();
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
      $map.drawLayers();
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
      $map.drawLayers();
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

    $('#dire-path-box').prev().click(function() {
      mapManager.toggleDireLines();
      $map.drawLayers();
    });

    $('#radiant-path-box').prev().click(function() {
      mapManager.toggleRadiantLines();
      $map.drawLayers();
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
      $map.drawLayers();
    });

    $('#smokes-box').prev().click(function() {
      var time = +$('#amount').text();
      mapManager.toggleSmokes();

      var snapshot = replayData.snapshots[time];
      mapManager.updateSmokes(replayData.smokeUses, snapshot.time);
      $map.drawLayers();
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
      $map.drawLayers();
    });
  };

  var setupLabel = function() {
    var time = getTime(0);
    $('#time-slider').find('.ui-slider-handle').html('<span class="label">' + time + '</span>');
    $('#time').append('<span id="hover-label" class="label">' + time + '</span>');
    $('#hover-label').hide();
    $('#time-range-slider').find('.ui-slider-handle').each(function(i) {
      $(this).html('<span class="label l' + i +'">' + time + '</span>');
    });
  };

  $(document).ready(function() {
    setupCheckboxes();
    loadPlayerData();
  });

})(jQuery);

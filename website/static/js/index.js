(function ($) {
  'use strict';

  var replayData = undefined;

  var getHeroName = function(dt_name) {
    for (var i=0; i<heroNameMap.length; i++) {
      if (heroNameMap[i].dt_name === dt_name) {
        return heroNameMap[i].localized_name;
      }
    }
  };

  var mapManager = {
    $map: $('#dota-map'),
    width: $('#dota-map').width(),
    scalef: $('#dota-map').width() / 127,
    layers: ['rad-1', 'rad-2', 'rad-3', 'rad-4', 'rad-5',
             'dir-1', 'dir-2', 'dir-3', 'dir-4', 'dir-5'],
    wards: {},

    getX: function(data_x) {
      return (data_x - 64) * this.scalef;
    },

    getY: function(data_y) {
      return this.width - ((data_y - 64) * this.scalef);
    },

    handleHoverOn: function(layer) {
      $('#character-name').text(layer.data.heroName).removeClass('hidden-text');
    },

    handleHoverOff: function(layer) {
      $('#character-name').addClass('hidden-text');
    },

    setupLayers: function(playerHeroes) {
      // Draw them like this because we want them in order in the layer list
      for(var i=0; i<10; i++) {
        var col = '';
        if (i < 5) {
          this.drawMapCircle(0, 0, '#097FE6', 'radiant', this.layers[i]);
          col = '#097FE6';
        } else {
          this.drawMapRect(0, 0, '#E65609', 'dire', this.layers[i]);
          col = '#E65609';
        }

        this.$map.setLayer(i, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff,
          data: {
            color: col,
            heroName: getHeroName(playerHeroes[i].replace('C', 'DT_')),
            items: []
          }
        })
      }

      var courierPath = '/static/img/courier.png';
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'rad-courier');
      this.drawMapIcon(0, 0, 0.6, courierPath, 'courier', 'dir-courier');
    },

    updateHeroLayers: function(heroData) {
      for (var i=0; i<10; i++) {
        var layer = this.layers[i];
        var layerData = this.$map.getLayer(layer).data;
        var hero = heroData[i];

        layerData.items = heroData.items;

        this.$map.setLayer(layer, {
          x: this.getX(hero.x),
          y: this.getY(hero.y),
          data: layerData
        });

        if (hero.alive) {
          this.$map.setLayer(layer, {
            fillStyle: layerData.color,
            strokeStyle: '#000'
          }).moveLayer(layer, this.$map.getLayers().length);
        } else {
          this.$map.setLayer(layer, {
            fillStyle: 'rgba(255, 0, 0, 0.4)',
            strokeStyle: 'rgba(0, 0, 0, 0.4)'
          }).moveLayer(layer, this.wards.length + 1);
        }
      }
    },

    updateCouriers: function(courierData) {
      var radData = courierData[0];
      var dirData = courierData[1];

      if (radData) {
        this.$map.setLayer('rad-courier', {
          x: this.getX(radData.x),
          y: this.getY(radData.y)
        });
      }

      if (dirData) {
        this.$map.setLayer('dir-courier', {
          x: this.getX(dirData.x),
          y: this.getY(dirData.y)
        });
      }
    },

    setupWards: function(wardEvents, firstTickTime) {
      for (var i=0; i<wardEvents.length; i++) {
        var event = wardEvents[i];
        var handle = 'w' + event.entityHandle;

        if (!event.died) {
          this.wards[handle] = {
            start: Math.round((event.time - firstTickTime) * 2) + 1,
            sentry: event.isSentry
          };

          this.addWard(event.x, event.y, 'radiant', handle);
          this.$map.setLayer(handle, {visible: false}).moveLayer(handle, 0);
        } else {
          this.wards[handle].end = Math.round((event.time - firstTickTime) * 2) + 1;
        }
      }
    },

    updateWards: function(time) {
      var map = this.$map;
      $.each(this.wards, function(handle, ward) {
        if ((ward.start < time) && (time < ward.end)) {
          map.setLayer(handle, {visible: true});
        } else {
          map.setLayer(handle, {visible: false});
        }
      });
    },

    addWard: function(x, y, team, handle) {
      var iconPath = '/static/img/icons/' + team[0] + '_ward.png';
      this.drawMapIcon(x, y, 0.5, iconPath, team + '-wards', handle);
    },

    drawMapCircle: function(x, y, colour, group, name) {
      group = group === undefined ? 'radiant' : group;

      this.$map.drawArc({
        name: name,
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: this.getX(x), y: this.getY(y),
        radius: 8
      });
    },

    drawMapRect: function(x, y, colour, group, name) {
      group = group === undefined ? 'dire' : group;

      this.$map.drawRect({
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

      $('canvas').drawImage({
        layer: true,
        name: name,
        groups: [group],
        source: path,
        x: this.getX(x), y: this.getY(y),
        scale: scale
      });
    },

    resetMap: function() {
      this.$map.clearCanvas();
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

    mapManager.setupLayers(replayData.playerHeroes);
    mapManager.setupWards(replayData.wardEvents, replayData.snapshots[1].time);
    mapManager.$map.drawLayers();

    var $timeSlider = $('#time-slider');
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 1,
      slide: function(event, ui) {
        var updateTeamScores = function(team, stats) {
          var $team = $(team);
          $team.find('#deaths').text(stats.score);
          var $teamStats = $team.find('.team-stats');
          $teamStats.find('.net-worth').text(stats.netWorth);
          $teamStats.find('.total-xp').text(stats.totalXp);
        };

        $('#amount').text(ui.value );

        mapManager.resetMap();

        var snapshot = replayData.snapshots[ui.value];
        var heroData = snapshot.heroData;
        mapManager.updateHeroLayers(heroData);

        var courierData = snapshot.courierData;
        if (courierData.length) {
          mapManager.updateCouriers(courierData);
        }

        mapManager.updateWards(ui.value);

        updateTeamScores('#radiant', snapshot.teamStats[0]);
        updateTeamScores('#dire', snapshot.teamStats[1]);

        mapManager.$map.drawLayers();
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

  $(document).ready(loadPlayerData);

})(jQuery);

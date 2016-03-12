(function ($) {
  'use strict';

  var replayData = undefined;

  var mapManager = {
    $map: $('#dota-map'),
    width: $('#dota-map').width(),
    scalef: $('#dota-map').width() / 127,
    layers: ['rad-1', 'rad-2', 'rad-3', 'rad-4', 'rad-5',
             'dir-1', 'dir-2', 'dir-3', 'dir-4', 'dir-5'],

    getX: function(data_x) {
      return (data_x - 64) * this.scalef;
    },

    getY: function(data_y) {
      return this.width - ((data_y - 64) * this.scalef);
    },

    handleHoverOn: function(layer) {

    },

    handleHoverOff: function(layer) {

    },

    setupLayers: function() {
      // Draw them like this because we want them in order in the layer list
      for(var i=0; i<10; i++) {
        if (i < 5) {
          this.drawMapCircle(0, 0, '#097FE6', 'radiant', this.layers[i]);
        } else {
          this.drawMapRect(0, 0, '#E65609', 'dire', this.layers[i]);
        }
        this.$map.setLayer(i, {
          mouseover: this.handleHoverOn,
          mouseout: this.handleHoverOff
        })
      }

      this.drawMapCircle(0, 0, '#FFF', 'courier', 'rad-courier');
      this.drawMapCircle(0, 0, '#FFF', 'courier', 'dir-courier');
    },

    updateHeroLayers: function(heroData) {
      for (var i=0; i<10; i++) {
        var layer = this.layers[i];
        var hero = heroData[i];

        this.$map.setLayer(layer, {
          x: this.getX(hero.x),
          y: this.getY(hero.y)
        });

        if (hero.alive) {
          var layerColour = this.$map.getLayer(layer).data.color;
          this.$map.setLayer(layer, {
            fillStyle: layerColour,
            strokeStyle: '#000'
          }).moveLayer(layer, 9);
        } else {
          this.$map.setLayer(layer, {
            fillStyle: 'rgba(255, 0, 0, 0.4)',
            strokeStyle: 'rgba(0, 0, 0, 0.4)'
          }).moveLayer(layer, 0);
        }
      }

      this.$map.drawLayers();
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
        radius: 8,
        data: {
          color: colour
        }
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
        width: 14, height:14,
        data: {
          color: colour
        }
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

    mapManager.setupLayers();

    var $timeSlider = $('#time-slider');
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 1,
      slide: function(event, ui) {
        var updateTeamScores = function(snapshot) {
          var $radiant = $('#radiant');
          var $dire = $('#dire');
          var radiantScore = $radiant.find('#deaths').text();
          radiantScore += snapshot.teamStats[0].score;

          var direScore = $radiant.find('#deaths').text();
          direScore += snapshot.teamStats[1].score;

          $radiant.find('#deaths').text(radiantScore);
          $dire.find('#deaths').text(direScore);
        };

        $('#amount').text(ui.value );

        mapManager.resetMap();

        var heroData = replayData.snapshots[ui.value].heroData;
        mapManager.updateHeroLayers(heroData);

        var courierData = replayData.snapshots[ui.value].courierData;
        if (courierData.length) {
          mapManager.updateCouriers(courierData);
        }

        var snapshot = replayData.snapshots[ui.value];
        updateTeamScores(snapshot);
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

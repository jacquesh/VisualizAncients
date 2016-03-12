(function ($) {
  'use strict';

  var replayData = undefined;

  var mapManager = {
    $map: $('#dota-map'),
    width: $('#dota-map').width(),
    scalef: $('#dota-map').width() / 127,

    handleHoverOn: function(layer) {

    },

    handleHoverOff: function(layer) {

    },

    setupLayers: function() {
      // Draw them like this because we want them in order in the layer list
      for(var i=0; i<5; i++) {
        this.drawMapCircle(0, 0, '#097FE6');
      }

      for(var i=0; i<5; i++) {
        this.drawMapRect(0, 0, '#E65609');
      }
    },

    updateLayers: function(heroData) {
      for (var i=0; i<10; i++) {
        var hero = heroData[i];
        var x_pos = hero.alive ? hero.x : 64;
        var y_pos = hero.alive ? hero.y : 64;
        var x = (x_pos - 64) * this.scalef;
        var y = this.width - ((y_pos - 64) * this.scalef);
        this.$map.setLayer(i, {
          x: x,
          y: y
        });
      }

      this.$map.drawLayers();
    },

    drawMapCircle: function(x, y, colour, group) {
      x = (x - 64) * this.scalef;
      y = this.width - ((y - 64) * this.scalef);
      group = group === undefined ? 'radiant' : group;

      this.$map.drawArc({
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: x, y: y,
        radius: 8,
        mouseover: this.handleHoverOn,
        mouseout: this.handleHoverOff
      });
    },

    drawMapRect: function(x, y, colour, group) {
      x = (x - 64) * this.scalef;
      y = this.width - ((y - 64) * this.scalef);
      group = group === undefined ? 'dire' : group;

      this.$map.drawRect({
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        groups: [group],
        fillStyle: colour,
        x: x, y: y,
        width: 14, height:14,
        mouseover: this.handleHoverOn,
        mouseout: this.handleHoverOff
      });
    },

    resetMap: function() {
      this.$map.removeLayerGroup('courier');
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
      step: 10,
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
        mapManager.updateLayers(heroData);

        var courierData = replayData.snapshots[ui.value].courierData;
        for (var j=0; j < courierData.length; j++) {
          var courier = courierData[j];
          if (courier.alive) {
              mapManager.drawMapCircle(courier.x, courier.y, '#FFF', 'courier');
          }
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

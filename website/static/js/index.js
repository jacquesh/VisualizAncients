(function ($) {
  'use strict';

  var replayData = undefined;

  var mapManager = {
    $map: $('#dota-map'),
    width: $('#dota-map').width(),
    scalef: $('#dota-map').width() / 127,

    drawMapCircle: function(x, y, colour) {
      x = (x - 64) * this.scalef;
      y = this.width - ((y - 64) * this.scalef);
      this.$map.drawArc({
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        fillStyle: colour,
        x: x, y: y,
        radius: 8
      });
    },

    drawMapRect: function(x, y, colour) {
      x = (x - 64) * this.scalef;
      y = this.width - ((y - 64) * this.scalef);
      this.$map.drawRect({
        strokeStyle: '#000',
        strokeWidth: 2,
        layer: true,
        fillStyle: colour,
        x: x, y: y,
        width: 14, height:14
      });
    },

    resetMap: function() {
      this.$map.clearCanvas();
      this.$map.removeLayers();
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
        for (var i=0; i < 10; i++) {
          var hero = heroData[i];
          var x_pos = hero.alive ? hero.x : 64;
          var y_pos = hero.alive ? hero.y : 64;

          if (i < 5) {
              mapManager.drawMapCircle(x_pos, y_pos, '#097FE6');
          } else {
              mapManager.drawMapRect(x_pos, y_pos, '#E65609');
          }
        }

        var courierData = replayData.snapshots[ui.value].courierData;
        for (var j=0; j < courierData.length; j++) {
          var courier = courierData[j];
          if (courier.alive) {
              mapManager.drawMapCircle(courier.x, courier.y, '#FFF');
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

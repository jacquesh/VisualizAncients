(function ($) {
  'use strict';

  var replayData = undefined;

  var mapManager = {
    $map: $('#dota-map'),

    drawMapPoint: function(x, y, colour) {
      var width = this.$map.width();
      var scalef = width / 127;
      x = (x - 64) * scalef;
      y = width - ((y - 64) * scalef);
      this.$map.drawArc({
        fillStyle: '#FFF',
        x: x, y: y,
        radius: 8
      }).drawArc({
        fillStyle: colour,
        x: x, y: y,
        radius: 6
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
    var result = outputArr.join("");
    return result;
  }

  var setupPlayerData = function (data) {
    var inflater = new pako.Inflate();
    inflater.push(data, true);
    var dataCharArr = inflater.result;
    var dataStr = charArr2Str(dataCharArr);
    replayData = JSON.parse(dataStr);

    var $timeSlider = $("#time-slider");
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.snapshots.length - 1,
      step: 10,
      slide: function(event, ui) {
        $("#amount").text("Time: " + ui.value );
        mapManager.resetMap();
        var heroData = replayData.snapshots[ui.value].heroData;
        for(var i=0; i<10; i++)
        {
            var hero = heroData[i];
            if(hero.alive)
            {
                mapManager.drawMapPoint(hero.x, hero.y, "#000");
            }
            else
            {
                mapManager.drawMapPoint(64, 64, "#000");
            }
        }

        var courierData = replayData.snapshots[ui.value].courierData;
        for(var i=0; i<courierData.length; i++)
        {
            var courier = courierData[i];
            if(courier.alive)
            {
                mapManager.drawMapPoint(courier.x, courier.y, "#FFF");
            }
        }
      }
    });
    //$timeSlider.slider('option', 'slide').call($timeSlider);
    $("#amount").text("Time: " + $timeSlider.slider("value"));
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
  }

  $(document).ready(loadPlayerData);

})(jQuery);

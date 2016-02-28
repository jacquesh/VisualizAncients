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

  var setupPlayerData = function (data) {
    replayData = JSON.parse(data);

    var $timeSlider = $("#time-slider");
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.length - 1,
      step: 10,
      slide: function(event, ui) {
        $("#amount").text("Time: " + ui.value );
        mapManager.resetMap();
        var heroData = replayData[ui.value].heroData;
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
      }
    });
    //$timeSlider.slider('option', 'slide').call($timeSlider);
    $("#amount").text("Time: " + $timeSlider.slider("value"));
  };

  var loadPlayerData = function() {
    $.get("/static/data_large.json", setupPlayerData);
  }

  $(document).ready(loadPlayerData);

})(jQuery);

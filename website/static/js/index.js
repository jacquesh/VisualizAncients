(function ($) {
  'use strict';

  var playerData = undefined;

  var mapManager = {
    $map: $('#dota-map'),

    drawMapPoint: function(x, y, colour) {
      // * 3 because the map is smaller than canvas
      x = (x - 60) * 3;
      y = 420 - ((y - 50) * 3);
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
    playerData = JSON.parse(data);

    var $timeSlider = $("#time-slider");
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: playerData.length - 1,
      step: 1,
      slide: function(event, ui) {
        $("#amount").text("Time: " + ui.value );
        var points = playerData[ui.value];
        mapManager.resetMap();
        mapManager.drawMapPoint(points.x, points.y, "#000");
      }
    });
    //$timeSlider.slider('option', 'slide').call($timeSlider);
    $("#amount").text("Time: " + $timeSlider.slider("value"));
  };

  var loadPlayerData = function() {
    $.get("static/data.json", setupPlayerData);
  }

  $(document).ready(loadPlayerData);

})(jQuery);

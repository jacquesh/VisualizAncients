(function ($) {
  'use strict';

  var replayData = undefined;

  var mapManager = {
    $map: $('#dota-map'),

    drawMapCircle: function(x, y, colour) {
      var width = this.$map.width();
      var scalef = width / 127;
      x = (x - 64) * scalef;
      y = width - ((y - 64) * scalef);
      this.$map.drawArc({
        fillStyle: '#000',
        x: x, y: y,
        radius: 8
      }).drawArc({
        fillStyle: colour,
        x: x, y: y,
        radius: 6
      });
    },

    drawMapRect: function(x, y, colour) {
      var width = this.$map.width();
      var scalef = width / 127;
      x = (x - 64) * scalef;
      y = width - ((y - 64) * scalef);
      this.$map.drawRect({
        fillStyle: '#000',
        x: x, y: y,
        width: 16, height:16
      }).drawRect({
        fillStyle: colour,
        x: x, y: y,
        width: 12, height:12
      });
    },

    resetMap: function() {
      this.$map.clearCanvas();
    }
  };

  var setupPlayerData = function (data) {
    replayData = data;

    var $timeSlider = $('#time-slider');
    $timeSlider.slider({
      value: 0,
      min: 0,
      max: replayData.length - 1,
      step: 10,
      slide: function(event, ui) {
        $('#amount').text(ui.value );
        mapManager.resetMap();
        var heroData = replayData[ui.value].heroData;
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

        var courierData = replayData[ui.value].courierData;
        for (var j=0; j < courierData.length; j++) {
          var courier = courierData[j];
          if (courier.alive) {
              mapManager.drawMapCircle(courier.x, courier.y, '#FFF');
          }
        }
      }
    });
    //$timeSlider.slider('option', 'slide').call($timeSlider);
    $('#amount').text($timeSlider.slider('value'));
  };

  var loadPlayerData = function() {
    $.getJSON("/static/data_large.json", setupPlayerData);
  };

  $(document).ready(loadPlayerData);

})(jQuery);

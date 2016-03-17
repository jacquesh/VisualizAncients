var aggregateData = undefined;

(function ($) {
  'use strict';

  var $roshanChart = $('#roshanSmallChart');
  var $wardChart = $('#wardSmallChart');
  var $playerKillsChart = $('#playerKillsSmallChart');
  var $graphBar = $('#graph-bar');
  var gHeight = $graphBar.height();
  var gWidth = $graphBar.width();

  var graphSettings = {
    barValueSpacing: 0,
    scaleShowVerticalLines: false,
    barShowStroke: false,
    animation: false,
    showScale: false,
    scaleShowLabels: false,
    scaleShowHorizontalLines: false,
    showTooltips: false
  };

  var time = (function () {
    var temp = [];
    for (var k = 0; k < 61; k++) {
      temp.push("");
    }
    return temp;
  })();

  var charArr2Str = function (charArr) {
    var chunkSize = 0x8000;
    var outputArr = [];
    for (var i = 0; i < charArr.length; i += chunkSize) {
      outputArr.push(String.fromCharCode.apply(null, charArr.subarray(i, i + chunkSize)));
    }
    return outputArr.join('');
  };

  var setupPlayerData = function (data) {
    var inflater = new pako.Inflate();
    inflater.push(data, true);
    var dataCharArr = inflater.result;
    var dataStr = charArr2Str(dataCharArr);
    aggregateData = JSON.parse(dataStr);

    $graphBar.find('canvas').each(function(index) {
      $(this).data('pos', index);
    });

    drawRoshanChart(aggregateData["roshCounts"]);
    drawWardsChart(aggregateData["wardCounts"]);
    drawPlayerKillsChart(aggregateData["deathCounts"]);
  };

  var loadPlayerData = function () {
    var req = new XMLHttpRequest();
    req.open("GET", "/static/aggregate.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function (event) {
      var bytes = new Uint8Array(req.response);
      return setupPlayerData(bytes);
    };
    req.send();
  };

  var drawRoshanChart = function (roshanDeaths) {
    var roshan_ctx = $roshanChart.get(0).getContext("2d");
    roshan_ctx.canvas.width = gWidth;
    roshan_ctx.canvas.height = gHeight;
    var data = {
      labels: time,
      datasets: [
        {
          label: "Roshan Kills",
          fillColor: "FireBrick",
          strokeColor: "rgba(220,220,220,0.8)",
          highlightFill: "rgba(220,220,220,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          data: roshanDeaths
        }]
    };
    var roshanChart = new Chart(roshan_ctx).Bar(data, graphSettings);
  };
  var drawWardsChart = function (wardCount) {
    var ward_ctx = $wardChart.get(0).getContext("2d");
    ward_ctx.canvas.width = gWidth;
    ward_ctx.canvas.height = gHeight;
    var data = {
      labels: time,
      datasets: [
        {
          label: "Wards Placed",
          fillColor: "ForestGreen",
          strokeColor: "rgba(220,220,220,0.8)",
          highlightFill: "rgba(220,220,220,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          data: wardCount
        }]
    };
    var wardChart = new Chart(ward_ctx).Bar(data, graphSettings);
  };
  var drawPlayerKillsChart = function (playerKillCount) {
    var player_kills_ctx = $playerKillsChart.get(0).getContext("2d");
    player_kills_ctx.canvas.width = gWidth;
    player_kills_ctx.canvas.height = gHeight;

    var data = {
      labels: time,
      datasets: [
        {
          label: "Player Deaths",
          fillColor: "DodgerBlue",
          strokeColor: "rgba(220,220,220,0.8)",
          highlightFill: "rgba(220,220,220,0.75)",
          highlightStroke: "rgba(220,220,220,1)",
          data: playerKillCount
        }]
    };
    var player_kills_Chart = new Chart(player_kills_ctx).Bar(data, graphSettings);
  };

  var setVisibleGraph = function(pos) {
    $graphBar.find('canvas').each(function(index) {
      if (index === pos) {
        $(this).addClass('selected').show();
        $('#graph-label').text($(this).data('name'));
      }
    });
  };

  $('#uparrow').click(function () {
    var otherGraphCount = $graphBar.find('canvas').get().length;
    var $selected = $graphBar.find('.selected');
    $selected.removeClass('selected').hide();
    var nextPos = (+$selected.data('pos') + 1) % otherGraphCount;
    setVisibleGraph(nextPos);
  });

  $('#downarrow').click(function () {
    var otherGraphCount = $graphBar.find('canvas').get().length;
    var $selected = $graphBar.find('.selected');
    $selected.removeClass('selected').hide();
    var nextPos = ((+$selected.data('pos') - 1) + 3) % otherGraphCount;
    setVisibleGraph(nextPos);
  });

  $(document).ready(loadPlayerData);
})(jQuery);

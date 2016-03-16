(function ($) {
  'use strict';

  var replayData = undefined;
  var graphSettings = {barValueSpacing: 0};
  var time = (function () {
    var temp = [];
    for (var k = 0; k < 61; k++) {
      temp.push(k);
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
    replayData = JSON.parse(dataStr);

    drawRoshanChart(replayData["roshCounts"]);
    drawWardsChart(replayData["wardCounts"]);
    drawPlayerKillsChart(replayData["deathCounts"]);
  };

  var loadPlayerData = function () {
    var req = new XMLHttpRequest();
    req.open("GET", "../static/aggregate.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function (event) {
      var bytes = new Uint8Array(req.response);
      return setupPlayerData(bytes);
    };
    req.send();
  };

  var drawRoshanChart = function (roshanDeaths) {
    var roshan_ctx = document.getElementById("roshanChart").getContext("2d");
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
    var ward_ctx = document.getElementById("wardChart").getContext("2d");
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
    var player_kills_ctx = document.getElementById("player_kills_Chart").getContext("2d");
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

  $(document).ready(loadPlayerData);
})(jQuery);

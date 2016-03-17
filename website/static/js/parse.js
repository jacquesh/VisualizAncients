var bigGraphs = function ($) {
  'use strict';

  var gWidth = 0;

  var graphSettings = {barValueSpacing: 0};
  var time = (function () {
    var temp = [];
    for (var k = 0; k < endTime; k++) {
      temp.push(k);
    }
    return temp;
  })();

  var setupGraphs = function () {
    gWidth = $('#content-container').width() - 150;
    drawRoshanChart(aggregateData["roshCounts"]);
    drawWardsChart(aggregateData["wardCounts"]);
    drawPlayerKillsChart(aggregateData["deathCounts"]);
  };

  var drawRoshanChart = function (roshanDeaths) {
    var roshan_ctx = $("#roshanChart").get(0).getContext("2d");
    roshan_ctx.canvas.width = gWidth;
    roshan_ctx.canvas.height = 200;
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
    var ward_ctx = $("#wardChart").get(0).getContext("2d");
    ward_ctx.canvas.width = gWidth;
    ward_ctx.canvas.height = 200;
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
    var player_kills_ctx = $("#player_kills_Chart").get(0).getContext("2d");
    player_kills_ctx.canvas.width = gWidth;
    player_kills_ctx.canvas.height = 200;
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

  $(document).ready(setupGraphs);
};

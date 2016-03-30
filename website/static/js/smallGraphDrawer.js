var aggregateData = undefined;

(function ($) {
  'use strict';

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
    var roshan_ctx = document.getElementById("roshanSmallChart").getContext("2d");
    roshan_ctx.canvas.width = 600;
    roshan_ctx.canvas.height = 40;
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
    var ward_ctx = document.getElementById("wardSmallChart").getContext("2d");
    ward_ctx.canvas.width = 800;
    ward_ctx.canvas.height = 40;
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
    var player_kills_ctx = document.getElementById("playerKillsSmallChart").getContext("2d");

    player_kills_ctx.canvas.width = 800;
    player_kills_ctx.canvas.height = 40;
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

  var upcount = 0;
  var downcount = 0;
  $('#uparrow').on("click", function () {
    upcount++;
    var roshan = document.getElementById("roshanSmallChart");
    var ward = document.getElementById("wardSmallChart");
    var player_kills_Chart = document.getElementById("playerKillsSmallChart");
    if ((upcount % 3) == 1) {
      $("#roshanSmallChart").hide();
      $("#playerKillsSmallChart").hide();
      ward.style.display = "block";
      $("#graph-label").text("Wards");
    }
    else if ((upcount % 3) == 2) {
      $("#wardSmallChart").hide();
      $("#roshanKillsSmallChart").hide();
      player_kills_Chart.style.display = "block";
      $("#graph-label").text("Kills");
    }
    else {
      $("#wardSmallChart").hide();
      $("#playerKillsSmallChart").hide();
      roshan.style.display = "block";
      $("#graph-label").text("Roshan");
    }
  });

  $('#downarrow').on("click", function () {
    upcount++;
    var roshan = document.getElementById("roshanSmallChart");
    var ward = document.getElementById("wardSmallChart");
    var player_kills_Chart = document.getElementById("playerKillsSmallChart");
    if ((upcount % 3) == 1) {
      $("#roshanSmallChart").hide();
      $("#wardSmallChart").hide();
      player_kills_Chart.style.display = "block";
      $("#graph-label").text("Kills");
    }
    else if ((upcount % 3) == 2) {
      $("#playerKillsSmallChart").hide();
      $("#roshanKillsSmallChart").hide();
      ward.style.display = "block";
      $("#graph-label").text("Wards");
    }
    else {
      $("#wardSmallChart").hide();
      $("#playerKillsSmallChart").hide();
      roshan.style.display = "block";
      $("#graph-label").text("Roshan");
    }
  });

  $(document).ready(loadPlayerData);
})(jQuery);

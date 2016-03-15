(function ($) {
  'use strict';

  var replayData = undefined;
  var graphSettings = {barValueSpacing: 0,scaleShowLabels: false};
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
    replayData = JSON.parse(dataStr);

    drawRoshanChart(replayData["roshCounts"]);
    drawWardsChart(replayData["wardCounts"]);
    drawPlayerKillsChart(replayData["deathCounts"]);
  };

  var loadPlayerData = function () {
    var req = new XMLHttpRequest();
    req.open("GET", "/static/data.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function (event) {
      var bytes = new Uint8Array(req.response);
      return setupPlayerData(bytes);
    };
    req.send();
  };

  var drawRoshanChart = function (roshanDeaths) {
    var roshan_ctx = document.getElementById("roshanSmallChart").getContext("2d");
    roshan_ctx.canvas.width=850;
    roshan_ctx.canvas.height=60;
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
    ward_ctx.canvas.width=850;
    ward_ctx.canvas.height=60;
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
    player_kills_ctx.canvas.width=850;
    player_kills_ctx.canvas.height=60;
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

		var changeGraphUp = function (){
		var roshan = document.getElementById("roshanSmallChart");
		var ward = document.getElementById("wardSmallChart");
		var player = document.getElementById("playerKillsSmallChart");
		if ((playe.style.display=="none") && (ward.style.display=="none"))
		{
			roshan.style.display="none";
			ward.style.display="block";	
		}
		
	};
  $(document).ready(loadPlayerData);
  $(document).ready(changeGraphUp);
})(jQuery);

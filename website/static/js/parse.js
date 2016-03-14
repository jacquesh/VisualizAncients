(function ($) {
  'use strict';

  var replayData = undefined;
  var graphSettings = {barValueSpacing : 0};
  var charArr2Str = function(charArr) {
    var chunkSize = 0x8000;
    var outputArr = [];
    for(var i=0; i<charArr.length; i+=chunkSize) {
        outputArr.push(String.fromCharCode.apply(null, charArr.subarray(i, i+chunkSize)));
    }
    var result = outputArr.join("");
    return result;
  }
  var replayData = undefined;
  var setupPlayerData = function (data) {
    var inflater = new pako.Inflate();
    inflater.push(data, true);
    var dataCharArr = inflater.result;
    var dataStr = charArr2Str(dataCharArr);
    replayData = JSON.parse(dataStr);
    console.log(replayData);
    drawRoshanChart(replayData["roshCounts"]);
	drawWardsChart(replayData["wardCounts"]);
	drawPlayerKillsChart(replayData["deathCounts"]);
};
  var loadPlayerData = function() {
    var req = new XMLHttpRequest();
    req.open("GET", "/static/aggregate.zjson", true);
    req.responseType = "arraybuffer";
    req.onload = function(event) {
        var bytes = new Uint8Array(req.response);
        var x = setupPlayerData(bytes);
        return x;
    };
    req.send();
   };
 
 var drawRoshanChart = function(replay)
  {
	var time = [];
	for (var k=0; k<61; k++)
	{
		time.push(k);
	}  
	var roshanDeaths = [];
	for (var i =0; i< replay.length; i++)
	{
		var event = replay[i];
		roshanDeaths.push(event);
		
	}
	var roshan_ctx = document.getElementById("roshanChart").getContext("2d");
	var data = {
    labels: time,
    datasets: [
        {
            label: "My First dataset",
            fillColor: "FireBrick",
            strokeColor: "rgba(220,220,220,0.8)",
            highlightFill: "rgba(220,220,220,0.75)",
            highlightStroke: "rgba(220,220,220,1)",
            data: roshanDeaths
        }]};
	var roshanChart = new Chart(roshan_ctx).Bar(data, graphSettings); 
  };	
  var drawWardsChart = function(replay)
  {
	var time = [];
	for (var k=0; k<61; k++)
	{
		time.push(k);
	}    
	var wardCount = [];
	for (var i =0; i< replay.length; i++)
	{
		var event = replay[i];
		wardCount.push(event);
		
	}
	var ward_ctx = document.getElementById("wardChart").getContext("2d");
	var data = {
    labels: time,
    datasets: [
        {
            label: "My First dataset",
            fillColor: "ForestGreen",
            strokeColor: "rgba(220,220,220,0.8)",
            highlightFill: "rgba(220,220,220,0.75)",
            highlightStroke: "rgba(220,220,220,1)",
            data: wardCount
        }]};
	var wardChart = new Chart(ward_ctx).Bar(data, graphSettings);
  };
    var drawPlayerKillsChart = function(replay)
  {
	var time = [];
	for (var k=0; k<61; k++)
	{
		time.push(k);
	}    
	var playerKillCount = [];
	for (var i =0; i< replay.length; i++)
	{
		var event = replay[i];
		playerKillCount.push(event);
		
	}
	var player_kills_ctx = document.getElementById("player_kills_Chart").getContext("2d");
	var data = {
    labels: time,
    datasets: [
        {
            label: "My First dataset",
            fillColor: "DodgerBlue",
            strokeColor: "rgba(220,220,220,0.8)",
            highlightFill: "rgba(220,220,220,0.75)",
            highlightStroke: "rgba(220,220,220,1)",
            data: playerKillCount
        }]};
	var player_kills_Chart = new Chart(player_kills_ctx).Bar(data, graphSettings);
  };		
 
	$(document).ready(loadPlayerData);
})(jQuery);

$(function () {
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="dropdown"]').dropdown();
})

var formatValue = function (value) {
	if (value.layer instanceof Decimal || value.layer > 2) {
		return value.toString();
	}
	if (!(value instanceof Decimal)) {
		var value = new Decimal(value);
	}
	if (value < 10000) {
		if (Number.isInteger(value.mag))
			return (value).toFixed(0);
		else 
			return (value).toFixed(2);
	}
	var mantissa = value.mantissa.toFixed(3);
	var power = value.e;
		
	if (power > 10000) {
        if (value.layer >= 2) {
            return "e" + formatValue(value.log10());
        } else {
            return "e" + formatValue(new Decimal(value.e));
        }
	}
	return mantissa + "e" + power;
}


/* PRESTIGE */

function estimatePointsForLayer(curLayer, targetLayer, target) {
	if (targetLayer < 1) {
		return;
	}
	points[targetLayer] = target;
	var layer = new Decimal(targetLayer-1);
	var pointsNeeded = new Decimal(100).mul(layer.sqr()).mul(target.pow(new Decimal(2).mul(new Decimal(1.25).pow(layer.sqrt()))));
	
	if (curLayer == targetLayer) {
		return pointsNeeded;
	} else {
		return estimatePointsForLayer(curLayer, targetLayer-1, pointsNeeded);
	}
}

var points = [];
function calculate() {
	points = [];
	var currentLayer = Number.parseInt($('#currentLayer').val());
	var targetLayer = Number.parseInt($('#targetLayer').val());
	var targetPoints = new Decimal($('#targetPoints').val());
	if (isNaN(currentLayer)) {
		currentLayer = 1;
	}
	if (currentLayer < targetLayer) {
		document.getElementById('tabcontent').style.display = "block";
		estimatePointsForLayer(currentLayer, targetLayer, targetPoints);
		$('#calculation').html('<b>Calculation</b> <br><ol></ol>');

		var first  = true;
		var i = 0;
		points.forEach((a,b)=>{
			var color = 200*(i)/points.length;
			i++;
			color = Number.parseInt(color.toFixed(0)).toString(16);
			if (color.length == 1) {
				color = '0' + color;
			}
			var colorcode = '#ff' + color + color;
			console.log(i + " of " + points.length + " " + colorcode);
			if (first) {
				first = false;
				var layerstr = "In <span style='font-weight:bold;color:" + colorcode + ";'>Layer " + b + "</span> you need: " + formatValue(a);
			} else {
				var layerstr = "In <span style='font-weight:bold;color:" + colorcode + ";'>Layer " + b + "</span> you'll get: <span>" + formatValue(a) + "</span>";
			}
			var li = $('<li />').html(layerstr).addClass('layer' + b);
			$('#calculation > ol').append(li);
		});
		$('#calculation > ol')[0].lastChild.lastChild.style.fontWeight = 'bold';
	} else {
		document.getElementById('tabcontent').style.display = "none";
	}
};


/* ASCENSION */

function getAvailableAscensionPoints(){
    var availableAscensionPoints = [];
    if(typeof(game.highestAscensionLevel) == 'undefined') return availableAscensionPoints;
    if(game.highestAscensionLevel.log10().cmp(10) < 0 || game.highestAscensionLevel.log10().log10() < 1){
        var percentageToNextAscension = new Decimal(0);
    } else {
        // points = (log(log(HL)) * (PL-10) / 100)^1.45 * 100
        var prestigeLayersUnlocked = (typeof(game.prestige) !== 'undefined' ? game.prestige.length : 1);
        if(typeof(availablePrestigePoints) !== 'undefined' && availablePrestigePoints.length > prestigeLayersUnlocked)
            prestigeLayersUnlocked = availablePrestigePoints.length;
        var percentageToNextAscension = game.highestAscensionLevel.log10().log10().times(prestigeLayersUnlocked > 10 ? prestigeLayersUnlocked-10 : 0).dividedBy(100).pow(1.45).times(100).floor();
    }
    ascensionPointsFromCurrentLayer = new Decimal(0);
	// pcl = unspent+stats^2.2
    if(typeof(game.ascension) !== 'undefined' && typeof(game.ascension[0]) !== 'undefined') {
        if(game.ascension[0][0].cmp(0) > 0)
            ascensionPointsFromCurrentLayer = ascensionPointsFromCurrentLayer.plus(game.ascension[0][0]);
        for(let i2 = 1; i2 <= 1; i2++){
            if(game.ascension[0][i2].cmp(1) > 0){
                ascensionPointsFromCurrentLayer = ascensionPointsFromCurrentLayer.plus(getAscensionPointsFromStatUpgrades(game.ascension[0][i2]));
            }
        }
    }
    if(percentageToNextAscension.cmp(100) > 0){
		// points = (points / 100 * (pcl+1)^0.125)^0.8 * 100
        percentageToNextAscension = percentageToNextAscension.dividedBy(100).times(ascensionPointsFromCurrentLayer.plus(1).sqrt().sqrt().sqrt()).pow(0.8).times(100).floor();
        if(percentageToNextAscension.cmp(10000) > 0)
            percentageToNextAscension = percentageToNextAscension.minus(10000).times(new Decimal(0.9).pow(percentageToNextAscension.log10().minus(4))).plus(10000).floor();
    }
    availableAscensionPoints[0] = percentageToNextAscension.dividedBy(100).floor();
    var nextAscensionAmount = percentageToNextAscension.dividedBy(100).plus(1).floor();
    var nextAscensionLayer = 1;
    percentageToNextAscension = modulo(percentageToNextAscension, 100);
    for(let i = 1; i < Number.MAX_SAFE_INTEGER; i++){
        if(typeof(game.ascension) == 'undefined' || typeof(game.ascension[i - 1]) == 'undefined') break;
        ascensionPointsFromPreviousLayer = availableAscensionPoints[i - 1];
        ascensionPointsFromPreviousLayer = ascensionPointsFromPreviousLayer.plus(game.ascension[i - 1][0]);
        if(game.ascension[i - 1][1].cmp(1) > 0){
            ascensionPointsFromPreviousLayer = ascensionPointsFromPreviousLayer.plus(getAscensionPointsFromStatUpgrades(game.ascension[i - 1][1]));
        }
        ascensionPointsFromCurrentLayer = new Decimal(0);
        if(typeof(game.ascension) !== 'undefined' && typeof(game.ascension[i]) !== 'undefined') {
            if(game.ascension[i][0].cmp(0) > 0)
                ascensionPointsFromCurrentLayer = ascensionPointsFromCurrentLayer.plus(game.ascension[i][0]);
            if(game.ascension[i][1].cmp(1) > 0){
                ascensionPointsFromCurrentLayer = ascensionPointsFromCurrentLayer.plus(getAscensionPointsFromStatUpgrades(game.ascension[i][1]));
            }
        }

        let innerPercentageToNextAscension = ascensionPointsFromPreviousLayer.dividedBy(new Decimal(i).pow(2)).floor();
        if(innerPercentageToNextAscension.cmp(100) >= 1) {
            innerPercentageToNextAscension = innerPercentageToNextAscension.dividedBy(100).times(ascensionPointsFromCurrentLayer.plus(1).sqrt().sqrt().sqrt()).pow(new Decimal(0.8).pow(new Decimal(i).sqrt())).times(100).floor();
            if(innerPercentageToNextAscension.cmp(10000) > 1)
                innerPercentageToNextAscension = innerPercentageToNextAscension.minus(10000).times(new Decimal(0.9).pow(innerPercentageToNextAscension.log10().minus(4))).plus(10000).floor();
            if(innerPercentageToNextAscension.dividedBy(100).cmp(ascensionPointsFromCurrentLayer) > 0)
                innerPercentageToNextAscension = innerPercentageToNextAscension.dividedBy(100).minus(ascensionPointsFromCurrentLayer).dividedBy(innerPercentageToNextAscension.dividedBy(100).minus(ascensionPointsFromCurrentLayer).sqrt()).plus(ascensionPointsFromCurrentLayer).times(100).floor();
        }
        if(innerPercentageToNextAscension.cmp(50) >= 0){
            percentageToNextAscension = modulo(innerPercentageToNextAscension, 100);
            nextAscensionAmount = innerPercentageToNextAscension.dividedBy(100).plus(1).floor();
            nextAscensionLayer = i+1;
        }
        availableAscensionPointsForLayer = innerPercentageToNextAscension.dividedBy(100).floor();
        if(availableAscensionPointsForLayer > 0 || typeof(game.ascension[i]) !== 'undefined')
        availableAscensionPoints[i] = availableAscensionPointsForLayer;
        else
            break;
    }
    if(percentageToNextAscension.cmp(20) >= 0 || nextAscensionAmount.cmp(1) >= 1)
        document.getElementById("next-ascension-percentage-text").innerHTML = " - Progress to Ascension" + (nextAscensionLayer > 1 ? " layer " + nextAscensionLayer : "") + (nextAscensionAmount.cmp(1) >= 1 ? " point " + renderNumber(nextAscensionAmount) : "") + ": " + renderNumber(percentageToNextAscension) + "%";
    else
        document.getElementById("next-ascension-percentage-text").innerHTML = "";
    return availableAscensionPoints;
}

function estimateAscPoints(curPoints) {
	for (let i=1; i<11; i++) {
		var ascPointsTarget = new Decimal(i);
		var ascPoints = new Decimal(0);
		
		var layer = new Decimal(17);
		var level = new Decimal('e1e9');
		while (ascPoints.lt(ascPointsTarget) && level.lt(new Decimal('e1e40'))) {
			level = level.pow(1.5);
			//console.log('level: ' + formatValue(level));
			if (new Decimal('e1e9').pow(new Decimal(5.8).pow(layer.minus(16))).lte(level)) {
				layer = layer.add(1);
				//console.log('layer: ' + layer.toNumber());
			}
			var ascPointsPercentage = level.log10().log10().times(layer.minus(10)).dividedBy(100).pow(1.45).times(100).floor();
			//console.log('precentage: ' + formatValue(ascPointsPercentage));
			if (ascPointsPercentage.gte(100)) {
				ascPointsPercentage = ascPointsPercentage.dividedBy(100).times(curPoints.plus(1).sqrt().sqrt().sqrt()).pow(0.8).times(100).floor();
				//console.log('precentage: ' + formatValue(ascPointsPercentage));
				if(ascPointsPercentage.cmp(10000) > 0) {
					ascPointsPercentage = ascPointsPercentage.minus(10000).times(new Decimal(0.9).pow(ascPoints.log10().minus(4))).plus(10000).floor();
					//console.log('precentage: ' + formatValue(ascPointsPercentage));
				}
			}
			ascPoints = ascPointsPercentage.div(100).floor();
			//console.log('points: ' + formatValue(ascPoints));
		}
		ascText[i] = '<b>' + i + '</b>' + ' Ascension points at layer <b>' + (layer.toNumber()) + '</b>, highest level <b>' + formatValue(level) + '</b>';
	}
}

var ascText = [];
function calculateAscension() {
	ascText = [];
	var currentLayer = Number.parseInt($('#currentAscLayer').val());
	var currentPoints = new Decimal($('#currentAscPoints').val());
	var currentExpUpgrades = new Decimal($('#currentAscExpUpgrades').val());
	var targetLayer = Number.parseInt($('#targetAscLayer').val());
	//var targetPoints = new Decimal($('#targetAscPoints').val());
	var currentLayerPoints = currentPoints;
	if (currentExpUpgrades.gt(0)) {
		currentLayerPoints = currentLayerPoints.plus(currentExpUpgrades.pow(2.2).floor());
	}
	
	if (isNaN(currentLayer)) {
		currentLayer = 1;
	}
	if (currentLayer <= targetLayer) {
		document.getElementById('tabcontent').style.display = "block";
		estimateAscPoints(currentLayerPoints);
		$('#calculation').html('<b>Calculation</b> <br><ol></ol>');

		var first  = true;
		var i = 0;
		ascText.forEach((a,b)=>{
			var color = 200*(i)/ascText.length;
			i++;
			color = Number.parseInt(color.toFixed(0)).toString(16);
			if (color.length == 1) {
				color = '0' + color;
			}
			var colorcode = '#ff' + color + color;
			//console.log(i + " of " + ascText.length + " " + colorcode);
			var li = $('<li />').html(a).addClass('point-' + b);
			$('#calculation > ol').append(li);
		});
		//$('#calculation > ol')[0].lastChild.lastChild.style.fontWeight = 'bold';
	} else {
		document.getElementById('tabcontent').style.display = "none";
	}
};

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}


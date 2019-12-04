$(function () {
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="dropdown"]').dropdown();
})

function getUrlParam(param) {
    var params = {};
    var search = decodeURIComponent(window.location.href.slice(window.location.href.indexOf('?') + 1));
    var definitions = search.split('&');

    definitions.forEach(function(val, key) {
        var parts = val.split('=',2);
        params[parts[0]] = parts[1];
    } );

    return (param && param in params) ? params[param] : null;
}

function upgInc(upgradeId) {
	var upgrade = $('#' + upgradeId)[0];
	var upgradeValue = Number.parseInt(upgrade.value) + 1;
	if (upgradeId == 'tal') {
		upgradeValue = Math.min(2, upgradeValue);
	}
	upgrade.value = upgradeValue;
}

function upgDec(upgradeId) {
	var upgrade = $('#' + upgradeId)[0];
	var upgradeValue = Number.parseInt(upgrade.value) - 1;
	upgradeValue = Math.max(0, upgradeValue);
	if (upgradeId == 'tal') {
		upgradeValue = Math.max(1, upgradeValue);
	}
	upgrade.value = upgradeValue;
}

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

// RPPR - number of "Reduce prestige points requirements" ascension upgrades
// RPDR - number of "Reduce prestige diminishing return" ascension upgrades
// EL = MAX(1,layer-RPPR)
// LM = 100 * MAX(layer - RPPR, 1)^2
// LP = 0.8^( 0.975^(RPDR * sqrt(EL)) )
// pcl - points needed
// Points = sqrt((pcl / LM)^LP)

// Points = pcl/(EL^2)/100
// if Points > 1:
//   Points = Points^( 0.5*(0.8^(0.975^RPDR))^sqrt(EL) )

// Reverse:
// pcl = LM * Points^(2 * LP^(-sqrt(EL))

function getNextLayerPoints(curLayer, curPoints) {
	var layer = new Decimal(curLayer);
	if ($('#rppr').val() != "0") {
		layer = layer.minus($('#rppr').val());
	}
	var layermult = Decimal.max(new Decimal(1), layer).sqr().mul(new Decimal(100));
	var layerpow = new Decimal(0.8);
	if ($('#rpdr').val() != "0") {
		layerpow = layerpow.pow(new Decimal(0.975).pow($('#rpdr').val()));
	}
	return curPoints.div(layermult).pow(layerpow.pow(layer.sqrt()).div(2));
}

function estimatePointsForLayer(curLayer, targetLayer, target) {
	if (targetLayer < 1) {
		return;
	}
	points[targetLayer] = target;
	var layer = new Decimal(targetLayer-1);
	if ($('#rppr').val() != "0") {
		layer = Decimal.max(new Decimal(1), layer.minus($('#rppr').val()));
	}
	var layermult = layer.sqr().mul(new Decimal(100));
	var layerpow = new Decimal(0.8);
	if ($('#rpdr').val() != "0") {
		layerpow = layerpow.pow(new Decimal(0.975).pow($('#rpdr').val()));
	}
	var pointsNeeded = target.pow(layerpow.pow(layer.sqrt().neg()).mul(new Decimal(2))).mul(layermult);
	
	if (curLayer == targetLayer) {
		return pointsNeeded;
	} else {
		return estimatePointsForLayer(curLayer, targetLayer-1, pointsNeeded);
	}
}

// parse url params for prestige
$(function() {
	var rppr = getUrlParam('rppr');
	if (rppr == null || rppr == 'undefined') {
		rppr = 0;
	}
	$('#rppr').val(rppr);
	var rpdr = getUrlParam('rpdr');
	if (rpdr == null || rpdr == 'undefined') {
		rpdr = 0;
	}
	$('#rpdr').val(rpdr);
	var cl = Number.parseInt(getUrlParam('cl')) || 1;
	var tl = cl;
	$('#currentLayer').val(cl);
	var clp = new Decimal(getUrlParam('clp'));
	if (tl > 0) {
		var tlp = clp;
		while (tlp.gt(1)) {
			clp = getNextLayerPoints(tl, tlp);
			if (clp.gt(1)) {
				tl++;
				tlp = clp;
			} else {
				break;
			}
		}
	}
	if (tl > cl) {
		$('#targetLayer').val(tl);
		$('#targetPoints').val(formatValue(tlp));
		calculate();
	} else {
		$('#targetLayer').val(cl+1);
		$('#targetPoints').val(1);
		calculate();
	}
});

var points = [];
function calculatePrestige() {
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
			//console.log(i + " of " + points.length + " " + colorcode);
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
// iapg - improved ascension points gain
// IAPG = max{1, PL/(15+10*AL)} : repetitive
// points = (log(log(HL)) * (PL-10) * IAPG / 100)^1.8 * 100
// pcl = unspent+stats^2.2
// points = (points / 100 * (pcl+1)^0.2)^0.85 * 100

// Reverse:
// HL = 10^10^((points^(1/0.85) / (pcl+1)^0.2)^(1/1.8) * 100 / (PL-10) / IAPG)

// Level per layer estimation
function getLayerLevel(layer) {
	return Decimal.layeradd(new Decimal(layer).sqr().mul(29/3056).add(new Decimal(layer).mul(50/169)).add(521/500) ,2);
}

function getAL1Points(PL, level, pcl) {
	var ascPoints = level.log10().log10().mul(PL.minus(10).mul(getIAPG(PL))).div(100).pow(1.8).times(100).floor();
	if (ascPoints.cmp(100) > 0){
		ascPoints = ascPoints.dividedBy(100).times(pcl.plus(1).pow(0.2)).pow(0.85).times(100).floor();
		if (ascPoints.cmp(10000) > 0)
			ascPoints = ascPoints.minus(10000).times(new Decimal(0.9).pow(ascPoints.log10().minus(4))).plus(10000).floor();
	}
	return ascPoints.dividedBy(100).floor();
}

function getAL2Points(AL1, pcl) {
	var ascPoints = AL1;
	if (ascPoints.cmp(100) > 0){
		ascPoints = ascPoints.dividedBy(100).times(pcl.plus(1).pow(0.2)).pow(0.85).times(100).floor();
		if(ascPoints.dividedBy(100).cmp(pcl) > 0)
			ascPoints = ascPoints.dividedBy(100).minus(pcl).dividedBy(ascPoints.dividedBy(100).minus(pcl).sqrt()).plus(pcl).times(100).floor();
	}
	return ascPoints.dividedBy(100).floor();
}

function getIAPG(PL) {
	var iapg = new Decimal(1);
	for (let i = 0; i < $('#iapg').val(); i++) {
		iapg = iapg.mul(Decimal.max(1, PL.div(25+10*i)));
	}
	return iapg;
}

function estimateAscPoints(targetLayer, targetPoints) {
	var currentAL1Points = new Decimal($('#currentAL1Points').val());
	var currentAL1StatUpgrades = new Decimal($('#currentAL1StatUpgrades').val());
	if (currentAL1StatUpgrades.gt(0)) {
		currentAL1Points = currentAL1Points.plus(currentAL1StatUpgrades.pow(2.2).floor());
	}
	if (targetLayer == 1) {
		for (let i=1; i<=targetPoints; i++) {
			var ascPointsTarget = new Decimal(i);
			var ascPoints = new Decimal(0);
			
			var layer = new Decimal(19);
			
			while (ascPoints.lt(ascPointsTarget)) {
				layer = layer.add(1);
				var level = getLayerLevel(layer.add(1));
				ascPoints = getAL1Points(layer, level, currentAL1Points);
			}
			
			var ascLevel = ascPointsTarget.pow(1/0.85);
			if (ascPointsTarget.gt(1)) {
				ascLevel = ascLevel.div(currentAL1Points.add(1).pow(0.2)).mul(100).ceil().div(100);
			}
			var ascLayerLevel = Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)).div(getIAPG(layer)), 2);
			
			ascText[i] = '&nbsp'.repeat(2*Math.floor(Math.log10(1e7/(i+1)))) + '<b>' + i 
				+ '</b> AL1 points at layer <b>' + (layer.toNumber()) 
				+ '</b>, highest level <b>' + formatValue(ascLayerLevel.pow(1.01)) + '</b>';
		}
	} else if (targetLayer == 2) {
		var currentAL2Points = new Decimal($('#currentAL2Points').val());
		var currentAL2StatUpgrades = new Decimal($('#currentAL2StatUpgrades').val());
		if (currentAL2StatUpgrades.gt(0)) {
			currentAL2Points = currentAL2Points.plus(currentAL2StatUpgrades.pow(2.2).floor());
		}
		
		var AL1Points = new Decimal(0);
		var AL2Points = new Decimal(0);
		var AL2PointsTarget = new Decimal(targetPoints);
		
		var layer = new Decimal(19);
		while (AL2Points.lt(AL2PointsTarget)) {
			layer = layer.add(1);
			var level = getLayerLevel(layer.add(1));
			var AL1PointsTmp = getAL1Points(layer, level, currentAL1Points);
			var AL2PointsTmp = getAL2Points(AL1PointsTmp.add(currentAL1Points), currentAL2Points);
			
			if (AL1PointsTmp.gt(AL1Points)) {
				AL1Points = AL1PointsTmp;
				
				var ascLevel = AL1Points.pow(1/0.85);
				if (AL1Points.gt(1)) {
					ascLevel = ascLevel.div(currentAL1Points.add(1).pow(0.2)).mul(100).ceil().div(100);
				}
				var ascLayerLevel = Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)).div(getIAPG(layer)), 2);
				
				ascTextVal = '&nbsp'.repeat(AL1Points.gt(1e4)?1:Decimal.floor(Decimal.log10(new Decimal(1e7).div(AL1Points.plus(1)))).mul(2)) + '<b>' + formatValue(AL1Points) 
				+ '</b> AL1 points at layer <b>' + (layer.toNumber()) 
				+ '</b>, highest level <b>' + formatValue(ascLayerLevel.pow(1.01)) + '</b>';
				
				if (AL2PointsTmp.gt(AL2Points)) {
					AL2Points = AL2PointsTmp;
					ascTextVal += '&nbsp'.repeat(4) + '<b>' + formatValue(AL2Points) + '</b> AL2 points';
				}
				ascText.push(ascTextVal);
			}
		}
	}
}

// parse url params for ascension
$(function() {
	$('#currentAL1Points').val(getUrlParam('a1cp') || getUrlParam('acp') || 0);
	$('#currentAL1StatUpgrades').val(getUrlParam('acu') || getUrlParam('a1cu') || 0);
	$('#currentAL2Points').val(getUrlParam('a2cp') || 0);
	$('#currentAL2StatUpgrades').val(getUrlParam('a2cu') || 0);
	if (getUrlParam('acp') != null || getUrlParam('a1cp') != null) {
		openTab({currentTarget:$('#ascensionLayersButton')[0]}, 'Ascension');
		if (getUrlParam('a2cp') != null) {
			$('#tal').val(2);
			drawAL();
		}
		calculateAscension();
	}
});

function drawAL() {
	var AL = Number.parseInt($('#tal').val());
	if (AL == 2) {
		$('#AL2p').show();
		$('#targetAscPointsLabel').text('Target AL2 Ascension Points');
	} else {
		$('#AL2p').hide();
		$('#targetAscPointsLabel').text('Target AL1 Ascension Points');
	}
}

var ascText = [];
function calculateAscension() {
	ascText = [];
	var targetLayer = Number.parseInt($('#tal').val());
	var targetPoints = new Decimal($('#targetAscPoints').val());

	document.getElementById('tabcontent').style.display = "block";
	estimateAscPoints(targetLayer, targetPoints);
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
		var li = $('<li />').html(a).addClass('point-' + b);
		$('#calculation > ol').append(li);
	});

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


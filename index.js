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
	if (upgradeId == 'targetAscensionLayer') {
		upgradeValue = Math.min(2, upgradeValue);
	}
	upgrade.value = upgradeValue;
	return upgradeValue;
}

function upgDec(upgradeId) {
	var upgrade = $('#' + upgradeId)[0];
	var upgradeValue = Number.parseInt(upgrade.value) - 1;
	upgradeValue = Math.max(0, upgradeValue);
	if (upgradeId == 'targetAscensionLayer') {
		upgradeValue = Math.max(1, upgradeValue);
	}
	upgrade.value = upgradeValue;
	return upgradeValue;
}

var formatValue = function (value) {
	if (!(value instanceof Decimal)) {
		var value = new Decimal(value);
	}
	value = value.ceil();
	if (value.lt(1000)) {
		if (Number.isInteger(value.mag))
			return (value).toFixed(0);
		else 
			return (value).toFixed(2);
	}
	var mantissa = value.mantissa.toFixed(3);
	var power = value.e;
		
	if (power > 10000) {
		if (value.layer < 2) {
			return "e" + formatValue(new Decimal(value.e));
		} else {
			return "e" + formatValue(value.log10());
		}
	}
	return mantissa + "e" + power;
}


/* PRESTIGE */

// RPPR - number of "Reduce prestige points requirements" ascension upgrades
// RPDR - number of "Reduce prestige diminishing return" ascension upgrades
// EL = MAX{1,layer-RPPR}
// LM = 100 * EL^2
// ERPDR = RPDR>=8 ? RPDR*2-7 : RPDR
// LP = MIN{0.83, 0.8^( sqrt(EL) * 0.975^(ERPDR) )}/2
// pcl - points needed

// Points = (pcl/LM)^LP

// Reverse:
// pcl = LM * Points^(1/LP)

function getNextLayerPoints(curLayer, curPoints) {
	var layer = new Decimal(curLayer);
	if ($('#rppr').val() != "0") {
		layer = Decimal.max(new Decimal(1), layer.minus($('#rppr').val()));
	}
	var layermult = layer.sqr().mul(new Decimal(100));
	var layerpow = new Decimal(0.8);
	var rpdr = new Decimal($('#rpdr').val());
	if (rpdr.neq(0)) {
		if (rpdr.gte(8)) {
			rpdr = rpdr.mul(2).minus(7);
		}
	}
	layerpow = Decimal.min(new Decimal(0.83), layerpow.pow(new Decimal(0.975).pow(rpdr).mul(layer.sqrt()))).div(2);
	return curPoints.div(layermult).pow(layerpow);
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
	var rpdr = new Decimal($('#rpdr').val());
	if (rpdr.neq(0)) {
		if (rpdr.gte(8)) {
			rpdr = rpdr.mul(2).minus(7);
		}
	}
	layerpow = Decimal.min(new Decimal(0.83), layerpow.pow(new Decimal(0.975).pow(rpdr).mul(layer.sqrt()))).div(2);
	var pointsNeeded = target.pow(layerpow.recip()).mul(layermult);
	
	if (curLayer == targetLayer) {
		return pointsNeeded;
	} else {
		return estimatePointsForLayer(curLayer, targetLayer-1, pointsNeeded);
	}
}

// parse url params for prestige
$(function() {
	$('#rppr').val(getUrlParam('rppr') || 0);
	$('#rpdr').val(getUrlParam('rpdr') || 0);
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
		calculatePrestige();
	} else {
		$('#targetLayer').val(cl+1);
		$('#targetPoints').val(1);
		calculatePrestige();
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
// IAPG - improved ascension points gain
// EIAPG = max{1, PL/(15+10*IAPG)} : repetitive
// points = (log(log(HL)) * (PL-10) * EIAPG / 100)^1.8 * 100
// pcl = unspent+stats^2.2
// points = (points / 100 * (pcl+1)^0.2)^0.85 * 100

// Reverse:
// HL = 10^10^((points^(1/0.85) / (pcl+1)^0.2)^(1/1.8) * 100 / (PL-10) / IAPG)

// Level per layer estimation
function getLayerLevel(layer) {
	return Decimal.layeradd(new Decimal(layer).sqr().mul(1/98).add(new Decimal(layer).mul(11/50)).add(11/4) ,2);
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

function getALPoints(AL, points, pcl) {
	var ascLayer = new Decimal(AL-1);
	var ascPoints = points.div(new Decimal(ascLayer).sqr());
	if (ascPoints.cmp(100) > 0){
		ascPoints = ascPoints.dividedBy(100).times(pcl.plus(1).pow(0.2)).pow(new Decimal(0.85).pow(ascLayer)).times(100).floor();
		if(ascPoints.dividedBy(100).cmp(pcl) > 0)
			ascPoints = ascPoints.dividedBy(100).minus(pcl).dividedBy(ascPoints.dividedBy(100).minus(pcl).sqrt()).plus(pcl).times(100).floor();
	}
	return ascPoints.dividedBy(100).floor();
}

function getAPLevelPart1(points) {
	return points.pow(1.048).mul(0.8).minus(points.pow(0.045).mul(90)).add(112);
}

function getAPLevel(target, layer, pcl) {
	if (target.gt(100)) {
		var ascLevel = getAPLevelPart1(target).pow(1/0.85);
	} else {
		var ascLevel = target.pow(1/0.85);
	}
	if (target.gt(1)) {
		ascLevel = ascLevel.div(pcl.add(1).pow(0.2)).mul(100).ceil().div(100);
	}
	return Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)).div(getIAPG(layer)), 2);
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
			
			var ascLayerLevel = getAPLevel(ascPointsTarget, layer, currentAL1Points);
			
			ascText[i] = [layer, '&nbsp'.repeat(2*Math.floor(Math.log10(1e7/(i+1)))) 
				+ '<b>' + i + '</b>'
				+ ' AL1 points at layer <b>' + (layer.toNumber()) + '</b>'
				+ ', highest level <b>' + formatValue(ascLayerLevel.pow(1.01)) + '</b>'];
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
			var AL2PointsTmp = getALPoints(targetLayer, AL1PointsTmp.add(currentAL1Points), currentAL2Points);
			
			if (AL1PointsTmp.gt(AL1Points)) {
				AL1Points = AL1PointsTmp;
				
				var ascLayerLevel = getAPLevel(AL1Points, layer, currentAL1Points);
				
				ascTextVal = '&nbsp'.repeat(AL1Points.gt(1e4)?1:Decimal.floor(Decimal.log10(new Decimal(1e7).div(AL1Points.plus(1)))).mul(2)) 
					+ '<b>' + formatValue(AL1Points) + '</b>'
					+ ' AL1 points at layer <b>' + (layer.toNumber()) + '</b>'
					+ ', highest level <b>' + formatValue(ascLayerLevel.pow(1.01)) + '</b>';
				
				var al2text = null;
				if (AL2PointsTmp.gt(AL2Points)) {
					AL2Points = AL2PointsTmp;
					al2text = '<b>' + formatValue(AL2Points) + '</b> AL2 points';
				}
				//ascText.push(ascTextVal);
				ascText.push([layer, ascTextVal, al2text]);
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
	var atp = getUrlParam('atp') || 0;
	$('#targetAscPoints').val(getUrlParam('atp') || 0);
	$('#iapg').val(getUrlParam('iapg') || 0);
	if (getUrlParam('acp') != null || getUrlParam('a1cp') != null) {
		openTab({currentTarget:$('#ascensionLayersButton')[0]}, 'Ascension');
		if (getUrlParam('a2cp') != null) {
			$('#targetAscensionLayer').val(2);
			$('#targetAscPoints').val(Number.parseInt(atp) + 5);
			drawAL();
		} else {
			$('#targetAscPoints').val(Number.parseInt(atp) + 20);
		}
		calculateAscension();
	}
});

function drawAL() {
	var AL = Number.parseInt($('#targetAscensionLayer').val());
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
	var targetLayer = Number.parseInt($('#targetAscensionLayer').val());
	var targetPoints = new Decimal($('#targetAscPoints').val());

	document.getElementById('tabcontent').style.display = "block";
	estimateAscPoints(targetLayer, targetPoints);
	$('#calculation').html('<b>Calculation</b> <br><ol></ol>');

	var first  = true;
	var i = 0;
	var al1u = new Decimal($('#currentAL1StatUpgrades').val());
	var al2u = new Decimal($('#currentAL2StatUpgrades').val());
	ascText.forEach((a,b)=>{
		var str = a[1];
		var pl = a[0].sqr();
		var aqv = new Decimal(10).pow(pl);
		str += '&emsp;&emsp; [<b>PL:</b> x10^(' + formatValue(a[0]) + '^2=' + formatValue(pl) + ')]';
		if (al1u.gt(0)) {
			var al1 = al1u.add(1).pow(4);
			str += '&emsp;[<b>L1:</b> ^' + formatValue(al1u.add(1)) + '^4=' + formatValue(al1) + ')]';
			aqv = aqv.pow(al1);
		}
		if (al2u.gt(0)) {
			var al2 = al2u.add(1).pow(6);
			str += '&emsp;[<b>L2:</b> ^' + formatValue(al2u.add(1)) + '^6=' + formatValue(al2) + ')]';
			aqv = aqv.pow(al2);
		}
		str += '&emsp;[<b>AT:</b> ' + formatValue(aqv) + 'x]';
		if (a[2] != null) {
			str += '&emsp;' + a[2];
		}
		var li = $('<li />').html(str).addClass('point-' + b);
		$('#calculation > ol').append(li);
	});

};


/* ASCENSION STATS */
// cost of upgrade = floor{upgrade^2.2} - floor{(upgrade-1)^2.2}
function updateAscInfo(infoId, value) {
	$('#'+infoId).val('^' + (value+1));
	updateAscCosts();
}

function updateAscCosts() {
	var cur = Number.parseInt($('#ascCurStats').val());
	var target = Number.parseInt($('#ascTargetStats').val());
	
	if (cur<target && target > 0) {
		document.getElementById('tabcontent').style.display = "block";
		$('#calculation').html('<b>Calculation</b> <br><ol></ol>');
		var total = new Decimal(0);
		for (let i=cur+1; i <= target; i++) {
			var cost = Decimal.pow(i, 2.2).floor().minus(Decimal.pow(i-1, 2.2).floor());
			total = total.plus(cost);
			cost = '^' + (i+1) + ': ' + formatValue(cost) + 'AP';
			var li = $('<li />').html(cost).addClass('point-' + i);
			$('#calculation > ol').append(li);
		}
		total = 'Total: ' + formatValue(total) + 'AP';
		var li = $('<li />').html(total).addClass('point-' + (target+1));
		$('#calculation > ol').prepend(li);
	} else {
		$('#calculation').html('<b>Calculation</b> <br><ol></ol>');
	}
	
	
}

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


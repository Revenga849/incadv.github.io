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

function checkValue(id) {
	var upgrade = $('#' + id);
	var upgradeValue = new Decimal(upgrade.val());
	/*upgradeValue = upgradeValue.replace(/[^\d\.\,]/g, '');
	var delimiter = Math.min(upgradeValue.indexOf(','), upgradeValue.indexOf('.'));
	if (delimiter > 0)
		upgradeValue = upgradeValue.substr(0, delimiter);*/
	upgrade.val(formatValue(upgradeValue,2));
}

function upgInc(event, upgradeId) {
	var upgrade = $('#' + upgradeId)[0];
	var upgVal = new Decimal(upgrade.value);
	upgVal = upgVal.plus(event.shiftKey?10:1);
	if (upgVal.gt(Number.MAX_VALUE)) {
		var upgradeValue = Number.MAX_VALUE;
	} else {
		var upgradeValue = upgVal.toNumber();
	}
	if (upgradeId == 'targetAscensionLayer') {
		//upgradeValue = Math.min(2, upgradeValue);
		if (upgradeValue > 2) 
			setHighAL();
		else
			setLowAL();
	}
	if (upgradeId == 'ipp' || upgradeId == 'statsIPP') {
		upgradeValue = Math.min(1, upgradeValue);
	}
	upgrade.value = upgradeValue;
	return upgradeValue;
}

function setHighAL() {
	$('#ap-only')[0].checked = true;
	$('#ap-only')[0].disabled = true;
}

function setLowAL() {
	$('#ap-only')[0].checked = false;
	$('#ap-only')[0].disabled = false;
}

function upgDec(event, upgradeId) {
	var upgrade = $('#' + upgradeId)[0];
	var upgVal = new Decimal(upgrade.value);
	upgVal = upgVal.minus(event.shiftKey?10:1);
	if (upgVal.gt(Number.MAX_VALUE)) {
		var upgradeValue = Number.MAX_VALUE;
	} else {
		var upgradeValue = upgVal.toNumber();
	}
	upgradeValue = Math.max(0, upgradeValue);
	if (upgradeId == 'targetAscensionLayer') {
		upgradeValue = Math.max(1, upgradeValue);
		if (upgradeValue > 2) 
			setHighAL();
		else
			setLowAL();
	}
	if (upgradeId == 'ipp' || upgradeId == 'statsIPP') {
		upgradeValue = Math.max(0, upgradeValue);
	}
	upgrade.value = upgradeValue;
	return upgradeValue;
}

var formatValue = function (value, prec=0) {
	if (!(value instanceof Decimal)) {
		var value = new Decimal(value);
	}
	if (prec==0) value = value.round();
	if (value.lt(1000)) {
		if (Number.isInteger(value.mag))
			return (value).toFixed(0);
		else 
			return (value).toFixed(prec);
	}
	var mantissa = value.mantissa.toFixed(prec);
	var power = value.e;
		
	if (power > 10000) {
		if (value.layer < 2) {
			return "e" + formatValue(new Decimal(value.e), prec);
		} else {
			return "e" + formatValue(value.log10(), prec);
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
				var layerstr = "In <span style='font-weight:bold;color:" + colorcode + ";'>Layer " + b + "</span> you need: " + formatValue(a,2);
			} else {
				var layerstr = "In <span style='font-weight:bold;color:" + colorcode + ";'>Layer " + b + "</span> you'll get: <span>" + formatValue(a,2) + "</span>";
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
	return Decimal.layeradd(new Decimal(layer).sqr().mul(1/98).plus(new Decimal(layer).mul(11/50)).plus(11/4) ,2);
}

function getCurrentALPoints(PL, level, pcl) {
	var scarcity = $('#scarcity').val();
	var ascPoints = level.log10().log10().pow(Decimal.pow(1.01, scarcity)).mul(PL.minus(10).mul(getIAPG(PL))).div(100).pow(1.8).times(100).floor();
	if (ascPoints.cmp(100) > 0){
		ascPoints = ascPoints.dividedBy(100).times(pcl.plus(1).pow(0.2)).pow(0.85).times(100).floor();
		if (ascPoints.cmp(10000) > 0)
			ascPoints = ascPoints.times(ascPoints.dividedBy(10000).pow(new Decimal(0.9).log10())).floor();
	}
	return ascPoints.dividedBy(100).floor();
}

function ascensionInverseApprox(AL, target, accumulated) {
	var i = 0;
	// find oom
	var points = new Decimal(100);
	var approx = getALPointsFromCurrent(AL, points, accumulated);
	while (approx.lt(target)) {
		points = points.mul(10);
		approx = getALPointsFromCurrent(AL, points, accumulated);
		i++;
		if (i>10000) break;
	}
	
	// iterative approximation
	step = points;
	for (var i=0; i<3; i++) {
		points = points.minus(step);
		step = step.div(10);
		approx = getALPointsFromCurrent(AL, points, accumulated);
		while (approx.lt(target)) {
			points = points.plus(step);
			approx = getALPointsFromCurrent(AL, points, accumulated);
		}
	}
	
	return points;
}

function getALPointsFromCurrent(AL, points, accumulated) {
	var ascLayer = new Decimal(AL-1);
	var ascPoints = points.div(new Decimal(ascLayer).sqr());
	if (ascPoints.cmp(100) > 0){
		ascPoints = ascPoints.dividedBy(100).times(accumulated.plus(1).pow(0.2)).pow(new Decimal(0.85).pow(ascLayer.sqrt())).times(100).floor();
		if(ascPoints.dividedBy(100).cmp(accumulated) > 0) {
			ascPoints = ascPoints.dividedBy(100);
			if (accumulated.eq(0))
				ascPoints = ascPoints.minus(accumulated).sqrt();
			else 
				ascPoints = ascPoints.div(accumulated).pow(0.25).mul(accumulated).plus(ascPoints.minus(accumulated).sqrt());
			ascPoints = ascPoints.times(100).floor();
		}
	}
	return ascPoints.dividedBy(100).floor();
}

function getALPointsFromTarget(AL, target, accumulated) {
	var eAL = new Decimal(AL).minus(1);
	if (target.eq(1)) {
		return eAL.sqr().mul(100);
	}
	var pcl = accumulated.plus(1);
	var points = new Decimal(target);
	if (target.gt(accumulated)) {
		return ascensionInverseApprox(AL, target, accumulated);
		/*if (accumulated.eq(0)) {
			points = points.sqr();
		} else {
			points = accumulated.sqr().mul(points.div(accumulated).sqrt()).minus(accumulated.mul(points).mul(points.div(accumulated).pow(0.25)).mul(2)).plus(accumulated).plus(points.sqr());
		}*/
	}
	points = points.mul(Decimal.pow(100, Decimal.pow(0.85, eAL.sqrt()))).pow(Decimal.pow(1/0.85, eAL.sqrt())).mul(eAL.sqr()).div(pcl.pow(0.2)).ceil();
	
	return points;
}

function getAPLevelPart1(points) {
	return points.pow(1.048).mul(0.8).minus(points.pow(0.045).mul(90)).plus(112);
}

function getAPLevel(target, layer, pcl) {
	if (target.gt(100)) {
		var ascLevel = getAPLevelPart1(target).pow(1/0.85);
	} else {
		var ascLevel = target.pow(1/0.85);
	}
	if (target.gt(1)) {
		ascLevel = ascLevel.div(pcl.plus(1).pow(0.2)).mul(100).ceil().div(100);
	}
	var scarcity = $('#scarcity').val();
	return Decimal.layeradd(ascLevel.pow(Decimal.pow(1.01, scarcity).recip()).pow(1/1.8).mul(100).div(layer.minus(10)).div(getIAPG(layer)), 2);
}

function getIAPG(PL) {
	var iapg = new Decimal(1);
	for (let i = 0; i < $('#iapg').val(); i++) {
		iapg = iapg.mul(Decimal.max(1, PL.div(25+5*i)));
	}
	return iapg;
}

function estimateAscPoints(targetLayer, targetPoints) {
	var ALCurrentPoints = new Decimal($('#ALCurrentPoints').val());
	var ALCurrentStats = new Decimal($('#ALCurrentStats').val());
	if (ALCurrentStats.gt(0)) {
		ALCurrentPoints = ALCurrentPoints.plus(ALCurrentStats.pow(2.2).floor());
	}
	if (targetLayer == 1) {
		for (let i=1; i<=targetPoints; i++) {
			var ascPointsTarget = new Decimal(i);
			var ascPoints = new Decimal(0);
			
			var layer = new Decimal(19);
			
			while (ascPoints.lt(ascPointsTarget)) {
				layer = layer.plus(1);
				var level = getLayerLevel(layer.plus(1));
				ascPoints = getCurrentALPoints(layer, level, ALCurrentPoints);
			}
			
			var ascLayerLevel = getAPLevel(ascPointsTarget, layer, ALCurrentPoints);
			
			ascText[i] = [layer, '&nbsp'.repeat(2*Math.floor(Math.log10(1e7/(i+1)))) 
				+ '<b>' + i + '</b>'
				+ ' AL1 points at layer <b>' + (layer.toNumber()) + '</b>'
				+ ', highest level <b>' + formatValue(ascLayerLevel.pow(1.01),2) + '</b>'];
		}
	} else {
		var ALTargetPoints = new Decimal($('#ALTargetPoints').val());
		var ALTargetStats = new Decimal($('#ALTargetStats').val());
		if (ALTargetStats.gt(0)) {
			ALTargetPoints = ALTargetPoints.plus(ALTargetStats.pow(2.2).floor());
		}
		
		var CurrentALPoints = new Decimal(0);
		var ALTPoints = new Decimal(0);
		var ALTPointsTarget = new Decimal(targetPoints);
		if ($('#ap-only')[0].checked) {
			var ALTPoints = getALPointsFromTarget(targetLayer, targetPoints, ALTargetPoints);
			//var ALTPoints = ascensionInverseApprox(targetLayer, targetPoints, ALTargetPoints);
			ascTextVal = '&nbsp'.repeat(ALTPoints.gt(1e3)?1:Decimal.floor(Decimal.log10(new Decimal(1e7).div(ALTPoints.plus(1)))).mul(2))
					+ '<b>' + formatValue(ALTPoints,2) + '</b>'
					+ ' AL' + (targetLayer-1) + ' points';
			alttext = 'for <b>' + formatValue(targetPoints,2) + '</b> AL' + targetLayer + ' points';
			ascText.push([null, ascTextVal, alttext]);
		} else {
			var layer = new Decimal(19);
			while (ALTPoints.lt(ALTPointsTarget)) {
				layer = layer.plus(1);
				var level = getLayerLevel(layer.plus(1));
				var CurrentALPointsTmp = getCurrentALPoints(layer, level, ALCurrentPoints);
				var ALTPointsTmp = getALPointsFromCurrent(targetLayer, CurrentALPointsTmp.plus(ALCurrentPoints), ALTargetPoints);
				
				if (CurrentALPointsTmp.gt(CurrentALPoints)) {
					CurrentALPoints = CurrentALPointsTmp;
					
					var ascLayerLevel = getAPLevel(CurrentALPoints, layer, ALCurrentPoints);
					
					ascTextVal = '&nbsp'.repeat(CurrentALPoints.gt(1e3)?1:Decimal.floor(Decimal.log10(new Decimal(1e7).div(CurrentALPoints.plus(1)))).mul(2)) 
						+ '<b>' + formatValue(CurrentALPoints,2) + '</b>'
						+ ' AL1 points at layer <b>' + (layer.toNumber()) + '</b>'
						+ ', highest level <b>' + formatValue(ascLayerLevel.pow(1.01),2) + '</b>';
					
					var alttext = null;
					if (ALTPointsTmp.gt(ALTPoints)) {
						ALTPoints = ALTPointsTmp;
						alttext = '<b>' + formatValue(ALTPoints,2) + '</b> AL2 points';
					}
					//ascText.push(ascTextVal);
					ascText.push([layer, ascTextVal, alttext]);
				}
			}
		}
	}
}

// parse url params for ascension
$(function() {
	$('#ALCurrentPoints').val(getUrlParam('a1cp') || getUrlParam('acp') || 0);
	$('#ALCurrentStats').val(getUrlParam('acu') || getUrlParam('a1cu') || 0);
	$('#ALTargetPoints').val(getUrlParam('a2cp') || 0);
	$('#ALTargetStats').val(getUrlParam('a2cu') || 0);
	var atp = getUrlParam('atp') || 0;
	$('#targetAscPoints').val(getUrlParam('atp') || 5);
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
	
	if ($('#ap-only')[0].checked) {
		$('#ALUnlocksContainer').hide();
		$('#ALCurrentContainer').hide();
	} else {
		$('#ALUnlocksContainer').show();
		if (AL <= 2) {
			$('#ALCurrentContainer').show();
		} else {
			$('#ALCurrentContainer').hide();
		}
	}
	if (AL >= 2) {
		$('#ALTargetContainer').show();
		$('#ap-only-container').show();
		$('#targetAscPointsLabel').text('Target AL' + AL + ' Ascension Points');
	} else {
		$('#ALTargetContainer').hide();
		$('#ap-only-container').hide();
		$('#targetAscPointsLabel').text('Target AL' + Math.max(1, (AL-1)) + ' Ascension Points');
	}
	$('#ALCurrentPointsLabel').text('Current AL' + Math.max(1, (AL-1)) + ' unspent points');
	$('#ALCurrentStatsLabel').text('Current AL' + Math.max(1, (AL-1)) + ' stat upgrades');
	$('#ALTargetPointsLabel').text('Current AL' + (AL) + ' unspent points');
	$('#ALTargetStatsLabel').text('Current AL' + (AL) + ' stat upgrades');
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
	var al1u = new Decimal($('#ALCurrentStats').val());
	var al2u = new Decimal($('#ALTargetStats').val());
	ascText.forEach((a,b)=>{
		var str = a[1];
		
		if (a[0] != null) {
			var plp = Decimal.max(($('#ipp').val()==1?a[0].div(18).pow(0.4).mul(2):new Decimal(2)),new Decimal(2));
			var pl = a[0].pow(plp);
			var aqv = new Decimal(10).pow(pl);
			str += '&emsp;&emsp; [<b>PL:</b> x10^(' + formatValue(a[0]) + '^' + formatValue(plp, 2) + '=' + formatValue(pl,2) + ')]';
			if (al1u.gt(0)) {
				var al1 = al1u.plus(1).pow(4);
				str += '&emsp;[<b>L1:</b> ^' + formatValue(al1u.plus(1)) + '^4=' + formatValue(al1,2) + ']';
				aqv = aqv.pow(al1);
			}
			if (al2u.gt(0)) {
				var al2 = al2u.plus(1).pow(6);
				str += '&emsp;[<b>L2:</b> ^' + formatValue(al2u.plus(1)) + '^6=' + formatValue(al2,2) + ']';
				aqv = aqv.pow(al2);
			}
			str += '&emsp;[<b>AT:</b> ' + formatValue(aqv,2) + 'x]';
		}
		if (a[2] != null) {
			str += '&emsp;' + a[2];
		}
		var li = $('<li />').html(str).addClass('point-' + b);
		$('#calculation > ol').append(li);
	});

};


/* ASCENSION STATS */
// cost of upgrade = floor{upgrade^2.2} - floor{(upgrade-1)^2.2}

function calcAscStats(id, pow) {
	var ap = new Decimal($('#' + id).val());
	ap = ap.plus(1);
	$('#' + id + 'Info').val('^' + formatValue(ap) + pow);
	return ap;
}

function calcStatsPL() {
	var pl = new Decimal($('#statsPL').val());
	if ($('#statsIPP').val() > 0 && pl > 17) {
		var pow = pl.div(18).pow(0.4).mul(2);
	} else {
		var pow = 2;
	}
	pl = pl.pow(pow);
	$('#statsPLInfo').val('^' + formatValue(pl));
	return pl;
}

function calcStatsKreds() {
	var kreds = new Decimal($('#statsKreds').val());
	if (kreds.gt(0)) {
		kreds = kreds.plus(1).pow(1.25).round();
	} else {
		kreds = new Decimal(1);
	}
	$('#statsKredsInfo').val('^' + formatValue(kreds));
	return kreds;
}

function perc2color(perc,min,max) {
	var base = max.minus(min);

	if (base.eq(0)) { perc = 100; }
	else {
		perc = perc.minus(min).div(base).mul(100).div(5).floor().mul(5).toNumber(); 
	}
	var r, g, b = 0;
	var percentile = 70;
	var percmul = 255/percentile;
	if (perc < percentile) {
		r = 255;
		g = Math.round(percmul * perc);
	}
	else {
		g = 255;
		r = Math.round(510 - percmul * perc);
	}
	var h = r * 0x10000 + g * 0x100 + b * 0x1;
	return '#' + ('000000' + h.toString(16)).slice(-6);
}

var values;
function updateAscCosts() {
	var curAL1 = Number.parseInt($('#ascAL1Cur').val());
	var curAL2 = Number.parseInt($('#ascAL2Cur').val());
	var curPL = Number.parseInt($('#statsPL').val());
	var statsIPP = Number.parseInt($('#statsIPP').val());
	var statsKreds = Number.parseInt($('#statsKreds').val());
	
	values = [];
	allvalues = [];
	for (let i=1; i<33; i++) {
		values[i] = [];
		var row = [];
		if (i==1) {
			values[i].al1 = 1;
			values[i].cost = new Decimal(0);
		} else if (i==2) {
			values[i].al1 = 2;
			values[i].cost = new Decimal(curAL1>0?0:1);
		} else {
			values[i].al1 = Math.max(curAL1, 2)+i-2;
			var cost = Decimal.pow(values[i].al1-1, 2.2).floor()
				.minus(Decimal.pow(curAL1, 2.2).floor());
			if (cost.lt(0)) 
				cost = new Decimal(0);
			values[i].cost = cost;
		}
		for (let j=1; j<13; j++) {
			row[j] = [];
			if (j==1) {
				row[j].al2 = 1;
				row[j].cost = new Decimal(0);
			} else if (j==2) {
				row[j].al2 = 2;
				row[j].cost = new Decimal(curAL2>0?0:1);
			} else {
				row[j].al2 = Math.max(curAL2, 2)+j-2;
				var cost = Decimal.pow(row[j].al2-1, 2.2).floor()
					.minus(Decimal.pow(curAL2, 2.2).floor());
				if (cost.lt(0)) 
					cost = new Decimal(0);
				row[j].cost = cost;
			}
			var value = 
				 Decimal.pow(values[i].al1, 4)
				.mul(Decimal.pow(row[j].al2, 6))
				.mul(calcStatsPL())
				.mul(calcStatsKreds());
			row[j].value = value;
			allvalues.push(value);
		}
		values[i].row = row;
	}
	var min = allvalues.reduce((a,b)=>a.lt(b)?a:b);
	var max = allvalues.reduce((a,b)=>a.gt(b)?a:b);
	
	$('#calculation').html('<table id="statsTable" style="display: block" class="table table-bordered"/>');
	var table = $('#statsTable');
	
	var header1 = $('<tr style="background-color:#EAF1DD"/>');
	header1.append('<th scope="col" style="background-color:#BFBFBF;"><b><u>LOG10</u></b></th>');
	header1.append('<th scope="col"><b>AL2</b></th>');
	var header2 = $('<tr style="background-color:#B6DDE8"/>');
	header2.append('<th scope="col" style="background-color:#E5E0EC;"><b>AL1</b></th>');
	header2.append('<th scope="col"><b>Costs</b></th>');
	for (let i=1; i<values[1].row.length; i++) {
		header1.append('<th scope="col"><b>^' + values[1].row[i].al2 + '^6</b></th>');
		header2.append('<th scope="col"><b>' + formatValue(values[1].row[i].cost,2) + '</b></th>');
	}
	table.append(header1);
	table.append(header2);
	
	for (let i=1; i<values.length; i++) {
		var row = $('<tr/>');
		row.append('<th scope="row" style="background-color:#E5E0EC;"><b>^' + values[i].al1 + '^4</b></th>');
		row.append('<th scope="row" style="background-color:#B6DDE8;"><b>' + formatValue(values[i].cost,2) + '</b></th>');
		for (let j=1; j<values[i].row.length; j++) {
			var color = perc2color(values[i].row[j].value.log10(), min.log10(), max.log10());
			//console.log(formatValue(values[i].row[j].value,1) + ' ' + percentage + '%');
			row.append('<td style="background-color:' + color + ';">e' + formatValue(values[i].row[j].value, 2) + '</td>');
		}
		table.append(row);
	}
	document.getElementById('tabcontent').style.display = "block";
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


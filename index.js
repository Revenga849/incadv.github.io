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

function rpprInc() {
	var rppr = $('#rppr')[0];
	rppr.value = Number.parseInt(rppr.value) + 1;
}

function rpprDec() {
	var rppr = $('#rppr')[0];
	var rpprValue = Math.max(Number.parseInt(rppr.value)-1,0);
	rppr.value = rpprValue;
	
}

function rpdrInc() {
	var rpdr = $('#rpdr')[0];
	rpdr.value = Number.parseInt(rpdr.value) + 1;
}

function rpdrDec() {
	var rpdr = $('#rpdr')[0];
	var rpdrValue = Math.max(Number.parseInt(rpdr.value)-1,0);
	rpdr.value = rpdrValue;
	
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
// LM = 100 * MAX(layer - RPPR, 1)^2
// LP = 0.8^( 0.975^(RPDR * sqrt(layer - RPPR)) )
// pcl - points needed
// points = sqrt((pcl / LM)^LP)

// Reverse:
// pcl = LM * points^(2 * LP^(-sqrt(layer - RPPR)))

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
		layer = layer.minus($('#rppr').val());
	}
	var layermult = Decimal.max(new Decimal(1), layer).sqr().mul(new Decimal(100));
	var layerpow = new Decimal(0.8);
	if ($('#rpdr').val() != "0") {
		layerpow = layerpow.pow(new Decimal(0.975).pow($('#rpdr').val()));
	}
	//var pointsNeeded = layermult.mul(target.pow(new Decimal(2).mul(layerpow.recip().pow(layer.sqrt()))));
	var pointsNeeded = target.pow(layerpow.pow(layer.sqrt().neg()).mul(new Decimal(2))).mul(layermult);
	
	if (curLayer == targetLayer) {
		return pointsNeeded;
	} else {
		return estimatePointsForLayer(curLayer, targetLayer-1, pointsNeeded);
	}
}

$(function() {
	var rppr = getUrlParam('rppr');
	if (rppr == null || rppr == 'undefined') {
		rppr = 0;
	}
	$('#rppr').val(rppr);
	var rppr = getUrlParam('rppr');
	if (rppr == null || rppr == 'undefined') {
		rppr = 0;
	}
	$('#rppr').val(rppr);
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
// points = (log(log(HL)) * (PL-10) / 100)^1.8 * 100
// pcl = unspent+stats^2.2
// points = (points / 100 * (pcl+1)^0.125)^0.8 * 100

// Reverse:
// HL = points^1.25 / (pcl+1)^0.125

function estimateAscPoints(curPoints) {
	for (let i=1; i<21; i++) {
		var ascPointsTarget = new Decimal(i);
		var ascPoints = new Decimal(0);
		
		var layer = new Decimal(20);
		var level = new Decimal('e2.27e11');
		var ascLevel = ascPointsTarget.pow(1.25);
		if (ascPointsTarget.gt(1)) {
			ascLevel = ascLevel.div(curPoints.add(1).pow(0.125)).mul(100).ceil().div(100);
		}
		var ascLayerLevel = Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)),2);
		while (ascLayerLevel.gte(level)) {
			layer = layer.add(1);
			level = level.pow(6.1);
			ascLayerLevel = Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)),2);
			//console.log(i + ' AP at PL' + layer + ': HL=' + formatValue(ascLayerLevel));
		}
		if (level.pow(0.7).gte(ascLayerLevel) && layer.gt(20)) {
			layer = layer.minus(1);
			ascLayerLevel = Decimal.layeradd(ascLevel.pow(1/1.8).mul(100).div(layer.minus(10)),2);
		}
		ascText[i] = (i<10?'&nbsp;&nbsp;':'') + '<b>' + i + '</b>' + ' Ascension points at layer <b>' + (layer.toNumber()) + '</b>, highest level <b>' + formatValue(ascLayerLevel.pow(1.01)) + '</b>';
	}
}

$(function() {
	$('#currentAscPoints').val(getUrlParam('acp') || 0);
	$('#currentAscExpUpgrades').val(getUrlParam('acu') || 0);
	if (getUrlParam('acp') != null) {
		openTab({currentTarget:$('#ascensionLayersButton')[0]}, 'Ascension');
		calculateAscension();
	}
});

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
			var li = $('<li />').html(a).addClass('point-' + b);
			$('#calculation > ol').append(li);
		});
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


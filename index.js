$(function () {
  $('[data-toggle="popover"]').popover();
  $('[data-toggle="dropdown"]').dropdown();
})

var formatValue = function (value) {
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

/*
Assume p = current points in layer k
y = sqrt((x/(k^2)/100)^(0.8^sqrt(k)))
resulting y = points you get in layer k+1

Reverse:
points needed to unlock layer (k+1) = 100*k^2*x^(2*1.25^sqrt(k))
where x = points you want at layer (k+1)
*/

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
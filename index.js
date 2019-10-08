var formatValue = function (value) {
	if (!(value instanceof Decimal)) {
		var value = new Decimal(value);
	}
	if (value < 1000) {
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

function getNextLayerPoints(currentPoints, layer) {
	prestigePointsFromCurrentLayer = new Decimal(0);
	var prestigePointsFromPreviousLayer = new Decimal(currentPoints);
	let layerPoints = prestigePointsFromPreviousLayer.dividedBy(new Decimal(layer).pow(2)).floor();
	if (layerPoints.cmp(100) >=  1) {
		layerPoints = layerPoints.dividedBy(100).times(prestigePointsFromCurrentLayer.plus(1).sqrt().sqrt().sqrt()).pow(new Decimal(0.8).pow(new Decimal(layer).sqrt())).times(100).floor();
		if (layerPoints.cmp(10000) >  1) layerPoints = layerPoints.minus(10000).times(new Decimal(0.9).pow(layerPoints['log10']().minus(4))).plus(10000).floor();
		if (layerPoints.dividedBy(100).cmp(prestigePointsFromCurrentLayer) >  0) layerPoints = layerPoints.dividedBy(100).minus(prestigePointsFromCurrentLayer).dividedBy(layerPoints.dividedBy(100).minus(prestigePointsFromCurrentLayer).sqrt()).plus(prestigePointsFromCurrentLayer).times(100).floor();
	}

	return layerPoints.dividedBy(100).floor();
}

function estimatePointsForLayer(curLayer, targetLayer, target, precision) {
	var point = new Decimal(0);
	var targetPoints = new Decimal(target);
    if (curLayer == targetLayer) {
        return targetPoints;
    }
	var prestigePoints = new Decimal(0);
	var e = new Decimal(10);
	var exp = targetPoints.cmp('1e1000') > 0;
	
	while (prestigePoints.cmp(targetPoints) < 0) {
		if (exp) {
			e = e.pow(1.1);
		} else {
			e = e.mul(10);
		}
		prestigePoints = getNextLayerPoints(e, targetLayer);
	}

	var prec = 0;
	var mult = new Decimal(1);
	while (prec < precision) {
		mult = mult.minus(new Decimal(1).divideBy(Decimal.pow(10, prec)));
		prec++;
		prestigePoints = new Decimal(0);
		for (let i=1; i<=10; i++) {
			var newmult = new Decimal(1).divideBy(Decimal.pow(10, prec)).mul(i).plus(mult);
			if (exp) {
				prestigePoints = getNextLayerPoints(e.pow(newmult), targetLayer);
			} else {
				prestigePoints = getNextLayerPoints(e.mul(newmult), targetLayer);
			}
			
			if (prestigePoints.cmp(targetPoints) >= 0) {
				mult = newmult;
				break;
			}
		}
		
	}
	if (exp) {
		point = e.pow(mult);
	} else {
		point = e.mul(mult);
	}
	estimatePointsForLayer(curLayer, targetLayer-1, point, precision);
	points[targetLayer-1] = point;
}

var points = [];

function calculate() {
	points = [];
	var currentLayer = Number.parseInt($('#currentLayer').val());
	var targetLayer = Number.parseInt($('#targetLayer').val());
	var precision = Number.parseInt($('#precision').val());
	var targetPoints = Number.parseInt($('#targetPoints').val());
	if (currentLayer < targetLayer) {
		document.getElementById('tabcontent').style.display = "block";
		estimatePointsForLayer(currentLayer, targetLayer, targetPoints, precision);
		$('#calculation').html('<b>Calculation</b> <br><ol></ol>');
		points.forEach((a,b)=>{
			var layerstr = "Layer " + b + ": " + formatValue(a);
			var li = $('<li />').html(layerstr).addClass('layer' + b);
			$('#calculation > ol').append(li);
		});
	} else {
		document.getElementById('tabcontent').style.display = "none";
	}
};
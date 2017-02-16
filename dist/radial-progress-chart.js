(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RadialProgressChart = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var d3;

// RadialProgressChart object
function RadialProgressChart(query, options) {

  // verify d3 is loaded
  d3 = (typeof window !== 'undefined' && window.d3) ? window.d3 : typeof require !== 'undefined' ? require("d3") : undefined;
  if(!d3) throw new Error('d3 object is missing. D3.js library has to be loaded before.');

  var self = this;
  self.options = RadialProgressChart.normalizeOptions(options);
  console.log(self.options);

  // internal  variables
  var series = self.options.series
    , width = 15 + ((self.options.diameter / 2) + (self.options.stroke.width * self.options.series.length) + (self.options.stroke.gap * self.options.series.length - 1)) * 2
    , height = width
    , dim = "0 0 " + height + " " + width
    , τ = 2 * Math.PI * self.options.scale
    , inner = []
    , outer = [];

  function innerRadius(item) {
    var radius = inner[item.index];
    if (radius) return radius;

    // first ring based on diameter and the rest based on the previous outer radius plus gap
    radius = item.index === 0 ? self.options.diameter / 2 : outer[item.index - 1] + self.options.stroke.gap;
    inner[item.index] = radius;
    return radius;
  }

  function outerRadius(item) {
    var radius = outer[item.index];
    if (radius) return radius;

    // based on the previous inner radius + stroke width
    radius = inner[item.index] + self.options.stroke.width;
    outer[item.index] = radius;
    return radius;
  }

  self.progress = d3.svg.arc()
    .startAngle(self.options.startPoint)
    .endAngle(function (item) {
      return item.percentage / 100 * τ + self.options.startPoint;
    })
    .innerRadius(innerRadius)
    .outerRadius(outerRadius)
    .cornerRadius(function (d) {
      // Workaround for d3 bug https://github.com/mbostock/d3/issues/2249
      // Reduce corner radius when corners are close each other
      var m;
      if (self.options.scale < 1) {
        m = 1;
      } else {
        m = d.percentage >= 99 ? (100 - d.percentage) * 0.1 : 1;
      }
      return (self.options.stroke.width / 2) * m;
    });

  if (self.options.background) {
    var background = d3.svg.arc()
      .startAngle(self.options.startPoint)
      .endAngle(τ + self.options.startPoint)
      .innerRadius(innerRadius)
      .outerRadius(outerRadius);
  } else {
    var background = d3.svg.arc();
  }



  // create svg
  self.svg = d3.select(query).append("svg")
    .attr("preserveAspectRatio","xMinYMin meet")
    .attr("viewBox", dim)
    .append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
/*
  // Remove gradients for Safari/iOS support
  // add gradients defs
  var defs = self.svg.append("svg:defs");
  series.forEach(function (item) {
    if (item.color.linearGradient || item.color.radialGradient) {
      var gradient = RadialProgressChart.Gradient.toSVGElement('gradient' + item.index, item.color);
      defs.node().appendChild(gradient);
    }
  });

  // add shadows defs
  defs = self.svg.append("svg:defs");
  var dropshadowId = "dropshadow-" + Math.random();
  var filter = defs.append("filter").attr("id", dropshadowId);
  if(self.options.shadow.width > 0) {

    filter.append("feGaussianBlur")
      .attr("in", "SourceAlpha")
      .attr("stdDeviation", self.options.shadow.width)
      .attr("result", "blur");

    filter.append("feOffset")
      .attr("in", "blur")
      .attr("dx", 1)
      .attr("dy", 1)
      .attr("result", "offsetBlur");
  }

  var feMerge = filter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "offsetBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");*/

  // add inner text
  if (self.options.center) {
    self.svg.append("text")
      .attr('class', 'rbc-center-text')
      .attr("text-anchor", self.options.center.textAnchor)
      .attr('x', self.options.center.x + 'px')
      .attr('y', self.options.center.y + 'px')
      .selectAll('tspan')
      .data(self.options.center.content).enter()
      .append('tspan')
      .attr("dominant-baseline", function () {

        // Single lines can easily centered in the middle using dominant-baseline, multiline need to use y
        if (self.options.center.content.length === 1) {
          return 'central';
        }
      })
      .attr('class', function (d, i) {
        return 'rbc-center-text-line' + i;
      })
      .attr('x', 0)
      .attr('dy', function (d, i) {
        if (i > 0) {
          return '1.1em';
        }
      })
      .each(function (d) {
        if (typeof d === 'function') {
          this.callback = d;
        }
      })
      .text(function (d) {
        if (typeof d === 'string') {
          return d;
        }

        return '';
      });
  }

  // add ring structure
  self.field = self.svg.selectAll("g")
    .data(series)
    .enter().append("g");

  self.field.append("path").attr("class", "progress")/*.attr("filter", "url(#" + dropshadowId +")")*/;

  self.field.append("path").attr("class", "bg")
    .style("fill", function (item) {
      return item.color.background;
    })
    .style("opacity", 0.2)
    .attr("d", background);

  self.field.append("text")
    .classed('rbc-label rbc-label-start', true)
    .attr("dominant-baseline", "central")
    .attr("x", "10")
    .attr("y", function (item) {
      return -(
        self.options.diameter / 2 +
        item.index * (self.options.stroke.gap + self.options.stroke.width) +
        self.options.stroke.width / 2
        );
    })
    .attr('font-size', '10px')
    .text(function (item) {
      return item.labelStart;
    });

  self.update();
}

/**
 * Update data to be visualized in the chart.
 *
 * @param {Object|Array} data Optional data you'd like to set for the chart before it will update. If not specified the update method will use the data that is already configured with the chart.
 * @example update([70, 10, 45])
 * @example update({series: [{value: 70}, 10, 45]})
 *
 */
RadialProgressChart.prototype.update = function (data) {
  var self = this;

  // parse new data
  if (data) {
    if (typeof data === 'number') {
      data = [data];
    }

    var series;

    if (Array.isArray(data)) {
      series = data;
    } else if (typeof data === 'object') {
      series = data.series || [];
    }

    for (var i = 0; i < series.length; i++) {
      this.options.series[i].previousValue = this.options.series[i].value;

      var item = series[i];
      if (typeof item === 'number') {
        this.options.series[i].value = item;
      } else if (typeof item === 'object') {
        this.options.series[i].value = item.value;
      }
    }
  }

  // calculate from percentage and new percentage for the progress animation
  self.options.series.forEach(function (item) {
    item.fromPercentage = item.percentage ? item.percentage : 5;
    item.percentage = (item.value - self.options.min) * 100 / (self.options.max - self.options.min);
  });

  var center = self.svg.select("text.rbc-center-text");

  // progress
  self.field.select("path.progress")
    .interrupt()
    .transition()
    .duration(self.options.animation.duration)
    .delay(function (d, i) {
      // delay between each item
      return i * self.options.animation.delay;
    })
    .ease("elastic")
    .attrTween("d", function (item) {
      var interpolator = d3.interpolateNumber(item.fromPercentage, item.percentage);
      return function (t) {
        item.percentage = interpolator(t);
        return self.progress(item);
      };
    })
    .tween("center", function (item) {
      // Execute callbacks on each line
      if (self.options.center) {
        var interpolate = self.options.round ? d3.interpolateRound : d3.interpolateNumber;
        var interpolator = interpolate(item.previousValue || 0, item.value);
        return function (t) {
          center
            .selectAll('tspan')
            .each(function () {
              if (this.callback) {
                d3.select(this).text(this.callback(interpolator(t), item.index, item, self.options.series));
              }
            });
        };
      }
    })
    .tween("interpolate-color", function (item) {
      if (item.color.interpolate && item.color.interpolate.length == 2) {
        var colorInterpolator = d3.interpolateHsl(item.color.interpolate[0], item.color.interpolate[1]);

        return function (t) {
          var color = colorInterpolator(item.percentage / 100);
          d3.select(this).style('fill', color);
          d3.select(this.parentNode).select('path.bg').style('fill', color);
        };
      }
    })
    .style("fill", function (item) {
      if (item.color.solid) {
        return item.color.solid;
      }

      if (item.color.linearGradient || item.color.radialGradient) {
        return "url(#gradient" + item.index + ')';
      }
    });
};

/**
 * Remove svg and clean some references
 */
RadialProgressChart.prototype.destroy = function () {
  this.svg.remove();
  delete this.svg;
};

/**
 * Detach and normalize user's options input.
 */
RadialProgressChart.normalizeOptions = function (options) {
  if (!options || typeof options !== 'object') {
    options = {};
  }

  var _options = {
    diameter: options.diameter || 100,
    stroke: {
      width: options.stroke && options.stroke.width || 40,
      gap: options.stroke && options.stroke.gap || 2
    },
    shadow: {
      width: (!options.shadow || options.shadow.width === null) ? 4 : options.shadow.width
    },
    animation: {
      duration: options.animation && options.animation.duration || 1750,
      delay: options.animation && options.animation.delay || 200
    },
    min: options.min || 0,
    max: options.max || 100,
    round: options.round !== undefined ? !!options.round : true,
    series: options.series || [],
    center: RadialProgressChart.normalizeCenter(options.center),
    border: options.scale || true,
    scale: options.scale || 1,
    // Optionally can be set via offset
    startPoint: options.startPoint || options.offset || 0,
  };

  var defaultColorsIterator = new RadialProgressChart.ColorsIterator();
  for (var i = 0, length = _options.series.length; i < length; i++) {
    var item = options.series[i];

    // convert number to object
    if (typeof item === 'number') {
      item = {value: item};
    }

    _options.series[i] = {
      index: i,
      value: item.value,
      labelStart: item.labelStart,
      label: item.label,
      color: RadialProgressChart.normalizeColor(item.color, defaultColorsIterator)
    };
  }

  return _options;
};

/**
 * Normalize different notations of color property
 *
 * @param {String|Array|Object} color
 * @example '#fe08b5'
 * @example { solid: '#fe08b5', background: '#000000' }
 * @example ['#000000', '#ff0000']
 * @example {
                linearGradient: { x1: '0%', y1: '100%', x2: '50%', y2: '0%'},
                stops: [
                  {offset: '0%', 'stop-color': '#fe08b5', 'stop-opacity': 1},
                  {offset: '100%', 'stop-color': '#ff1410', 'stop-opacity': 1}
                ]
              }
 * @example {
                radialGradient: {cx: '60', cy: '60', r: '50'},
                stops: [
                  {offset: '0%', 'stop-color': '#fe08b5', 'stop-opacity': 1},
                  {offset: '100%', 'stop-color': '#ff1410', 'stop-opacity': 1}
                ]
              }
 *
 */
RadialProgressChart.normalizeColor = function (color, defaultColorsIterator) {

  if (!color) {
    color = {solid: defaultColorsIterator.next()};
  } else if (typeof color === 'string') {
    color = {solid: color};
  } else if (Array.isArray(color)) {
    color = {interpolate: color};
  } else if (typeof color === 'object') {
    if (!color.solid && !color.interpolate && !color.linearGradient && !color.radialGradient) {
      color.solid = defaultColorsIterator.next();
    }
  }

  // Validate interpolate syntax
  if (color.interpolate) {
    if (color.interpolate.length !== 2) {
      throw new Error('interpolate array should contain two colors');
    }
  }

  // Validate gradient syntax
  if (color.linearGradient || color.radialGradient) {
    if (!color.stops || !Array.isArray(color.stops) || color.stops.length !== 2) {
      throw new Error('gradient syntax is malformed');
    }
  }

  // Set background when is not provided
  if (!color.background) {
    if (color.solid) {
      color.background = color.solid;
    } else if (color.interpolate) {
      color.background = color.interpolate[0];
    } else if (color.linearGradient || color.radialGradient) {
      color.background = color.stops[0]['stop-color'];
    }
  }

  return color;

};


/**
 * Normalize different notations of center property
 *
 * @param {String|Array|Function|Object} center
 * @example 'foo bar'
 * @example { content: 'foo bar', x: 10, y: 4 }
 * @example function(value, index, item) {}
 * @example ['foo bar', function(value, index, item) {}]
 */
RadialProgressChart.normalizeCenter = function (center) {
  if (!center) return null;

  // Convert to object notation
  if (center.constructor !== Object) {
    center = {content: center};
  }

  // Defaults
  center.content = center.content || [];
  center.x = center.x || 0;
  center.y = center.y || 0;
  center.textAnchor = center.textAnchor || 'middle';

  // Convert content to array notation
  if (!Array.isArray(center.content)) {
    center.content = [center.content];
  }

  return center;
};

// Linear or Radial Gradient internal object
RadialProgressChart.Gradient = (function () {
  function Gradient() {
  }

  Gradient.toSVGElement = function (id, options) {
    var gradientType = options.linearGradient ? 'linearGradient' : 'radialGradient';
    var gradient = d3.select(document.createElementNS(d3.ns.prefix.svg, gradientType))
      .attr(options[gradientType])
      .attr('id', id);

    options.stops.forEach(function (stopAttrs) {
      gradient.append("svg:stop").attr(stopAttrs);
    });

    this.background = options.stops[0]['stop-color'];

    return gradient.node();
  };

  return Gradient;
})();

// Default colors iterator
RadialProgressChart.ColorsIterator = (function () {

  ColorsIterator.DEFAULT_COLORS = ["#1ad5de", "#a0ff03", "#e90b3a", '#ff9500', '#007aff', '#ffcc00', '#5856d6', '#8e8e93'];

  function ColorsIterator() {
    this.index = 0;
  }

  ColorsIterator.prototype.next = function () {
    if (this.index === ColorsIterator.DEFAULT_COLORS.length) {
      this.index = 0;
    }

    return ColorsIterator.DEFAULT_COLORS[this.index++];
  };

  return ColorsIterator;
})();


// Export RadialProgressChart object
if (typeof module !== "undefined")module.exports = RadialProgressChart;

},{"d3":undefined}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIGQzO1xuXG4vLyBSYWRpYWxQcm9ncmVzc0NoYXJ0IG9iamVjdFxuZnVuY3Rpb24gUmFkaWFsUHJvZ3Jlc3NDaGFydChxdWVyeSwgb3B0aW9ucykge1xuXG4gIC8vIHZlcmlmeSBkMyBpcyBsb2FkZWRcbiAgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmQzKSA/IHdpbmRvdy5kMyA6IHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyA/IHJlcXVpcmUoXCJkM1wiKSA6IHVuZGVmaW5lZDtcbiAgaWYoIWQzKSB0aHJvdyBuZXcgRXJyb3IoJ2QzIG9iamVjdCBpcyBtaXNzaW5nLiBEMy5qcyBsaWJyYXJ5IGhhcyB0byBiZSBsb2FkZWQgYmVmb3JlLicpO1xuXG4gIHZhciBzZWxmID0gdGhpcztcbiAgc2VsZi5vcHRpb25zID0gUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVPcHRpb25zKG9wdGlvbnMpO1xuICBjb25zb2xlLmxvZyhzZWxmLm9wdGlvbnMpO1xuXG4gIC8vIGludGVybmFsICB2YXJpYWJsZXNcbiAgdmFyIHNlcmllcyA9IHNlbGYub3B0aW9ucy5zZXJpZXNcbiAgICAsIHdpZHRoID0gMTUgKyAoKHNlbGYub3B0aW9ucy5kaWFtZXRlciAvIDIpICsgKHNlbGYub3B0aW9ucy5zdHJva2Uud2lkdGggKiBzZWxmLm9wdGlvbnMuc2VyaWVzLmxlbmd0aCkgKyAoc2VsZi5vcHRpb25zLnN0cm9rZS5nYXAgKiBzZWxmLm9wdGlvbnMuc2VyaWVzLmxlbmd0aCAtIDEpKSAqIDJcbiAgICAsIGhlaWdodCA9IHdpZHRoXG4gICAgLCBkaW0gPSBcIjAgMCBcIiArIGhlaWdodCArIFwiIFwiICsgd2lkdGhcbiAgICAsIM+EID0gMiAqIE1hdGguUEkgKiBzZWxmLm9wdGlvbnMuc2NhbGVcbiAgICAsIGlubmVyID0gW11cbiAgICAsIG91dGVyID0gW107XG5cbiAgZnVuY3Rpb24gaW5uZXJSYWRpdXMoaXRlbSkge1xuICAgIHZhciByYWRpdXMgPSBpbm5lcltpdGVtLmluZGV4XTtcbiAgICBpZiAocmFkaXVzKSByZXR1cm4gcmFkaXVzO1xuXG4gICAgLy8gZmlyc3QgcmluZyBiYXNlZCBvbiBkaWFtZXRlciBhbmQgdGhlIHJlc3QgYmFzZWQgb24gdGhlIHByZXZpb3VzIG91dGVyIHJhZGl1cyBwbHVzIGdhcFxuICAgIHJhZGl1cyA9IGl0ZW0uaW5kZXggPT09IDAgPyBzZWxmLm9wdGlvbnMuZGlhbWV0ZXIgLyAyIDogb3V0ZXJbaXRlbS5pbmRleCAtIDFdICsgc2VsZi5vcHRpb25zLnN0cm9rZS5nYXA7XG4gICAgaW5uZXJbaXRlbS5pbmRleF0gPSByYWRpdXM7XG4gICAgcmV0dXJuIHJhZGl1cztcbiAgfVxuXG4gIGZ1bmN0aW9uIG91dGVyUmFkaXVzKGl0ZW0pIHtcbiAgICB2YXIgcmFkaXVzID0gb3V0ZXJbaXRlbS5pbmRleF07XG4gICAgaWYgKHJhZGl1cykgcmV0dXJuIHJhZGl1cztcblxuICAgIC8vIGJhc2VkIG9uIHRoZSBwcmV2aW91cyBpbm5lciByYWRpdXMgKyBzdHJva2Ugd2lkdGhcbiAgICByYWRpdXMgPSBpbm5lcltpdGVtLmluZGV4XSArIHNlbGYub3B0aW9ucy5zdHJva2Uud2lkdGg7XG4gICAgb3V0ZXJbaXRlbS5pbmRleF0gPSByYWRpdXM7XG4gICAgcmV0dXJuIHJhZGl1cztcbiAgfVxuXG4gIHNlbGYucHJvZ3Jlc3MgPSBkMy5zdmcuYXJjKClcbiAgICAuc3RhcnRBbmdsZShzZWxmLm9wdGlvbnMuc3RhcnRQb2ludClcbiAgICAuZW5kQW5nbGUoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLnBlcmNlbnRhZ2UgLyAxMDAgKiDPhCArIHNlbGYub3B0aW9ucy5zdGFydFBvaW50O1xuICAgIH0pXG4gICAgLmlubmVyUmFkaXVzKGlubmVyUmFkaXVzKVxuICAgIC5vdXRlclJhZGl1cyhvdXRlclJhZGl1cylcbiAgICAuY29ybmVyUmFkaXVzKGZ1bmN0aW9uIChkKSB7XG4gICAgICAvLyBXb3JrYXJvdW5kIGZvciBkMyBidWcgaHR0cHM6Ly9naXRodWIuY29tL21ib3N0b2NrL2QzL2lzc3Vlcy8yMjQ5XG4gICAgICAvLyBSZWR1Y2UgY29ybmVyIHJhZGl1cyB3aGVuIGNvcm5lcnMgYXJlIGNsb3NlIGVhY2ggb3RoZXJcbiAgICAgIHZhciBtO1xuICAgICAgaWYgKHNlbGYub3B0aW9ucy5zY2FsZSA8IDEpIHtcbiAgICAgICAgbSA9IDE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtID0gZC5wZXJjZW50YWdlID49IDk5ID8gKDEwMCAtIGQucGVyY2VudGFnZSkgKiAwLjEgOiAxO1xuICAgICAgfVxuICAgICAgcmV0dXJuIChzZWxmLm9wdGlvbnMuc3Ryb2tlLndpZHRoIC8gMikgKiBtO1xuICAgIH0pO1xuXG4gIGlmIChzZWxmLm9wdGlvbnMuYmFja2dyb3VuZCkge1xuICAgIHZhciBiYWNrZ3JvdW5kID0gZDMuc3ZnLmFyYygpXG4gICAgICAuc3RhcnRBbmdsZShzZWxmLm9wdGlvbnMuc3RhcnRQb2ludClcbiAgICAgIC5lbmRBbmdsZSjPhCArIHNlbGYub3B0aW9ucy5zdGFydFBvaW50KVxuICAgICAgLmlubmVyUmFkaXVzKGlubmVyUmFkaXVzKVxuICAgICAgLm91dGVyUmFkaXVzKG91dGVyUmFkaXVzKTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYmFja2dyb3VuZCA9IGQzLnN2Zy5hcmMoKTtcbiAgfVxuXG5cblxuICAvLyBjcmVhdGUgc3ZnXG4gIHNlbGYuc3ZnID0gZDMuc2VsZWN0KHF1ZXJ5KS5hcHBlbmQoXCJzdmdcIilcbiAgICAuYXR0cihcInByZXNlcnZlQXNwZWN0UmF0aW9cIixcInhNaW5ZTWluIG1lZXRcIilcbiAgICAuYXR0cihcInZpZXdCb3hcIiwgZGltKVxuICAgIC5hcHBlbmQoXCJnXCIpXG4gICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIgKyB3aWR0aCAvIDIgKyBcIixcIiArIGhlaWdodCAvIDIgKyBcIilcIik7XG4vKlxuICAvLyBSZW1vdmUgZ3JhZGllbnRzIGZvciBTYWZhcmkvaU9TIHN1cHBvcnRcbiAgLy8gYWRkIGdyYWRpZW50cyBkZWZzXG4gIHZhciBkZWZzID0gc2VsZi5zdmcuYXBwZW5kKFwic3ZnOmRlZnNcIik7XG4gIHNlcmllcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgaWYgKGl0ZW0uY29sb3IubGluZWFyR3JhZGllbnQgfHwgaXRlbS5jb2xvci5yYWRpYWxHcmFkaWVudCkge1xuICAgICAgdmFyIGdyYWRpZW50ID0gUmFkaWFsUHJvZ3Jlc3NDaGFydC5HcmFkaWVudC50b1NWR0VsZW1lbnQoJ2dyYWRpZW50JyArIGl0ZW0uaW5kZXgsIGl0ZW0uY29sb3IpO1xuICAgICAgZGVmcy5ub2RlKCkuYXBwZW5kQ2hpbGQoZ3JhZGllbnQpO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gYWRkIHNoYWRvd3MgZGVmc1xuICBkZWZzID0gc2VsZi5zdmcuYXBwZW5kKFwic3ZnOmRlZnNcIik7XG4gIHZhciBkcm9wc2hhZG93SWQgPSBcImRyb3BzaGFkb3ctXCIgKyBNYXRoLnJhbmRvbSgpO1xuICB2YXIgZmlsdGVyID0gZGVmcy5hcHBlbmQoXCJmaWx0ZXJcIikuYXR0cihcImlkXCIsIGRyb3BzaGFkb3dJZCk7XG4gIGlmKHNlbGYub3B0aW9ucy5zaGFkb3cud2lkdGggPiAwKSB7XG5cbiAgICBmaWx0ZXIuYXBwZW5kKFwiZmVHYXVzc2lhbkJsdXJcIilcbiAgICAgIC5hdHRyKFwiaW5cIiwgXCJTb3VyY2VBbHBoYVwiKVxuICAgICAgLmF0dHIoXCJzdGREZXZpYXRpb25cIiwgc2VsZi5vcHRpb25zLnNoYWRvdy53aWR0aClcbiAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwiYmx1clwiKTtcblxuICAgIGZpbHRlci5hcHBlbmQoXCJmZU9mZnNldFwiKVxuICAgICAgLmF0dHIoXCJpblwiLCBcImJsdXJcIilcbiAgICAgIC5hdHRyKFwiZHhcIiwgMSlcbiAgICAgIC5hdHRyKFwiZHlcIiwgMSlcbiAgICAgIC5hdHRyKFwicmVzdWx0XCIsIFwib2Zmc2V0Qmx1clwiKTtcbiAgfVxuXG4gIHZhciBmZU1lcmdlID0gZmlsdGVyLmFwcGVuZChcImZlTWVyZ2VcIik7XG4gIGZlTWVyZ2UuYXBwZW5kKFwiZmVNZXJnZU5vZGVcIikuYXR0cihcImluXCIsIFwib2Zmc2V0Qmx1clwiKTtcbiAgZmVNZXJnZS5hcHBlbmQoXCJmZU1lcmdlTm9kZVwiKS5hdHRyKFwiaW5cIiwgXCJTb3VyY2VHcmFwaGljXCIpOyovXG5cbiAgLy8gYWRkIGlubmVyIHRleHRcbiAgaWYgKHNlbGYub3B0aW9ucy5jZW50ZXIpIHtcbiAgICBzZWxmLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAuYXR0cignY2xhc3MnLCAncmJjLWNlbnRlci10ZXh0JylcbiAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgc2VsZi5vcHRpb25zLmNlbnRlci50ZXh0QW5jaG9yKVxuICAgICAgLmF0dHIoJ3gnLCBzZWxmLm9wdGlvbnMuY2VudGVyLnggKyAncHgnKVxuICAgICAgLmF0dHIoJ3knLCBzZWxmLm9wdGlvbnMuY2VudGVyLnkgKyAncHgnKVxuICAgICAgLnNlbGVjdEFsbCgndHNwYW4nKVxuICAgICAgLmRhdGEoc2VsZi5vcHRpb25zLmNlbnRlci5jb250ZW50KS5lbnRlcigpXG4gICAgICAuYXBwZW5kKCd0c3BhbicpXG4gICAgICAuYXR0cihcImRvbWluYW50LWJhc2VsaW5lXCIsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgICAvLyBTaW5nbGUgbGluZXMgY2FuIGVhc2lseSBjZW50ZXJlZCBpbiB0aGUgbWlkZGxlIHVzaW5nIGRvbWluYW50LWJhc2VsaW5lLCBtdWx0aWxpbmUgbmVlZCB0byB1c2UgeVxuICAgICAgICBpZiAoc2VsZi5vcHRpb25zLmNlbnRlci5jb250ZW50Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHJldHVybiAnY2VudHJhbCc7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuYXR0cignY2xhc3MnLCBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICByZXR1cm4gJ3JiYy1jZW50ZXItdGV4dC1saW5lJyArIGk7XG4gICAgICB9KVxuICAgICAgLmF0dHIoJ3gnLCAwKVxuICAgICAgLmF0dHIoJ2R5JywgZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgcmV0dXJuICcxLjFlbSc7XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICAuZWFjaChmdW5jdGlvbiAoZCkge1xuICAgICAgICBpZiAodHlwZW9mIGQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aGlzLmNhbGxiYWNrID0gZDtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICByZXR1cm4gZDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH0pO1xuICB9XG5cbiAgLy8gYWRkIHJpbmcgc3RydWN0dXJlXG4gIHNlbGYuZmllbGQgPSBzZWxmLnN2Zy5zZWxlY3RBbGwoXCJnXCIpXG4gICAgLmRhdGEoc2VyaWVzKVxuICAgIC5lbnRlcigpLmFwcGVuZChcImdcIik7XG5cbiAgc2VsZi5maWVsZC5hcHBlbmQoXCJwYXRoXCIpLmF0dHIoXCJjbGFzc1wiLCBcInByb2dyZXNzXCIpLyouYXR0cihcImZpbHRlclwiLCBcInVybCgjXCIgKyBkcm9wc2hhZG93SWQgK1wiKVwiKSovO1xuXG4gIHNlbGYuZmllbGQuYXBwZW5kKFwicGF0aFwiKS5hdHRyKFwiY2xhc3NcIiwgXCJiZ1wiKVxuICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLmNvbG9yLmJhY2tncm91bmQ7XG4gICAgfSlcbiAgICAuc3R5bGUoXCJvcGFjaXR5XCIsIDAuMilcbiAgICAuYXR0cihcImRcIiwgYmFja2dyb3VuZCk7XG5cbiAgc2VsZi5maWVsZC5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgLmNsYXNzZWQoJ3JiYy1sYWJlbCByYmMtbGFiZWwtc3RhcnQnLCB0cnVlKVxuICAgIC5hdHRyKFwiZG9taW5hbnQtYmFzZWxpbmVcIiwgXCJjZW50cmFsXCIpXG4gICAgLmF0dHIoXCJ4XCIsIFwiMTBcIilcbiAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiAtKFxuICAgICAgICBzZWxmLm9wdGlvbnMuZGlhbWV0ZXIgLyAyICtcbiAgICAgICAgaXRlbS5pbmRleCAqIChzZWxmLm9wdGlvbnMuc3Ryb2tlLmdhcCArIHNlbGYub3B0aW9ucy5zdHJva2Uud2lkdGgpICtcbiAgICAgICAgc2VsZi5vcHRpb25zLnN0cm9rZS53aWR0aCAvIDJcbiAgICAgICAgKTtcbiAgICB9KVxuICAgIC5hdHRyKCdmb250LXNpemUnLCAnMTBweCcpXG4gICAgLnRleHQoZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIHJldHVybiBpdGVtLmxhYmVsU3RhcnQ7XG4gICAgfSk7XG5cbiAgc2VsZi51cGRhdGUoKTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgZGF0YSB0byBiZSB2aXN1YWxpemVkIGluIHRoZSBjaGFydC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gZGF0YSBPcHRpb25hbCBkYXRhIHlvdSdkIGxpa2UgdG8gc2V0IGZvciB0aGUgY2hhcnQgYmVmb3JlIGl0IHdpbGwgdXBkYXRlLiBJZiBub3Qgc3BlY2lmaWVkIHRoZSB1cGRhdGUgbWV0aG9kIHdpbGwgdXNlIHRoZSBkYXRhIHRoYXQgaXMgYWxyZWFkeSBjb25maWd1cmVkIHdpdGggdGhlIGNoYXJ0LlxuICogQGV4YW1wbGUgdXBkYXRlKFs3MCwgMTAsIDQ1XSlcbiAqIEBleGFtcGxlIHVwZGF0ZSh7c2VyaWVzOiBbe3ZhbHVlOiA3MH0sIDEwLCA0NV19KVxuICpcbiAqL1xuUmFkaWFsUHJvZ3Jlc3NDaGFydC5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIC8vIHBhcnNlIG5ldyBkYXRhXG4gIGlmIChkYXRhKSB7XG4gICAgaWYgKHR5cGVvZiBkYXRhID09PSAnbnVtYmVyJykge1xuICAgICAgZGF0YSA9IFtkYXRhXTtcbiAgICB9XG5cbiAgICB2YXIgc2VyaWVzO1xuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgIHNlcmllcyA9IGRhdGE7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHNlcmllcyA9IGRhdGEuc2VyaWVzIHx8IFtdO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VyaWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnByZXZpb3VzVmFsdWUgPSB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnZhbHVlO1xuXG4gICAgICB2YXIgaXRlbSA9IHNlcmllc1tpXTtcbiAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgdGhpcy5vcHRpb25zLnNlcmllc1tpXS52YWx1ZSA9IGl0ZW07XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBpdGVtID09PSAnb2JqZWN0Jykge1xuICAgICAgICB0aGlzLm9wdGlvbnMuc2VyaWVzW2ldLnZhbHVlID0gaXRlbS52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBjYWxjdWxhdGUgZnJvbSBwZXJjZW50YWdlIGFuZCBuZXcgcGVyY2VudGFnZSBmb3IgdGhlIHByb2dyZXNzIGFuaW1hdGlvblxuICBzZWxmLm9wdGlvbnMuc2VyaWVzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICBpdGVtLmZyb21QZXJjZW50YWdlID0gaXRlbS5wZXJjZW50YWdlID8gaXRlbS5wZXJjZW50YWdlIDogNTtcbiAgICBpdGVtLnBlcmNlbnRhZ2UgPSAoaXRlbS52YWx1ZSAtIHNlbGYub3B0aW9ucy5taW4pICogMTAwIC8gKHNlbGYub3B0aW9ucy5tYXggLSBzZWxmLm9wdGlvbnMubWluKTtcbiAgfSk7XG5cbiAgdmFyIGNlbnRlciA9IHNlbGYuc3ZnLnNlbGVjdChcInRleHQucmJjLWNlbnRlci10ZXh0XCIpO1xuXG4gIC8vIHByb2dyZXNzXG4gIHNlbGYuZmllbGQuc2VsZWN0KFwicGF0aC5wcm9ncmVzc1wiKVxuICAgIC5pbnRlcnJ1cHQoKVxuICAgIC50cmFuc2l0aW9uKClcbiAgICAuZHVyYXRpb24oc2VsZi5vcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbilcbiAgICAuZGVsYXkoZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgIC8vIGRlbGF5IGJldHdlZW4gZWFjaCBpdGVtXG4gICAgICByZXR1cm4gaSAqIHNlbGYub3B0aW9ucy5hbmltYXRpb24uZGVsYXk7XG4gICAgfSlcbiAgICAuZWFzZShcImVsYXN0aWNcIilcbiAgICAuYXR0clR3ZWVuKFwiZFwiLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgdmFyIGludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlTnVtYmVyKGl0ZW0uZnJvbVBlcmNlbnRhZ2UsIGl0ZW0ucGVyY2VudGFnZSk7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgaXRlbS5wZXJjZW50YWdlID0gaW50ZXJwb2xhdG9yKHQpO1xuICAgICAgICByZXR1cm4gc2VsZi5wcm9ncmVzcyhpdGVtKTtcbiAgICAgIH07XG4gICAgfSlcbiAgICAudHdlZW4oXCJjZW50ZXJcIiwgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgIC8vIEV4ZWN1dGUgY2FsbGJhY2tzIG9uIGVhY2ggbGluZVxuICAgICAgaWYgKHNlbGYub3B0aW9ucy5jZW50ZXIpIHtcbiAgICAgICAgdmFyIGludGVycG9sYXRlID0gc2VsZi5vcHRpb25zLnJvdW5kID8gZDMuaW50ZXJwb2xhdGVSb3VuZCA6IGQzLmludGVycG9sYXRlTnVtYmVyO1xuICAgICAgICB2YXIgaW50ZXJwb2xhdG9yID0gaW50ZXJwb2xhdGUoaXRlbS5wcmV2aW91c1ZhbHVlIHx8IDAsIGl0ZW0udmFsdWUpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHQpIHtcbiAgICAgICAgICBjZW50ZXJcbiAgICAgICAgICAgIC5zZWxlY3RBbGwoJ3RzcGFuJylcbiAgICAgICAgICAgIC5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgaWYgKHRoaXMuY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3QodGhpcykudGV4dCh0aGlzLmNhbGxiYWNrKGludGVycG9sYXRvcih0KSwgaXRlbS5pbmRleCwgaXRlbSwgc2VsZi5vcHRpb25zLnNlcmllcykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KVxuICAgIC50d2VlbihcImludGVycG9sYXRlLWNvbG9yXCIsIGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICBpZiAoaXRlbS5jb2xvci5pbnRlcnBvbGF0ZSAmJiBpdGVtLmNvbG9yLmludGVycG9sYXRlLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgIHZhciBjb2xvckludGVycG9sYXRvciA9IGQzLmludGVycG9sYXRlSHNsKGl0ZW0uY29sb3IuaW50ZXJwb2xhdGVbMF0sIGl0ZW0uY29sb3IuaW50ZXJwb2xhdGVbMV0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodCkge1xuICAgICAgICAgIHZhciBjb2xvciA9IGNvbG9ySW50ZXJwb2xhdG9yKGl0ZW0ucGVyY2VudGFnZSAvIDEwMCk7XG4gICAgICAgICAgZDMuc2VsZWN0KHRoaXMpLnN0eWxlKCdmaWxsJywgY29sb3IpO1xuICAgICAgICAgIGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLnNlbGVjdCgncGF0aC5iZycpLnN0eWxlKCdmaWxsJywgY29sb3IpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pXG4gICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgaWYgKGl0ZW0uY29sb3Iuc29saWQpIHtcbiAgICAgICAgcmV0dXJuIGl0ZW0uY29sb3Iuc29saWQ7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtLmNvbG9yLmxpbmVhckdyYWRpZW50IHx8IGl0ZW0uY29sb3IucmFkaWFsR3JhZGllbnQpIHtcbiAgICAgICAgcmV0dXJuIFwidXJsKCNncmFkaWVudFwiICsgaXRlbS5pbmRleCArICcpJztcbiAgICAgIH1cbiAgICB9KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIHN2ZyBhbmQgY2xlYW4gc29tZSByZWZlcmVuY2VzXG4gKi9cblJhZGlhbFByb2dyZXNzQ2hhcnQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMuc3ZnLnJlbW92ZSgpO1xuICBkZWxldGUgdGhpcy5zdmc7XG59O1xuXG4vKipcbiAqIERldGFjaCBhbmQgbm9ybWFsaXplIHVzZXIncyBvcHRpb25zIGlucHV0LlxuICovXG5SYWRpYWxQcm9ncmVzc0NoYXJ0Lm5vcm1hbGl6ZU9wdGlvbnMgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICBpZiAoIW9wdGlvbnMgfHwgdHlwZW9mIG9wdGlvbnMgIT09ICdvYmplY3QnKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgdmFyIF9vcHRpb25zID0ge1xuICAgIGRpYW1ldGVyOiBvcHRpb25zLmRpYW1ldGVyIHx8IDEwMCxcbiAgICBzdHJva2U6IHtcbiAgICAgIHdpZHRoOiBvcHRpb25zLnN0cm9rZSAmJiBvcHRpb25zLnN0cm9rZS53aWR0aCB8fCA0MCxcbiAgICAgIGdhcDogb3B0aW9ucy5zdHJva2UgJiYgb3B0aW9ucy5zdHJva2UuZ2FwIHx8IDJcbiAgICB9LFxuICAgIHNoYWRvdzoge1xuICAgICAgd2lkdGg6ICghb3B0aW9ucy5zaGFkb3cgfHwgb3B0aW9ucy5zaGFkb3cud2lkdGggPT09IG51bGwpID8gNCA6IG9wdGlvbnMuc2hhZG93LndpZHRoXG4gICAgfSxcbiAgICBhbmltYXRpb246IHtcbiAgICAgIGR1cmF0aW9uOiBvcHRpb25zLmFuaW1hdGlvbiAmJiBvcHRpb25zLmFuaW1hdGlvbi5kdXJhdGlvbiB8fCAxNzUwLFxuICAgICAgZGVsYXk6IG9wdGlvbnMuYW5pbWF0aW9uICYmIG9wdGlvbnMuYW5pbWF0aW9uLmRlbGF5IHx8IDIwMFxuICAgIH0sXG4gICAgbWluOiBvcHRpb25zLm1pbiB8fCAwLFxuICAgIG1heDogb3B0aW9ucy5tYXggfHwgMTAwLFxuICAgIHJvdW5kOiBvcHRpb25zLnJvdW5kICE9PSB1bmRlZmluZWQgPyAhIW9wdGlvbnMucm91bmQgOiB0cnVlLFxuICAgIHNlcmllczogb3B0aW9ucy5zZXJpZXMgfHwgW10sXG4gICAgY2VudGVyOiBSYWRpYWxQcm9ncmVzc0NoYXJ0Lm5vcm1hbGl6ZUNlbnRlcihvcHRpb25zLmNlbnRlciksXG4gICAgYm9yZGVyOiBvcHRpb25zLnNjYWxlIHx8IHRydWUsXG4gICAgc2NhbGU6IG9wdGlvbnMuc2NhbGUgfHwgMSxcbiAgICAvLyBPcHRpb25hbGx5IGNhbiBiZSBzZXQgdmlhIG9mZnNldFxuICAgIHN0YXJ0UG9pbnQ6IG9wdGlvbnMuc3RhcnRQb2ludCB8fCBvcHRpb25zLm9mZnNldCB8fCAwLFxuICB9O1xuXG4gIHZhciBkZWZhdWx0Q29sb3JzSXRlcmF0b3IgPSBuZXcgUmFkaWFsUHJvZ3Jlc3NDaGFydC5Db2xvcnNJdGVyYXRvcigpO1xuICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gX29wdGlvbnMuc2VyaWVzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBvcHRpb25zLnNlcmllc1tpXTtcblxuICAgIC8vIGNvbnZlcnQgbnVtYmVyIHRvIG9iamVjdFxuICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ251bWJlcicpIHtcbiAgICAgIGl0ZW0gPSB7dmFsdWU6IGl0ZW19O1xuICAgIH1cblxuICAgIF9vcHRpb25zLnNlcmllc1tpXSA9IHtcbiAgICAgIGluZGV4OiBpLFxuICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICBsYWJlbFN0YXJ0OiBpdGVtLmxhYmVsU3RhcnQsXG4gICAgICBsYWJlbDogaXRlbS5sYWJlbCxcbiAgICAgIGNvbG9yOiBSYWRpYWxQcm9ncmVzc0NoYXJ0Lm5vcm1hbGl6ZUNvbG9yKGl0ZW0uY29sb3IsIGRlZmF1bHRDb2xvcnNJdGVyYXRvcilcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIF9vcHRpb25zO1xufTtcblxuLyoqXG4gKiBOb3JtYWxpemUgZGlmZmVyZW50IG5vdGF0aW9ucyBvZiBjb2xvciBwcm9wZXJ0eVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fE9iamVjdH0gY29sb3JcbiAqIEBleGFtcGxlICcjZmUwOGI1J1xuICogQGV4YW1wbGUgeyBzb2xpZDogJyNmZTA4YjUnLCBiYWNrZ3JvdW5kOiAnIzAwMDAwMCcgfVxuICogQGV4YW1wbGUgWycjMDAwMDAwJywgJyNmZjAwMDAnXVxuICogQGV4YW1wbGUge1xuICAgICAgICAgICAgICAgIGxpbmVhckdyYWRpZW50OiB7IHgxOiAnMCUnLCB5MTogJzEwMCUnLCB4MjogJzUwJScsIHkyOiAnMCUnfSxcbiAgICAgICAgICAgICAgICBzdG9wczogW1xuICAgICAgICAgICAgICAgICAge29mZnNldDogJzAlJywgJ3N0b3AtY29sb3InOiAnI2ZlMDhiNScsICdzdG9wLW9wYWNpdHknOiAxfSxcbiAgICAgICAgICAgICAgICAgIHtvZmZzZXQ6ICcxMDAlJywgJ3N0b3AtY29sb3InOiAnI2ZmMTQxMCcsICdzdG9wLW9wYWNpdHknOiAxfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICogQGV4YW1wbGUge1xuICAgICAgICAgICAgICAgIHJhZGlhbEdyYWRpZW50OiB7Y3g6ICc2MCcsIGN5OiAnNjAnLCByOiAnNTAnfSxcbiAgICAgICAgICAgICAgICBzdG9wczogW1xuICAgICAgICAgICAgICAgICAge29mZnNldDogJzAlJywgJ3N0b3AtY29sb3InOiAnI2ZlMDhiNScsICdzdG9wLW9wYWNpdHknOiAxfSxcbiAgICAgICAgICAgICAgICAgIHtvZmZzZXQ6ICcxMDAlJywgJ3N0b3AtY29sb3InOiAnI2ZmMTQxMCcsICdzdG9wLW9wYWNpdHknOiAxfVxuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgICAgfVxuICpcbiAqL1xuUmFkaWFsUHJvZ3Jlc3NDaGFydC5ub3JtYWxpemVDb2xvciA9IGZ1bmN0aW9uIChjb2xvciwgZGVmYXVsdENvbG9yc0l0ZXJhdG9yKSB7XG5cbiAgaWYgKCFjb2xvcikge1xuICAgIGNvbG9yID0ge3NvbGlkOiBkZWZhdWx0Q29sb3JzSXRlcmF0b3IubmV4dCgpfTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgY29sb3IgPT09ICdzdHJpbmcnKSB7XG4gICAgY29sb3IgPSB7c29saWQ6IGNvbG9yfTtcbiAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGNvbG9yKSkge1xuICAgIGNvbG9yID0ge2ludGVycG9sYXRlOiBjb2xvcn07XG4gIH0gZWxzZSBpZiAodHlwZW9mIGNvbG9yID09PSAnb2JqZWN0Jykge1xuICAgIGlmICghY29sb3Iuc29saWQgJiYgIWNvbG9yLmludGVycG9sYXRlICYmICFjb2xvci5saW5lYXJHcmFkaWVudCAmJiAhY29sb3IucmFkaWFsR3JhZGllbnQpIHtcbiAgICAgIGNvbG9yLnNvbGlkID0gZGVmYXVsdENvbG9yc0l0ZXJhdG9yLm5leHQoKTtcbiAgICB9XG4gIH1cblxuICAvLyBWYWxpZGF0ZSBpbnRlcnBvbGF0ZSBzeW50YXhcbiAgaWYgKGNvbG9yLmludGVycG9sYXRlKSB7XG4gICAgaWYgKGNvbG9yLmludGVycG9sYXRlLmxlbmd0aCAhPT0gMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdpbnRlcnBvbGF0ZSBhcnJheSBzaG91bGQgY29udGFpbiB0d28gY29sb3JzJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gVmFsaWRhdGUgZ3JhZGllbnQgc3ludGF4XG4gIGlmIChjb2xvci5saW5lYXJHcmFkaWVudCB8fCBjb2xvci5yYWRpYWxHcmFkaWVudCkge1xuICAgIGlmICghY29sb3Iuc3RvcHMgfHwgIUFycmF5LmlzQXJyYXkoY29sb3Iuc3RvcHMpIHx8IGNvbG9yLnN0b3BzLmxlbmd0aCAhPT0gMikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdncmFkaWVudCBzeW50YXggaXMgbWFsZm9ybWVkJyk7XG4gICAgfVxuICB9XG5cbiAgLy8gU2V0IGJhY2tncm91bmQgd2hlbiBpcyBub3QgcHJvdmlkZWRcbiAgaWYgKCFjb2xvci5iYWNrZ3JvdW5kKSB7XG4gICAgaWYgKGNvbG9yLnNvbGlkKSB7XG4gICAgICBjb2xvci5iYWNrZ3JvdW5kID0gY29sb3Iuc29saWQ7XG4gICAgfSBlbHNlIGlmIChjb2xvci5pbnRlcnBvbGF0ZSkge1xuICAgICAgY29sb3IuYmFja2dyb3VuZCA9IGNvbG9yLmludGVycG9sYXRlWzBdO1xuICAgIH0gZWxzZSBpZiAoY29sb3IubGluZWFyR3JhZGllbnQgfHwgY29sb3IucmFkaWFsR3JhZGllbnQpIHtcbiAgICAgIGNvbG9yLmJhY2tncm91bmQgPSBjb2xvci5zdG9wc1swXVsnc3RvcC1jb2xvciddO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBjb2xvcjtcblxufTtcblxuXG4vKipcbiAqIE5vcm1hbGl6ZSBkaWZmZXJlbnQgbm90YXRpb25zIG9mIGNlbnRlciBwcm9wZXJ0eVxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfEFycmF5fEZ1bmN0aW9ufE9iamVjdH0gY2VudGVyXG4gKiBAZXhhbXBsZSAnZm9vIGJhcidcbiAqIEBleGFtcGxlIHsgY29udGVudDogJ2ZvbyBiYXInLCB4OiAxMCwgeTogNCB9XG4gKiBAZXhhbXBsZSBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGl0ZW0pIHt9XG4gKiBAZXhhbXBsZSBbJ2ZvbyBiYXInLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGl0ZW0pIHt9XVxuICovXG5SYWRpYWxQcm9ncmVzc0NoYXJ0Lm5vcm1hbGl6ZUNlbnRlciA9IGZ1bmN0aW9uIChjZW50ZXIpIHtcbiAgaWYgKCFjZW50ZXIpIHJldHVybiBudWxsO1xuXG4gIC8vIENvbnZlcnQgdG8gb2JqZWN0IG5vdGF0aW9uXG4gIGlmIChjZW50ZXIuY29uc3RydWN0b3IgIT09IE9iamVjdCkge1xuICAgIGNlbnRlciA9IHtjb250ZW50OiBjZW50ZXJ9O1xuICB9XG5cbiAgLy8gRGVmYXVsdHNcbiAgY2VudGVyLmNvbnRlbnQgPSBjZW50ZXIuY29udGVudCB8fCBbXTtcbiAgY2VudGVyLnggPSBjZW50ZXIueCB8fCAwO1xuICBjZW50ZXIueSA9IGNlbnRlci55IHx8IDA7XG4gIGNlbnRlci50ZXh0QW5jaG9yID0gY2VudGVyLnRleHRBbmNob3IgfHwgJ21pZGRsZSc7XG5cbiAgLy8gQ29udmVydCBjb250ZW50IHRvIGFycmF5IG5vdGF0aW9uXG4gIGlmICghQXJyYXkuaXNBcnJheShjZW50ZXIuY29udGVudCkpIHtcbiAgICBjZW50ZXIuY29udGVudCA9IFtjZW50ZXIuY29udGVudF07XG4gIH1cblxuICByZXR1cm4gY2VudGVyO1xufTtcblxuLy8gTGluZWFyIG9yIFJhZGlhbCBHcmFkaWVudCBpbnRlcm5hbCBvYmplY3RcblJhZGlhbFByb2dyZXNzQ2hhcnQuR3JhZGllbnQgPSAoZnVuY3Rpb24gKCkge1xuICBmdW5jdGlvbiBHcmFkaWVudCgpIHtcbiAgfVxuXG4gIEdyYWRpZW50LnRvU1ZHRWxlbWVudCA9IGZ1bmN0aW9uIChpZCwgb3B0aW9ucykge1xuICAgIHZhciBncmFkaWVudFR5cGUgPSBvcHRpb25zLmxpbmVhckdyYWRpZW50ID8gJ2xpbmVhckdyYWRpZW50JyA6ICdyYWRpYWxHcmFkaWVudCc7XG4gICAgdmFyIGdyYWRpZW50ID0gZDMuc2VsZWN0KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhkMy5ucy5wcmVmaXguc3ZnLCBncmFkaWVudFR5cGUpKVxuICAgICAgLmF0dHIob3B0aW9uc1tncmFkaWVudFR5cGVdKVxuICAgICAgLmF0dHIoJ2lkJywgaWQpO1xuXG4gICAgb3B0aW9ucy5zdG9wcy5mb3JFYWNoKGZ1bmN0aW9uIChzdG9wQXR0cnMpIHtcbiAgICAgIGdyYWRpZW50LmFwcGVuZChcInN2ZzpzdG9wXCIpLmF0dHIoc3RvcEF0dHJzKTtcbiAgICB9KTtcblxuICAgIHRoaXMuYmFja2dyb3VuZCA9IG9wdGlvbnMuc3RvcHNbMF1bJ3N0b3AtY29sb3InXTtcblxuICAgIHJldHVybiBncmFkaWVudC5ub2RlKCk7XG4gIH07XG5cbiAgcmV0dXJuIEdyYWRpZW50O1xufSkoKTtcblxuLy8gRGVmYXVsdCBjb2xvcnMgaXRlcmF0b3JcblJhZGlhbFByb2dyZXNzQ2hhcnQuQ29sb3JzSXRlcmF0b3IgPSAoZnVuY3Rpb24gKCkge1xuXG4gIENvbG9yc0l0ZXJhdG9yLkRFRkFVTFRfQ09MT1JTID0gW1wiIzFhZDVkZVwiLCBcIiNhMGZmMDNcIiwgXCIjZTkwYjNhXCIsICcjZmY5NTAwJywgJyMwMDdhZmYnLCAnI2ZmY2MwMCcsICcjNTg1NmQ2JywgJyM4ZThlOTMnXTtcblxuICBmdW5jdGlvbiBDb2xvcnNJdGVyYXRvcigpIHtcbiAgICB0aGlzLmluZGV4ID0gMDtcbiAgfVxuXG4gIENvbG9yc0l0ZXJhdG9yLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24gKCkge1xuICAgIGlmICh0aGlzLmluZGV4ID09PSBDb2xvcnNJdGVyYXRvci5ERUZBVUxUX0NPTE9SUy5sZW5ndGgpIHtcbiAgICAgIHRoaXMuaW5kZXggPSAwO1xuICAgIH1cblxuICAgIHJldHVybiBDb2xvcnNJdGVyYXRvci5ERUZBVUxUX0NPTE9SU1t0aGlzLmluZGV4KytdO1xuICB9O1xuXG4gIHJldHVybiBDb2xvcnNJdGVyYXRvcjtcbn0pKCk7XG5cblxuLy8gRXhwb3J0IFJhZGlhbFByb2dyZXNzQ2hhcnQgb2JqZWN0XG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiltb2R1bGUuZXhwb3J0cyA9IFJhZGlhbFByb2dyZXNzQ2hhcnQ7XG4iXX0=

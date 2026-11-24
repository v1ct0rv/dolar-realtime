// The parts of the page's chart logic that are not Highcharts calls. The page
// loads this file before index.js and reads the `chartHelpers` global; the tests
// (legacy/chartHelpers.test.js) require it under Node.
var chartHelpers = {
    // Position in `times` (epoch milliseconds, ascending) of the one nearest to
    // `target`, or -1 when none is within `maxGapMs`. A tie goes to the earlier
    // time, so the answer does not flicker between two points.
    nearestIndexByTime: function(times, target, maxGapMs) {
        var nearest = -1;
        var nearestGap = Infinity;

        for (var i = 0; i < times.length; i++) {
            var gap = Math.abs(times[i] - target);
            // A target that is not a time gives NaN, which fails both comparisons.
            if (gap <= maxGapMs && gap < nearestGap) {
                nearest = i;
                nearestGap = gap;
            }
        }

        return nearest;
    },

    // The first price of a [[time, price], ...] series when it is a positive
    // number, else null. It is the level SET-ICAP's own chart is coloured against.
    openingPrice: function(series) {
        var first = series && series[0] && series[0][1];
        return typeof first === 'number' && first > 0 ? first : null;
    }
};

if (typeof module !== 'undefined') {
    module.exports = chartHelpers;
}

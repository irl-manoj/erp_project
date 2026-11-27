'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getAttendanceProjection } = require('../calculations');

test('attendance projection calculates exact integer class counts around 75%', () => {
  assert.deepEqual(getAttendanceProjection(6, 10), {
    percentage: 60, met: false, classesToAttend: 6, classesCanSkip: 0
  });
  assert.deepEqual(getAttendanceProjection(3, 4), {
    percentage: 75, met: true, classesToAttend: 0, classesCanSkip: 0
  });
  assert.deepEqual(getAttendanceProjection(4, 5), {
    percentage: 80, met: true, classesToAttend: 0, classesCanSkip: 0
  });
  assert.deepEqual(getAttendanceProjection(9, 10), {
    percentage: 90, met: true, classesToAttend: 0, classesCanSkip: 2
  });
  assert.equal(getAttendanceProjection(0, 0).classesToAttend, 1);
});

test('attendance projection validates threshold and handles whole-class rounding', () => {
  assert.equal(getAttendanceProjection(7, 10, 75).classesToAttend, 2);
  assert.equal(getAttendanceProjection(2, 3, 75).classesCanSkip, 0);
  assert.throws(() => getAttendanceProjection(1, 2, 100), RangeError);
  assert.throws(() => getAttendanceProjection(1, 2, 0), RangeError);
});

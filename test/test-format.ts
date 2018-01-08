import 'mocha';
import { expect } from 'chai';

import { formatTime, formatPercentage } from '../src/common/format';

describe('format', () => {
  describe('formatTime', () => {
    const TESTS: [ number, string ][] = [
      [    0,    '0:00' ],
      [    1,    '0:01' ],
      [   10,    '0:10' ],
      [   60,    '1:00' ],
      [   61,    '1:01' ],
      [   70,    '1:10' ],
      [  610,   '10:10' ],
      [ 3600, '1:00:00' ],
      [ 3661, '1:01:01' ],
      [ 4210, '1:10:10' ],
    ];

    TESTS.forEach(([ input, output]) => {
      it(`should output '${output}' for ${input}`, () => {
        expect(formatTime(input)).to.equal(output);
      });
    });
  });

  describe('formatPercentage', () => {
    const TESTS: [ number, string ][] = [
      [     0,   '0%' ],
      [   0.1,  '10%' ],
      [ 0.011, '1.1%' ],
      [  0.56,  '56%' ], // This one actually surfaced in the UI. .56 * 100 = 56.00000000000001.
      [     1, '100%' ],
      [  1.00, '100%' ],
    ];

    TESTS.forEach(([ input, output]) => {
      it(`should output '${output}' for ${input}`, () => {
        expect(formatPercentage(input)).to.equal(output);
      });
    });
  });
});

import { Injectable } from '@nestjs/common';
import type { Indicator } from './indicator.interface';
import { validateIndicatorValues } from './indicator-validation';
import type { CrossoverInput, CrossoverResult } from './crossover.types';

@Injectable()
export class CrossoverService implements Indicator<
  CrossoverInput,
  CrossoverResult
> {
  calculate(input: CrossoverInput): CrossoverResult {
    validateIndicatorValues(input.left);
    validateIndicatorValues(input.right);

    if (input.left.length !== input.right.length) {
      throw new Error('Crossover series must have the same length');
    }

    if (input.left.length < 2) {
      throw new Error(
        'Crossover detection requires at least two aligned values',
      );
    }

    const previousIndex = input.left.length - 2;

    const currentIndex = input.left.length - 1;

    const previousLeft = input.left[previousIndex];

    const previousRight = input.right[previousIndex];

    const currentLeft = input.left[currentIndex];

    const currentRight = input.right[currentIndex];

    if (
      previousLeft === undefined ||
      previousRight === undefined ||
      currentLeft === undefined ||
      currentRight === undefined
    ) {
      throw new Error('Crossover series is incomplete');
    }

    if (previousLeft <= previousRight && currentLeft > currentRight) {
      return {
        type: 'CROSS_ABOVE',
        crossed: true,
        previousLeft,
        previousRight,
        currentLeft,
        currentRight,
      };
    }

    if (previousLeft >= previousRight && currentLeft < currentRight) {
      return {
        type: 'CROSS_BELOW',
        crossed: true,
        previousLeft,
        previousRight,
        currentLeft,
        currentRight,
      };
    }

    return {
      type: 'NONE',
      crossed: false,
      previousLeft,
      previousRight,
      currentLeft,
      currentRight,
    };
  }
}

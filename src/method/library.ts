/**
 * The shared `mut.*` misconception library: one JSON per family of slips,
 * merged here, so the loader imports ONE module and a new question adds a
 * file to this list (domain data), never a line of the loader.
 */
import baseLibrary from '../content/methodMutations.misconceptions.json';
import q2Library from '../content/methodMutations.q2.misconceptions.json';
import q3Library from '../content/methodMutations.q3.misconceptions.json';
// Registers the domain templates (Question 2, 3) the moment the library is loaded.
import './templatesUrn';
import './templatesBinomial';

export const MUTATION_LIBRARIES: readonly unknown[][] = [
  baseLibrary,
  q2Library,
  q3Library,
];

export const mutationLibrary = (): unknown[] => MUTATION_LIBRARIES.flat();

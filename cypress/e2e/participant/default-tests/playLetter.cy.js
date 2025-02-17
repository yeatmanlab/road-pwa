import { playLetter } from '../../../support/helper-functions/roar-letter/letterHelpers';
import { isCurrentVersion } from '../../../support/utils';

const app = '@bdelab/roar-letter';

describe('ROAR - Letra Play Through', () => {
  it('Plays Letra', () => {
    cy.wrap(isCurrentVersion(app)).then((isCurrentVersion) => {
      if (isCurrentVersion) {
        cy.log(`Did not detect a new version of ${app}, skipping test.`);
      } else {
        cy.log(`Detected a new version of ${app}, running test.`);
        playLetter();
      }
    });
  });
});

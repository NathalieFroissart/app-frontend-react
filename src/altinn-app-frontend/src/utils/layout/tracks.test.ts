import { getLayoutOrderFromTracks } from 'src/utils/layout/tracks';

describe('getLayoutOrderFromTracks', () => {
  it('should hide a layout after layout expressions have been evaluated', () => {
    expect(
      getLayoutOrderFromTracks({
        order: ['first', 'second', 'third'],
        hidden: ['second'],
        hiddenExpr: {},
      }),
    ).toEqual(['first', 'third']);
  });

  it('should not affect the order sent from the server', () => {
    expect(
      getLayoutOrderFromTracks({
        order: ['4', '3', '2', '1'],
        hidden: ['2', '3'],
        hiddenExpr: {},
      }),
    ).toEqual(['4', '1']);
  });
});

import clientThemeFrom from './clientTheme';
import muiTheme from '../../styles/muiTheme';

describe('clientThemeFrom', () => {
  test('returns the base theme when there is no brand', () => {
    expect(clientThemeFrom(null)).toBe(muiTheme);
    expect(clientThemeFrom({})).toBe(muiTheme);
  });

  test('overrides only the palette from branding colours', () => {
    const theme = clientThemeFrom({ primaryColor: '#0B5FFF', secondaryColor: '#FF00AA' });
    expect(theme.palette.primary.main).toBe('#0B5FFF');
    expect(theme.palette.secondary.main).toBe('#FF00AA');
    // Inherits the base theme's typography untouched.
    expect(theme.typography.fontFamily).toBe(muiTheme.typography.fontFamily);
  });

  test('a single colour still inherits the rest', () => {
    const theme = clientThemeFrom({ primaryColor: '#123456' });
    expect(theme.palette.primary.main).toBe('#123456');
    expect(theme.palette.secondary.main).toBe(muiTheme.palette.secondary.main);
  });
});

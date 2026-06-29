import { createTheme } from '@mui/material/styles';

import muiTheme from '../../styles/muiTheme';

// White-label: inherit the base TTA theme and override ONLY the palette from the
// client's branding record. Structure/components/spacing stay identical for
// every funder; colours change. An empty/absent brand falls back to muiTheme.
export default function clientThemeFrom(brand) {
  if (!brand || (!brand.primaryColor && !brand.secondaryColor)) {
    return muiTheme;
  }
  return createTheme({
    ...muiTheme,
    palette: {
      ...muiTheme.palette,
      ...(brand.primaryColor
        ? { primary: { ...muiTheme.palette.primary, main: brand.primaryColor } }
        : {}),
      ...(brand.secondaryColor
        ? { secondary: { ...muiTheme.palette.secondary, main: brand.secondaryColor } }
        : {}),
    },
  });
}

// project import
import Default from './default';
import Theme3 from './theme3';
import Theme5 from './theme5';
import Theme6 from './theme6';
import Theme8 from './theme8';

// types
import { PaletteThemeProps } from 'common/types/theme';
import { PalettesProps } from '@ant-design/colors';
import { ThemeMode, PresetColor } from 'access/types/config';

// ==============================|| PRESET THEME - THEME SELECTOR ||============================== //

const Theme = (colors: PalettesProps, presetColor: PresetColor, mode: ThemeMode): PaletteThemeProps => {
  switch (presetColor) {
    case 'theme3':
      return Theme3(colors, mode);
    case 'theme5':
      return Theme5(colors, mode);
    case 'theme6':
      return Theme6(colors, mode);
    case 'theme8':
      return Theme8(colors, mode);
    default:
      return Default(colors, mode);
  }
};

export default Theme;

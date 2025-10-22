// project import
// import samplePage from './sample-page';
import financePages from './finance';
import ownerPages from './owner';

// types
import { NavItemType } from 'common/types/menu';

// ==============================|| MENU ITEMS ||============================== //

const menuItems: { items: NavItemType[] } = {
  items: [ownerPages, financePages]
};

export default menuItems;

// type
import { NavItemType } from 'common/types/menu';
import { UnorderedListOutlined } from '@ant-design/icons';

const icons = {
  UnorderedListOutlined
};

// ==============================|| MENU ITEMS - PAGES ||============================== //

const ownerPages: NavItemType = {
  id: 'owners',
  type: 'group',
  children: [
    {
      id: 'owner',
      title: 'Owners',
      type: 'collapse',
      children: [
        {
          id: 'ownerlist',
          title: 'Owners List',
          type: 'item',
          url: '/owner/list',
          icon: icons.UnorderedListOutlined
        }
      ]
    }
  ]
};

export default ownerPages;

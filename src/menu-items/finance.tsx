// src/menu-items/finance.tsx
// assets
import { BankOutlined, PlusCircleOutlined, UnorderedListOutlined } from '@ant-design/icons';

// type
import { NavItemType } from 'common/types/menu';

// icons
const icons = {
  BankOutlined,
  PlusCircleOutlined,
  UnorderedListOutlined
};

// ==============================|| MENU ITEMS - FINANCE ||============================== //

const financePages: NavItemType = {
  id: 'finance',
  type: 'group',
  children: [
    {
      id: 'finance-company',
      title: 'Finance',
      type: 'collapse',
      icon: icons.BankOutlined,
      children: [
        {
          id: 'finance-list',
          title: 'Companies',
          type: 'item',
          url: '/finance/list',
          icon: icons.UnorderedListOutlined
        },
        {
          id: 'add-finance',
          title: 'Add Company',
          type: 'item',
          url: '/finance/add',
          icon: icons.PlusCircleOutlined
        }
      ]
    }
  ]
};

export default financePages;

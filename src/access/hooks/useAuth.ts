import { useContext } from 'react';

// auth provider - Changed to Firebase
import AuthContext from 'access/contexts/fireBaseContext';

// ==============================|| AUTH HOOKS ||============================== //

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) throw new Error('context must be use inside provider');

  return context;
};

export default useAuth;

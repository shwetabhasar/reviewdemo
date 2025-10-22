import { useContext } from 'react';
import { ConfigContext } from 'common/contexts/ConfigContext';

// ==============================|| CONFIG - HOOKS ||============================== //

const useConfig = () => useContext(ConfigContext);

export default useConfig;

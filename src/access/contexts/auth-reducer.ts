// action - state management
import { REGISTER, LOGIN, LOGOUT } from 'access/contexts/actions';

// types
import { AuthProps, AuthActionProps } from 'access/types/auth';

// initial state
export const initialState: AuthProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

// ==============================|| AUTH REDUCER ||============================== //

const AuthReducer = (state = initialState, action: AuthActionProps) => {
  switch (action.type) {
    case REGISTER: {
      const { user } = action.payload!;
      return {
        ...state,
        user
      };
    }
    case LOGIN: {
      const { user } = action.payload!;
      return {
        ...state,
        isLoggedIn: true,
        isInitialized: true,
        user
      };
    }
    case LOGOUT: {
      return {
        ...state,
        isInitialized: true,
        isLoggedIn: false,
        user: null
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default AuthReducer;

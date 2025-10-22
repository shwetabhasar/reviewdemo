import React, { createContext, useEffect, useReducer } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { LOGIN, LOGOUT } from './actions';
import authReducer from './auth-reducer';
import Loader from 'components/appseeds/common/Loader';
import { AuthProps, JWTContextType } from '../types/auth';

const initialState: AuthProps = {
  isLoggedIn: false,
  isInitialized: false,
  user: null
};

const FirebaseContext = createContext<JWTContextType | null>(null);

export const FirebaseProvider = ({ children }: { children: React.ReactElement }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      try {
        if (firebaseUser) {
          // Get user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user = {
              ...userData,
              id: firebaseUser.uid,
              email: firebaseUser.email || userData.email || '',
              username: userData.username || userData.name || firebaseUser.email || '',
              name: userData.name || '',
              role: userData.role || 'user',
              phone_number: userData.phone || userData.phone_number || '',
              showroomId: userData.showroomId || userData.showroomid || ''
            };

            dispatch({
              type: LOGIN,
              payload: {
                isLoggedIn: true,
                user: user
              }
            });
          } else {
            // Create user document if it doesn't exist
            const newUserData = {
              email: firebaseUser.email || '',
              username: firebaseUser.email || '',
              role: 'user',
              createdAt: new Date()
            };

            await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);

            const user = {
              ...newUserData,
              id: firebaseUser.uid,
              email: firebaseUser.email || newUserData.email || '',
              username: newUserData.username || firebaseUser.email || '',
              role: newUserData.role || 'user'
            };

            dispatch({
              type: LOGIN,
              payload: {
                isLoggedIn: true,
                user: user
              }
            });
          }
        } else {
          dispatch({ type: LOGOUT });
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        dispatch({ type: LOGOUT });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const user = {
          ...userData,
          id: firebaseUser.uid,
          email: firebaseUser.email || userData.email || '',
          username: userData.username || userData.name || firebaseUser.email || '',
          name: userData.name || '',
          role: userData.role || 'user',
          phone_number: userData.phone || userData.phone_number || '',
          showroomId: userData.showroomId || userData.showroomid || ''
        };

        dispatch({
          type: LOGIN,
          payload: {
            isLoggedIn: true,
            user: user
          }
        });

        return { success: true, message: 'You are logged in successfully!' };
      } else {
        // Create user document if it doesn't exist
        const newUserData = {
          email: firebaseUser.email || '',
          username: firebaseUser.email || '',
          role: 'user',
          createdAt: new Date()
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUserData);

        const user = {
          ...newUserData,
          id: firebaseUser.uid,
          email: firebaseUser.email || newUserData.email || '',
          username: newUserData.username || firebaseUser.email || '',
          role: newUserData.role || 'user'
        };

        dispatch({
          type: LOGIN,
          payload: {
            isLoggedIn: true,
            user: user
          }
        });

        return { success: true, message: 'You are logged in successfully!' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';

      // Firebase error handling
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        default:
          errorMessage = error.message || 'Login failed. Please try again.';
      }

      throw new Error(errorMessage);
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      const userData = {
        email: firebaseUser.email || '',
        username: email,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        role: 'user',
        createdAt: new Date()
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);

      return { success: true, message: 'Registration successful!' };
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = 'Registration failed. Please try again.';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already registered.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password should be at least 6 characters.';
          break;
        default:
          errorMessage = error.message || 'Registration failed. Please try again.';
      }

      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('currentShowroom');
      dispatch({ type: LOGOUT });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    // Implement password reset if needed
  };

  const updateProfile = () => {
    // Implement profile update if needed
  };

  if (state.isInitialized !== undefined && !state.isInitialized) {
    return <Loader />;
  }

  return (
    <FirebaseContext.Provider value={{ ...state, login, logout, register, resetPassword, updateProfile }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseContext;

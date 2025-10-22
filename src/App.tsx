// src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';

// project import
import router from 'routes';
import ThemeCustomization from 'common/themes';
import Locales from 'components/Locales';
import ScrollTop from 'components/ScrollTop';
import Snackbar from 'components/@extended/Snackbar';
import Notistack from '@components/Notistack';

// auth-provider - Firebase
import { FirebaseProvider as AuthProvider } from 'access/contexts/fireBaseContext';
import { ShowroomProvider } from 'access/contexts/showRoomContext';

// Firebase offline support
import { initializeFirebaseOfflineSupport } from 'access/config/firebase';

// ==============================|| APP - THEME, ROUTER, LOCAL ||============================== //

const App = () => {
  // Initialize Firebase offline support when app starts
  useEffect(() => {
    const initializeOfflineSupport = async () => {
      try {
        await initializeFirebaseOfflineSupport();
        console.log('✅ Firebase offline support initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing Firebase offline support:', error);
      }
    };

    initializeOfflineSupport();
  }, []);

  return (
    <ThemeCustomization>
      <Locales>
        <ScrollTop>
          <AuthProvider>
            <ShowroomProvider>
              <>
                <Notistack>
                  <RouterProvider router={router} />
                  <Snackbar />
                </Notistack>
              </>
            </ShowroomProvider>
          </AuthProvider>
        </ScrollTop>
      </Locales>
    </ThemeCustomization>
  );
};

export default App;

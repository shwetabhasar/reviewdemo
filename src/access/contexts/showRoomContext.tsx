// showroomContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';
import useAuth from '../hooks/useAuth';

interface ShowroomContextType {
  currentShowroom: {
    showroomId: string;
    showroomName: string;
    companyName?: string; // Make companyName optional
  } | null;
  setCurrentShowroom: (showroom: any) => void;
  loading: boolean;
  error: string | null;
}

const ShowroomContext = createContext<ShowroomContextType | null>(null);

export const ShowroomProvider = ({ children }: { children: React.ReactElement }) => {
  // Initialize from localStorage
  const initialShowroom = React.useMemo(() => {
    try {
      const storedShowroom = localStorage.getItem('currentShowroom');
      return storedShowroom ? JSON.parse(storedShowroom) : null;
    } catch (error) {
      console.error('Error reading showroom from localStorage:', error);
      return null;
    }
  }, []);

  const [currentShowroom, setCurrentShowroomState] = React.useState<ShowroomContextType['currentShowroom']>(initialShowroom);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { user } = useAuth();

  const updateCurrentShowroom = React.useCallback(async (showroom: any) => {
    if (!showroom) {
      localStorage.removeItem('currentShowroom');
      setCurrentShowroomState(null);
      return;
    }

    // Handle different property names and ensure data consistency
    const showroomData: any = {
      showroomId: showroom.id || showroom.showroomId,
      showroomName: showroom.showroomName || showroom.name
    };

    // Only add companyName if it exists
    const companyName = showroom.companyName || showroom.company_name;
    if (companyName) {
      showroomData.companyName = companyName;
    }

    // Save to localStorage
    localStorage.setItem('currentShowroom', JSON.stringify(showroomData));
    setCurrentShowroomState(showroomData);

    // Also save to Firestore if user is authenticated
    if (auth.currentUser) {
      try {
        // Filter out undefined values before saving to Firestore
        const firestoreData = Object.entries(showroomData).reduce((acc, [key, value]) => {
          if (value !== undefined) {
            acc[key] = value;
          }
          return acc;
        }, {} as any);

        await setDoc(doc(db, 'users', auth.currentUser.uid, 'preferences', 'currentShowroom'), firestoreData);
      } catch (error) {
        console.error('Error saving showroom to Firestore:', error);
      }
    }
  }, []);

  // Fetch showroom from Firestore when user changes
  const fetchUserShowroom = React.useCallback(
    async (showroomId: string) => {
      setLoading(true);
      setError(null);

      try {
        const showroomDoc = await getDoc(doc(db, 'showrooms', showroomId));

        if (showroomDoc.exists()) {
          const showroomData = {
            showroomId: showroomDoc.id,
            ...showroomDoc.data()
          };
          await updateCurrentShowroom(showroomData);
        } else {
          setError('Showroom not found');
          console.error('Showroom document does not exist:', showroomId);
        }
      } catch (error: any) {
        console.error('Error fetching showroom:', error);
        setError(error.message || 'Failed to fetch showroom');
      } finally {
        setLoading(false);
      }
    },
    [updateCurrentShowroom]
  );

  // Load showroom when user logs in or changes
  useEffect(() => {
    const loadShowroom = async () => {
      // If user is logged in and has showroomId
      if (user && user.showroomId) {
        // First check if we already have the correct showroom loaded
        if (currentShowroom?.showroomId === user.showroomId) {
          return; // Already loaded
        }

        // Fetch the showroom data
        await fetchUserShowroom(user.showroomId);
      } else if (user && !user.showroomId) {
        // User is logged in but doesn't have a showroom assigned
        setError('No showroom assigned to user');
        console.error('User does not have showroomId:', user);
      } else if (!user) {
        // User logged out - clear showroom
        updateCurrentShowroom(null);
      }
    };

    loadShowroom();
  }, [user, user?.showroomId, fetchUserShowroom, currentShowroom?.showroomId, updateCurrentShowroom]);

  // Load showroom preference from Firestore when component mounts
  useEffect(() => {
    const loadShowroomFromFirestore = async () => {
      if (auth.currentUser && !currentShowroom) {
        try {
          const showroomDoc = await getDoc(doc(db, 'users', auth.currentUser.uid, 'preferences', 'currentShowroom'));
          if (showroomDoc.exists()) {
            updateCurrentShowroom(showroomDoc.data());
          }
        } catch (error: any) {
          // Check if it's a permissions error
          if (error.code === 'permission-denied') {
            console.log('No permission to load showroom preferences - this is normal for new users');
          } else {
            console.error('Error loading showroom from Firestore:', error);
          }
        }
      }
    };

    loadShowroomFromFirestore();
  }, [updateCurrentShowroom, currentShowroom]);

  return (
    <ShowroomContext.Provider
      value={{
        currentShowroom,
        setCurrentShowroom: updateCurrentShowroom,
        loading,
        error
      }}
    >
      {children}
    </ShowroomContext.Provider>
  );
};

export const useShowroom = () => {
  const context = useContext(ShowroomContext);
  if (!context) {
    throw new Error('useShowroom must be used within a ShowroomProvider');
  }
  return context;
};

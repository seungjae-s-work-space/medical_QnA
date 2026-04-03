import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'user' | null
  const [loading, setLoading] = useState(true);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Firestore에서 사용자 역할 조회
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser(currentUser);
          setUserRole(userData.role || 'user');
        } else {
          // users 컬렉션에 문서가 없으면 기본 user 역할
          setUser(currentUser);
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole(null);
        setHasActiveSubscription(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 구독 상태 실시간 리스닝
  useEffect(() => {
    if (!user || userRole === 'admin') {
      if (userRole === 'admin') setHasActiveSubscription(true);
      return;
    }

    const q = query(
      collection(db, 'subscriptions'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const hasValid = snapshot.docs.some((doc) => {
        const data = doc.data();
        const endDate = data.endDate?.toDate?.() || new Date(0);
        return endDate > now;
      });
      setHasActiveSubscription(hasValid);
    });

    return unsubscribe;
  }, [user, userRole]);

  // 계산된 권한
  const isAdmin = userRole === 'admin';
  const isLoggedIn = user !== null;

  const value = {
    user,
    userRole,
    loading,
    isAdmin,
    isLoggedIn,
    hasActiveSubscription,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

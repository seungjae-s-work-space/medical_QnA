import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../firebase';

const AuthContext = createContext(null);

function hasAdminClaim(claims = {}) {
  return claims.admin === true || claims.role === 'admin';
}

async function ensureAdminAuthClaim(currentUser, role) {
  if (role !== 'admin') return;

  const tokenResult = await currentUser.getIdTokenResult();
  if (hasAdminClaim(tokenResult.claims)) return;

  const ensureAdminClaim = httpsCallable(functions, 'ensureAdminAuthClaim');
  await ensureAdminClaim();
  await currentUser.getIdToken(true);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'user' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Firestore에서 사용자 역할 조회
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const role = userData.role || 'user';
          try {
            await ensureAdminAuthClaim(currentUser, role);
          } catch (error) {
            console.warn('Admin auth claim sync failed:', error);
          }
          setUser(currentUser);
          setUserRole(role);
        } else {
          // users 컬렉션에 문서가 없으면 기본 user 역할
          setUser(currentUser);
          setUserRole('user');
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // 계산된 권한
  const isAdmin = userRole === 'admin';
  const isLoggedIn = user !== null;

  const value = {
    user,
    userRole,
    loading,
    isAdmin,
    isLoggedIn,
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

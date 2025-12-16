import { Injectable, OnInit, OnDestroy } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';
import { Database, ref, push, onValue, set } from '@angular/fire/database';
import { getApp } from 'firebase/app';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService implements OnInit, OnDestroy {
  private authStateSubscriptions = new Set<() => void>();
  private initializationAttempts = 0;
  private readonly maxInitAttempts = 3;
  private isInitialized = false;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private database: Database
  ) {
    console.log('🔥 FirebaseService constructor called');
  }

  ngOnInit() {
    this.initializeFirebaseService();
  }

  ngOnDestroy() {
    this.cleanupAllAuthStateListeners();
  }

  /**
   * Initialize Firebase service with safeguards
   */
  private initializeFirebaseService(): void {
    if (this.initializationAttempts >= this.maxInitAttempts) {
      console.error('❌ Firebase service initialization failed after maximum attempts');
      return;
    }

    this.initializationAttempts++;

    try {
      console.log(`🔧 Initializing Firebase service (attempt ${this.initializationAttempts})`);
      
      // 🔥 Verify single Firebase app instance
      const app = getApp();
      console.log('✅ Firebase Service initialized with app:', app.name);
      console.log('✅ Auth instance:', this.auth.app.name);
      console.log('✅ Firestore instance:', this.firestore.app.name);
      console.log('✅ Database instance:', this.database.app.name);
      
      // Ensure all instances belong to the same app
      if (this.auth.app.name !== this.firestore.app.name || 
          this.auth.app.name !== this.database.app.name) {
        console.warn('⚠️  Firebase instances belong to different apps!');
        throw new Error('Firebase instances belong to different apps');
      }

      // Verify Firebase configuration
      this.verifyFirebaseConfig(app);
      
      this.isInitialized = true;
      console.log('✅ Firebase service initialized successfully');

    } catch (error) {
      console.error('❌ Firebase Service initialization error:', error);
      
      if (this.initializationAttempts < this.maxInitAttempts) {
        const delay = 1000 * this.initializationAttempts; // Exponential backoff
        console.log(`⏳ Retrying Firebase initialization in ${delay}ms...`);
        setTimeout(() => this.initializeFirebaseService(), delay);
      }
    }
  }

  /**
   * Verify Firebase configuration
   */
  private verifyFirebaseConfig(app: any): void {
    const config = app.options;
    const requiredFields = ['apiKey', 'authDomain', 'projectId'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required Firebase config field: ${field}`);
      }
    }
    
    console.log('✅ Firebase configuration verified');
  }

  // ✅ Instance getters for compatibility
  getAuthInstance(): Auth {
    this.ensureInitialized();
    return this.auth;
  }

  getFirestoreInstance(): Firestore {
    this.ensureInitialized();
    return this.firestore;
  }

  getDatabaseInstance(): Database {
    this.ensureInitialized();
    return this.database;
  }

  /**
   * Ensure service is initialized before use
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Firebase service not initialized. Please wait for initialization to complete.');
    }
  }

  // 🔍 Get Firebase app instance for debugging
  getFirebaseApp() {
    try {
      return getApp();
    } catch (error) {
      console.error('❌ Failed to get Firebase app instance:', error);
      throw error;
    }
  }

  /**
   * Enhanced auth state change listener with cleanup
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    this.ensureInitialized();
    
    console.log('🔗 Setting up auth state change listener');
    
    // Create a bound callback to prevent context issues
    const boundCallback = (user: User | null) => {
      try {
        console.log('Auth state callback triggered:', user ? 'User present' : 'No user');
        callback(user);
      } catch (error) {
        console.error('Error in auth state callback:', error);
      }
    };

    // Subscribe and store the unsubscribe function
    const unsubscribe = onAuthStateChanged(this.auth, boundCallback);
    
    // Store the unsubscribe function for cleanup
    this.authStateSubscriptions.add(unsubscribe);
    
    // Return a wrapper that also removes from our tracking set
    return () => {
      unsubscribe();
      this.authStateSubscriptions.delete(unsubscribe);
      console.log('Auth state listener removed');
    };
  }

  /**
   * Clean up all auth state listeners
   */
  private cleanupAllAuthStateListeners(): void {
    console.log(`🧹 Cleaning up ${this.authStateSubscriptions.size} auth state listeners`);
    
    this.authStateSubscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up auth listener:', error);
      }
    });
    
    this.authStateSubscriptions.clear();
  }

  // ✅ Authentication methods
  async signIn(email: string, password: string): Promise<User> {
    this.ensureInitialized();
    
    try {
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User signed in successfully:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string): Promise<User> {
    this.ensureInitialized();
    
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('✅ User signed up successfully:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('❌ Sign up error:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await signOut(this.auth);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current user with enhanced error handling
   */
  async getCurrentUser(): Promise<User | null> {
    this.ensureInitialized();
    
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(this.auth, (user) => {
        try {
          unsub();
          resolve(user);
        } catch (error) {
          console.error('Error getting current user:', error);
          unsub();
          resolve(null);
        }
      }, (error) => {
        console.error('Error in auth state listener:', error);
        unsub();
        resolve(null);
      });
    });
  }

  // 🔐 ID Token Management with enhanced error handling
  async getCurrentIdToken(forceRefresh = false): Promise<string | null> {
    this.ensureInitialized();
    
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.warn('No authenticated user available for ID token');
        return null;
      }
      
      const idToken = await user.getIdToken(forceRefresh);
      console.log('🔐 ID token retrieved:', idToken ? idToken.substring(0, 20) + '...' : 'null');
      return idToken;
      
    } catch (error) {
      console.error('❌ Failed to get ID token:', error);
      return null;
    }
  }

  /**
   * Verify Firebase service authentication with timeout
   */
  async verifyFirebaseAuth(): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('❌ No user authenticated');
        return false;
      }
      
      const idToken = await user.getIdToken();
      if (!idToken) {
        console.log('❌ No ID token available');
        return false;
      }
      
      console.log('✅ Firebase authentication verified');
      console.log('User UID:', user.uid);
      console.log('Token obtained successfully');
      
      return true;
      
    } catch (error) {
      console.error('❌ Firebase auth verification failed:', error);
      return false;
    }
  }

  /**
   * Debug ID token status with enhanced logging
   */
  async debugIdToken(): Promise<void> {
    this.ensureInitialized();
    
    try {
      const user = await this.getCurrentUser();
      console.log('🔍 Current user:', user?.uid);
      
      if (user) {
        const idToken = await user.getIdToken();
        console.log('🔐 ID Token available:', !!idToken);
        console.log('🔐 Token preview:', idToken ? idToken.substring(0, 20) + '...' : 'null');
        
        // Test token by getting it again (this will refresh if needed)
        const freshToken = await user.getIdToken(true);
        console.log('🔄 Fresh token obtained:', !!freshToken);
        
        // Verify token is valid JSON
        try {
          const payload = JSON.parse(atob(freshToken.split('.')[1]));
          console.log('🔐 Token payload preview:', {
            uid: payload.uid,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            aud: payload.aud,
            iss: payload.iss
          });
        } catch (parseError) {
          console.error('Failed to parse token payload:', parseError);
        }
      }
    } catch (error) {
      console.error('❌ ID token debug failed:', error);
    }
  }

  // ✅ Firestore methods with error handling
  async addDocument(collectionName: string, data: any, docId?: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const docRef = docId
        ? doc(this.firestore, collectionName, docId)
        : doc(collection(this.firestore, collectionName));

      await setDoc(docRef, { ...data, id: docRef.id });
      console.log('✅ Document added to:', collectionName);
    } catch (error) {
      console.error('❌ Error adding document:', error);
      throw error;
    }
  }

  async getDocument(collectionName: string, docId: string): Promise<any> {
    this.ensureInitialized();
    
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.log('❌ No such document:', docId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting document:', error);
      throw error;
    }
  }

  async getDocuments(collectionName: string, conditions?: any[]): Promise<any[]> {
    this.ensureInitialized();
    
    try {
      let q: any = collection(this.firestore, collectionName);

      if (conditions?.length) {
        q = query(q, ...conditions.map(c => where(c.field, c.operator, c.value)));
      }

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error getting documents:', error);
      throw error;
    }
  }

  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    this.ensureInitialized();
    
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await updateDoc(docRef, data);
      console.log('✅ Document updated:', docId);
    } catch (error) {
      console.error('❌ Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await deleteDoc(docRef);
      console.log('✅ Document deleted:', docId);
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  // ✅ Realtime Database methods with error handling
  async addToRealtimeDatabase(path: string, data: any): Promise<any> {
    this.ensureInitialized();
    
    try {
      const dbRef = ref(this.database, path);
      const newRef = push(dbRef);
      await set(newRef, { ...data, id: newRef.key });
      console.log('✅ Data added to Realtime Database:', path);
      return { id: newRef.key, ...data };
    } catch (error) {
      console.error('❌ Error adding to Realtime Database:', error);
      throw error;
    }
  }

  /**
   * Subscribe to Realtime Database with cleanup
   */
  subscribeToRealtimeDatabase(path: string, callback: (data: any) => void): () => void {
    this.ensureInitialized();
    
    try {
      const dbRef = ref(this.database, path);
      const unsubscribe = onValue(dbRef, snap => {
        try {
          callback(snap.val());
        } catch (error) {
          console.error('Error in Realtime Database callback:', error);
        }
      }, (error) => {
        console.error('Realtime Database subscription error:', error);
      });
      
      // Return a wrapper that handles cleanup
      return () => {
        try {
          unsubscribe();
          console.log('Realtime Database subscription cleaned up');
        } catch (error) {
          console.error('Error cleaning up Realtime Database subscription:', error);
        }
      };
    } catch (error) {
      console.error('❌ Error setting up Realtime Database subscription:', error);
      throw error;
    }
  }

  /**
   * Check if Firebase service is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get initialization status for debugging
   */
  getInitializationStatus(): { attempts: number; isInitialized: boolean; maxAttempts: number } {
    return {
      attempts: this.initializationAttempts,
      isInitialized: this.isInitialized,
      maxAttempts: this.maxInitAttempts
    };
  }
}
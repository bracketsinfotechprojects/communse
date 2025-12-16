import { Injectable, OnInit } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';
import { Database, ref, push, onValue, set } from '@angular/fire/database';
import { getApp } from 'firebase/app';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService implements OnInit {

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private database: Database
  ) {}

  ngOnInit() {
    // 🔥 Verify single Firebase app instance
    try {
      const app = getApp();
      console.log('✅ Firebase Service initialized with app:', app.name);
      console.log('✅ Auth instance:', this.auth.app.name);
      console.log('✅ Firestore instance:', this.firestore.app.name);
      console.log('✅ Database instance:', this.database.app.name);
      
      // Ensure all instances belong to the same app
      if (this.auth.app.name !== this.firestore.app.name || 
          this.auth.app.name !== this.database.app.name) {
        console.warn('⚠️  Firebase instances belong to different apps!');
      }
    } catch (error) {
      console.error('❌ Firebase Service initialization error:', error);
    }
  }

  // ✅ Instance getters for compatibility
  getAuthInstance(): Auth {
    return this.auth;
  }

  getFirestoreInstance(): Firestore {
    return this.firestore;
  }

  getDatabaseInstance(): Database {
    return this.database;
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

  // ✅ Auth state change listener
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  // ✅ Authentication
  async signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  async signUp(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    return result.user;
  }

  signOut() {
    return signOut(this.auth);
  }

  getCurrentUser(): Promise<User | null> {
    return new Promise(resolve => {
      const unsub = onAuthStateChanged(this.auth, user => {
        unsub();
        resolve(user);
      });
    });
  }

  // 🔐 ID Token Management
  async getCurrentIdToken(forceRefresh = false): Promise<string | null> {
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
   * Verify Firebase service authentication
   */
  async verifyFirebaseAuth(): Promise<boolean> {
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
   * Debug ID token status
   */
  async debugIdToken(): Promise<void> {
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
      }
    } catch (error) {
      console.error('❌ ID token debug failed:', error);
    }
  }

  // ✅ Firestore
  addDocument(collectionName: string, data: any, docId?: string) {
    const docRef = docId
      ? doc(this.firestore, collectionName, docId)
      : doc(collection(this.firestore, collectionName));

    return setDoc(docRef, { ...data, id: docRef.id });
  }

  getDocument(collectionName: string, docId: string) {
    const docRef = doc(this.firestore, collectionName, docId);
    return getDoc(docRef);
  }

  async getDocuments(collectionName: string, conditions?: any[]): Promise<any[]> {
    let q: any = collection(this.firestore, collectionName);

    if (conditions?.length) {
      q = query(q, ...conditions.map(c => where(c.field, c.operator, c.value)));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  updateDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(this.firestore, collectionName, docId);
    return updateDoc(docRef, data);
  }

  deleteDocument(collectionName: string, docId: string) {
    const docRef = doc(this.firestore, collectionName, docId);
    return deleteDoc(docRef);
  }

  // ✅ Realtime Database
  addToRealtimeDatabase(path: string, data: any) {
    const dbRef = ref(this.database, path);
    const newRef = push(dbRef);
    return set(newRef, { ...data, id: newRef.key });
  }

  subscribeToRealtimeDatabase(path: string, callback: (data: any) => void) {
    const dbRef = ref(this.database, path);
    return onValue(dbRef, snap => callback(snap.val()));
  }
}
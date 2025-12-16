import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { getApp } from 'firebase/app';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    
    // 🔥 Single Firebase App initialization with duplicate protection
    provideFirebaseApp(() => {
      try {
        return initializeApp(environment.firebase);
      } catch (error: any) {
        // If app already exists, return existing instance
        if (error.code === 'app/duplicate-app') {
          console.warn('Firebase app already initialized, using existing instance');
          return getApp();
        }
        throw error;
      }
    }),
    
    // Firebase services with single instance guarantee
    provideAuth(() => {
      try {
        return getAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
        throw error;
      }
    }),
    
    provideFirestore(() => {
      try {
        return getFirestore();
      } catch (error) {
        console.error('Firestore initialization error:', error);
        throw error;
      }
    }),
    
    provideDatabase(() => {
      try {
        return getDatabase();
      } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
      }
    })
  ]
};

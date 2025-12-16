import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseConfigService {
  private readonly API_BASE_URL = 'http://localhost:5000';
  private configSubject = new BehaviorSubject<FirebaseConfig | null>(null);
  public config$ = this.configSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get Firebase configuration from backend
   */
  getFirebaseConfig(): Observable<FirebaseConfig> {
    return this.http.get<FirebaseConfig>(`${this.API_BASE_URL}/firebase/config`);
  }

  /**
   * Load Firebase configuration dynamically
   */
  async loadFirebaseConfig(): Promise<void> {
    try {
      const config = await this.getFirebaseConfig().toPromise();
      if (config) {
        this.configSubject.next(config);
        console.log('Firebase configuration loaded dynamically:', config.projectId);
      }
    } catch (error) {
      console.error('Failed to load Firebase config:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getCurrentConfig(): FirebaseConfig | null {
    return this.configSubject.value;
  }

  /**
   * Check if config is loaded
   */
  isConfigLoaded(): boolean {
    return this.configSubject.value !== null;
  }
}
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-firebase-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="firebase-test-container">
      <h2>Firebase Connectivity Test</h2>
      
      <!-- Status Display -->
      <div class="test-section">
        <h3>Firebase Status</h3>
        <div [class]="statusClass">{{ statusMessage }}</div>
      </div>

      <div class="test-section">
        <h3>Test Results</h3>
        <div id="test-logs" class="logs">
          <div *ngFor="let log of testLogs" [class]="'log-entry ' + log.type">
            [{{ log.timestamp }}] {{ log.message }}
          </div>
        </div>
      </div>

      <div class="test-section">
        <button (click)="runFirebaseTest()" [disabled]="isRunning || !firebaseReady">
          {{ isRunning ? 'Running Tests...' : 'Run Firebase Tests' }}
        </button>
        <button (click)="clearLogs()">Clear Logs</button>
        <button (click)="checkFirebaseStatus()">Check Status</button>
      </div>

      <!-- Auth State Monitor -->
      <div class="test-section" *ngIf="currentUser">
        <h3>Current Auth State</h3>
        <div class="auth-info">
          <strong>User ID:</strong> {{ currentUser.uid }}<br>
          <strong>Email:</strong> {{ currentUser.email || 'Not available' }}<br>
          <strong>Email Verified:</strong> {{ currentUser.emailVerified ? 'Yes' : 'No' }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .firebase-test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .test-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .status {
      padding: 10px;
      border-radius: 5px;
      font-weight: bold;
    }
    .status.success { background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status.error { background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .status.info { background-color: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    .status.warning { background-color: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    .logs {
      background-color: #f8f9fa;
      padding: 10px;
      border: 1px solid #dee2e6;
      max-height: 300px;
      overflow-y: auto;
      max-height: 200px;
      font-family: monospace;
      font-size: 12px;
    }
    .log-entry {
      margin: 2px 0;
      padding: 2px 5px;
    }
    .log-entry.info { color: #0c5460; }
    .log-entry.success { color: #155724; }
    .log-entry.error { color: #721c24; }
    .log-entry.warning { color: #856404; }
    button {
      margin: 5px;
      padding: 8px 15px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    button:first-of-type {
      background-color: #007bff;
      color: white;
    }
    button:nth-of-type(2) {
      background-color: #6c757d;
      color: white;
    }
    button:last-of-type {
      background-color: #28a745;
      color: white;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .auth-info {
      background-color: #f8f9fa;
      padding: 10px;
      border-radius: 3px;
      font-size: 14px;
      line-height: 1.5;
    }
  `]
})
export class FirebaseTestComponent implements OnInit, OnDestroy {
  statusMessage = 'Initializing...';
  statusClass = 'status info';
  testLogs: Array<{timestamp: string, message: string, type: string}> = [];
  isRunning = false;
  currentUser: any = null;
  firebaseReady = false;
  private subscriptions: Subscription[] = [];
  private authStateUnsubscriber: (() => void) | null = null;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    this.log('Firebase Test Component initialized', 'info');
    this.checkFirebaseStatus();
    this.setupAuthStateMonitoring();
  }

  ngOnDestroy() {
    console.log('🧹 FirebaseTestComponent being destroyed, cleaning up...');
    this.cleanupSubscriptions();
  }

  /**
   * Set up auth state monitoring
   */
  private setupAuthStateMonitoring(): void {
    try {
      this.authStateUnsubscriber = this.firebaseService.onAuthStateChange((user) => {
        this.currentUser = user;
        console.log('Auth state changed in test component:', user ? 'User present' : 'No user');
      });
      
      this.log('Auth state monitoring setup completed', 'success');
    } catch (error: any) {
      this.log(`Failed to setup auth state monitoring: ${error.message}`, 'error');
    }
  }

  private log(message: string, type: string = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.testLogs.push({ timestamp, message, type });
    console.log(`[${timestamp}] ${message}`);
    
    // Keep only last 50 logs to prevent memory issues
    if (this.testLogs.length > 50) {
      this.testLogs = this.testLogs.slice(-50);
    }
  }

  private setStatus(message: string, type: string = 'info') {
    this.statusMessage = message;
    this.statusClass = `status ${type}`;
  }

  checkFirebaseStatus() {
    try {
      // Test basic Firebase service access
      const auth = this.firebaseService.getAuthInstance();
      const firestore = this.firebaseService.getFirestoreInstance();
      const database = this.firebaseService.getDatabaseInstance();
      
      this.log('✅ Firebase services accessible', 'success');
      this.setStatus('✅ Firebase initialized successfully', 'success');
      this.firebaseReady = true;
    } catch (error: any) {
      this.log(`❌ Firebase initialization error: ${error.message}`, 'error');
      this.setStatus(`❌ Firebase initialization failed: ${error.message}`, 'error');
      this.firebaseReady = false;
    }
  }

  async runFirebaseTest() {
    if (this.isRunning || !this.firebaseReady) return;
    
    this.isRunning = true;
    this.log('Starting comprehensive Firebase tests...', 'info');
    this.setStatus('Running Firebase tests...', 'info');

    try {
      // Test 1: Auth Service
      this.log('Testing Firebase Auth...', 'info');
      const auth = this.firebaseService.getAuthInstance();
      this.log(`✅ Auth service accessible: ${auth.app.name}`, 'success');

      // Test 2: Firestore Service
      this.log('Testing Firebase Firestore...', 'info');
      const firestore = this.firebaseService.getFirestoreInstance();
      this.log(`✅ Firestore service accessible: ${firestore.app.name}`, 'success');

      // Test 3: Realtime Database Service
      this.log('Testing Firebase Realtime Database...', 'info');
      const database = this.firebaseService.getDatabaseInstance();
      this.log(`✅ Realtime Database service accessible: ${database.app.name}`, 'success');

      // Test 4: Auth state change listener
      this.log('Testing Auth state listener...', 'info');
      const unsubscribe = this.firebaseService.onAuthStateChange((user: any) => {
        this.log(`Auth state changed: ${user ? 'User logged in' : 'No user'}`, 'info');
      });
      
      // Clean up after test
      setTimeout(() => {
        try {
          unsubscribe();
          this.log('Auth state listener test completed and cleaned up', 'success');
        } catch (error) {
          this.log(`Error cleaning up auth listener: ${error}`, 'error');
        }
      }, 2000);

      // Test 5: Current user
      this.log('Testing current user retrieval...', 'info');
      const currentUser = await this.firebaseService.getCurrentUser();
      this.log(`Current user: ${currentUser ? currentUser.uid : 'No user logged in'}`, 'success');

      // Test 6: ID Token debug (if user is logged in)
      if (currentUser) {
        this.log('Testing ID token debug...', 'info');
        await this.firebaseService.debugIdToken();
        this.log('ID token debug completed', 'success');
      }

      // Test 7: Firebase verification
      this.log('Testing Firebase authentication verification...', 'info');
      const isAuthValid = await this.firebaseService.verifyFirebaseAuth();
      this.log(`Firebase auth verification: ${isAuthValid ? 'Valid' : 'Invalid'}`, isAuthValid ? 'success' : 'warning');

      this.setStatus('🎉 All Firebase tests passed successfully!', 'success');
      this.log('🎉 Firebase connectivity test completed successfully!', 'success');

    } catch (error: any) {
      this.log(`❌ Test failed: ${error.message}`, 'error');
      this.log(`Error stack: ${error.stack}`, 'error');
      this.setStatus(`❌ Firebase tests failed: ${error.message}`, 'error');
    } finally {
      this.isRunning = false;
      this.checkFirebaseStatus(); // Refresh status after tests
    }
  }

  clearLogs() {
    this.testLogs = [];
    this.log('Logs cleared', 'info');
  }

  /**
   * Clean up all subscriptions and listeners
   */
  private cleanupSubscriptions(): void {
    // Clean up auth state listener
    if (this.authStateUnsubscriber) {
      try {
        this.authStateUnsubscriber();
        this.log('Auth state listener cleaned up', 'info');
      } catch (error) {
        console.error('Error cleaning up auth state listener:', error);
      }
      this.authStateUnsubscriber = null;
    }

    // Clean up any tracked subscriptions
    this.subscriptions.forEach(sub => {
      try {
        sub.unsubscribe();
      } catch (error) {
        console.error('Error cleaning up subscription:', error);
      }
    });

    this.subscriptions = [];
    console.log('🧹 All subscriptions cleaned up');
  }

  /**
   * Add subscription to cleanup tracking
   */
  protected addSubscription(sub: Subscription): void {
    this.subscriptions.push(sub);
  }
}
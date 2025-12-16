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
        <button (click)="runFirebaseTest()" [disabled]="isRunning">
          {{ isRunning ? 'Running Tests...' : 'Run Firebase Tests' }}
        </button>
        <button (click)="clearLogs()">Clear Logs</button>
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
    .logs {
      background-color: #f8f9fa;
      padding: 10px;
      border: 1px solid #dee2e6;
      max-height: 300px;
      overflow-y: auto;
      max-height: 200px;
    }
    .log-entry {
      margin: 2px 0;
      font-family: monospace;
      font-size: 12px;
      padding: 2px 5px;
    }
    .log-entry.info { color: #0c5460; }
    .log-entry.success { color: #155724; }
    .log-entry.error { color: #721c24; }
    button {
      margin: 5px;
      padding: 8px 15px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }
    button:first-child {
      background-color: #007bff;
      color: white;
    }
    button:last-child {
      background-color: #6c757d;
      color: white;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `]
})
export class FirebaseTestComponent implements OnInit, OnDestroy {
  statusMessage = 'Initializing...';
  statusClass = 'status info';
  testLogs: Array<{timestamp: string, message: string, type: string}> = [];
  isRunning = false;
  private subscriptions: Subscription[] = [];

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    this.log('Firebase Test Component initialized', 'info');
    this.checkFirebaseStatus();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private log(message: string, type: string = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.testLogs.push({ timestamp, message, type });
    console.log(`[${timestamp}] ${message}`);
  }

  private setStatus(message: string, type: string = 'info') {
    this.statusMessage = message;
    this.statusClass = `status ${type}`;
  }

  private checkFirebaseStatus() {
    try {
      // Test basic Firebase service access
      const auth = this.firebaseService.getAuthInstance();
      const firestore = this.firebaseService.getFirestoreInstance();
      const database = this.firebaseService.getDatabaseInstance();
      
      this.log('✅ Firebase services accessible', 'success');
      this.setStatus('✅ Firebase initialized successfully', 'success');
    } catch (error: any) {
      this.log(`❌ Firebase initialization error: ${error.message}`, 'error');
      this.setStatus(`❌ Firebase initialization failed: ${error.message}`, 'error');
    }
  }

  async runFirebaseTest() {
    if (this.isRunning) return;
    
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
      
      setTimeout(() => {
        unsubscribe();
        this.log('Auth state listener test completed', 'success');
      }, 2000);

      // Test 5: Current user
      this.log('Testing current user retrieval...', 'info');
      const currentUser = await this.firebaseService.getCurrentUser();
      this.log(`Current user: ${currentUser ? currentUser.uid : 'No user logged in'}`, 'success');

      this.setStatus('🎉 All Firebase tests passed successfully!', 'success');
      this.log('🎉 Firebase connectivity test completed successfully!', 'success');

    } catch (error: any) {
      this.log(`❌ Test failed: ${error.message}`, 'error');
      this.log(`Error stack: ${error.stack}`, 'error');
      this.setStatus(`❌ Firebase tests failed: ${error.message}`, 'error');
    } finally {
      this.isRunning = false;
    }
  }

  clearLogs() {
    this.testLogs = [];
    this.log('Logs cleared', 'info');
  }
}
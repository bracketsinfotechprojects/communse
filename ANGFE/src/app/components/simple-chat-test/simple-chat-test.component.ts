import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-simple-chat-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="padding: 20px; font-family: monospace;">
      <h2>🔍 Simple Chat Diagnostic</h2>
      
      <div style="background: #f0f0f0; padding: 15px; margin: 10px 0;">
        <h3>Step-by-step Test</h3>
        <div>Status: <strong>{{ status }}</strong></div>
        <div>Error: <strong style="color: red;">{{ error || 'None' }}</strong></div>
        <div>Log:</div>
        <div style="background: white; padding: 10px; max-height: 200px; overflow-y: auto; border: 1px solid #ccc;">
          <div *ngFor="let log of logs" style="margin: 2px 0; font-size: 12px;">
            [{{ log.time }}] {{ log.message }}
          </div>
        </div>
      </div>

      <div style="margin: 20px 0;">
        <button (click)="testFirebaseService()" [disabled]="isRunning">Test Firebase Service</button>
        <button (click)="testBasicAuth()" [disabled]="isRunning">Test Basic Auth</button>
        <button (click)="testBackendConnection()" [disabled]="isRunning">Test Backend</button>
        <button (click)="clearLogs()">Clear Logs</button>
      </div>

      <div style="background: #fff; padding: 15px; margin: 10px 0;">
        <h3>Manual Test Inputs</h3>
        <div>
          <label>User ID:</label>
          <input [(ngModel)]="testUserId" style="margin: 5px; padding: 5px;">
        </div>
        <div>
          <label>Event ID:</label>
          <input [(ngModel)]="testEventId" style="margin: 5px; padding: 5px;">
        </div>
        <div>
          <label>Auth Token:</label>
          <input [(ngModel)]="testAuthToken" style="margin: 5px; padding: 5px; width: 300px;">
        </div>
        <button (click)="testManualConnection()" [disabled]="isRunning">Test Manual Connection</button>
      </div>
    </div>
  `
})
export class SimpleChatTestComponent implements OnInit, OnDestroy {
  status = 'Ready to test';
  error: string | null = null;
  isRunning = false;
  logs: Array<{time: string, message: string}> = [];
  
  testUserId = 'test-user-123';
  testEventId = 'test-event-456';
  testAuthToken = 'dummy-token';

  constructor(private firebaseService: FirebaseService) {
    this.log('Component initialized');
  }

  ngOnInit() {
    this.log('Component ngOnInit called');
  }

  ngOnDestroy() {
    this.log('Component ngOnDestroy called');
  }

  private log(message: string) {
    const time = new Date().toLocaleTimeString();
    this.logs.push({ time, message });
    console.log(`[${time}] ${message}`);
    
    // Keep only last 20 logs
    if (this.logs.length > 20) {
      this.logs = this.logs.slice(-20);
    }
  }

  private setStatus(status: string) {
    this.status = status;
    this.log(`Status changed to: ${status}`);
  }

  private setError(error: string | null) {
    this.error = error;
    if (error) {
      this.log(`Error: ${error}`);
    }
  }

  async testFirebaseService() {
    this.isRunning = true;
    this.setStatus('Testing Firebase Service...');
    this.setError(null);
    
    try {
      this.log('Testing Firebase service access...');
      
      // Test 1: Get Firebase instances
      const auth = this.firebaseService.getAuthInstance();
      this.log(`✅ Auth service accessible: ${auth.app.name}`);
      
      const firestore = this.firebaseService.getFirestoreInstance();
      this.log(`✅ Firestore service accessible: ${firestore.app.name}`);
      
      const database = this.firebaseService.getDatabaseInstance();
      this.log(`✅ Database service accessible: ${database.app.name}`);
      
      // Test 2: Test auth state listener
      this.log('Testing auth state listener...');
      const unsubscribe = this.firebaseService.onAuthStateChange((user) => {
        this.log(`Auth state changed: ${user ? user.uid : 'no user'}`);
      });
      
      setTimeout(() => {
        unsubscribe();
        this.log('Auth state listener test completed');
      }, 2000);
      
      this.setStatus('✅ Firebase Service Test Passed');
      
    } catch (error: any) {
      this.setError(`Firebase Service Error: ${error.message}`);
      this.setStatus('❌ Firebase Service Test Failed');
    } finally {
      this.isRunning = false;
    }
  }

  async testBasicAuth() {
    this.isRunning = true;
    this.setStatus('Testing Basic Auth...');
    this.setError(null);
    
    try {
      this.log('Testing current user retrieval...');
      const user = await this.firebaseService.getCurrentUser();
      this.log(`Current user: ${user ? user.uid : 'No user'}`);
      
      this.setStatus('✅ Basic Auth Test Completed');
      
    } catch (error: any) {
      this.setError(`Auth Error: ${error.message}`);
      this.setStatus('❌ Basic Auth Test Failed');
    } finally {
      this.isRunning = false;
    }
  }

  async testBackendConnection() {
    this.isRunning = true;
    this.setStatus('Testing Backend Connection...');
    this.setError(null);
    
    try {
      this.log('Testing backend API connection...');
      
      // Test with a simple HTTP request
      const response = await fetch('http://localhost:5000/chat/token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      this.log(`Backend response status: ${response.status}`);
      
      if (response.status === 401) {
        this.log('✅ Backend is running (401 is expected without auth)');
      } else if (response.status === 0) {
        throw new Error('Network error - backend server not accessible');
      } else {
        this.log(`Backend responded with status: ${response.status}`);
      }
      
      this.setStatus('✅ Backend Connection Test Completed');
      
    } catch (error: any) {
      this.setError(`Backend Error: ${error.message}`);
      this.setStatus('❌ Backend Connection Test Failed');
    } finally {
      this.isRunning = false;
    }
  }

  async testManualConnection() {
    this.isRunning = true;
    this.setStatus('Testing Manual Connection...');
    this.setError(null);
    
    try {
      this.log('Testing manual connection with provided inputs...');
      this.log(`User ID: ${this.testUserId}`);
      this.log(`Event ID: ${this.testEventId}`);
      this.log(`Auth Token: ${this.testAuthToken.substring(0, 20)}...`);
      
      // Test the exact same flow as the chat service
      const response = await fetch(`http://localhost:5000/chat/token?userId=${this.testUserId}&eventId=${this.testEventId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.testAuthToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.log(`Manual test response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        this.log('✅ Manual connection successful');
        this.log(`Response: ${JSON.stringify(data, null, 2)}`);
      } else {
        this.log(`❌ Manual connection failed with status: ${response.status}`);
        const errorText = await response.text();
        this.log(`Error response: ${errorText}`);
      }
      
      this.setStatus('Manual Connection Test Completed');
      
    } catch (error: any) {
      this.setError(`Manual Connection Error: ${error.message}`);
      this.setStatus('❌ Manual Connection Test Failed');
    } finally {
      this.isRunning = false;
    }
  }

  clearLogs() {
    this.logs = [];
    this.log('Logs cleared');
  }
}
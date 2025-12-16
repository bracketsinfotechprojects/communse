import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-firebase-diagnostic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; max-width: 800px; margin: 0 auto;">
      <h2>Firebase Diagnostic Report</h2>
      
      <div style="margin: 20px 0;">
        <h3>Initialization Test</h3>
        <div [style.color]="initializationSuccess ? 'green' : 'red'">
          {{ initializationMessage }}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <h3>Firebase Services Status</h3>
        <ul>
          <li [style.color]="authAvailable ? 'green' : 'red'">
            Auth Service: {{ authAvailable ? 'Available' : 'Not Available' }}
          </li>
          <li [style.color]="firestoreAvailable ? 'green' : 'red'">
            Firestore Service: {{ firestoreAvailable ? 'Available' : 'Not Available' }}
          </li>
          <li [style.color]="databaseAvailable ? 'green' : 'red'">
            Realtime Database: {{ databaseAvailable ? 'Available' : 'Not Available' }}
          </li>
        </ul>
      </div>

      <div style="margin: 20px 0;">
        <h3>Error Details</h3>
        <div style="background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">
          {{ errorDetails || 'No errors detected' }}
        </div>
      </div>

      <div style="margin: 20px 0;">
        <button (click)="runDiagnostic()" style="padding: 10px 20px;">
          Run Diagnostic Again
        </button>
      </div>
    </div>
  `
})
export class FirebaseDiagnosticComponent implements OnInit {
  initializationSuccess = false;
  initializationMessage = 'Testing...';
  authAvailable = false;
  firestoreAvailable = false;
  databaseAvailable = false;
  errorDetails = '';

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    this.runDiagnostic();
  }

  runDiagnostic() {
    this.initializationMessage = 'Testing Firebase initialization...';
    this.errorDetails = '';

    try {
      // Test 1: Try to get Auth instance
      console.log('Testing Auth service...');
      const auth = this.firebaseService.getAuthInstance();
      this.authAvailable = true;
      console.log('✅ Auth service accessible');

      // Test 2: Try to get Firestore instance
      console.log('Testing Firestore service...');
      const firestore = this.firebaseService.getFirestoreInstance();
      this.firestoreAvailable = true;
      console.log('✅ Firestore service accessible');

      // Test 3: Try to get Database instance
      console.log('Testing Realtime Database...');
      const database = this.firebaseService.getDatabaseInstance();
      this.databaseAvailable = true;
      console.log('✅ Realtime Database accessible');

      this.initializationSuccess = true;
      this.initializationMessage = '✅ All Firebase services initialized successfully';
      console.log('🎉 Firebase diagnostic completed successfully');

    } catch (error: any) {
      this.initializationSuccess = false;
      this.initializationMessage = `❌ Firebase initialization failed: ${error.message}`;
      this.errorDetails = `Error: ${error.message}\nStack: ${error.stack}`;
      console.error('❌ Firebase diagnostic failed:', error);
    }
  }
}
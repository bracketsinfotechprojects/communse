import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../services/firebase.service';
import { User } from 'firebase/auth';

@Component({
  selector: 'app-firebase-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './firebase-dashboard.component.html',
  styleUrls: ['./firebase-dashboard.component.scss']
})
export class FirebaseDashboardComponent implements OnInit, OnDestroy {
  // Authentication
  user: User | null = null;
  email = '';
  password = '';
  isLoading = false;
  authMessage = '';

  // Firestore data
  documents: any[] = [];
  newDocument = {
    title: '',
    description: '',
    author: ''
  };
  isAddingDocument = false;

  // Realtime Database
  messages: any[] = [];
  newMessage = '';
  realtimeMessage = '';

  private authUnsubscribe?: () => void;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit() {
    // Check for existing authentication state
    this.checkAuthState();
    
    // Listen to authentication state changes
    this.authUnsubscribe = this.firebaseService.onAuthStateChange((user) => {
      this.user = user;
      if (user) {
        this.loadDocuments();
        this.subscribeToMessages();
      }
    });
  }

  ngOnDestroy() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  async checkAuthState() {
    try {
      this.user = await this.firebaseService.getCurrentUser();
      if (this.user) {
        this.loadDocuments();
        this.subscribeToMessages();
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    }
  }

  async signIn() {
    if (!this.email || !this.password) {
      this.authMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;
    this.authMessage = '';

    try {
      this.user = await this.firebaseService.signIn(this.email, this.password);
      this.authMessage = 'Successfully signed in!';
      this.email = '';
      this.password = '';
    } catch (error: any) {
      this.authMessage = `Sign in failed: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async signUp() {
    if (!this.email || !this.password) {
      this.authMessage = 'Please enter email and password';
      return;
    }

    this.isLoading = true;
    this.authMessage = '';

    try {
      this.user = await this.firebaseService.signUp(this.email, this.password);
      this.authMessage = 'Account created successfully!';
      this.email = '';
      this.password = '';
    } catch (error: any) {
      this.authMessage = `Sign up failed: ${error.message}`;
    } finally {
      this.isLoading = false;
    }
  }

  async signOut() {
    try {
      await this.firebaseService.signOut();
      this.user = null;
      this.documents = [];
      this.messages = [];
      this.authMessage = 'Successfully signed out!';
    } catch (error: any) {
      this.authMessage = `Sign out failed: ${error.message}`;
    }
  }

  async loadDocuments() {
    if (!this.user) return;

    try {
      this.documents = await this.firebaseService.getDocuments('documents');
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  }

  async addDocument() {
    if (!this.user || !this.newDocument.title) return;

    this.isAddingDocument = true;

    try {
      await this.firebaseService.addDocument('documents', {
        ...this.newDocument,
        author: this.user.email || 'Anonymous'
      });
      
      this.newDocument = { title: '', description: '', author: '' };
      await this.loadDocuments(); // Reload documents
    } catch (error) {
      console.error('Error adding document:', error);
    } finally {
      this.isAddingDocument = false;
    }
  }

  subscribeToMessages() {
    if (!this.user) return;

    this.firebaseService.subscribeToRealtimeDatabase('messages', (data) => {
      if (data) {
        this.messages = Object.values(data);
      }
    });
  }

  async sendMessage() {
    if (!this.user || !this.newMessage.trim()) return;

    try {
      await this.firebaseService.addToRealtimeDatabase('messages', {
        text: this.newMessage,
        user: this.user.email || 'Anonymous',
        timestamp: new Date().toISOString()
      });
      
      this.newMessage = '';
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  clearMessages() {
    this.messages = [];
    this.realtimeMessage = '';
  }
}
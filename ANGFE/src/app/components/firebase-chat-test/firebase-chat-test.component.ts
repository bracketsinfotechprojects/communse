import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-firebase-chat-test',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="firebase-chat-test">
      <h2>🔥 Firebase Chat Test</h2>
      
      <!-- Status Display -->
      <div class="status-section">
        <div>Loading: <strong>{{ isLoading ? 'YES 🔄' : 'NO ✅' }}</strong></div>
        <div>Connected: <strong>{{ isConnected ? 'YES ✅' : 'NO ❌' }}</strong></div>
        <div>Initialized: <strong>{{ isInitialized ? 'YES ✅' : 'NO ❌' }}</strong></div>
        <div>Error: <strong>{{ error || 'None ✅' }}</strong></div>
        <div>Debug: <small>Last Update: {{ lastStateUpdate | date:'medium' }}</small></div>
      </div>

      <!-- Input Form -->
      <div class="input-section" *ngIf="!isInitialized">
        <h3>Setup Chat</h3>
        
        <div>
          <label>User ID:</label>
          <input [(ngModel)]="userId" placeholder="User ID" class="input-field">
        </div>
        
        <div>
          <label>Event ID:</label>
          <input [(ngModel)]="eventId" placeholder="Event ID" class="input-field">
        </div>
        
        <div>
          <label>Auth Token:</label>
          <input [(ngModel)]="authToken" placeholder="Auth Token" class="input-field">
        </div>
        
        <button 
          (click)="initializeChat()" 
          [disabled]="isLoading || !userId || !eventId || !authToken"
          class="btn-primary"
        >
          {{ isLoading ? 'Loading...' : 'Join Chat' }}
        </button>
      </div>

      <!-- Chat Interface -->
      <div class="chat-section" *ngIf="isInitialized">
        <h3>💬 Chat Messages</h3>
        
        <div class="messages">
          <div *ngFor="let message of messages" class="message">
            <strong>{{ message.userName }}:</strong> {{ message.text }}
            <small>{{ formatTimestamp(message.timestamp) }}</small>
          </div>
        </div>
        
        <div class="input-row">
          <input 
            [(ngModel)]="newMessage" 
            (keypress)="onKeyPress($event)"
            placeholder="Type message..."
            class="message-input"
            [disabled]="!isConnected"
          >
          <button (click)="sendMessage()" [disabled]="!newMessage.trim() || !isConnected">
            Send
          </button>
        </div>
        
        <button (click)="disconnect()" class="btn-secondary">Disconnect</button>
      </div>
    </div>
  `,
  styles: [`
    .firebase-chat-test {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .status-section {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .input-section {
      background: #fff;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    .input-field {
      width: 100%;
      padding: 8px;
      margin: 5px 0;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    
    .btn-primary {
      background: #007bff;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
    }
    
    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
    }
    
    .chat-section {
      background: #fff;
      padding: 20px;
      border-radius: 5px;
    }
    
    .messages {
      height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      padding: 10px;
      margin-bottom: 10px;
    }
    
    .message {
      padding: 5px;
      border-bottom: 1px solid #eee;
    }
    
    .message small {
      color: #666;
      margin-left: 10px;
    }
    
    .input-row {
      display: flex;
      gap: 10px;
    }
    
    .message-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
  `]
})
export class FirebaseChatTestComponent implements OnInit, OnDestroy {
  // Component state
  userId = '';
  eventId = '';
  authToken = '';
  newMessage = '';
  
  // Observable data - component state derived from service observables
  messages: any[] = [];
  isConnected = false;
  isLoading = false;
  error: string | null = null;
  
  // Computed property for UI initialization
  isInitialized = false;
  
  // Debug info
  lastStateUpdate: Date = new Date();

  private subscriptions: Subscription[] = [];

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🔥 FirebaseChatTestComponent constructor');
  }

  ngOnInit() {
    console.log('🔥 FirebaseChatTestComponent initialized');
    this.setupSubscriptions();
    this.updateInitializationState();
  }

  ngOnDestroy() {
    console.log('🔥 FirebaseChatTestComponent destroyed, cleaning up...');
    this.cleanupSubscriptions();
  }

  /**
   * Update computed initialization state based on service state
   */
  private updateInitializationState(): void {
    const previousState = this.isInitialized;
    // Chat is initialized when connected AND not loading AND no errors
    this.isInitialized = this.isConnected && !this.isLoading && !this.error;
    this.lastStateUpdate = new Date();
    
    console.log(`🔄 Initialization state updated: ${this.isInitialized ? 'READY' : 'NOT_READY'} (connected: ${this.isConnected}, loading: ${this.isLoading}, error: ${this.error || 'none'})`);
    console.log(`🔄 State change: ${previousState} -> ${this.isInitialized}`);
    
    // Force change detection to ensure UI updates
    this.cdr.detectChanges();
    
    // Also trigger Angular's change detection
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  /**
   * Setup subscriptions with enhanced debugging
   */
  private setupSubscriptions(): void {
    try {
      // Subscribe to messages with error handling
      const messagesSub = this.chatService.messages$.subscribe({
        next: (messages) => {
          this.messages = messages;
          console.log('📨 Messages updated in component:', messages.length);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error in messages subscription:', error);
          this.error = 'Failed to subscribe to messages';
          this.updateInitializationState();
        }
      });
      this.subscriptions.push(messagesSub);

      // Subscribe to connection status with enhanced debugging
      const connectedSub = this.chatService.isConnected$.subscribe({
        next: (isConnected) => {
          console.log('🔌 Connection status changed:', isConnected, 'Previous:', this.isConnected);
          this.isConnected = isConnected;
          this.updateInitializationState();
        },
        error: (error) => {
          console.error('❌ Error in connection subscription:', error);
          this.error = 'Failed to monitor connection status';
          this.updateInitializationState();
        }
      });
      this.subscriptions.push(connectedSub);

      // Subscribe to loading status with enhanced debugging
      const loadingSub = this.chatService.isLoading$.subscribe({
        next: (isLoading) => {
          console.log('🔄 Loading state changed:', isLoading, 'Previous:', this.isLoading);
          this.isLoading = isLoading;
          this.updateInitializationState();
        },
        error: (error) => {
          console.error('❌ Error in loading subscription:', error);
          this.error = 'Failed to monitor loading status';
          this.updateInitializationState();
        }
      });
      this.subscriptions.push(loadingSub);

      // Subscribe to errors with enhanced debugging
      const errorSub = this.chatService.error$.subscribe({
        next: (error) => {
          console.log('❌ Service error changed:', error);
          this.error = error;
          this.updateInitializationState();
        },
        error: (error) => {
          console.error('❌ Error in error subscription:', error);
        }
      });
      this.subscriptions.push(errorSub);

      console.log('✅ All subscriptions setup completed');
    } catch (error) {
      console.error('❌ Error setting up subscriptions:', error);
      this.error = 'Failed to initialize chat service subscriptions';
      this.updateInitializationState();
    }
  }

  /**
   * Initialize chat with enhanced error handling and debugging
   */
  async initializeChat(): Promise<void> {
    console.log('🚀 Starting chat initialization...');
    
    // Clear any previous errors first
    this.error = null;
    this.chatService.clearError();
    this.updateInitializationState();
    
    // Validate inputs
    if (!this.userId?.trim()) {
      this.error = 'Please enter a User ID';
      this.updateInitializationState();
      return;
    }
    
    if (!this.eventId?.trim()) {
      this.error = 'Please enter an Event ID';
      this.updateInitializationState();
      return;
    }
    
    if (!this.authToken?.trim()) {
      this.error = 'Please enter an Auth Token';
      this.updateInitializationState();
      return;
    }

    try {
      console.log('📡 Calling chatService.initializeChat...');
      await this.chatService.initializeChat(this.userId.trim(), this.eventId.trim(), this.authToken.trim());
      
      console.log('✅ Chat initialization call completed - UI will update when service confirms connection');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize chat:', error);
      
      // More specific error handling
      let errorMessage = 'Failed to initialize chat';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.status === 401) {
        errorMessage = 'Authentication failed. Please check your auth token.';
      } else if (error?.status === 0) {
        errorMessage = 'Network error. Please check if the backend server is running.';
      }
      
      this.error = errorMessage;
      this.updateInitializationState();
      console.log('❌ Chat initialization failed, UI will show input form when service confirms disconnection');
    }
  }

  /**
   * Send message with error handling
   */
  async sendMessage(): Promise<void> {
    if (!this.newMessage?.trim()) return;

    try {
      console.log('📤 Sending message:', this.newMessage);
      await this.chatService.sendMessage(this.newMessage.trim());
      this.newMessage = '';
      console.log('✅ Message sent successfully');
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      this.error = error?.message || 'Failed to send message';
    }
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Disconnect from chat
   */
  disconnect(): void {
    try {
      console.log('🔌 Disconnecting from chat...');
      this.chatService.disconnectChat();
      console.log('✅ Disconnected successfully - UI will update when service confirms disconnection');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
      this.error = 'Failed to disconnect from chat';
    }
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    try {
      return this.chatService.formatTimestamp(timestamp);
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return new Date(timestamp).toLocaleTimeString();
    }
  }

  /**
   * Cleanup all subscriptions
   */
  private cleanupSubscriptions(): void {
    console.log(`🧹 Cleaning up ${this.subscriptions.length} subscriptions`);
    
    this.subscriptions.forEach((sub, index) => {
      try {
        sub.unsubscribe();
        console.log(`✅ Subscription ${index + 1} cleaned up`);
      } catch (error) {
        console.error(`❌ Error cleaning up subscription ${index + 1}:`, error);
      }
    });
    
    this.subscriptions = [];
    console.log('🧹 All subscriptions cleaned up');
  }
}
import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { 
  signInWithCustomToken, 
  User, 
  Auth 
} from 'firebase/auth';
import { 
  ref, 
  onValue, 
  push, 
  off, 
  DatabaseReference 
} from 'firebase/database';

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
  eventId: string;
}

export interface ChatToken {
  success: boolean;
  token: string;
  claims: {
    eventId: string;
    role: string;
    userId: string;
    communityId: string;
  };
}

export interface ChatPermission {
  hasAccess: boolean;
  role: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private readonly API_BASE_URL = 'http://localhost:5000';
  private currentUser: User | null = null;
  private currentEventId: string | null = null;
  private messagesListener: (() => void) | null = null;
  private authStateListener: (() => void) | null = null;
  private isFirebaseReady = false;
  private isInitializingAuth = false;
  private hasAttemptedAuthInit = false;
  private retryCount = 0;
  private readonly maxRetries = 3; // Strict limit to prevent infinite recursion
  private readonly retryDelay = 2000; // 2 seconds
  
  // BehaviorSubjects for reactive state management
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public messages$ = this.messagesSubject.asObservable();
  public isConnected$ = this.isConnectedSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private http: HttpClient,
    private firebaseService: FirebaseService
  ) {
    this.initializeAuthStateListenerSafely();
  }

  /**
   * Safe initialization of auth state listener with strict recursion limits
   */
  private initializeAuthStateListenerSafely(): void {
    // Prevent multiple simultaneous initialization attempts
    if (this.hasAttemptedAuthInit && this.retryCount >= this.maxRetries) {
      console.warn('Maximum auth initialization attempts reached');
      this.errorSubject.next('Firebase initialization failed after multiple attempts');
      return;
    }

    this.hasAttemptedAuthInit = true;
    this.retryCount++;

    try {
      // Clear any existing listener first
      this.cleanupAuthStateListener();
      
      console.log(`🔧 Initializing auth listener (attempt ${this.retryCount})`);
      
      // Subscribe to auth state changes
      this.authStateListener = this.firebaseService.onAuthStateChange((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        this.currentUser = user;
        this.isConnectedSubject.next(!!user);
      });
      
      this.isFirebaseReady = true;
      console.log('✅ Firebase auth listener initialized successfully');
      
      // Reset retry count on success
      this.retryCount = 0;
      
    } catch (error) {
      console.error(`❌ Failed to initialize auth listener (attempt ${this.retryCount}):`, error);
      
      if (this.retryCount < this.maxRetries) {
        // Use a controlled retry with exponential backoff
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        
        setTimeout(() => {
          this.initializeAuthStateListenerSafely();
        }, delay);
      } else {
        console.error('❌ Failed to initialize Firebase auth listener after maximum attempts');
        this.errorSubject.next('Failed to initialize Firebase connection');
      }
    }
  }

  /**
   * Get chat token from backend API
   */
  getChatToken(userId: string, eventId: string, authToken: string): Observable<ChatToken> {
    return this.http.get<ChatToken>(`${this.API_BASE_URL}/chat/token`, {
      params: { userId, eventId },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).pipe(
      catchError(error => {
        console.error('Error getting chat token:', error);
        if (error.status === 401) {
          this.errorSubject.next('Authentication required. Invalid token.');
        } else {
          this.errorSubject.next('Failed to get chat token');
        }
        throw error;
      }),
      take(1) // Ensure single subscription to prevent memory leaks
    );
  }

  /**
   * Initialize chat for a specific event with enhanced error handling
   */
  async initializeChat(userId: string, eventId: string, authToken: string): Promise<void> {
    console.log('🔄 Starting chat initialization...');
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      // Validate inputs
      if (!userId || !eventId || !authToken) {
        throw new Error('Missing required parameters: userId, eventId, or authToken');
      }

      // Skip waiting for Firebase - proceed directly
      console.log('⏭️ Proceeding with chat initialization...');

      // Step 1: Get chat token from backend with authentication
      console.log('📡 Getting chat token from backend...');
      const tokenResponse = await this.getChatToken(userId, eventId, authToken).toPromise();
      console.log('✅ Token response received:', tokenResponse?.success);
      
      if (!tokenResponse?.success) {
        throw new Error('Failed to get chat token from backend');
      }

      // Step 2: Sign in with custom token
      console.log('🔐 Signing in with custom token...');
      const auth = this.firebaseService.getAuthInstance();
      const userCredential = await signInWithCustomToken(auth, tokenResponse.token);
      
      console.log('✅ Firebase login success');
      console.log('👤 User:', userCredential.user.uid);
      console.log('📅 Event ID:', eventId);

      // Step 3: Wait a moment for Firebase to settle
      await this.delay(300);

      // Step 4: Verify authentication
      console.log('🔍 Verifying Firebase authentication...');
      const isAuthValid = await this.firebaseService.verifyFirebaseAuth();
      if (!isAuthValid) {
        throw new Error('Firebase authentication verification failed');
      }

      // Step 5: Subscribe to messages
      console.log('📡 Subscribing to messages...');
      await this.subscribeToMessages(eventId);
      
      // Step 6: Update state
      this.currentUser = userCredential.user;
      this.currentEventId = eventId;
      
      console.log('🎉 Chat initialization completed successfully');
      this.isConnectedSubject.next(true);
      this.isLoadingSubject.next(false);

    } catch (error: any) {
      console.error('❌ Error initializing chat:', error);
      this.isLoadingSubject.next(false);
      
      // Enhanced error handling
      if (error.status === 401) {
        this.errorSubject.next('Authentication required. Please provide a valid authentication token.');
      } else if (error.message.includes('Firebase authentication')) {
        this.errorSubject.next(error.message);
      } else if (error.message.includes('timeout')) {
        this.errorSubject.next('Connection timeout. Please check your network and try again.');
      } else {
        this.errorSubject.next(`Failed to initialize chat: ${error.message}`);
      }
      
      throw error;
    }
  }

  /**
   * Subscribe to real-time messages for an event with cleanup
   */
  private async subscribeToMessages(eventId: string): Promise<void> {
    // Clean up existing listener
    this.unsubscribeFromMessages();

    try {
      console.log('🔗 Setting up Realtime Database listener...');
      const database = this.firebaseService.getDatabaseInstance();
      const messagesRef = ref(database, `event_chats/${eventId}/messages`);
      
      this.messagesListener = onValue(messagesRef, (snapshot) => {
        try {
          const data = snapshot.val();
          if (data) {
            const messages: ChatMessage[] = Object.entries(data)
              .map(([id, message]: [string, any]) => ({
                id,
                ...message
              }))
              .sort((a, b) => a.timestamp - b.timestamp);
            
            this.messagesSubject.next(messages);
            console.log('📨 Messages updated:', messages.length, 'messages');
          } else {
            this.messagesSubject.next([]);
            console.log('📭 No messages found for event:', eventId);
          }
        } catch (error) {
          console.error('Error processing message data:', error);
        }
      }, (error: any) => {
        console.error('❌ Realtime Database subscription error:', error);
        if (error?.code === 'PERMISSION_DENIED') {
          this.errorSubject.next('Permission denied. Please check your authentication.');
        } else {
          this.errorSubject.next('Failed to subscribe to chat messages');
        }
      });

      console.log(`✅ Subscribed to messages for event: ${eventId}`);
    } catch (error) {
      console.error('❌ Error subscribing to messages:', error);
      this.errorSubject.next('Failed to subscribe to chat messages');
      throw error;
    }
  }

  /**
   * Unsubscribe from messages with proper cleanup
   */
  private unsubscribeFromMessages(): void {
    if (this.messagesListener) {
      try {
        this.messagesListener();
        this.messagesListener = null;
        console.log('🔌 Unsubscribed from messages');
      } catch (error) {
        console.error('Error unsubscribing from messages:', error);
      }
    }
  }

  /**
   * Send a message with enhanced error handling and validation
   */
  async sendMessage(text: string): Promise<void> {
    // Input validation
    if (!this.currentUser || !this.currentEventId) {
      throw new Error('Chat not initialized');
    }

    if (!text || !text.trim()) {
      return;
    }

    // Prevent empty or excessively long messages
    const trimmedText = text.trim();
    if (trimmedText.length > 1000) {
      throw new Error('Message too long (max 1000 characters)');
    }

    try {
      console.log('📤 Sending message...');
      console.log('Current user:', this.currentUser.uid);
      console.log('Current event:', this.currentEventId);
      
      const database = this.firebaseService.getDatabaseInstance();
      const messagesRef = ref(database, `event_chats/${this.currentEventId}/messages`);
      
      const messageData = {
        text: trimmedText,
        userId: this.currentUser.uid,
        userName: this.currentUser.displayName || this.currentUser.email || 'Anonymous',
        timestamp: Date.now(),
        eventId: this.currentEventId
      };
      
      console.log('Message data:', messageData);
      
      await push(messagesRef, messageData);

      console.log('✅ Message sent successfully');

    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      // Provide more specific error messages
      if (error.code === 'PERMISSION_DENIED') {
        this.errorSubject.next('Permission denied. Please check your authentication for this event.');
      } else if (error.code === 'UNAUTHENTICATED') {
        this.errorSubject.next('Authentication expired. Please reconnect to the chat.');
      } else if (error.message?.includes('permission')) {
        this.errorSubject.next('Permission denied. You may not have access to send messages in this event.');
      } else {
        this.errorSubject.next(`Failed to send message: ${error.message || 'Unknown error'}`);
      }
      
      throw error;
    }
  }

  /**
   * Check chat permission for a user and event
   */
  checkChatPermission(userId: string, eventId: string): Observable<ChatPermission> {
    return this.http.post<ChatPermission>(`${this.API_BASE_URL}/chat/permission`, {
      userId,
      eventId
    }).pipe(take(1));
  }

  /**
   * Disconnect from chat with comprehensive cleanup
   */
  disconnectChat(): void {
    console.log('🔌 Disconnecting chat...');
    
    // Unsubscribe from all listeners
    this.unsubscribeFromMessages();
    this.cleanupAuthStateListener();
    
    // Sign out from Firebase
    if (this.currentUser) {
      try {
        this.firebaseService.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }

    // Reset all state
    this.currentUser = null;
    this.currentEventId = null;
    this.messagesSubject.next([]);
    this.isConnectedSubject.next(false);
    this.isLoadingSubject.next(false);
    this.errorSubject.next(null);
    this.isFirebaseReady = false;
    this.retryCount = 0;
    this.hasAttemptedAuthInit = false;

    console.log('🔌 Chat disconnected and cleaned up');
  }

  /**
   * Clean up auth state listener
   */
  private cleanupAuthStateListener(): void {
    if (this.authStateListener) {
      try {
        this.authStateListener();
        this.authStateListener = null;
        console.log('🔌 Auth state listener cleaned up');
      } catch (error) {
        console.error('Error cleaning up auth listener:', error);
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Get current event ID
   */
  getCurrentEventId(): string | null {
    return this.currentEventId;
  }

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: ChatMessage): boolean {
    return this.currentUser?.uid === message.userId;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Comprehensive cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    console.log('🧹 ChatService being destroyed, cleaning up...');
    
    this.disconnectChat();
    
    // Clean up BehaviorSubjects
    this.messagesSubject.complete();
    this.isConnectedSubject.complete();
    this.isLoadingSubject.complete();
    this.errorSubject.complete();
    
    console.log('🧹 ChatService cleanup completed');
  }
}

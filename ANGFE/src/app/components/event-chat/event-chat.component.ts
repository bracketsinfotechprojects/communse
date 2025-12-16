import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ChatService, ChatMessage } from '../../services/chat.service';

@Component({
  selector: 'app-event-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './event-chat.component.html',
  styleUrls: ['./event-chat.component.scss']
})
export class EventChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;

  // Component state
  userId = '6937ca8a627f152384ac1884'; // Default test user ID
  eventId = '693bb754eb012d2a43551197'; // Default test event ID
  authToken = ''; // Authentication token for API access
  newMessage = '';
  isInitialized = false;
  
  // Observable data
  messages: ChatMessage[] = [];
  isConnected = false;
  isLoading = false;
  error: string | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  constructor(public chatService: ChatService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Subscribe to observables - remove manual change detection calls
    this.chatService.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        this.messages = messages;
        this.scrollToBottom();
        // Let Angular handle change detection automatically
      });

    this.chatService.isConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isConnected => {
        console.log('🔌 Connection state changed:', isConnected);
        this.isConnected = isConnected;
        
        // Auto-initialize UI when connected (but only if we haven't initialized yet)
        if (isConnected && !this.isInitialized && this.userId && this.eventId && this.authToken) {
          console.log('🔄 Auto-initializing chat interface...');
          this.isInitialized = true;
        }
      });

    this.chatService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isLoading => {
        console.log('🔄 Loading state changed:', isLoading);
        this.isLoading = isLoading;
        // Let Angular handle change detection automatically
      });

    this.chatService.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        console.log('❌ Chat error:', error);
        this.error = error;
        // Let Angular handle change detection automatically
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chatService.disconnectChat();
  }

  /**
   * Initialize chat connection
   */
  async initializeChat(): Promise<void> {
    if (!this.userId || !this.eventId) {
      this.error = 'Please provide User ID and Event ID';
      return;
    }

    if (!this.authToken) {
      this.error = 'Please provide your authentication token';
      return;
    }

    try {
      console.log('🔄 Starting chat initialization...');
      console.log('User ID:', this.userId);
      console.log('Event ID:', this.eventId);
      console.log('Auth Token present:', !!this.authToken);
      
      // Initialize chat and wait for completion
      await this.chatService.initializeChat(this.userId, this.eventId, this.authToken);
      
      console.log('✅ Chat service initialization completed');
      
      // Set initialized state immediately after successful service init
      this.isInitialized = true;
      this.chatService.clearError();
      // Let Angular handle change detection automatically
      
      console.log('✅ Chat interface should now be visible');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize chat:', error);
      
      // Provide specific error messages for different issues
      if (error.message.includes('Authentication required') || error.message.includes('401')) {
        this.error = 'Invalid authentication token. Please provide a valid token.';
      } else if (error.message.includes('Firebase configuration')) {
        this.error = 'Firebase configuration error. Please check your Firebase project setup and ensure Authentication is enabled.';
      } else if (error.message.includes('authentication failed')) {
        this.error = 'Authentication failed. Please verify your User ID and Event ID are correct.';
      } else {
        this.error = `Failed to connect: ${error.message}`;
      }
      
      // Let Angular handle change detection automatically
    }
  }

  /**
   * EMERGENCY: Manual trigger to force UI update
   */
  debugForceShowChat(): void {
    console.log('🚨 EMERGENCY: Forcing chat interface to show');
    console.log('Current isInitialized:', this.isInitialized);
    console.log('Current isConnected:', this.isConnected);
    console.log('Current isLoading:', this.isLoading);
    console.log('Current error:', this.error);
    
    // Force all states to correct values
    this.isInitialized = true;
    this.isConnected = true;
    this.isLoading = false;
    this.error = null;
    
    // Only use manual change detection in emergencies, not in normal flow
    this.cdr.detectChanges();
    
    console.log('🚨 EMERGENCY: States forced - interface should now be visible');
    console.log('New isInitialized:', this.isInitialized);
    console.log('New isConnected:', this.isConnected);
    console.log('New isLoading:', this.isLoading);
  }

  /**
   * Debug logging for states
   */
  debugLogStates(): void {
    console.log('Component States:', {
      isInitialized: this.isInitialized,
      isConnected: this.isConnected,
      isLoading: this.isLoading,
      error: this.error
    });
  }

  /**
   * Send a message
   */
  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.isConnected) {
      return;
    }

    try {
      await this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * Handle Enter key press in message input
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Disconnect from chat
   */
  disconnect(): void {
    this.chatService.disconnectChat();
    this.isInitialized = false;
  }

  /**
   * Check if message is from current user
   */
  isOwnMessage(message: ChatMessage): boolean {
    return this.chatService.isOwnMessage(message);
  }

  /**
   * Format message timestamp
   */
  formatTimestamp(timestamp: number): string {
    return this.chatService.formatTimestamp(timestamp);
  }

  /**
   * Scroll messages container to bottom
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  /**
   * Get connection status message
   */
  getConnectionStatus(): string {
    if (this.isLoading) return 'Connecting...';
    if (this.isConnected) return 'Connected';
    if (this.error) return 'Connection Error';
    return 'Disconnected';
  }

  /**
   * Get status CSS class
   */
  getStatusClass(): string {
    if (this.isLoading) return 'status-loading';
    if (this.isConnected) return 'status-connected';
    if (this.error) return 'status-error';
    return 'status-disconnected';
  }
}
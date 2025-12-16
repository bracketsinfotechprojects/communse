import { Routes } from '@angular/router';
import { FirebaseDashboardComponent } from './components/firebase-dashboard/firebase-dashboard.component';
import { EventChatComponent } from './components/event-chat/event-chat.component';
import { FirebaseTestComponent } from './components/firebase-test/firebase-test.component';
import { FirebaseDiagnosticComponent } from './components/firebase-diagnostic/firebase-diagnostic.component';
import { FirebaseChatTestComponent } from './components/firebase-chat-test/firebase-chat-test.component';
import { SimpleChatTestComponent } from './components/simple-chat-test/simple-chat-test.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/diagnostic',
    pathMatch: 'full'
  },
  {
    path: 'chat',
    component: EventChatComponent
  },
  {
    path: 'chat-test',
    component: FirebaseChatTestComponent
  },
  {
    path: 'firebase-demo',
    component: FirebaseDashboardComponent
  },
  {
    path: 'firebase-test',
    component: FirebaseTestComponent
  },
  {
    path: 'firebase-diagnostic',
    component: FirebaseDiagnosticComponent
  },
  {
    path: 'diagnostic',
    component: SimpleChatTestComponent
  }
];

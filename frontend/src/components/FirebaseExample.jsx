import React, { useState } from 'react';
import { useAuth, useDatabase, useStorage, useNotifications } from '../hooks/useFirebase';

const FirebaseExample = () => {
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth();
  const { ref, set, push, onValue, loading: dbLoading, error: dbError } = useDatabase();
  const { uploadFile, getDownloadURL, loading: storageLoading } = useStorage();
  const { requestPermission, getFCMToken, permission, fcmToken } = useNotifications();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // Listen to messages in real-time
  React.useEffect(() => {
    if (user) {
      const messagesRef = ref(`messages/${user.uid}`);
      const unsubscribe = onValue(messagesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const messagesList = Object.entries(data).map(([id, msg]) => ({
            id,
            ...msg
          }));
          setMessages(messagesList);
        }
      });

      return () => {
        if (unsubscribe) {
          // Clean up the listener
          messagesRef.off('value', unsubscribe);
        }
      };
    }
  }, [user, ref, onValue]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await signUp(email, password);
    } catch (error) {
      console.error('Sign up error:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const sendMessage = async () => {
    if (user && message.trim()) {
      try {
        await push(`messages/${user.uid}`, {
          text: message,
          timestamp: Date.now(),
          userId: user.uid,
          email: user.email
        });
        setMessage('');
      } catch (error) {
        console.error('Send message error:', error);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && user) {
      try {
        const fileName = `uploads/${user.uid}/${Date.now()}-${file.name}`;
        await uploadFile(fileName, file);
        const downloadURL = await getDownloadURL(fileName);
        console.log('File uploaded successfully:', downloadURL);
      } catch (error) {
        console.error('File upload error:', error);
      }
    }
  };

  const setupNotifications = async () => {
    try {
      await requestPermission();
      const token = await getFCMToken();
      console.log('FCM Token:', token);
    } catch (error) {
      console.error('Notification setup error:', error);
    }
  };

  if (authLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Firebase Integration Example</h1>
      
      {user ? (
        <div className="space-y-4">
          <div className="bg-green-100 p-3 rounded">
            <p>Signed in as: {user.email}</p>
            <button
              onClick={handleSignOut}
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>

          {/* Send Message */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Send Message</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded"
              />
              <button
                onClick={sendMessage}
                disabled={dbLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Messages</h3>
            <div className="max-h-40 overflow-y-auto space-y-2">
              {messages.map((msg) => (
                <div key={msg.id} className="bg-gray-100 p-2 rounded">
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <h3 className="text-lg font-semibold mb-2">File Upload</h3>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={storageLoading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {storageLoading && <p className="text-sm text-gray-500">Uploading...</p>}
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Push Notifications</h3>
            <button
              onClick={setupNotifications}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Setup Notifications
            </button>
            {permission && (
              <p className="text-sm text-gray-600 mt-2">
                Permission: {permission}
              </p>
            )}
            {fcmToken && (
              <p className="text-xs text-gray-500 mt-2 break-all">
                Token: {fcmToken}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Sign In</h3>
            <form onSubmit={handleSignIn} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-3 py-2 border rounded"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Sign In
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Sign Up</h3>
            <form onSubmit={handleSignUp} className="space-y-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className="w-full px-3 py-2 border rounded"
              />
              <button
                type="submit"
                disabled={authLoading}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                Sign Up
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(authError || dbError) && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {authError || dbError}
        </div>
      )}
    </div>
  );
};

export default FirebaseExample;
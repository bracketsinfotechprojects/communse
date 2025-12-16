import { useState, useEffect } from 'react';
import firebaseClientService from '../services/firebaseService';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = firebaseClientService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    try {
      setError(null);
      const result = await firebaseClientService.signInWithEmailAndPassword(email, password);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signUp = async (email, password) => {
    try {
      setError(null);
      const result = await firebaseClientService.createUserWithEmailAndPassword(email, password);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await firebaseClientService.signOut();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetPassword = async (email) => {
    try {
      setError(null);
      await firebaseClientService.sendPasswordResetEmail(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getIdToken = async () => {
    try {
      return await firebaseClientService.getIdToken();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    getIdToken
  };
};

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ref = (path) => {
    return firebaseClientService.ref(path);
  };

  const set = async (path, data) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseClientService.ref(path).set(data);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const push = async (path, data) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseClientService.ref(path).push(data);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const update = async (path, data) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseClientService.ref(path).update(data);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const remove = async (path) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseClientService.ref(path).remove();
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const onValue = (path, callback) => {
    return firebaseClientService.ref(path).on('value', callback);
  };

  const off = (path, callback) => {
    return firebaseClientService.ref(path).off('value', callback);
  };

  return {
    ref,
    set,
    push,
    update,
    remove,
    onValue,
    off,
    loading,
    error
  };
};

export const useStorage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const uploadFile = async (path, file, metadata = {}) => {
    try {
      setError(null);
      setLoading(true);
      const result = await firebaseClientService.uploadFile(path, file, metadata);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  const getDownloadURL = async (path) => {
    try {
      setError(null);
      setLoading(true);
      const url = await firebaseClientService.getDownloadURL(path);
      setLoading(false);
      return url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return {
    uploadFile,
    getDownloadURL,
    loading,
    error
  };
};

export const useNotifications = () => {
  const [permission, setPermission] = useState(null);
  const [fcmToken, setFcmToken] = useState(null);
  const [error, setError] = useState(null);

  const requestPermission = async () => {
    try {
      setError(null);
      const perm = await firebaseClientService.requestNotificationPermission();
      setPermission(perm);
      return perm;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const getFCMToken = async () => {
    try {
      setError(null);
      const token = await firebaseClientService.getFCMToken();
      setFcmToken(token);
      return token;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    permission,
    fcmToken,
    error,
    requestPermission,
    getFCMToken
  };
};
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { customerAPI } from '../services/api';
import { useAuth } from './AuthContext';

const ProfileContext = createContext();

// Action types
const PROFILE_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_PROFILE: 'SET_PROFILE',
  UPDATE_PROFILE: 'UPDATE_PROFILE',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Initial state
const initialState = {
  profile: null,
  loading: false,
  error: null,
};

// Reducer
const profileReducer = (state, action) => {
  switch (action.type) {
    case PROFILE_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
        error: null,
      };

    case PROFILE_ACTIONS.SET_PROFILE:
      return {
        ...state,
        profile: action.payload,
        loading: false,
        error: null,
      };

    case PROFILE_ACTIONS.UPDATE_PROFILE:
      return {
        ...state,
        profile: { ...state.profile, ...action.payload },
      };

    case PROFILE_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case PROFILE_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Provider component
export const ProfileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);
  const { user, userType, isAuthenticated } = useAuth();

  // Load profile from user data
  const loadProfile = useCallback(() => {
    if (user && isAuthenticated) {
      dispatch({ type: PROFILE_ACTIONS.SET_PROFILE, payload: user });
    }
  }, [user, isAuthenticated]);

  // Load profile on mount or when user changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Update profile
  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: PROFILE_ACTIONS.SET_LOADING, payload: true });
      
      if (userType === 'customer') {
        const response = await customerAPI.updateCustomer(user.customer_id, profileData);
        
        if (response.success && response.customer) {
          dispatch({ type: PROFILE_ACTIONS.UPDATE_PROFILE, payload: response.customer });
          return { success: true, profile: response.customer };
        } else {
          dispatch({ type: PROFILE_ACTIONS.SET_ERROR, payload: response.message || 'Failed to update profile' });
          return { success: false, message: response.message };
        }
      } else {
        // For employees, just update local state for now
        dispatch({ type: PROFILE_ACTIONS.UPDATE_PROFILE, payload: profileData });
        return { success: true, profile: { ...state.profile, ...profileData } };
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      dispatch({ type: PROFILE_ACTIONS.SET_ERROR, payload: error.message || 'Failed to update profile' });
      return { success: false, message: error.message };
    }
  };

  // Set profile (for local state management)
  const setProfile = (profile) => {
    dispatch({ type: PROFILE_ACTIONS.SET_PROFILE, payload: profile });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: PROFILE_ACTIONS.CLEAR_ERROR });
  };

  // Get profile display name
  const getDisplayName = () => {
    if (state.profile) {
      return state.profile.name || state.profile.username || 'User';
    }
    return 'User';
  };

  // Get profile initials
  const getInitials = () => {
    const name = getDisplayName();
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const value = {
    // State
    ...state,
    
    // Actions
    updateProfile,
    setProfile,
    clearError,
    getDisplayName,
    getInitials,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
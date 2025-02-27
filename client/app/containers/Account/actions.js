/*
 *
 * Account actions
 *
 */

import { success } from 'react-notification-system-redux';
import axios from 'axios';
import cookie from 'react-cookies';

import {
  ACCOUNT_CHANGE,
  FETCH_PROFILE,
  TOGGLE_RESET_FORM,
  CLEAR_ACCOUNT
} from './constants';
import handleError from '../../utils/error';

export const accountChange = (name, value) => {
  let formData = {};
  formData[name] = value;

  return {
    type: ACCOUNT_CHANGE,
    payload: formData
  };
};

export const toggleResetForm = () => {
  return {
    type: TOGGLE_RESET_FORM
  };
};

export const clearAccount = () => {
  return {
    type: CLEAR_ACCOUNT
  };
};

export const fetchProfile = userId => {
  return async (dispatch, getState) => {
    try {
      const response = await axios.get(`/api/user/${userId}`);

      dispatch({ type: FETCH_PROFILE, payload: response.data.user });
    } catch (error) {
      const title = `Please try again!`;
      handleError(error, title, dispatch);
    }
  };
};

export const updateProfile = () => {
  return async (dispatch, getState) => {
    const profile = getState().account.profileData;
    const userId = cookie.load('user');

    try {
      const response = await axios.put(`/api/user/${userId}`, {
        profile
      });

      const successfulOptions = {
        title: `${response.data.message}`,
        position: 'tr',
        autoDismiss: 1
      };

      dispatch({ type: FETCH_PROFILE, payload: response.data.user });

      // dispatch(fetchProfile(userId));

      dispatch(success(successfulOptions));
    } catch (error) {
      const title = `Please try again!`;
      handleError(error, title, dispatch);
    }
  };
};

export const unsubscribeFromNewsletter = subscriberId => {
  return async (dispatch, getState) => {
    try {
      const response = await axios.post(
        `/api/user/unsubscribe/${subscriberId}`
      );

      const successfulOptions = {
        title: `${response.data.message}`,
        position: 'tr',
        autoDismiss: 1
      };

      dispatch({ type: FETCH_PROFILE, payload: response.data.user });

      dispatch(success(successfulOptions));
    } catch (error) {
      const title = `Please try again!`;
      handleError(error, title, dispatch);
    }
  };
};

export const reSubscribeToNewsletter = () => {
  return async (dispatch, getState) => {
    try {
      const response = await axios.post(`/api/user/subscribe`);

      const successfulOptions = {
        title: `${response.data.message}`,
        position: 'tr',
        autoDismiss: 1
      };

      dispatch({ type: FETCH_PROFILE, payload: response.data.user });
      dispatch(success(successfulOptions));
    } catch (error) {
      const title = `Please try again!`;
      handleError(error, title, dispatch);
    }
  };
};

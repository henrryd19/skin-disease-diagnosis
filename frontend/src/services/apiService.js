/**
 * API Service for handling backend communication
 */

import axios from 'axios';

// API base URL configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor for API calls
apiClient.interceptors.request.use(
  config => {
    // You can add auth tokens here if needed in the future
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
apiClient.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // Handle errors globally
    console.error('API Error:', error);
    
    // Format error message based on response
    let errorMessage = 'Đã xảy ra lỗi không xác định';
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage = error.response.data.message || `Lỗi ${error.response.status}: ${error.response.statusText}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.';
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * API Service for handling backend operations
 */
const apiService = {
  /**
   * Make a GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Response data
   */
  get: async (endpoint, params = {}) => {
    try {
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Make a POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} - Response data
   */
  post: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Make a POST request with form data (e.g., for file uploads)
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data
   * @returns {Promise<Object>} - Response data
   */
  postFormData: async (endpoint, formData) => {
    try {
      const response = await apiClient.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Make a PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} - Response data
   */
  put: async (endpoint, data = {}) => {
    try {
      const response = await apiClient.put(endpoint, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Make a DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} - Response data
   */
  delete: async (endpoint) => {
    try {
      const response = await apiClient.delete(endpoint);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default apiService;
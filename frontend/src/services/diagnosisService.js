import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/api';

class DiagnosisService {
  async testConnection() {
    console.log('🔗 Testing connection to:', `${API_URL}/health`);
    
    try {
      const response = await axios.get(`${API_URL}/health`, {
        timeout: 10000
      });
      console.log('✅ Connection successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Connection failed:', error.response?.status, error.message);
      
      // Try fallback
      try {
        console.log('🔄 Trying fallback endpoint...');
        const fallbackResponse = await axios.get('http://127.0.0.1:5000/health', {
          timeout: 10000
        });
        console.log('✅ Fallback successful:', fallbackResponse.data);
        return fallbackResponse.data;
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        throw error;
      }
    }
  }

  async analyzeImage(imageFile) {
    console.log('📸 Analyzing image:', imageFile?.name || 'Unknown file');
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', imageFile);
      
      console.log('🚀 Sending request to:', `${API_URL}/predict`);
      
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for image processing
      });
      
      console.log('✅ Analysis successful:', response.data);
      
      // Transform the response to match your expected format
      if (response.data.success && response.data.predictions) {
        return {
          status: 'success',
          result: {
            topResult: response.data.top_prediction,
            allPredictions: response.data.predictions,
            modelInfo: response.data.model_info
          }
        };
      } else {
        throw new Error(response.data.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
        throw new Error(errorMessage);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      } else {
        // Something else happened
        throw new Error(error.message || 'Có lỗi xảy ra khi phân tích ảnh');
      }
    }
  }

  async getClasses() {
    console.log('📋 Getting available classes...');
    
    try {
      const response = await axios.get(`${API_URL}/classes`, {
        timeout: 10000
      });
      console.log('✅ Classes retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get classes:', error);
      throw error;
    }
  }
}

export default new DiagnosisService();
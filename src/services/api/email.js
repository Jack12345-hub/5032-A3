// ========================================
// 1. src/services/api/email.js
// ========================================
import axios from 'axios';

const API_BASE_URL = process.env.VUE_APP_API_URL || 'http://localhost:3000';

class EmailAPI {
  /**
   * Send email
   */
  static async sendEmail(emailData, attachments = []) {
    const formData = new FormData();
    
    // Add email data
    Object.keys(emailData).forEach(key => {
      if (emailData[key] !== null && emailData[key] !== undefined) {
        formData.append(key, emailData[key]);
      }
    });
    
    // Add attachments
    attachments.forEach((file, index) => {
      formData.append('attachments', file);
    });
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/send-email`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send email');
    }
  }
  
  /**
   * Send bulk emails
   */
  static async sendBulkEmail(recipients, emailContent) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/send-bulk-email`,
        {
          recipients,
          ...emailContent
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send bulk emails');
    }
  }
}

export default EmailAPI;
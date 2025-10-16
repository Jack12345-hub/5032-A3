// ========================================
// 2. src/services/emailService.js
// ========================================
import EmailAPI from './api/email';

class EmailService {
  constructor() {
    this.emailTemplates = {
      welcome: {
        name: 'Welcome Email',
        subject: 'Welcome to Our Platform!',
        template: (data) => `
          <h2>Welcome, ${data.userName}!</h2>
          <p>Thank you for registering.</p>
        `
      },
      notification: {
        name: 'Notification Email',
        subject: 'Important Notification',
        template: (data) => `
          <h2>Notification</h2>
          <p>${data.message}</p>
        `
      },
      invoice: {
        name: 'Invoice Email',
        subject: 'Your Invoice',
        template: (data) => `
          <h2>Invoice #${data.invoiceNumber}</h2>
          <p>Amount: ${data.amount}</p>
        `
      }
    };
  }
  
  /**
   * Get all email templates
   */
  getTemplates() {
    return Object.keys(this.emailTemplates).map(key => ({
      key,
      name: this.emailTemplates[key].name,
      subject: this.emailTemplates[key].subject
    }));
  }
  
  /**
   * Generate email content from template
   */
  generateEmailContent(templateKey, data) {
    const template = this.emailTemplates[templateKey];
    if (!template) {
      throw new Error('Template does not exist');
    }
    
    return {
      subject: template.subject,
      html: template.template(data)
    };
  }
  
  /**
   * Send email
   */
  async sendEmail(options) {
    return await EmailAPI.sendEmail(options.emailData, options.attachments);
  }
  
  /**
   * Validate email format
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
}

export default new EmailService();
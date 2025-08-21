// Popup JavaScript for Kanji Learning Extension
class PopupController {
  constructor() {
    this.isSignUpMode = false;
    this.currentUser = null;
    this.init();
  }

  async init() {
    this.bindEvents();
    await this.checkAuthenticationStatus();
  }

  bindEvents() {
    // Authentication form
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAuth();
    });

    // Toggle between sign in and sign up
    document.getElementById('toggleMode').addEventListener('click', () => {
      this.toggleAuthMode();
    });

    // Dashboard controls
    document.getElementById('signOutBtn').addEventListener('click', () => {
      this.signOut();
    });

    document.getElementById('extensionToggle').addEventListener('click', () => {
      this.toggleExtension();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });
  }

  async checkAuthenticationStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
      
      if (response.isAuthenticated) {
        this.currentUser = response.user;
        await this.showDashboard();
      } else {
        this.showAuthForm();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      this.showAuthForm();
    }
  }

  async handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const submitBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
      this.showMessage('Please fill in all fields', 'error');
      return;
    }

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="loading"></div>Processing...';
    this.hideMessage();

    try {
      if (this.isSignUpMode) {
        await this.signUp(email, password);
      } else {
        await this.signIn(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      this.showMessage('Something went wrong. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = this.isSignUpMode ? 'Create Account' : 'Sign In';
    }
  }

  async signIn(email, password) {
    const response = await chrome.runtime.sendMessage({
      type: 'AUTHENTICATE',
      email,
      password
    });

    if (response.success) {
      this.currentUser = response.user;
      await this.showDashboard();
    } else {
      this.showMessage(response.error || 'Sign in failed', 'error');
    }
  }

  async signUp(email, password) {
    const response = await chrome.runtime.sendMessage({
      type: 'SIGN_UP',
      email,
      password
    });

    if (response.success) {
      this.showMessage(response.message || 'Account created! Please check your email.', 'success');
      // Switch back to sign in mode
      setTimeout(() => {
        this.isSignUpMode = false;
        this.toggleAuthMode();
      }, 2000);
    } else {
      this.showMessage(response.error || 'Sign up failed', 'error');
    }
  }

  async signOut() {
    const response = await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
    
    if (response.success) {
      this.currentUser = null;
      this.showAuthForm();
    } else {
      this.showMessage('Sign out failed', 'error');
    }
  }

  toggleAuthMode() {
    this.isSignUpMode = !this.isSignUpMode;
    const title = document.querySelector('.form-title');
    const submitBtn = document.getElementById('loginBtn');
    const toggleBtn = document.getElementById('toggleMode');

    if (this.isSignUpMode) {
      title.textContent = 'Create Account';
      submitBtn.textContent = 'Create Account';
      toggleBtn.textContent = 'Already have an account?';
    } else {
      title.textContent = 'Welcome Back';
      submitBtn.textContent = 'Sign In';
      toggleBtn.textContent = 'Create New Account';
    }

    // Clear form and messages
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
    this.hideMessage();
  }

  showAuthForm() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('dashboard').classList.add('hidden');
    document.getElementById('authForm').classList.remove('hidden');
  }

  async showDashboard() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('authForm').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Update user info
    if (this.currentUser?.email) {
      document.getElementById('userEmail').textContent = this.currentUser.email;
    }

    // Load and display stats
    await this.loadStats();
  }

  async loadStats() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STUDIED_KANJI' });
      
      if (response.success) {
        const studiedKanji = response.data;
        const today = new Date().toISOString().split('T')[0];
        const studiedToday = studiedKanji.filter(k => 
          k.studied_at && k.studied_at.startsWith(today)
        ).length;

        document.getElementById('studiedCount').textContent = studiedToday;
        document.getElementById('totalCount').textContent = studiedKanji.length;
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async toggleExtension() {
    const toggle = document.getElementById('extensionToggle');
    const isEnabled = toggle.classList.contains('active');
    
    // Toggle the visual state
    toggle.classList.toggle('active');
    
    // Update storage
    await chrome.storage.sync.set({ 
      extensionEnabled: !isEnabled 
    });

    // Update status text
    const statusText = document.querySelector('.user-status span:last-child');
    statusText.textContent = !isEnabled ? 'Extension Active' : 'Extension Disabled';
    
    // Update status dot color
    const statusDot = document.querySelector('.status-dot');
    statusDot.style.background = !isEnabled ? '#4CAF50' : '#f44336';
  }

  openSettings() {
    // Open the old settings/options page in a new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
  }

  showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
  }

  hideMessage() {
    document.getElementById('message').classList.add('hidden');
  }
}

// Initialize popup controller when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

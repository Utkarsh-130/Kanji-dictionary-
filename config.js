// Supabase Configuration
// Replace these with your actual Supabase project credentials
const SUPABASE_CONFIG = {
  url: 'https://sgdpvromsceywrgwvzvb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnZHB2cm9tc2NleXdyZ3d2enZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4Mjk5NTgsImV4cCI6MjA2NzQwNTk1OH0.Bm716eRUCVdTsStNInhZIWUewHNbZUq6aqqSFypwrZA'
};

// Lightweight Supabase client for extension
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.session = null;
  }

  async signIn(email, password) {
    try {
      const response = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        this.session = data;
        await chrome.storage.local.set({ supabaseSession: data });
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signUp(email, password) {
    try {
      const response = await fetch(`${this.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        return { data, error: null };
      } else {
        return { data: null, error: data };
      }
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  }

  async signOut() {
    try {
      if (this.session?.access_token) {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.access_token}`,
            'apikey': this.key
          }
        });
      }
      
      this.session = null;
      await chrome.storage.local.remove('supabaseSession');
      return { error: null };
    } catch (error) {
      return { error: { message: error.message } };
    }
  }

  async getSession() {
    if (!this.session) {
      const stored = await chrome.storage.local.get('supabaseSession');
      if (stored.supabaseSession) {
        // Check if token is still valid
        const tokenExpiry = stored.supabaseSession.expires_at;
        if (tokenExpiry && Date.now() / 1000 < tokenExpiry) {
          this.session = stored.supabaseSession;
        } else {
          await chrome.storage.local.remove('supabaseSession');
        }
      }
    }
    return this.session;
  }

  async insertKanjiStudy(kanji, meaning, reading, level) {
    const session = await this.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.url}/rest/v1/studied_kanji`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': this.key,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          user_id: session.user.id,
          kanji: kanji,
          meaning: meaning,
          reading: reading,
          level: level,
          studied_at: new Date().toISOString()
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving kanji study:', error);
      return false;
    }
  }

  async getStudiedKanji() {
    const session = await this.getSession();
    if (!session?.access_token) {
      return [];
    }

    try {
      const response = await fetch(`${this.url}/rest/v1/studied_kanji?select=*&user_id=eq.${session.user.id}&order=studied_at.desc`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': this.key
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching studied kanji:', error);
      return [];
    }
  }
}

// Initialize Supabase client
const supabase = new SupabaseClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);

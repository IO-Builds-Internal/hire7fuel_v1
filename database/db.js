const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const baseConfig = require('../config');

// Load environment variables if available
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let dbClient = null;
const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);

if (isSupabaseConfigured) {
  try {
    dbClient = createClient(supabaseUrl, supabaseKey);
    console.log('Database Client: Supabase layer successfully initialized.');
  } catch (error) {
    console.error('Database Client: Error initializing Supabase client. Falling back to local JSON.', error);
    dbClient = null;
  }
} else {
  console.log('Database Client: Supabase credentials not found in env. Initializing offline Local JSON database fallback.');
}

// Path to offline local database file
const localDbPath = path.join(__dirname, 'local_db.json');

// Initialize local JSON file if missing
function initLocalDb() {
  if (!fs.existsSync(localDbPath)) {
    const defaultData = {
      settings: {
        brand_name: baseConfig.brand.name,
        brand_tagline: baseConfig.brand.tagline,
        logo_url: baseConfig.brand.logo,
        contact_phone: baseConfig.contact.phone,
        contact_email: baseConfig.contact.email,
        contact_address: baseConfig.contact.address,
        social_linkedin: baseConfig.social.linkedin,
        social_facebook: baseConfig.social.facebook,
        social_instagram: baseConfig.social.instagram
      },
      jobs: [],
      submissions: []
    };
    fs.writeFileSync(localDbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

// Read from local JSON
function readLocalDb() {
  initLocalDb();
  try {
    const rawData = fs.readFileSync(localDbPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading local JSON db:', error);
    return { settings: {}, jobs: [], submissions: [] };
  }
}

// Write to local JSON
function writeLocalDb(data) {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error writing to local JSON db:', error);
    return false;
  }
}

// Helper to generate UUID-like string for local jobs/submissions
const generateId = () => Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);

// Expose unified DB interfaces
module.exports = {
  isSupabase: isSupabaseConfigured && dbClient !== null,

  /**
   * Fetch site settings, falling back to base configuration.
   */
  async getSettings() {
    const settingsObj = {
      brand: { ...baseConfig.brand },
      colors: { ...baseConfig.colors },
      contact: { ...baseConfig.contact },
      social: { ...baseConfig.social }
    };

    if (this.isSupabase) {
      try {
        const { data, error } = await dbClient
          .from('settings')
          .select('key, value');

        if (error) throw error;

        if (data && data.length > 0) {
          data.forEach(item => {
            if (item.key === 'brand_name') settingsObj.brand.name = item.value;
            if (item.key === 'brand_tagline') settingsObj.brand.tagline = item.value;
            if (item.key === 'logo_url') settingsObj.brand.logo = item.value;
            if (item.key === 'contact_phone') settingsObj.contact.phone = item.value;
            if (item.key === 'contact_email') settingsObj.contact.email = item.value;
            if (item.key === 'contact_address') settingsObj.contact.address = item.value;
            if (item.key === 'social_linkedin') settingsObj.social.linkedin = item.value;
            if (item.key === 'social_facebook') settingsObj.social.facebook = item.value;
            if (item.key === 'social_instagram') settingsObj.social.instagram = item.value;
          });
        }
      } catch (err) {
        console.error('Supabase getSettings failed, using config defaults:', err.message);
      }
    } else {
      const db = readLocalDb();
      const s = db.settings || {};
      if (s.brand_name) settingsObj.brand.name = s.brand_name;
      if (s.brand_tagline) settingsObj.brand.tagline = s.brand_tagline;
      if (s.logo_url) settingsObj.brand.logo = s.logo_url;
      if (s.contact_phone) settingsObj.contact.phone = s.contact_phone;
      if (s.contact_email) settingsObj.contact.email = s.contact_email;
      if (s.contact_address) settingsObj.contact.address = s.contact_address;
      if (s.social_linkedin) settingsObj.social.linkedin = s.social_linkedin;
      if (s.social_facebook) settingsObj.social.facebook = s.social_facebook;
      if (s.social_instagram) settingsObj.social.instagram = s.social_instagram;
    }

    return settingsObj;
  },

  /**
   * Update a specific key-value setting.
   */
  async updateSetting(key, value) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('settings')
          .upsert({ key, value, updated_at: new Date() }, { onConflict: 'key' });
        
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateSetting failed:', err.message);
        return false;
      }
    } else {
      const db = readLocalDb();
      if (!db.settings) db.settings = {};
      db.settings[key] = value;
      return writeLocalDb(db);
    }
  },

  /**
   * Bulk update multiple settings.
   */
  async updateSettings(settingsMap) {
    let success = true;
    for (const [key, val] of Object.entries(settingsMap)) {
      const ok = await this.updateSetting(key, val);
      if (!ok) success = false;
    }
    return success;
  },

  /**
   * Fetch all jobs.
   * @param {boolean} onlyActive - If true, filters by active jobs (for public views)
   */
  async getJobs(onlyActive = false) {
    if (this.isSupabase) {
      try {
        let query = dbClient.from('jobs').select('*').order('created_at', { ascending: false });
        if (onlyActive) {
          query = query.eq('active', true);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase getJobs failed:', err.message);
        return [];
      }
    } else {
      const db = readLocalDb();
      const list = db.jobs || [];
      const sorted = list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (onlyActive) {
        return sorted.filter(j => j.active);
      }
      return sorted;
    }
  },

  /**
   * Insert a new job.
   */
  async addJob({ title, department, location, description, requirements, type = 'Full-time' }) {
    const newJob = {
      title,
      department,
      location,
      description,
      requirements, // Store as newline-separated list string
      type,
      active: true,
      created_at: new Date().toISOString()
    };

    if (this.isSupabase) {
      try {
        const { data, error } = await dbClient
          .from('jobs')
          .insert([newJob])
          .select();
        
        if (error) throw error;
        return data ? data[0] : true;
      } catch (err) {
        console.error('Supabase addJob failed:', err.message);
        return false;
      }
    } else {
      const db = readLocalDb();
      newJob.id = generateId();
      db.jobs.push(newJob);
      const ok = writeLocalDb(db);
      return ok ? newJob : false;
    }
  },

  /**
   * Toggle a job's active status.
   */
  async toggleJobStatus(id, active) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('jobs')
          .update({ active })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase toggleJobStatus failed:', err.message);
        return false;
      }
    } else {
      const db = readLocalDb();
      const idx = db.jobs.findIndex(j => j.id === id);
      if (idx !== -1) {
        db.jobs[idx].active = active;
        return writeLocalDb(db);
      }
      return false;
    }
  },

  /**
   * Delete a job posting.
   */
  async deleteJob(id) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('jobs')
          .delete()
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteJob failed:', err.message);
        return false;
      }
    } else {
      const db = readLocalDb();
      const filtered = db.jobs.filter(j => j.id !== id);
      if (filtered.length !== db.jobs.length) {
        db.jobs = filtered;
        return writeLocalDb(db);
      }
      return false;
    }
  },

  /**
   * Save a form submission (contact, fuelcard application, careers general)
   */
  async saveSubmission(type, payload) {
    const submission = {
      type,
      payload,
      created_at: new Date().toISOString()
    };

    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('submissions')
          .insert([submission]);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase saveSubmission failed:', err.message);
        return false;
      }
    } else {
      const db = readLocalDb();
      submission.id = generateId();
      if (!db.submissions) db.submissions = [];
      db.submissions.push(submission);
      return writeLocalDb(db);
    }
  },

  /**
   * Retrieve all submissions, sorted by date.
   */
  async getSubmissions(type = null) {
    if (this.isSupabase) {
      try {
        let query = dbClient.from('submissions').select('*').order('created_at', { ascending: false });
        if (type) {
          query = query.eq('type', type);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase getSubmissions failed:', err.message);
        return [];
      }
    } else {
      const db = readLocalDb();
      const list = db.submissions || [];
      const sorted = list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (type) {
        return sorted.filter(s => s.type === type);
      }
      return sorted;
    }
  }
};

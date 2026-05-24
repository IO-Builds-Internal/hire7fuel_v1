const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
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
    console.error('Database Client: Error initializing Supabase client. Falling back to SQLite.', error);
    dbClient = null;
  }
} else {
  console.log('Database Client: Supabase credentials not found in env. Initializing offline SQLite local database fallback.');
}

// Path to offline local SQLite database file
const localDbFile = path.join(__dirname, 'hire7_fuel.sqlite');
let sqliteDb = null;

if (!isSupabaseConfigured || dbClient === null) {
  // Initialize SQLite Connection
  sqliteDb = new sqlite3.Database(localDbFile, (err) => {
    if (err) {
      console.error('Error connecting to SQLite database:', err.message);
    } else {
      console.log('SQLite Client: Connected to local hire7_fuel.sqlite database.');
      initSqliteTables();
    }
  });
}

/**
 * Bootstraps SQLite tables and initial settings seed if database is new.
 */
function initSqliteTables() {
  sqliteDb.serialize(() => {
    // 1. Settings Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Jobs Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        requirements TEXT NOT NULL,
        type TEXT DEFAULT 'Full-time',
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Submissions Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed settings if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM settings", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline brand settings database rows...');
        const stmt = sqliteDb.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
        stmt.run('brand_name', baseConfig.brand.name);
        stmt.run('brand_tagline', baseConfig.brand.tagline);
        stmt.run('logo_url', baseConfig.brand.logo);
        stmt.run('contact_phone', baseConfig.contact.phone);
        stmt.run('contact_email', baseConfig.contact.email);
        stmt.run('contact_address', baseConfig.contact.address);
        stmt.run('social_linkedin', baseConfig.social.linkedin);
        stmt.run('social_facebook', baseConfig.social.facebook);
        stmt.run('social_instagram', baseConfig.social.instagram);
        stmt.run('app_playstore', baseConfig.app.playstore);
        stmt.run('app_appstore', baseConfig.app.appstore);
        stmt.finalize();
      }
    });

    // Seed default jobs if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM jobs", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline carrier logistics and technical jobs...');
        const stmt = sqliteDb.prepare("INSERT INTO jobs (id, title, department, location, description, requirements, type, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)");
        
        stmt.run(
          'job-1',
          'Commercial Fleet Logistics Coordinator',
          'Dispatch Operations',
          'Brampton, ON - Hybrid',
          'Oversee fuel purchase logs, coordinate active fleet routes across primary highway lanes, and assist commercial carriers in minimizing out-of-route refueling overhead using the Hire7 Shield AI™ tracking system.',
          '2+ years experience dispatching long-haul commercial trucks or handling fleet fuel procurement.\nStrong familiarity with North American highway corridors and freight route planning.\nProficient communication skills and rapid multi-tasking abilities.',
          'Full-time'
        );

        stmt.run(
          'job-2',
          'Staff Software Engineer, Fleet Analytics',
          'Engineering & Security',
          'Brampton, ON - Hybrid',
          'Help build and expand the Hire7 Shield AI™ real-time security tracking engine. Drive optimizations in telemetry geofencing databases, automated state IFTA compilation pipelines, and responsive glassmorphic dashboard management interfaces.',
          '4+ years of professional backend software development experience with Node.js and relational databases.\nDeep understanding of geospatial indexing, real-time streaming pipelines, and API architecture.\nStrong dedication to clean code, modular frameworks, and premium visual components.',
          'Full-time'
        );

        stmt.run(
          'job-3',
          'Enterprise Carrier Account Executive',
          'Sales & Fleet Growth',
          'Brampton, ON - Remote',
          'Identify and partner with mid-to-large-size commercial truck fleets across Canada and the United States. Conduct custom lane savings assessments demonstrating the clear financial advantages of Hire7 Fuel\'s transparent wholesale cost-plus pricing structures.',
          'Proven track record of B2B sales inside the logistics, freight brokerage, or commercial transportation sectors.\nAbility to analyze financial reports and contrast legacy retail pricing with wholesale Cost-Plus structures.\nOutstanding relationship building skills with fleet owners and dispatch directors.',
          'Full-time'
        );


        stmt.finalize();
      }
    });

    // 4. Testimonials Table
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS testimonials (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        role TEXT NOT NULL,
        quote TEXT NOT NULL,
        stars INTEGER DEFAULT 5,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default testimonials if empty
    sqliteDb.get("SELECT COUNT(*) as count FROM testimonials", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log('SQLite Client: Seeding baseline carrier testimonials...');
        const stmt = sqliteDb.prepare("INSERT INTO testimonials (id, author, role, quote, stars, active) VALUES (?, ?, ?, ?, ?, 1)");
        
        stmt.run(
          'testi-1',
          'Marcus Howell',
          'Director of Logistics, Howell Transport',
          'Implementing the Hire7 Fuel Card completely resolved our card abuse issues. The geofencing tool blocked two out-of-bounds fills in our first month alone, saving us hundreds of dollars in leakage.',
          5
        );
        
        stmt.run(
          'testi-2',
          'Sandeep Dhillon',
          'Operations Manager, GTA Freightways',
          'We scaled our fleet from 5 to 25 trucks without adding a single administrative hire. The automated IFTA tax logs export seamlessly to our accounting platform. It\'s clean, rapid, and transparent.',
          5
        );
        
        stmt.run(
          'testi-3',
          'Terri Lafleur',
          'Fleet Coordinator, Lafleur Transport Inc.',
          'Outstanding customer care. Whenever our drivers encounter weather route delays or require sudden limit extensions for truck maintenance, the phone dispatchers respond in under a minute.',
          5
        );
        
        stmt.finalize();
      }
    });
  });
}

/**
 * Async Promisified helpers for SQLite transactions
 */
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  if (!sqliteDb) return reject(new Error('SQLite is not initialized.'));
  sqliteDb.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  if (!sqliteDb) return reject(new Error('SQLite is not initialized.'));
  sqliteDb.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  if (!sqliteDb) return reject(new Error('SQLite is not initialized.'));
  sqliteDb.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

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
      social: { ...baseConfig.social },
      app: { ...baseConfig.app },
      smtp: { ...baseConfig.smtp }
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
            if (item.key === 'smtp_host') settingsObj.smtp.host = item.value;
            if (item.key === 'smtp_port') settingsObj.smtp.port = item.value;
            if (item.key === 'smtp_user') settingsObj.smtp.user = item.value;
            if (item.key === 'smtp_pass') settingsObj.smtp.pass = item.value;
            if (item.key === 'smtp_from') settingsObj.smtp.from = item.value;
            if (item.key === 'smtp_to') settingsObj.smtp.to = item.value;
            if (item.key === 'smtp_enabled') settingsObj.smtp.enabled = item.value;
            if (item.key === 'app_playstore') settingsObj.app.playstore = item.value;
            if (item.key === 'app_appstore') settingsObj.app.appstore = item.value;
          });
        }
      } catch (err) {
        console.error('Supabase getSettings failed, using config defaults:', err.message);
      }
    } else {
      try {
        const rows = await dbAll("SELECT key, value FROM settings");
        if (rows && rows.length > 0) {
          rows.forEach(row => {
            if (row.key === 'brand_name') settingsObj.brand.name = row.value;
            if (row.key === 'brand_tagline') settingsObj.brand.tagline = row.value;
            if (row.key === 'logo_url') settingsObj.brand.logo = row.value;
            if (row.key === 'contact_phone') settingsObj.contact.phone = row.value;
            if (row.key === 'contact_email') settingsObj.contact.email = row.value;
            if (row.key === 'contact_address') settingsObj.contact.address = row.value;
            if (row.key === 'social_linkedin') settingsObj.social.linkedin = row.value;
            if (row.key === 'social_facebook') settingsObj.social.facebook = row.value;
            if (row.key === 'social_instagram') settingsObj.social.instagram = row.value;
            if (row.key === 'smtp_host') settingsObj.smtp.host = row.value;
            if (row.key === 'smtp_port') settingsObj.smtp.port = row.value;
            if (row.key === 'smtp_user') settingsObj.smtp.user = row.value;
            if (row.key === 'smtp_pass') settingsObj.smtp.pass = row.value;
            if (row.key === 'smtp_from') settingsObj.smtp.from = row.value;
            if (row.key === 'smtp_to') settingsObj.smtp.to = row.value;
            if (row.key === 'smtp_enabled') settingsObj.smtp.enabled = row.value;
            if (row.key === 'app_playstore') settingsObj.app.playstore = row.value;
            if (row.key === 'app_appstore') settingsObj.app.appstore = row.value;
          });
        }
      } catch (err) {
        console.error('SQLite getSettings failed, using config defaults:', err.message);
      }
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
      try {
        await dbRun(
          "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
          [key, value]
        );
        return true;
      } catch (err) {
        console.error('SQLite updateSetting failed:', err.message);
        return false;
      }
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
      try {
        let sql = "SELECT * FROM jobs ORDER BY created_at DESC";
        let params = [];
        if (onlyActive) {
          sql = "SELECT * FROM jobs WHERE active = 1 ORDER BY created_at DESC";
        }
        const rows = await dbAll(sql, params);
        // SQLite stores boolean active as 0 or 1, map it to boolean true/false for template parity
        return rows.map(r => ({
          ...r,
          active: !!r.active
        }));
      } catch (err) {
        console.error('SQLite getJobs failed:', err.message);
        return [];
      }
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
      try {
        newJob.id = generateId();
        await dbRun(
          "INSERT INTO jobs (id, title, department, location, description, requirements, type, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
          [newJob.id, newJob.title, newJob.department, newJob.location, newJob.description, newJob.requirements, newJob.type]
        );
        return newJob;
      } catch (err) {
        console.error('SQLite addJob failed:', err.message);
        return false;
      }
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
      try {
        const activeInt = active ? 1 : 0;
        await dbRun("UPDATE jobs SET active = ? WHERE id = ?", [activeInt, id]);
        return true;
      } catch (err) {
        console.error('SQLite toggleJobStatus failed:', err.message);
        return false;
      }
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
      try {
        await dbRun("DELETE FROM jobs WHERE id = ?", [id]);
        return true;
      } catch (err) {
        console.error('SQLite deleteJob failed:', err.message);
        return false;
      }
    }
  },

  /**
   * Fetch a single job.
   */
  async getJob(id) {
    if (this.isSupabase) {
      try {
        const { data, error } = await dbClient
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getJob failed:', err.message);
        return null;
      }
    } else {
      try {
        const row = await dbGet("SELECT * FROM jobs WHERE id = ?", [id]);
        if (!row) return null;
        return {
          ...row,
          active: !!row.active
        };
      } catch (err) {
        console.error('SQLite getJob failed:', err.message);
        return null;
      }
    }
  },

  /**
   * Update an existing job.
   */
  async updateJob(id, { title, department, location, description, requirements, type }) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('jobs')
          .update({ title, department, location, description, requirements, type })
          .eq('id', id);

        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateJob failed:', err.message);
        return false;
      }
    } else {
      try {
        await dbRun(
          "UPDATE jobs SET title = ?, department = ?, location = ?, description = ?, requirements = ?, type = ? WHERE id = ?",
          [title, department, location, description, requirements, type, id]
        );
        return true;
      } catch (err) {
        console.error('SQLite updateJob failed:', err.message);
        return false;
      }
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
      try {
        submission.id = generateId();
        const payloadStr = JSON.stringify(submission.payload);
        await dbRun(
          "INSERT INTO submissions (id, type, payload, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
          [submission.id, submission.type, payloadStr]
        );
        return true;
      } catch (err) {
        console.error('SQLite saveSubmission failed:', err.message);
        return false;
      }
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
      try {
        let sql = "SELECT * FROM submissions ORDER BY created_at DESC";
        let params = [];
        if (type) {
          sql = "SELECT * FROM submissions WHERE type = ? ORDER BY created_at DESC";
          params = [type];
        }
        const rows = await dbAll(sql, params);
        return rows.map(r => ({
          ...r,
          payload: JSON.parse(r.payload)
        }));
      } catch (err) {
        console.error('SQLite getSubmissions failed:', err.message);
        return [];
      }
    }
  },

  /**
   * Delete a submission by ID.
   */
  async deleteSubmission(id) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('submissions')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteSubmission failed:', err.message);
        return false;
      }
    } else {
      try {
        await dbRun("DELETE FROM submissions WHERE id = ?", [id]);
        return true;
      } catch (err) {
        console.error('SQLite deleteSubmission failed:', err.message);
        return false;
      }
    }
  },

  /**
   * Fetch all testimonials, optionally filtering only active ones.
   */
  async getTestimonials(onlyActive = false) {
    if (this.isSupabase) {
      try {
        let query = dbClient.from('testimonials').select('*').order('created_at', { ascending: false });
        if (onlyActive) {
          query = query.eq('active', true);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Supabase getTestimonials failed:', err.message);
        return [];
      }
    } else {
      try {
        let sql = "SELECT * FROM testimonials ORDER BY created_at DESC";
        let params = [];
        if (onlyActive) {
          sql = "SELECT * FROM testimonials WHERE active = 1 ORDER BY created_at DESC";
        }
        const rows = await dbAll(sql, params);
        return rows.map(r => ({
          ...r,
          active: !!r.active
        }));
      } catch (err) {
        console.error('SQLite getTestimonials failed:', err.message);
        return [];
      }
    }
  },

  /**
   * Fetch a single testimonial.
   */
  async getTestimonial(id) {
    if (this.isSupabase) {
      try {
        const { data, error } = await dbClient
          .from('testimonials')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.error('Supabase getTestimonial failed:', err.message);
        return null;
      }
    } else {
      try {
        const row = await dbGet("SELECT * FROM testimonials WHERE id = ?", [id]);
        if (!row) return null;
        return {
          ...row,
          active: !!row.active
        };
      } catch (err) {
        console.error('SQLite getTestimonial failed:', err.message);
        return null;
      }
    }
  },

  /**
   * Insert a new testimonial.
   */
  async addTestimonial({ author, role, quote, stars = 5 }) {
    const newTestimonial = {
      author,
      role,
      quote,
      stars: parseInt(stars, 10) || 5,
      active: true,
      created_at: new Date().toISOString()
    };

    if (this.isSupabase) {
      try {
        const { data, error } = await dbClient
          .from('testimonials')
          .insert([newTestimonial])
          .select();
        if (error) throw error;
        return data ? data[0] : true;
      } catch (err) {
        console.error('Supabase addTestimonial failed:', err.message);
        return false;
      }
    } else {
      try {
        newTestimonial.id = generateId();
        await dbRun(
          "INSERT INTO testimonials (id, author, role, quote, stars, active, created_at) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)",
          [newTestimonial.id, newTestimonial.author, newTestimonial.role, newTestimonial.quote, newTestimonial.stars]
        );
        return newTestimonial;
      } catch (err) {
        console.error('SQLite addTestimonial failed:', err.message);
        return false;
      }
    }
  },

  /**
   * Update an existing testimonial.
   */
  async updateTestimonial(id, { author, role, quote, stars }) {
    const parsedStars = parseInt(stars, 10) || 5;
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('testimonials')
          .update({ author, role, quote, stars: parsedStars })
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase updateTestimonial failed:', err.message);
        return false;
      }
    } else {
      try {
        await dbRun(
          "UPDATE testimonials SET author = ?, role = ?, quote = ?, stars = ? WHERE id = ?",
          [author, role, quote, parsedStars, id]
        );
        return true;
      } catch (err) {
        console.error('SQLite updateTestimonial failed:', err.message);
        return false;
      }
    }
  },

  /**
   * Toggle a testimonial's active status.
   */
  async toggleTestimonialStatus(id, active) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('testimonials')
          .update({ active })
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase toggleTestimonialStatus failed:', err.message);
        return false;
      }
    } else {
      try {
        const activeInt = active ? 1 : 0;
        await dbRun("UPDATE testimonials SET active = ? WHERE id = ?", [activeInt, id]);
        return true;
      } catch (err) {
        console.error('SQLite toggleTestimonialStatus failed:', err.message);
        return false;
      }
    }
  },

  /**
   * Delete a testimonial.
   */
  async deleteTestimonial(id) {
    if (this.isSupabase) {
      try {
        const { error } = await dbClient
          .from('testimonials')
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Supabase deleteTestimonial failed:', err.message);
        return false;
      }
    } else {
      try {
        await dbRun("DELETE FROM testimonials WHERE id = ?", [id]);
        return true;
      } catch (err) {
        console.error('SQLite deleteTestimonial failed:', err.message);
        return false;
      }
    }
  }
};

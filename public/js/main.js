/**
 * KSG Fuel - Core Frontend Scripts
 * Standard Vanilla JS - Zero External Dependencies
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initFaqAccordion();
  initTabSwitcher();
  initFormValidation();
  initAdminModal();
});

/**
 * 1. Mobile Menu Drawer Navigation
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBtn.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu when clicking a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        toggleBtn.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
        toggleBtn.classList.remove('active');
        navMenu.classList.remove('active');
      }
    });
  }
}

/**
 * 2. FAQ Smooth Accordion Controller
 */
function initFaqAccordion() {
  const faqTriggers = document.querySelectorAll('.faq-trigger');

  faqTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const parent = trigger.parentElement;
      const isActive = parent.classList.contains('active');

      // Close all other FAQs
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });

      // Toggle current FAQ
      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });
}

/**
 * 3. Tab Switcher (Fuel Card Program Selection)
 */
function initTabSwitcher() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  if (tabBtns.length > 0 && tabPanes.length > 0) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');

        // Deactivate all buttons & panes
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        // Activate selected button & pane
        btn.classList.add('active');
        const activePane = document.getElementById(targetTabId);
        if (activePane) {
          activePane.classList.add('active');
        }
      });
    });
  }
}

/**
 * 4. Client-side HTML5 Interactive Form Validation
 */
function initFormValidation() {
  const forms = document.querySelectorAll('form[needs-validation]');

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        
        // Highlight first invalid input
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
          firstInvalid.focus();
        }
      }
      form.classList.add('was-validated');
    }, false);

    // Dynamic color helpers on inputs
    const inputs = form.querySelectorAll('.form-control');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        if (input.checkValidity()) {
          input.style.borderColor = 'var(--color-accent)';
        } else if (input.value !== '') {
          input.style.borderColor = 'var(--color-error)';
        }
      });
      
      input.addEventListener('input', () => {
        if (input.checkValidity()) {
          input.style.borderColor = 'var(--color-accent)';
        }
      });
    });
  });
}

/**
 * 5. Administrative Dashboards & Detail Modals
 */
function initAdminModal() {
  const viewDetailBtns = document.querySelectorAll('.admin-view-details');
  const modal = document.getElementById('submissionsModal');
  const modalClose = document.querySelector('.modal-close');

  if (viewDetailBtns.length > 0 && modal) {
    viewDetailBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rowDataRaw = btn.getAttribute('data-submission');
        
        try {
          const submission = JSON.parse(rowDataRaw);
          const fieldsWrap = document.getElementById('modalFields');
          fieldsWrap.innerHTML = ''; // Clear old fields

          // Populate dynamically based on submission type
          const payload = submission.payload || {};
          
          // Form header information
          const typeFieldStr = getSubmissionTypeBadge(submission.type);
          addModalField('Form Category', typeFieldStr);
          addModalField('Submitted On', new Date(submission.created_at).toLocaleString());

          // Populate payload parameters
          Object.entries(payload).forEach(([key, val]) => {
            const formattedLabel = formatKeyLabel(key);
            addModalField(formattedLabel, val);
          });

          // Show modal
          modal.classList.add('active');
        } catch (error) {
          console.error('Error parsing submission details:', error);
        }
      });
    });

    // Close handles
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });

    // Escape key close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        modal.classList.remove('active');
      }
    });
  }
}

// Modal helper: add visual label/value block
function addModalField(label, value) {
  const fieldsWrap = document.getElementById('modalFields');
  const div = document.createElement('div');
  div.className = 'modal-field';
  
  const labelEl = document.createElement('label');
  labelEl.textContent = label;
  
  const valueEl = document.createElement('p');
  // Safe text injection to prevent XSS in admin UI
  valueEl.textContent = value;
  
  div.appendChild(labelEl);
  div.appendChild(valueEl);
  fieldsWrap.appendChild(div);
}

// Formatting helper: full name instead of contact_email
function formatKeyLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Type string translation
function getSubmissionTypeBadge(type) {
  switch (type) {
    case 'contact': return 'General Inquiry';
    case 'fuelcard': return 'Fuel Card Application';
    case 'career': return 'Job Application / Talent Pool';
    default: return type.toUpperCase();
  }
}

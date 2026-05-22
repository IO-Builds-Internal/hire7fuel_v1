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
  initSavingsCalculator();
  initDashboardEmulator();
  initIftaSplitPreview();
  initHeroSimulator();
  initCardStack3D();
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

/**
 * 6. Interactive Fleet Savings Calculator
 */
function initSavingsCalculator() {
  const sizeSlider = document.getElementById('fleet-size-slider');
  const volumeSlider = document.getElementById('fuel-volume-slider');
  
  if (sizeSlider && volumeSlider) {
    const sizeVal = document.getElementById('fleet-size-val');
    const volumeVal = document.getElementById('fuel-volume-val');
    const readout = document.getElementById('annual-savings-readout');
    const breakdownFuel = document.getElementById('breakdown-fuel');
    const breakdownAdmin = document.getElementById('breakdown-admin');

    const updateCalculations = () => {
      const trucks = parseInt(sizeSlider.value);
      const volume = parseInt(volumeSlider.value);
      
      // Calculations based on 25¢ saving per Liter + $5 administration savings per truck/month
      const fuelRebateRate = 0.25;
      const adminSavingsRate = 5.00; // $5 savings per truck/month

      const monthlyFuelRebate = trucks * volume * fuelRebateRate;
      const annualFuelRebate = monthlyFuelRebate * 12;

      const monthlyAdminSavings = trucks * adminSavingsRate;
      const annualAdminSavings = monthlyAdminSavings * 12;

      const totalAnnualSavings = annualFuelRebate + annualAdminSavings;

      // Update text output
      sizeVal.textContent = trucks + (trucks === 250 ? '+' : '') + (trucks === 1 ? ' Truck' : ' Trucks');
      volumeVal.textContent = volume.toLocaleString() + ' L';
      readout.textContent = '$' + Math.round(totalAnnualSavings).toLocaleString();
      breakdownFuel.textContent = '$' + Math.round(annualFuelRebate).toLocaleString();
      breakdownAdmin.textContent = '$' + Math.round(annualAdminSavings).toLocaleString();
    };

    sizeSlider.addEventListener('input', updateCalculations);
    volumeSlider.addEventListener('input', updateCalculations);

    // Initial run on mount
    updateCalculations();
  }
}

/**
 * 7. Interactive Fleet Portal Emulator (Outclassing Nomad.io)
 */
function initDashboardEmulator() {
  const lockSwitch = document.getElementById('card-lock-toggle');
  const limitSlider = document.getElementById('card-spend-slider');
  const limitVal = document.getElementById('card-spend-val');
  const cardRender = document.getElementById('emulator-card');
  const statusPill = document.getElementById('card-status-pill');
  const statusText = document.getElementById('card-status-text');
  const activityList = document.getElementById('activity-list');
  const geofenceBoxes = document.querySelectorAll('.geofence-checkbox input');

  if (!activityList) return; // Exit if not on home/landing page featuring emulator

  // Seed transaction database
  const transactionPool = [
    { driver: 'Dave Miller', location: 'Brampton, ON (HQ Network)', amount: '320 L', cost: '$448.00', corridor: 'on' },
    { driver: 'Elena Rostova', location: 'Windsor, ON (HQ Network)', amount: '290 L', cost: '$406.00', corridor: 'on' },
    { driver: 'Tyrone Jackson', location: 'Detroit, MI (Mid-West Grid)', amount: '95 Gal', cost: '$361.00', corridor: 'midwest' },
    { driver: 'Marcus Vance', location: 'Toledo, OH (Mid-West Grid)', amount: '120 Gal', cost: '$456.00', corridor: 'midwest' },
    { driver: 'Chloe Leblanc', location: 'Richmond, VA (US I-95 corridor)', amount: '85 Gal', cost: '$323.00', corridor: 'i95' },
    { driver: 'Sandeep Singh', location: 'Erie, PA (HQ Network)', amount: '340 L', cost: '$476.00', corridor: 'on' },
    { driver: 'Robert Chen', location: 'Miami, FL (US I-95 corridor)', amount: '110 Gal', cost: '$429.00', corridor: 'i95' }
  ];

  // Helper to append scrollable feed entries
  const addLog = (message, type = 'success', bodyHtml = '') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const li = document.createElement('div');
    li.className = `feed-item ${type}`;

    let headerBadge = '<span class="check-icon"><i class="fas fa-circle-check"></i> AUTHORIZED</span>';
    if (type === 'blocked') {
      headerBadge = '<span class="blocked-badge"><i class="fas fa-circle-xmark"></i> BLOCKED BY SHIELD AI™</span>';
    } else if (type === 'system') {
      headerBadge = '<span class="text-highlight" style="font-weight: 700; color: var(--color-highlight);"><i class="fas fa-gears"></i> SYSTEM ALERT</span>';
    }

    li.innerHTML = `
      <div class="feed-meta">
        ${headerBadge}
        <span>${timestamp}</span>
      </div>
      <div class="feed-body">
        <span>${message}</span>
        ${bodyHtml}
      </div>
    `;

    activityList.insertBefore(li, activityList.firstChild);

    // Keep log size managed to avoid memory bloat
    if (activityList.children.length > 25) {
      activityList.removeChild(activityList.lastChild);
    }
  };

  // Initial welcome message
  addLog('KSG Shield AI™ Engine Online. Awaiting fleet refueling activity...', 'system');

  // 1. Instant Card Freeze Control
  if (lockSwitch && cardRender) {
    lockSwitch.addEventListener('change', () => {
      const isFrozen = lockSwitch.checked;
      
      if (isFrozen) {
        cardRender.classList.add('frozen');
        statusPill.className = 'card-status-pill frozen';
        statusText.textContent = 'FROZEN';
        addLog('ADMIN SECURITY ACTION: Card KSG-9981 frozen by dashboard operator.', 'system', '<span style="color: var(--color-error); font-weight:600;">ALL ATTEMPTS SUSPENDED</span>');
      } else {
        cardRender.classList.remove('frozen');
        statusPill.className = 'card-status-pill active';
        statusText.textContent = 'ACTIVE';
        addLog('ADMIN SECURITY ACTION: Card KSG-9981 reactivated and enabled for transit.', 'system', '<span style="color: var(--color-accent); font-weight:600;">PORTAL ONLINE</span>');
      }
    });
  }

  // 2. Spending Limit Slider
  if (limitSlider && limitVal) {
    limitSlider.addEventListener('input', () => {
      const val = limitSlider.value;
      limitVal.textContent = val + ' Gal';
    });

    limitSlider.addEventListener('change', () => {
      const val = limitSlider.value;
      addLog(`SYSTEM UPDATE: Daily card limit configured to ${val} Gallons ($${val * 4} limit equivalence).`, 'system');
    });
  }

  // 3. Geofencing Toggles
  geofenceBoxes.forEach(box => {
    box.addEventListener('change', () => {
      const label = box.parentElement.textContent.trim();
      const status = box.checked ? 'ENABLED' : 'DISABLED';
      addLog(`SYSTEM UPDATE: Corridor geofence path [${label}] has been ${status}.`, 'system');
    });
  });

  // 4. Feed Stream Interval
  setInterval(() => {
    // Select random entry from transaction database
    const tx = transactionPool[Math.floor(Math.random() * transactionPool.length)];
    const isFrozen = lockSwitch ? lockSwitch.checked : false;

    // Check if geofence for corridor is active
    let isGeofenceActive = true;
    const targetBox = document.querySelector(`.geofence-checkbox input[value="${tx.corridor}"]`);
    if (targetBox) {
      isGeofenceActive = targetBox.checked;
    }

    if (isFrozen) {
      addLog(
        `REFUEL REJECTED: Driver ${tx.driver} attempted purchase at ${tx.location}.`,
        'blocked',
        `<span class="feed-location" style="color: var(--color-error);"><i class="fas fa-ban"></i> Card Frozen State Triggered</span>`
      );
    } else if (!isGeofenceActive) {
      addLog(
        `SECURITY VIOLATION: Unauthorized corridor transaction flagged for ${tx.driver}.`,
        'blocked',
        `<span class="feed-location" style="color: var(--color-highlight);"><i class="fas fa-location-dot"></i> Geofence Breach at ${tx.location}</span>`
      );
    } else {
      addLog(
        `Authorized fill-up: Driver ${tx.driver} completed fueling ${tx.amount} (${tx.cost}).`,
        'success',
        `<span class="feed-location" style="color: var(--color-accent);"><i class="fas fa-gas-pump"></i> Approved: ${tx.location}</span>`
      );
    }
  }, 6000);
}

/**
 * 8. Dynamic IFTA Compliance State Splits Visualizer
 */
function initIftaSplitPreview() {
  const reCalcBtn = document.getElementById('recalculate-ifta-btn');
  const onBar = document.getElementById('ifta-on-bar');
  const miBar = document.getElementById('ifta-mi-bar');
  const nyBar = document.getElementById('ifta-ny-bar');
  const paBar = document.getElementById('ifta-pa-bar');

  const onValEl = document.getElementById('ifta-on-val');
  const miValEl = document.getElementById('ifta-mi-val');
  const nyValEl = document.getElementById('ifta-ny-val');
  const paValEl = document.getElementById('ifta-pa-val');

  if (reCalcBtn) {
    // Starting values and bounds
    let states = {
      on: { el: onValEl, bar: onBar, min: 3800, max: 6200, val: 4850 },
      mi: { el: miValEl, bar: miBar, min: 1500, max: 3200, val: 2120 },
      ny: { el: nyValEl, bar: nyBar, min: 1200, max: 2800, val: 1840 },
      pa: { el: paValEl, bar: paBar, min: 800, max: 2000, val: 1290 }
    };

    const triggerRecalculate = () => {
      Object.entries(states).forEach(([key, state]) => {
        if (!state.el || !state.bar) return;
        
        // Randomize a new value within ranges
        const newVal = Math.floor(Math.random() * (state.max - state.min)) + state.min;
        const oldVal = state.val;
        state.val = newVal;

        // Proportional scale bar animation
        const maxLimit = state.max * 1.1;
        const pct = Math.min(Math.round((newVal / maxLimit) * 100), 100);
        state.bar.style.width = '0%';
        setTimeout(() => {
          state.bar.style.width = pct + '%';
        }, 120);

        // Value counter transition
        animateValue(oldVal, newVal, state.el);
      });
    };

    const animateValue = (start, end, element) => {
      const duration = 600; // ms
      const startTime = performance.now();

      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress * (2 - progress); // easeOutQuad
        const current = Math.round(start + (end - start) * ease);
        element.textContent = current.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          element.textContent = end.toLocaleString();
        }
      };
      requestAnimationFrame(step);
    };

    reCalcBtn.addEventListener('click', (e) => {
      e.preventDefault();
      
      const originalText = reCalcBtn.innerHTML;
      reCalcBtn.innerHTML = '<i class="fas fa-arrows-rotate fa-spin" style="margin-right: 0.5rem;"></i> Compiling splits...';
      reCalcBtn.disabled = true;
      
      triggerRecalculate();

      setTimeout(() => {
        reCalcBtn.innerHTML = '✓ Tax Ledgers Compiled';
        setTimeout(() => {
          reCalcBtn.innerHTML = originalText;
          reCalcBtn.disabled = false;
        }, 1500);
      }, 750);
    });

    // Initial load animation
    setTimeout(() => {
      Object.entries(states).forEach(([key, state]) => {
        if (state.bar) {
          const pct = state.bar.getAttribute('data-pct');
          state.bar.style.width = '0%';
          setTimeout(() => {
            state.bar.style.width = pct + '%';
          }, 80);
        }
      });
    }, 200);
  }
}

/**
 * 9. Hero Section Dynamic Simulator & Hologram 3D Card
 */
function initHeroSimulator() {
  const fleetSlider = document.getElementById('hero-fleet-slider');
  const fuelSlider = document.getElementById('hero-fuel-slider');
  
  if (fleetSlider && fuelSlider) {
    const fleetVal = document.getElementById('hero-fleet-val');
    const fuelVal = document.getElementById('hero-fuel-val');
    const savingsCounter = document.getElementById('hero-savings-counter');
    const rebateVal = document.getElementById('hero-rebate-val');
    const hoursVal = document.getElementById('hero-hours-val');
    const holoCard = document.getElementById('hero-holo-card');
    const simulatorCard = document.getElementById('hero-simulator');

    let currentSavings = 11250; // Starting baseline

    const updateSavings = () => {
      const fleetSize = parseInt(fleetSlider.value);
      const fuelPerTruck = parseInt(fuelSlider.value);

      // Calculations: 
      // Fuel Rebate: 25 cents per Liter
      // IFTA & Admin Saved: $5 per truck per month
      const fuelRebateRate = 0.25;
      const adminSavingsRate = 5.00;

      const annualRebate = fleetSize * fuelPerTruck * fuelRebateRate * 12;
      const annualAdminSaved = fleetSize * adminSavingsRate * 12;
      const totalSavings = annualRebate + annualAdminSaved;

      // Update text displays
      fleetVal.textContent = fleetSize + (fleetSize === 150 ? '+' : '') + (fleetSize === 1 ? ' Truck' : ' Trucks');
      fuelVal.textContent = fuelPerTruck.toLocaleString() + ' L';
      
      rebateVal.textContent = '$' + Math.round(annualRebate).toLocaleString();
      hoursVal.textContent = '$' + Math.round(annualAdminSaved).toLocaleString();

      // Real-time Number counter animation
      animateNumber(currentSavings, totalSavings, savingsCounter);
      currentSavings = totalSavings;

      // Trigger a brief card pulse animation on change
      if (holoCard) {
        holoCard.style.borderColor = 'rgba(34, 201, 138, 0.8)';
        holoCard.style.boxShadow = '0 20px 45px rgba(0,0,0,0.6), 0 0 25px rgba(34, 201, 138, 0.4)';
        setTimeout(() => {
          holoCard.style.borderColor = '';
          holoCard.style.boxShadow = '';
        }, 150);
      }
    };

    // Helper function to animate number counting smoothly
    const animateNumber = (start, end, element) => {
      const duration = 250; // milliseconds
      const startTime = performance.now();

      const run = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing out quadratic
        const ease = progress * (2 - progress);
        const currentVal = Math.round(start + (end - start) * ease);
        
        element.textContent = '$' + currentVal.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(run);
        } else {
          element.textContent = '$' + Math.round(end).toLocaleString();
        }
      };

      requestAnimationFrame(run);
    };

    fleetSlider.addEventListener('input', updateSavings);
    fuelSlider.addEventListener('input', updateSavings);

    // Initial calculation
    updateSavings();

    // --- Premium 3D Holographic Tilt Effect (Nomad.io styled) ---
    if (simulatorCard && holoCard) {
      simulatorCard.addEventListener('mousemove', (e) => {
        const rect = holoCard.getBoundingClientRect();
        
        // Calculate mouse relative coordinates
        const x = e.clientX - rect.left - (rect.width / 2);
        const y = e.clientY - rect.top - (rect.height / 2);

        // Normalize values to max tilt angle (e.g. 15 degrees)
        const tiltX = (y / (rect.height / 2)) * -15;
        const tiltY = (x / (rect.width / 2)) * 15;

        holoCard.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.03)`;
      });

      simulatorCard.addEventListener('mouseleave', () => {
        holoCard.style.transform = 'rotateX(0deg) rotateY(0deg) scale(1)';
      });
    }
  }
}

/**
 * 10. Fuel Card Page Interactive 3D Stack tilt
 */
function initCardStack3D() {
  const stackWrapper = document.querySelector('.card-stack-viewport');
  const stackedCards = document.querySelectorAll('.stacked-card');

  if (stackWrapper && stackedCards.length > 0) {
    stackWrapper.addEventListener('mousemove', (e) => {
      const rect = stackWrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - (rect.width / 2);
      const y = e.clientY - rect.top - (rect.height / 2);

      const tiltX = (y / (rect.height / 2)) * -12;
      const tiltY = (x / (rect.width / 2)) * 12;

      stackedCards.forEach((card, idx) => {
        const defaultOffset = idx * 30;
        const defaultYOffset = idx * 20;
        const defaultZOffset = idx * -40;

        if (!card.matches(':hover')) {
          card.style.transform = `translate3d(${defaultOffset + (x * 0.06)}px, ${defaultYOffset + (y * 0.06)}px, ${defaultZOffset}px) rotateX(${5 + tiltX}deg) rotateY(${-10 + tiltY}deg)`;
        }
      });
    });

    stackWrapper.addEventListener('mouseleave', () => {
      stackedCards.forEach((card, idx) => {
        const defaultOffset = idx * 30;
        const defaultYOffset = idx * 20;
        const defaultZOffset = idx * -40;
        card.style.transform = `translate3d(${defaultOffset}px, ${defaultYOffset}px, ${defaultZOffset}px) rotateX(5deg) rotateY(-10deg)`;
      });
    });
  }
}


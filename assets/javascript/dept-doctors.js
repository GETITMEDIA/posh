/* ============================================
   THE POSH HOSPITAL — DEPARTMENT DOCTORS SYNC JS
   Dynamically loads & syncs doctor rosters from 
   localStorage (posh_doctors) for all department pages.
   ============================================ */

(function () {
  'use strict';

  // Mapping from department HTML page filename / slug to doctor.department values in doctors.json / posh_doctors
  const DEPT_MAP = {
    'anaesthesiology': ['anaesthesiology', 'anesthesiology'],
    'arthroscopy': ['orthopaedics', 'orthopedics', 'arthroscopy'],
    'cardiology': ['cardiology'],
    'cardiothoracic-vascular': ['cardiothoracic', 'cardiothoracic-vascular'],
    'dental': ['dental'],
    'dermatology': ['dermatology'],
    'endocrinology': ['endocrinology'],
    'ent': ['ent'],
    'gastroenterology': ['gastroenterology'],
    'general-medicine': ['general-medicine', 'medicine', 'general'],
    'general-surgery': ['general-Surgeon ', 'general-surgery', 'general-surgeon'],
    'hepatology': ['hepatology'],
    'nephrology': ['nephrology'],
    'neurology': ['neurology'],
    'neurosurgery': ['neuroSurgeon ', 'neurosurgery', 'neuro-surgeon'],
    'obstetrics-gynaecology': ['gynaecology', 'gynaecologist', 'obstetrics-gynaecology', 'obgyn'],
    'oncology': ['oncology'],
    'ophthalmology': ['ophthalmology'],
    'orthopedics-spine-care': ['orthopaedics', 'orthopedics', 'orthopedics-spine-care', 'orthopaedic'],
    'paediatrics': ['paediatrics', 'pediatrics'],
    'physical-medicine-rehabilitation': ['physical-medicine-rehabilitation', 'physiotherapy'],
    'physiotherapy': ['physiotherapy', 'physical-medicine-rehabilitation'],
    'plastic-surgery': ['plastic-surgeon', 'plastic-surgery'],
    'psychiatry': ['psychiatry'],
    'pulmonology': ['pulmonology'],
    'radiology': ['radiology'],
    'sports-injury': ['orthopaedics', 'orthopedics', 'sports-injury'],
    'urology': ['urology']
  };

  // Helper to get current department key from page location
  function getPageDeptKey() {
    const path = window.location.pathname.toLowerCase();
    const filename = path.substring(path.lastIndexOf('/') + 1).replace('.html', '');
    
    // Check script dataset if specified
    const scriptEl = document.getElementById('dept-dc-render');
    if (scriptEl && scriptEl.dataset && scriptEl.dataset.dept) {
      return scriptEl.dataset.dept.toLowerCase();
    }

    return filename || 'all';
  }

  // Normalize image src for department subfolders
  function fixImgSrc(src) {
    if (!src) return '../assets/images/doc3.avif';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
      return src;
    }
    // If inside /departments/ folder and path starts with assets/, prepend ../
    const inDeptFolder = window.location.pathname.includes('/departments/');
    if (inDeptFolder) {
      if (src.startsWith('../')) return src;
      if (src.startsWith('./')) return '../' + src.substring(2);
      if (src.startsWith('assets/')) return '../' + src;
    }
    return src;
  }

  async function loadAndRenderDoctors() {
    let container = document.getElementById('dept-doctors-grid');
    let isDoctorsContainer = false;

    if (!container) {
      container = document.getElementById('doctorsContainer');
      isDoctorsContainer = true;
    }
    if (!container) return;

    let doctors = [];
    const stored = localStorage.getItem('posh_doctors');

    if (stored) {
      try {
        doctors = JSON.parse(stored);
      } catch (e) {
        console.error('Error parsing posh_doctors from localStorage:', e);
      }
    }

    // Fallback to fetch doctors.json if localStorage is empty
    if (!doctors || doctors.length === 0) {
      try {
        const inDept = window.location.pathname.includes('/departments/');
        const jsonUrl = inDept ? '../assets/data/doctors.json' : 'assets/data/doctors.json';
        const res = await fetch(jsonUrl);
        if (res.ok) {
          doctors = await res.json();
          localStorage.setItem('posh_doctors', JSON.stringify(doctors));
        }
      } catch (err) {
        console.warn('Could not load fallback doctors.json:', err);
      }
    }

    if (!doctors || doctors.length === 0) return;

    const pageSlug = getPageDeptKey();
    const allowedDepts = DEPT_MAP[pageSlug] || [pageSlug];

    // Filter active doctors for this department
    const deptDoctors = doctors.filter(function (d) {
      if (d.status === 'inactive') return false;
      if (!d.department) return false;
      const docDept = d.department.trim().toLowerCase();
      return allowedDepts.some(function (target) {
        return docDept === target.trim().toLowerCase();
      });
    });

    if (deptDoctors.length === 0) return; // Keep inline fallback if no dynamic match

    // Render filtered doctors
    container.innerHTML = '';

    let targetGrid = container;
    if (isDoctorsContainer) {
      targetGrid = document.createElement('div');
      targetGrid.className = 'dept-dc-grid';
    }

    deptDoctors.forEach(function (d) {
      let drName = d.name || '';
      let drQual = d.qual || d.qualification || '';

      if (drName.includes(', ')) {
        const commaIdx = drName.indexOf(', ');
        if (!drQual) drQual = drName.substring(commaIdx + 2);
        drName = drName.substring(0, commaIdx);
      }

      const imgSrc = fixImgSrc(d.img);
      const waName = encodeURIComponent(drName);
      const waMsg = 'Hello%2C%20I%20would%20like%20to%20book%20an%20appointment%20with%20' + waName + '%20at%20The%20Posh%20Hospital.%20Please%20let%20me%20know%20the%20available%20date%20and%20time.';

      const card = document.createElement('div');
      card.className = 'dept-dc-card';
      card.innerHTML = 
        '<div class="dept-dc-photo-wrap">' +
          '<img loading="lazy" class="dept-dc-photo" src="' + imgSrc + '" onerror="this.src=\'../assets/images/doc3.avif\'" alt="' + drName + '">' +
        '</div>' +
        '<div class="dept-dc-body">' +
          '<div class="dept-dc-name">' + drName + '</div>' +
          (drQual ? '<div class="dept-dc-qual">' + drQual + '</div>' : '') +
          '<div class="dept-dc-spec">' + (d.specialty || '') + '</div>' +
          '<a href="https://wa.me/918056555330?text=' + waMsg + '" class="dept-dc-btn" target="_blank">&#128172; Book Appointment</a>' +
        '</div>';

      targetGrid.appendChild(card);
    });

    if (isDoctorsContainer) {
      container.appendChild(targetGrid);
    }
  }

  // Initialize on DOM load
  document.addEventListener('DOMContentLoaded', loadAndRenderDoctors);

  // Real-time synchronization across browser tabs when admin adds/edits/deletes a doctor
  window.addEventListener('storage', function (e) {
    if (e.key === 'posh_doctors') {
      loadAndRenderDoctors();
    }
  });

  window.addEventListener('posh_doctors_updated', loadAndRenderDoctors);

})();

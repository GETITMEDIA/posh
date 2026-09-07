/* ============================================
   THE POSH HOSPITAL — ULTRA ADMIN PANEL JS
   Auth, CRUD State, Grid/Table View & Persistence
   ============================================ */

(function () {
  'use strict';

  // ===== CONFIGURATION =====
  const CONFIG = {
    STORAGE_KEY: 'posh_doctors',
    SESSION_KEY: 'posh_admin_session',
    THEME_KEY: 'posh_admin_theme',
    CREDENTIALS_URL: 'assets/data/credentials.json',
    DOCTORS_URL: 'assets/data/doctors.json',
    DEPARTMENTS_URL: 'assets/data/departments.json'
  };

  // ===== STATE =====
  let doctors = [];
  let departments = {};
  let credentials = {};
  let currentFilter = 'all';
  let currentSearch = '';
  let currentView = 'table'; // 'table' or 'grid'
  let editingDoctorId = null;

  // ===== INIT =====
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    setupTheme();
    await loadData();
    checkSession();
    setupEventListeners();
  }

  // ===== THEME MANAGEMENT =====
  function setupTheme() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(CONFIG.THEME_KEY, next);
    updateThemeIcon(next);
    showToast(`Switched to ${next} mode`, 'info');
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
  }

  // ===== DATA LOADING =====
  async function loadData() {
    credentials = {
      admin: {
        email: "admin@theposh.in",
        password: "admin@123",
        name: "Admin",
        role: "Super Admin"
      }
    };
    departments = {
      "dental": { name: "DENTAL", icon: "fas fa-tooth", color: "#d946ef" },
      "cardiology": { name: "CARDIOLOGY", icon: "fas fa-heartbeat", color: "#ef4444" },
      "orthopedics": { name: "TRAUMA & ORTHOPEDICS", icon: "fas fa-bone", color: "#3b82f6" },
      "neurology": { name: "NEUROLOGY", icon: "fas fa-brain", color: "#8b5cf6" },
      "general": { name: "GENERAL MEDICINE", icon: "fas fa-user-md", color: "#10b981" }
    };

    try {
      const credRes = await fetch(CONFIG.CREDENTIALS_URL);
      if (credRes.ok) credentials = await credRes.json();

      const deptRes = await fetch(CONFIG.DEPARTMENTS_URL);
      if (deptRes.ok) {
        const jsonDepts = await deptRes.json();
        departments = { ...departments, ...jsonDepts };
      }
    } catch (e) {
      console.warn('Network fetch fallback used');
    }

    const storedDepts = localStorage.getItem('posh_departments');
    if (storedDepts) {
      try {
        const customDepts = JSON.parse(storedDepts);
        departments = { ...departments, ...customDepts };
      } catch (e) {}
    }

    const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (stored) {
      try {
        doctors = JSON.parse(stored);
      } catch (e) {}
    }

    if (!doctors || doctors.length === 0) {
      try {
        const docRes = await fetch(CONFIG.DOCTORS_URL);
        if (docRes.ok) {
          doctors = await docRes.json();
          saveDoctors();
        }
      } catch (err) {
        console.warn('Could not fetch initial doctors:', err);
      }
    }
  }

  function saveDoctors() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(doctors));
  }

  // ===== SESSION MANAGEMENT =====
  function checkSession() {
    const session = sessionStorage.getItem(CONFIG.SESSION_KEY);
    if (session) {
      showDashboard();
    } else {
      showLogin();
    }
  }

  function createSession(user) {
    sessionStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      loginTime: Date.now()
    }));
  }

  function destroySession() {
    sessionStorage.removeItem(CONFIG.SESSION_KEY);
  }

  function getSession() {
    const s = sessionStorage.getItem(CONFIG.SESSION_KEY);
    return s ? JSON.parse(s) : null;
  }

  // ===== LOGIN SCREEN =====
  function showLogin() {
    document.getElementById('loginPage').style.display = '';
    document.getElementById('dashboard').classList.remove('active');
    createLoginParticles();
  }

  function showDashboard() {
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    renderDashboard();
  }

  function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('loginEmail');
    const passInput = document.getElementById('loginPassword');
    const btn = document.getElementById('loginBtn');

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    if (!email || !password) {
      showLoginError('Please enter email and password');
      return;
    }

    btn.classList.add('loading');

    setTimeout(() => {
      if (email === credentials.admin.email && password === credentials.admin.password) {
        createSession(credentials.admin);
        btn.classList.remove('loading');
        showDashboard();
        showToast('Welcome back, Admin! 🏥', 'success');
      } else {
        btn.classList.remove('loading');
        showLoginError('Invalid email or password');
        const card = document.querySelector('.login-card');
        card.classList.add('animate-shake');
        setTimeout(() => card.classList.remove('animate-shake'), 600);
      }
    }, 600);
  }

  function showLoginError(msg) {
    const box = document.getElementById('loginError');
    box.querySelector('span').textContent = msg;
    box.classList.add('show');
    setTimeout(() => box.classList.remove('show'), 5000);
  }

  function handleLogout() {
    destroySession();
    showLogin();
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    showToast('Logged out successfully', 'info');
  }

  function createLoginParticles() {
    const container = document.getElementById('loginParticles');
    if (!container || container.children.length > 0) return;

    const icons = [
      'fa-stethoscope', 'fa-user-md', 'fa-heartbeat', 'fa-hospital',
      'fa-syringe', 'fa-pills', 'fa-bone', 'fa-brain', 'fa-lungs', 'fa-eye'
    ];

    for (let i = 0; i < 18; i++) {
      const el = document.createElement('i');
      const icon = icons[Math.floor(Math.random() * icons.length)];
      el.className = `fas ${icon} login-particle`;
      el.style.fontSize = `${Math.random() * 24 + 14}px`;
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = `${Math.random() * 100}%`;
      el.style.setProperty('--duration', `${Math.random() * 14 + 10}s`);
      el.style.setProperty('--delay', `${Math.random() * 6}s`);
      el.style.opacity = (Math.random() * 0.08 + 0.03).toFixed(2);
      container.appendChild(el);
    }
  }

  // ===== DASHBOARD RENDERING =====
  function renderDashboard() {
    updateStats();
    populateDepartmentFilter();
    renderDoctorsView();
    updateUserInfo();
  }

  function updateStats() {
    const totalDocs = doctors.length;
    const activeDocs = doctors.filter(d => (d.status || 'active') === 'active').length;
    const deptSet = new Set(doctors.map(d => d.department));
    const inactiveDocs = totalDocs - activeDocs;

    animateCounter('statTotal', totalDocs);
    animateCounter('statActive', activeDocs);
    animateCounter('statDepts', deptSet.size);
    animateCounter('statInactive', inactiveDocs);
  }

  function animateCounter(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const duration = 600;
    const stepTime = 30;
    const steps = duration / stepTime;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(start);
      }
    }, stepTime);
  }

  function updateUserInfo() {
    const session = getSession();
    if (!session) return;
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    if (nameEl) nameEl.textContent = session.name || 'Admin';
    if (roleEl) roleEl.textContent = session.role || 'Super Admin';
  }

  function populateDepartmentFilter() {
    const select = document.getElementById('deptFilter');
    if (!select) return;

    select.innerHTML = '<option value="all">All Departments</option>';
    Object.keys(departments).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = departments[key].name;
      select.appendChild(opt);
    });
  }

  // ===== DOCTORS RENDERING (TABLE / GRID) =====
  function renderDoctorsView() {
    let filtered = [...doctors];

    // Search filter
    if (currentSearch) {
      const term = currentSearch.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(term) ||
        d.specialty.toLowerCase().includes(term) ||
        (departments[d.department]?.name || '').toLowerCase().includes(term)
      );
    }

    // Department filter
    if (currentFilter !== 'all') {
      filtered = filtered.filter(d => d.department === currentFilter);
    }

    // Update count text
    const countEl = document.getElementById('tableCount');
    if (countEl) {
      countEl.textContent = `Showing ${filtered.length} of ${doctors.length} doctors`;
    }

    const tableContainer = document.getElementById('tableCard');
    const gridContainer = document.getElementById('gridCard');
    const emptyState = document.getElementById('emptyState');

    if (filtered.length === 0) {
      if (tableContainer) tableContainer.style.display = 'none';
      if (gridContainer) gridContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (currentView === 'table') {
      if (gridContainer) gridContainer.style.display = 'none';
      if (tableContainer) tableContainer.style.display = 'block';
      renderTableContent(filtered);
    } else {
      if (tableContainer) tableContainer.style.display = 'none';
      if (gridContainer) gridContainer.style.display = 'grid';
      renderGridContent(filtered);
    }
  }

  function renderTableContent(list) {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;

    tbody.innerHTML = list.map((doc, index) => {
      let drName = doc.name || '';
      let drQual = doc.qual || doc.qualification || '';
      if (drName.includes(', ')) {
        const commaIdx = drName.indexOf(', ');
        if (!drQual) drQual = drName.substring(commaIdx + 2);
        drName = drName.substring(0, commaIdx);
      }
      const deptInfo = departments[doc.department] || { name: doc.department, color: '#d946ef', icon: 'fas fa-stethoscope' };
      const status = doc.status || 'active';

      return `
        <tr data-id="${doc.id}">
          <td>
            <div class="doc-info">
              <img src="${doc.img}" alt="${drName}" class="doc-avatar" onerror="this.src='assets/images/doc3.avif'">
              <div>
                <div class="doc-name">${drName}</div>
                ${drQual ? `<div class="doc-qual">${drQual}</div>` : ''}
              </div>
            </div>
          </td>
          <td><span class="doc-specialty">${doc.specialty}</span></td>
          <td>
            <span class="dept-tag" style="--dept-bg: ${deptInfo.color}18; --dept-color: ${deptInfo.color};">
              <i class="${deptInfo.icon}"></i>
              ${deptInfo.name}
            </span>
          </td>
          <td>
            <span class="status-badge ${status}">
              ${status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </td>
          <td>
            <div class="action-btns">
              <button class="btn-icon edit" onclick="window.PoshAdmin.editDoctor(${doc.id})" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
              <button class="btn-icon delete" onclick="window.PoshAdmin.deleteDoctor(${doc.id})" title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderGridContent(list) {
    const grid = document.getElementById('gridCard');
    if (!grid) return;

    grid.innerHTML = list.map((doc) => {
      let drName = doc.name || '';
      let drQual = doc.qual || doc.qualification || '';
      if (drName.includes(', ')) {
        const commaIdx = drName.indexOf(', ');
        if (!drQual) drQual = drName.substring(commaIdx + 2);
        drName = drName.substring(0, commaIdx);
      }
      const deptInfo = departments[doc.department] || { name: doc.department, color: '#d946ef', icon: 'fas fa-stethoscope' };
      const status = doc.status || 'active';

      return `
        <div class="doctor-grid-card" data-id="${doc.id}">
          <img src="${doc.img}" alt="${drName}" class="doctor-grid-avatar" onerror="this.src='assets/images/doc3.avif'">
          <div class="doctor-grid-name">${drName}</div>
          ${drQual ? `<div class="doctor-grid-qual">${drQual}</div>` : ''}
          <div class="doc-specialty" style="margin-bottom:0.75rem; font-size:0.85rem;">${doc.specialty}</div>
          <span class="dept-tag" style="--dept-bg: ${deptInfo.color}18; --dept-color: ${deptInfo.color}; margin-bottom: 0.75rem;">
            <i class="${deptInfo.icon}"></i> ${deptInfo.name}
          </span>
          <div class="doctor-grid-actions">
            <span class="status-badge ${status}">${status}</span>
            <div class="action-btns">
              <button class="btn-icon edit" onclick="window.PoshAdmin.editDoctor(${doc.id})" title="Edit">
                <i class="fas fa-pen"></i>
              </button>
              <button class="btn-icon delete" onclick="window.PoshAdmin.deleteDoctor(${doc.id})" title="Delete">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== DOCTOR CRUD OPERATIONS =====
  function openAddModal() {
    editingDoctorId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus" style="color:var(--accent-pink);"></i> Add New Doctor';
    document.getElementById('doctorForm').reset();
    document.getElementById('docImg').value = '';
    document.getElementById('imgPreview').src = 'assets/images/doc3.avif';
    populateModalDepartments();
    openModal('doctorModal');
  }

  function editDoctor(id) {
    const doc = doctors.find(d => d.id === id);
    if (!doc) return;

    editingDoctorId = id;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit" style="color:var(--accent-pink);"></i> Edit Doctor';
    populateModalDepartments();

    let drName = doc.name || '';
    let drQual = doc.qual || doc.qualification || '';
    if (drName.includes(', ')) {
      const commaIdx = drName.indexOf(', ');
      if (!drQual) drQual = drName.substring(commaIdx + 2);
      drName = drName.substring(0, commaIdx);
    }

    document.getElementById('docName').value = drName;
    const qualEl = document.getElementById('docQual');
    if (qualEl) qualEl.value = drQual;

    document.getElementById('docSpecialty').value = doc.specialty;
    document.getElementById('docDepartment').value = doc.department;
    document.getElementById('docImg').value = doc.img;
    document.getElementById('docPhone').value = doc.phone || '';
    document.getElementById('docEmail').value = doc.email || '';
    document.getElementById('docStatus').value = doc.status || 'active';
    document.getElementById('imgPreview').src = doc.img || 'assets/images/doc3.avif';

    openModal('doctorModal');
  }

  function saveDoctor(e) {
    e.preventDefault();

    const name = document.getElementById('docName').value.trim();
    const qualEl = document.getElementById('docQual');
    const qual = qualEl ? qualEl.value.trim() : '';

    const specialty = document.getElementById('docSpecialty').value.trim();
    const department = document.getElementById('docDepartment').value;
    const img = document.getElementById('docImg').value.trim() || 'assets/images/doc3.avif';
    const phone = document.getElementById('docPhone').value.trim();
    const email = document.getElementById('docEmail').value.trim();
    const status = document.getElementById('docStatus').value;

    if (!name || !specialty || !department) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    let savedId = editingDoctorId;

    if (editingDoctorId !== null) {
      const idx = doctors.findIndex(d => d.id === editingDoctorId);
      if (idx !== -1) {
        doctors[idx] = {
          ...doctors[idx],
          name, qual, specialty, department, img, phone, email, status
        };
        showToast('Doctor profile updated! ✏️', 'success');
      }
    } else {
      const newId = doctors.length > 0 ? Math.max(...doctors.map(d => d.id)) + 1 : 1;
      savedId = newId;
      doctors.push({
        id: newId, name, qual, specialty, department, img, phone, email, status
      });
      showToast('New doctor added! 🎉', 'success');
    }

    saveDoctors();
    closeModal('doctorModal');
    revealDoctor(savedId);
  }

  /* Scroll the saved doctor into view and flash it, so the user can
     see that the record really was written. */
  function revealDoctor(id) {
    const search = document.getElementById('searchDoctors');
    const deptFilter = document.getElementById('deptFilter');
    if (search) search.value = '';
    if (deptFilter) deptFilter.value = 'all';
    currentSearch = '';
    currentFilter = 'all';

    renderDashboard();

    requestAnimationFrame(function () {
      const el = document.querySelector('[data-id="' + id + '"]');
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('row-flash');
      setTimeout(function () { el.classList.remove('row-flash'); }, 2600);
    });
  }

  function deleteDoctor(id) {
    const doc = doctors.find(d => d.id === id);
    if (!doc) return;

    const commaIdx = doc.name.indexOf(', ');
    const drName = commaIdx !== -1 ? doc.name.substring(0, commaIdx) : doc.name;

    document.getElementById('deleteDocName').textContent = drName;
    document.getElementById('confirmDeleteBtn').onclick = () => {
      doctors = doctors.filter(d => d.id !== id);
      saveDoctors();
      renderDashboard();
      closeModal('deleteModal');
      showToast('Doctor removed successfully', 'warning');
    };

    openModal('deleteModal');
  }

  // ===== DEPARTMENT CREATION =====
  function saveDepartments() {
    localStorage.setItem('posh_departments', JSON.stringify(departments));
  }

  // ===== AUTOMATIC ICON MATCHER FOR DEPARTMENTS =====
  function getAutoIconForDept(name) {
    const n = (name || '').toLowerCase();
    
    if (n.includes('tooth') || n.includes('dental') || n.includes('denti')) return 'fas fa-tooth';
    if (n.includes('heart') || n.includes('cardio')) return 'fas fa-heartbeat';
    if (n.includes('eye') || n.includes('ophthalm') || n.includes('vision') || n.includes('optom')) return 'fas fa-eye';
    if (n.includes('skin') || n.includes('derma')) return 'fas fa-allergies';
    if (n.includes('child') || n.includes('pedia') || n.includes('kids') || n.includes('baby')) return 'fas fa-baby';
    if (n.includes('bone') || n.includes('ortho') || n.includes('joint') || n.includes('spine') || n.includes('fracture')) return 'fas fa-bone';
    if (n.includes('brain') || n.includes('neuro') || n.includes('mind') || n.includes('psych')) return 'fas fa-brain';
    if (n.includes('ear') || n.includes('nose') || n.includes('throat') || n.includes('ent')) return 'fas fa-head-side-cough';
    if (n.includes('women') || n.includes('gynae') || n.includes('obgyn') || n.includes('matern') || n.includes('pregnancy') || n.includes('female')) return 'fas fa-female';
    if (n.includes('stomach') || n.includes('gastro') || n.includes('digest') || n.includes('liver')) return 'fas fa-disease';
    if (n.includes('kidney') || n.includes('nephro') || n.includes('uro') || n.includes('bladder')) return 'fas fa-procedures';
    if (n.includes('lung') || n.includes('pulmo') || n.includes('respirat') || n.includes('chest')) return 'fas fa-lungs';
    if (n.includes('cancer') || n.includes('onco') || n.includes('tumor')) return 'fas fa-ribbon';
    if (n.includes('radiolog') || n.includes('x-ray') || n.includes('mri') || n.includes('scan') || n.includes('ultrasound')) return 'fas fa-x-ray';
    if (n.includes('surg') || n.includes('operation') || n.includes('laparo')) return 'fas fa-scalpel';
    if (n.includes('emerg') || n.includes('trauma') || n.includes('casualty') || n.includes('ambulance')) return 'fas fa-ambulance';
    if (n.includes('blood') || n.includes('hemato') || n.includes('lab') || n.includes('patho')) return 'fas fa-vials';
    if (n.includes('physio') || n.includes('rehab') || n.includes('therap')) return 'fas fa-running';
    if (n.includes('diabet') || n.includes('endo') || n.includes('metabol')) return 'fas fa-syringe';
    if (n.includes('general') || n.includes('physician') || n.includes('clinic')) return 'fas fa-user-md';

    return 'fas fa-clinic-medical';
  }

  function createDepartment(e) {
    e.preventDefault();
    const nameEl = document.getElementById('newDeptName');
    const name = nameEl ? nameEl.value.trim() : '';

    if (!name) {
      showToast('Please enter a department name', 'error');
      return;
    }

    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const autoIcon = getAutoIconForDept(name);

    departments[key] = {
      name: name.toUpperCase(),
      icon: autoIcon,
      color: '#d946ef'
    };

    saveDepartments();
    populateDepartmentFilter();
    populateModalDepartments();

    // Select the new department in the doctor form if open
    const docDeptSelect = document.getElementById('docDepartment');
    if (docDeptSelect) docDeptSelect.value = key;

    closeModal('deptModal');
    document.getElementById('deptForm').reset();
    showToast(`New department "${name.toUpperCase()}" created! 🏥`, 'success');
  }

  function populateModalDepartments() {
    const select = document.getElementById('docDepartment');
    if (!select) return;

    select.innerHTML = '<option value="">Select Department</option>';
    Object.keys(departments).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = departments[key].name;
      select.appendChild(opt);
    });
  }

  // ===== MODALS =====
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  window.openModal = openModal;
  window.closeModal = closeModal;
  window.openDeptModal = function () { openModal('deptModal'); };

  // ===== TOASTS =====
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Remove old identical or theme toasts so notifications don't accumulate
    const existing = container.querySelectorAll('.toast');
    existing.forEach(t => {
      if (t.textContent.includes(message) || (message.includes('Switched') && t.textContent.includes('Switched'))) {
        t.remove();
      }
    });

    const iconMap = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas ${iconMap[type]}"></i>
      <span>${message}</span>
      <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(12px) scale(0.95)';
        setTimeout(() => toast.remove(), 250);
      }
    }, 2800);
  }

  // ===== EXPORT TO EXCEL / CSV =====
  function exportData() {
    if (!doctors || doctors.length === 0) {
      showToast('No doctor data available to export', 'error');
      return;
    }

    const headers = ['ID', 'Doctor Name', 'Qualification', 'Specialty', 'Department', 'Status', 'Phone Number', 'Email Address'];
    const csvRows = [headers.join(',')];

    doctors.forEach(doc => {
      let drName = doc.name || '';
      let drQual = doc.qual || doc.qualification || '';
      if (drName.includes(', ')) {
        const commaIdx = drName.indexOf(', ');
        if (!drQual) drQual = drName.substring(commaIdx + 2);
        drName = drName.substring(0, commaIdx);
      }
      const deptName = departments[doc.department]?.name || doc.department || '';
      const status = (doc.status || 'active').toUpperCase();
      const phone = doc.phone || '';
      const email = doc.email || '';

      const row = [
        doc.id,
        `"${drName.replace(/"/g, '""')}"`,
        `"${drQual.replace(/"/g, '""')}"`,
        `"${doc.specialty.replace(/"/g, '""')}"`,
        `"${deptName.replace(/"/g, '""')}"`,
        `"${status}"`,
        `"${phone.replace(/"/g, '""')}"`,
        `"${email.replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `POSH_Doctors_List_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Doctors roster exported as Excel CSV! 📊', 'success');
  }

  // ===== EVENT LISTENERS =====
  function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // Password toggle
    const passToggle = document.getElementById('passToggle');
    if (passToggle) {
      passToggle.addEventListener('click', () => {
        const input = document.getElementById('loginPassword');
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        passToggle.className = `fas ${isPassword ? 'fa-eye-slash' : 'fa-eye'} password-toggle`;
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Sidebar menu toggle (mobile)
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('show');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
      });
    }

    // View switcher (table vs grid)
    const tableViewBtn = document.getElementById('tableViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');

    if (tableViewBtn && gridViewBtn) {
      tableViewBtn.addEventListener('click', () => {
        currentView = 'table';
        tableViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        renderDoctorsView();
      });
      gridViewBtn.addEventListener('click', () => {
        currentView = 'grid';
        gridViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
        renderDoctorsView();
      });
    }

    // Add Doctor button
    const addBtn = document.getElementById('addDoctorBtn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);

    // Doctor form submit
    const docForm = document.getElementById('doctorForm');
    if (docForm) docForm.addEventListener('submit', saveDoctor);

    // Add Department button
    const addDeptBtn = document.getElementById('addNewDeptBtn');
    if (addDeptBtn) addDeptBtn.addEventListener('click', () => openModal('deptModal'));

    // Department form submit
    const deptForm = document.getElementById('deptForm');
    if (deptForm) deptForm.addEventListener('submit', createDepartment);

    // Search
    const searchInput = document.getElementById('searchDoctors');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        renderDoctorsView();
      });
    }

    // Department filter
    const deptFilter = document.getElementById('deptFilter');
    if (deptFilter) {
      deptFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderDoctorsView();
      });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close, [data-dismiss="modal"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
      });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal(overlay.id);
      });
    });

    // Image File Upload Handler
    const imgFileInput = document.getElementById('docImgFile');
    if (imgFileInput) {
      imgFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = function (evt) {
            const base64Data = evt.target.result;
            document.getElementById('docImg').value = base64Data;
            document.getElementById('imgPreview').src = base64Data;
            showToast('Image uploaded! 📷', 'info');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Image preview URL change
    const imgInput = document.getElementById('docImg');
    if (imgInput) {
      imgInput.addEventListener('input', (e) => {
        const preview = document.getElementById('imgPreview');
        if (preview) {
          preview.src = e.target.value || 'assets/images/doc3.avif';
          preview.onerror = () => { preview.src = 'assets/images/doc3.avif'; };
        }
      });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);

    // Keyboard ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(m => closeModal(m.id));
      }
    });
  }

  // ===== TABLE HORIZONTAL SCROLL =====
  function scrollTable(direction) {
    const container = document.getElementById('tableCard');
    if (!container) return;
    const scrollAmount = 300;
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
  window.scrollTable = scrollTable;

  // ===== EXPOSE PUBLIC API =====
  window.PoshAdmin = {
    editDoctor,
    deleteDoctor,
    openDeptModal: function () {
      openModal('deptModal');
    },
    openModal,
    closeModal
  };

})();

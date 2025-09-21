// app.js (CLEAN VERSION)

// Firebase references (set in firebase-config.js)
const auth = window.auth;
const db = window.db;
if (!db) {
  console.error('Firestore (window.db) not found - check firebase-config.js');
}

// --- DOM elements ---
const adminLogin = document.getElementById('adminLogin');
const adminDashboard = document.getElementById('adminDashboard');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

const addPropertyBtn = document.getElementById('addPropertyBtn');
const addPropertyForm = document.getElementById('propertyForm');
const cancelAddBtn = document.getElementById('cancelAddBtn');
const propertyForm = document.getElementById('propertyForm');

const propertiesTableContainer = document.querySelector('.properties-table');
const inquiriesListContainer = document.querySelector('.inquiries-list');

const adminNavLinks = document.querySelectorAll('.admin-nav-link');
const adminSections = document.querySelectorAll('.admin-section');

const settingsSection = document.getElementById('settingsSection');
const adminEmailInput = document.getElementById('adminEmail');
const changePasswordInput = document.getElementById('changePassword');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

const formTitle = document.getElementById('formTitle');
const goToWebsiteBtn = document.getElementById('goToWebsiteBtn');

let editingPropertyId = null;
let allProperties = []; // caches properties

// --- AUTH ---
if (loginForm) {
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();
    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        loginForm.reset();
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
        loadProperties();
        loadInquiries();
        loadSettings();
      })
      .catch(err => alert('Login failed: ' + err.message));
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      adminDashboard.style.display = 'none';
      adminLogin.style.display = 'flex';
      editingPropertyId = null;
      if (propertyForm) propertyForm.reset();
      if (addPropertyForm) addPropertyForm.style.display = 'none';
    });
  });
}

if (auth && auth.onAuthStateChanged) {
  auth.onAuthStateChanged(user => {
    if (user) {
      if (adminLogin && adminDashboard) {
        adminLogin.style.display = 'none';
        adminDashboard.style.display = 'block';
      }
      loadProperties();
      loadInquiries();
      loadSettings();
    } else {
      if (adminDashboard && adminLogin) {
        adminDashboard.style.display = 'none';
        adminLogin.style.display = 'flex';
      }
    }
  });
}

// Admin nav tabs
adminNavLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    adminNavLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    adminSections.forEach(section => {
      section.style.display = section.id === targetId + 'Section' ? 'block' : 'none';
    });
  });
});

if (goToWebsiteBtn) {
  goToWebsiteBtn.addEventListener('click', () => window.location.href = 'index.html');
}

// --- ADMIN: Add/Edit properties ---
if (addPropertyBtn) {
  addPropertyBtn.addEventListener('click', () => {
    editingPropertyId = null;
    propertyForm.reset();
    formTitle.textContent = 'Add New Property';
    addPropertyForm.style.display = 'block';
  });
}
if (cancelAddBtn) {
  cancelAddBtn.addEventListener('click', () => {
    editingPropertyId = null;
    propertyForm.reset();
    addPropertyForm.style.display = 'none';
  });
}

if (propertyForm) {
  propertyForm.addEventListener('submit', async e => {
    e.preventDefault();
    const cityEl = propertyForm.querySelector('#city');
    const fullLocationEl = propertyForm.querySelector('#fullLocation');

    const data = {
      title: propertyForm.title.value.trim(),
      price: parseInt(propertyForm.price.value) || 0,
      city: cityEl ? cityEl.value.trim() : '',
      fullLocation: fullLocationEl ? fullLocationEl.value.trim() : '',
      type: propertyForm.type.value,
      bhk: parseInt(propertyForm.bhk.value) || 0,
      area: parseInt(propertyForm.area.value) || 0,
      bathrooms: parseInt(propertyForm.bathrooms.value) || 0,
      description: propertyForm.description.value.trim(),
      amenities: propertyForm.amenities.value
        .split(',')
        .map(a => a.trim())
        .filter(a => a),
      images: propertyForm.images.value
        .split('\n')
        .map(i => i.trim())
        .filter(i => i),
      coverImage: propertyForm.coverImage.value.trim() || null,
      furnishing: propertyForm.furnishing.value || 'Semi-Furnished',
      status: propertyForm.status.value || 'Ready to Move',
      latitude: propertyForm.latitude.value ? parseFloat(propertyForm.latitude.value) : null,
      longitude: propertyForm.longitude.value ? parseFloat(propertyForm.longitude.value) : null,
      updatedAt: new Date()
    };

    if (!data.title || !data.price || !data.city) {
      alert('Please fill required fields: Title, Price, City.');
      return;
    }

    try {
      if (editingPropertyId) {
        await db.collection('properties').doc(editingPropertyId).update(data);
        alert('Property updated successfully.');
      } else {
        data.createdAt = new Date();
        await db.collection('properties').add(data);
        alert('Property added successfully.');
      }
      propertyForm.reset();
      addPropertyForm.style.display = 'none';
      editingPropertyId = null;
      loadProperties();
    } catch (err) {
      alert('Error saving property: ' + err.message);
    }
  });
}

// --- Admin helper: load properties into table ---
async function loadProperties() {
  if (!propertiesTableContainer) return;
  try {
    const snapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
    allProperties = [];
    let html = `
      <div class="table-header">
        <span>Property</span>
        <span>City</span>
        <span>Price</span>
        <span>Actions</span>
      </div>
    `;
    snapshot.forEach(doc => {
      const p = doc.data() || {};
      allProperties.push({ id: doc.id, ...p });
      html += `
        <div class="table-row" data-id="${doc.id}">
          <span>${p.title || '—'}</span>
          <span>${p.city || '—'}</span>
          <span>₹${(p.price || 0).toLocaleString()}</span>
          <span class="actions">
            <button class="edit-btn" onclick="editProperty('${doc.id}')">Edit</button>
            <button class="delete-btn" onclick="deleteProperty('${doc.id}')">Delete</button>
          </span>
        </div>
      `;
    });
    propertiesTableContainer.innerHTML = html;
    populateFilterOptions();
  } catch (err) {
    alert('Error loading properties: ' + err.message);
  }
}

// expose edit & delete
window.editProperty = async function (id) {
  try {
    const doc = await db.collection('properties').doc(id).get();
    if (!doc.exists) { alert('Property not found'); return; }
    const p = doc.data();
    editingPropertyId = id;
    addPropertyForm.style.display = 'block';
    formTitle.textContent = 'Edit Property';

    propertyForm.title.value = p.title || '';
    propertyForm.price.value = p.price || '';
    if (propertyForm.querySelector('#city')) propertyForm.querySelector('#city').value = p.city || '';
    if (propertyForm.querySelector('#fullLocation')) propertyForm.querySelector('#fullLocation').value = p.fullLocation || '';
    propertyForm.type.value = p.type || 'apartment';
    propertyForm.bhk.value = p.bhk || '';
    propertyForm.area.value = p.area || '';
    propertyForm.bathrooms.value = p.bathrooms || '';
    propertyForm.description.value = p.description || '';
    propertyForm.amenities.value = (p.amenities || []).join(', ');
    propertyForm.images.value = (p.images || []).join('\n');
    propertyForm.coverImage.value = p.coverImage || '';
    propertyForm.furnishing.value = p.furnishing || 'Semi-Furnished';
    propertyForm.status.value = p.status || 'Ready to Move';
    propertyForm.latitude.value = p.latitude || '';
    propertyForm.longitude.value = p.longitude || '';
  } catch (err) {
    alert('Error fetching property: ' + err.message);
  }
};

window.deleteProperty = function (id) {
  if (!confirm('Are you sure you want to delete this property?')) return;
  db.collection('properties').doc(id).delete()
    .then(() => {
      alert('Property deleted successfully.');
      loadProperties();
    })
    .catch(err => alert('Error deleting property: ' + err.message));
};

// --- Inquiries management ---
async function loadInquiries() {
  if (!inquiriesListContainer) return;
  try {
    const snapshot = await db.collection('inquiries').orderBy('timestamp', 'desc').get();
    if (snapshot.empty) {
      inquiriesListContainer.innerHTML = '<p>No inquiries found.</p>';
      return;
    }
    let html = '';
    snapshot.forEach(doc => {
      const i = doc.data() || {};
      const date = i.timestamp ? i.timestamp.toDate().toLocaleString() : 'Unknown date';
      html += `
        <div class="inquiry-card" data-id="${doc.id}">
          <h4>${i.name || '—'} - Property ID: ${i.propertyId || 'N/A'}</h4>
          <p>Email: ${i.email || '—'} | Phone: ${i.phone || '—'}</p>
          <p>${i.message || ''}</p>
          <span class="inquiry-date">${date}</span>
          <button class="delete-btn" onclick="deleteInquiry('${doc.id}')">Delete</button>
        </div>
      `;
    });
    inquiriesListContainer.innerHTML = html;
  } catch (err) {
    alert('Error loading inquiries: ' + err.message);
  }
}
window.deleteInquiry = function (id) {
  if (!confirm('Are you sure you want to delete this inquiry?')) return;
  db.collection('inquiries').doc(id).delete()
    .then(() => {
      alert('Inquiry deleted.');
      loadInquiries();
    })
    .catch(err => alert('Error deleting inquiry: ' + err.message));
};

// --- Settings ---
function loadSettings() {
  const user = auth.currentUser;
  if (!user || !adminEmailInput) return;
  adminEmailInput.value = user.email;
  changePasswordInput.value = '';
}
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener('click', () => {
    const user = auth.currentUser;
    if (!user) { alert('No user logged in.'); return; }
    const newEmail = adminEmailInput.value.trim();
    const newPassword = changePasswordInput.value.trim();
    if (newEmail && newEmail !== user.email) {
      user.updateEmail(newEmail).then(() => alert('Email updated successfully.')).catch(err => alert('Error updating email: ' + err.message));
    }
    if (newPassword) {
      user.updatePassword(newPassword).then(() => {
        alert('Password updated successfully.');
        changePasswordInput.value = '';
      }).catch(err => alert('Error updating password: ' + err.message));
    }
  });
}

// --- MAIN SITE: listing, filtering & rendering ---
const propertiesGrid = document.getElementById('propertiesGrid');
const filterApplyBtn = document.getElementById('filterApplyBtn');
const searchInput = document.getElementById('searchInput');
const filterType = document.getElementById('filterType');
const filterBHK = document.getElementById('filterBHK');
const filterCity = document.getElementById('filterCity');
const priceRange = document.getElementById('priceRange');
const priceRangeValue = document.getElementById('priceRangeValue');

function renderProperties(properties) {
  if (!propertiesGrid) return;
  if (!properties || properties.length === 0) {
    propertiesGrid.innerHTML = '<p>No properties found matching your criteria.</p>';
    return;
  }
  let html = '';
  properties.forEach(p => {
    const coverImg = p.coverImage || (p.images && p.images[0]) || 'https://placehold.co/400x300?text=No+Image';
    html += `
      <div class="property-card">
        <div class="property-image">
          <img src="${coverImg}" alt="${escapeHtml(p.title || '')}" />
          <span class="property-tag">${p.type || ''}</span>
        </div>
        <div class="property-content">
          <h3 class="property-title">${escapeHtml(p.title || '')}</h3>
          <p class="property-location">${escapeHtml(p.city || '')}</p>
          <div class="property-features">
            <span>${p.bhk || 0} BHK</span>
            <span>${p.area || 0} sq.ft.</span>
            <span>${p.bathrooms || 0} Bathrooms</span>
          </div>
          <div class="property-price">₹${(p.price || 0).toLocaleString()}</div>
          <a href="property-details.html?id=${p.id}" class="property-view-btn">View Details</a>
        </div>
      </div>
    `;
  });
  propertiesGrid.innerHTML = html;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[s]));
}

// load all properties
async function loadAllProperties() {
  try {
    const snapshot = await db.collection('properties').orderBy('createdAt', 'desc').get();
    allProperties = [];
    snapshot.forEach(doc => {
      allProperties.push({ id: doc.id, ...doc.data() });
    });
    renderProperties(allProperties);
    populateFilterOptions();
  } catch (err) {
    console.error('Error loading properties:', err);
  }
}

// populate City dropdown
function populateFilterOptions() {
  if (!allProperties) return;
  if (filterCity) {
    const cities = [...new Set(allProperties.map(p => (p.city || '').trim()).filter(Boolean))].sort();
    filterCity.innerHTML = '<option value="">All Cities</option>';
    cities.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      filterCity.appendChild(opt);
    });
  }
}

// filter handler
if (filterApplyBtn) {
  filterApplyBtn.addEventListener('click', () => {
    let filtered = allProperties.slice();

    const type = filterType ? filterType.value : '';
    if (type) filtered = filtered.filter(p => (p.type || '') === type);

    const city = filterCity ? filterCity.value : '';
    if (city) filtered = filtered.filter(p => (p.city || '').toLowerCase() === city.toLowerCase());

    const maxPrice = priceRange ? parseInt(priceRange.value) : Infinity;
    if (!isNaN(maxPrice)) filtered = filtered.filter(p => (p.price || 0) <= maxPrice);

    const bhk = filterBHK ? filterBHK.value : '';
    if (bhk) {
      if (bhk === '4') filtered = filtered.filter(p => (p.bhk || 0) >= 4);
      else filtered = filtered.filter(p => (p.bhk || 0) === parseInt(bhk));
    }

    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    if (searchTerm) {
      filtered = filtered.filter(p =>
        (p.title || '').toLowerCase().includes(searchTerm) ||
        (p.city || '').toLowerCase().includes(searchTerm) ||
        (p.description || '').toLowerCase().includes(searchTerm)
      );
    }

    renderProperties(filtered);
  });
}

// price range display
if (priceRange && priceRangeValue) {
  priceRange.addEventListener('input', () => {
    const val = parseInt(priceRange.value);
    priceRangeValue.textContent = val === parseInt(priceRange.max) ? `₹${val.toLocaleString()}+` : `₹${val.toLocaleString()}`;
  });
}

// --- inquiry form ---
const inquiryForm = document.getElementById('inquiryForm');
if (inquiryForm) {
  inquiryForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = inquiryForm.querySelector('input[placeholder="Your Name"]').value.trim();
    const email = inquiryForm.querySelector('input[placeholder="Your Email"]').value.trim();
    const phone = inquiryForm.querySelector('input[placeholder="Your Phone"]').value.trim();
    const message = inquiryForm.querySelector('textarea').value.trim();
    const propertyId = new URLSearchParams(window.location.search).get('id') || null;
    if (!name || !email || !phone || !message) {
      alert('Please fill all required fields.');
      return;
    }
    try {
      await db.collection('inquiries').add({
        name, email, phone, message, propertyId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert('Inquiry sent successfully!');
      inquiryForm.reset();
    } catch (error) {
      alert('Failed to send inquiry: ' + error.message);
    }
  });
}

// --- Initialize ---
if (propertiesGrid) loadAllProperties();
window.loadProperties = loadProperties;
window.loadInquiries = loadInquiries;

// --- Dark Mode ---
const darkModeToggle = document.getElementById('darkModeToggle');
if (darkModeToggle) {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
  }
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
      localStorage.setItem('darkMode', 'enabled');
    } else {
      localStorage.setItem('darkMode', 'disabled');
    }
  });
}

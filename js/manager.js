// js/manager.js

let currentAuthMode = 'login';
let currentUser = null;

// Initialize App & Supabase Auth Listener
document.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
  setupEventListeners();
});

function setupEventListeners() {
  const authForm = document.getElementById('authForm');
  if (authForm) authForm.addEventListener('submit', handleAuth);

  const addHostelForm = document.getElementById('addHostelForm');
  if (addHostelForm) addHostelForm.addEventListener('submit', handleAddHostel);
}

// Global Auth State Observer
function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      currentUser = session.user;
      showDashboard();
    } else {
      currentUser = null;
      showAuth();
    }
  });
}

// Toggle between Login and Register tabs
function switchAuthTab(mode) {
  currentAuthMode = mode;
  document.getElementById('tabLogin')?.classList.toggle('active', mode === 'login');
  document.getElementById('tabRegister')?.classList.toggle('active', mode === 'register');
  
  const submitBtn = document.getElementById('authSubmitBtn');
  if (submitBtn) {
    submitBtn.textContent = mode === 'login' ? 'Log In' : 'Create Manager Account';
  }
}

// Handle Form Authentication (Login / Register)
async function handleAuth(event) {
  event.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;

  if (!email || !password) return alert('Please enter both email and password.');

  if (currentAuthMode === 'register') {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert('Registration Error: ' + error.message);
    alert('Account created successfully!');
    currentUser = data.user;
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert('Login Error: ' + error.message);
    currentUser = data.user;
  }
}

// Logout Manager
async function handleLogout() {
  const { error } = await supabase.auth.signOut();
  if (error) alert('Error signing out: ' + error.message);
}

function showAuth() {
  document.getElementById('authSection')?.classList.remove('hidden');
  document.getElementById('dashboardSection')?.classList.add('hidden');
  document.getElementById('userNav')?.classList.add('hidden');
}

function showDashboard() {
  document.getElementById('authSection')?.classList.add('hidden');
  document.getElementById('dashboardSection')?.classList.remove('hidden');
  document.getElementById('userNav')?.classList.remove('hidden');
  
  const emailDisplay = document.getElementById('userEmail');
  if (emailDisplay && currentUser) emailDisplay.textContent = currentUser.email;

  loadManagerData();
}

// Fetch manager's hostels and rooms from Supabase
async function loadManagerData() {
  const container = document.getElementById('hostelsContainer');
  if (!container) return;

  container.innerHTML = '<p style="color: var(--text-muted)">Loading your hostels...</p>';

  // Fetch Hostels for current user
  const { data: hostels, error: hostelErr } = await supabase
    .from('hostels')
    .select('*')
    .eq('manager_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (hostelErr) {
    alert('Failed to load hostels: ' + hostelErr.message);
    return;
  }

  if (!hostels || hostels.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted)">No hostels added yet. Add your first hostel using the form above!</p>';
    updateStats(0, 0, 0);
    return;
  }

  // Fetch all rooms for these hostels in one query
  const hostelIds = hostels.map(h => h.id);
  const { data: rooms, error: roomErr } = await supabase
    .from('rooms')
    .select('*')
    .in('hostel_id', hostelIds);

  if (roomErr) console.error('Error fetching rooms:', roomErr.message);

  const safeRooms = rooms || [];
  const totalRooms = safeRooms.length;
  const totalSlots = safeRooms.reduce((acc, r) => acc + (r.available_slots || 0), 0);
  
  updateStats(hostels.length, totalRooms, totalSlots);

  // Render Hostels HTML
  container.innerHTML = hostels.map(hostel => {
    const hostelRooms = safeRooms.filter(r => r.hostel_id === hostel.id);
    
    return `
      <div class="hostel-item" data-hostel-id="${hostel.id}">
        <div class="hostel-item-header">
          <div>
            <h3>${escapeHTML(hostel.name)}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top:0.25rem;">
              <i data-lucide="map-pin"></i> ${hostel.distance_mins} mins walk to campus | Contact: ${escapeHTML(hostel.contact_phone || 'N/A')}
            </p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              Suitable Colleges: <strong>${(hostel.suitable_colleges || []).map(escapeHTML).join(', ')}</strong>
            </p>
          </div>
          <button data-action="delete-hostel" data-id="${hostel.id}" class="btn btn-danger">
            <i data-lucide="trash-2"></i> Delete Hostel
          </button>
        </div>

        <!-- Existing Rooms List -->
        <div>
          <strong style="font-size: 0.9rem;">Available Room Types & Prices:</strong>
          <div style="margin-top: 0.25rem;">
            ${hostelRooms.length === 0 
              ? '<span style="font-size: 0.85rem; color: var(--text-muted)">No room configurations added yet.</span>'
              : hostelRooms.map(r => `
                  <span class="room-badge">
                    ${escapeHTML(r.room_type)} — $${r.price_per_year}/yr (${r.available_slots} slots available)
                    <button data-action="delete-room" data-id="${r.id}" style="background:none;border:none;color:red;cursor:pointer;margin-left:4px;">&times;</button>
                  </span>
                `).join('')
            }
          </div>
        </div>

        <!-- Add Room Configuration Form -->
        <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px; margin-top: 0.75rem;">
          <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">+ Add Room Type to ${escapeHTML(hostel.name)}</h4>
          <form class="add-room-form" data-hostel-id="${hostel.id}" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
            <select class="form-control room-type" required>
              <option value="">Select Room Type</option>
              <option value="1-in-1">1-in-1 (Single Room)</option>
              <option value="2-in-1">2-in-1 (2 Students)</option>
              <option value="3-in-1">3-in-1 (3 Students)</option>
              <option value="4-in-1">4-in-1 (4 Students)</option>
            </select>
            <input type="number" step="0.01" class="form-control room-price" placeholder="Price (e.g. 1200)" required />
            <input type="number" min="1" class="form-control room-slots" placeholder="Available Slots" required />
            <button type="submit" class="btn btn-primary" style="padding:0.6rem 1rem;">Add Room</button>
          </form>
        </div>
      </div>
    `;
  }).join('');

  // Re-initialize dynamic icons and bind delegated events
  if (window.lucide) lucide.createIcons();
  attachDynamicEventListeners();
}

// Delegation for dynamically rendered buttons and forms
function attachDynamicEventListeners() {
  const container = document.getElementById('hostelsContainer');

  // Handle deletions via click delegation
  container.onclick = async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === 'delete-hostel') {
      await deleteHostel(id);
    } else if (action === 'delete-room') {
      await deleteRoom(id);
    }
  };

  // Handle nested Add Room forms
  container.querySelectorAll('.add-room-form').forEach(form => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const hostelId = form.dataset.hostelId;
      const roomType = form.querySelector('.room-type').value;
      const price = parseFloat(form.querySelector('.room-price').value);
      const slots = parseInt(form.querySelector('.room-slots').value, 10);

      await handleAddRoom(hostelId, roomType, price, slots);
    };
  });
}

// Add a new Hostel
async function handleAddHostel(event) {
  event.preventDefault();

  const name = document.getElementById('hostelName').value.trim();
  const contact_phone = document.getElementById('hostelPhone').value.trim();
  const distance_mins = parseInt(document.getElementById('hostelDistance').value, 10);
  const image_url = document.getElementById('hostelImage').value.trim();
  const description = document.getElementById('hostelDescription').value.trim();

  const checkedColleges = Array.from(document.querySelectorAll('input[name="college"]:checked'))
    .map(cb => cb.value);

  if (checkedColleges.length === 0) {
    alert('Please select at least one suitable college!');
    return;
  }

  const { error } = await supabase.from('hostels').insert([{
    manager_id: currentUser.id,
    name,
    contact_phone,
    distance_mins,
    image_url,
    description,
    suitable_colleges: checkedColleges
  }]);

  if (error) {
    alert('Failed to save hostel: ' + error.message);
  } else {
    alert('Hostel successfully added!');
    document.getElementById('addHostelForm').reset();
    loadManagerData();
  }
}

// Add Room Configuration
async function handleAddRoom(hostelId, room_type, price_per_year, available_slots) {
  const { error } = await supabase.from('rooms').insert([{
    hostel_id: hostelId,
    room_type,
    price_per_year,
    total_slots: available_slots,
    available_slots
  }]);

  if (error) {
    alert('Failed to add room: ' + error.message);
  } else {
    loadManagerData();
  }
}

// Delete Hostel
async function deleteHostel(hostelId) {
  if (!confirm('Are you sure you want to delete this hostel? All associated rooms will also be deleted.')) return;

  const { error } = await supabase.from('hostels').delete().eq('id', hostelId);
  if (error) {
    alert('Error deleting hostel: ' + error.message);
  } else {
    loadManagerData();
  }
}

// Delete Room
async function deleteRoom(roomId) {
  if (!confirm('Remove this room configuration?')) return;

  const { error } = await supabase.from('rooms').delete().eq('id', roomId);
  if (error) {
    alert('Error deleting room: ' + error.message);
  } else {
    loadManagerData();
  }
}

function updateStats(hostels, rooms, slots) {
  const statHostels = document.getElementById('statHostels');
  const statRooms = document.getElementById('statRooms');
  const statSlots = document.getElementById('statSlots');

  if (statHostels) statHostels.textContent = hostels;
  if (statRooms) statRooms.textContent = rooms;
  if (statSlots) statSlots.textContent = slots;
}

// Utility: Prevent XSS injection in user string renders
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
// js/manager.js

let currentAuthMode = 'login';
let currentUser = null;

// Initialize Lucide icons
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  checkSession();
});

// Toggle between Login and Register tabs
function switchAuthTab(mode) {
  currentAuthMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabRegister').classList.toggle('active', mode === 'register');
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? 'Log In' : 'Create Manager Account';
}

// Check if user is currently logged in
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    showDashboard();
  } else {
    showAuth();
  }
}

// Handle Form Authentication (Login / Register)
async function handleAuth(event) {
  event.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;

  if (currentAuthMode === 'register') {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return alert('Registration Error: ' + error.message);
    alert('Account created! Logging you in...');
    currentUser = data.user;
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return alert('Login Error: ' + error.message);
    currentUser = data.user;
  }

  showDashboard();
}

// Logout Manager
async function handleLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  showAuth();
}

function showAuth() {
  document.getElementById('authSection').classList.remove('hidden');
  document.getElementById('dashboardSection').classList.add('hidden');
  document.getElementById('userNav').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('userNav').classList.remove('hidden');
  document.getElementById('userEmail').textContent = currentUser.email;
  loadManagerData();
}

// Fetch manager's hostels and rooms from Supabase
async function loadManagerData() {
  const container = document.getElementById('hostelsContainer');
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

  // Fetch all rooms for these hostels
  const hostelIds = hostels.map(h => h.id);
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .in('hostel_id', hostelIds);

  let totalRooms = rooms ? rooms.length : 0;
  let totalSlots = rooms ? rooms.reduce((acc, r) => acc + (r.available_slots || 0), 0) : 0;
  updateStats(hostels.length, totalRooms, totalSlots);

  // Render Hostels
  container.innerHTML = hostels.map(hostel => {
    const hostelRooms = rooms ? rooms.filter(r => r.hostel_id === hostel.id) : [];
    
    return `
      <div class="hostel-item">
        <div class="hostel-item-header">
          <div>
            <h3>${hostel.name}</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top:0.25rem;">
              <i data-lucide="map-pin"></i> ${hostel.distance_mins} mins walk to campus | Contact: ${hostel.contact_phone}
            </p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top:0.25rem;">
              Suitable Colleges: <strong>${(hostel.suitable_colleges || []).join(', ')}</strong>
            </p>
          </div>
          <button onclick="deleteHostel('${hostel.id}')" class="btn btn-danger">
            <i data-lucide="trash-2"></i> Delete Hostel
          </button>
        </div>

        <!-- Existing Rooms List -->
        <div>
          <strong style="font-size: 0.9rem;">Available Room Types & Prices:</strong>
          <div>
            ${hostelRooms.length === 0 
              ? '<span style="font-size: 0.85rem; color: var(--text-muted)">No room configurations added yet.</span>'
              : hostelRooms.map(r => `
                  <span class="room-badge">
                    ${r.room_type} — $${r.price_per_year}/yr (${r.available_slots} slots available)
                  </span>
                `).join('')
            }
          </div>
        </div>

        <!-- Add Room Configuration Form -->
        <div style="background: #F8FAFC; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
          <h4 style="font-size: 0.85rem; margin-bottom: 0.5rem;">+ Add Room Type to ${hostel.name}</h4>
          <form onsubmit="handleAddRoom(event, '${hostel.id}')" style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
            <select class="form-control" id="roomType_${hostel.id}" required>
              <option value="">Select Room Type</option>
              <option value="1-in-1">1-in-1 (Single Room)</option>
              <option value="2-in-1">2-in-1 (2 Students)</option>
              <option value="3-in-1">3-in-1 (3 Students)</option>
              <option value="4-in-1">4-in-1 (4 Students)</option>
            </select>
            <input type="number" class="form-control" id="roomPrice_${hostel.id}" placeholder="Price (e.g. 1200)" required />
            <input type="number" class="form-control" id="roomSlots_${hostel.id}" placeholder="Available Slots" required />
            <button type="submit" class="btn btn-primary" style="padding:0.6rem 1rem;">Add Room</button>
          </form>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// Add a new Hostel
async function handleAddHostel(event) {
  event.preventDefault();

  const name = document.getElementById('hostelName').value;
  const contact_phone = document.getElementById('hostelPhone').value;
  const distance_mins = parseInt(document.getElementById('hostelDistance').value);
  const image_url = document.getElementById('hostelImage').value;
  const description = document.getElementById('hostelDescription').value;

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

// Add Room Configuration to a Hostel
async function handleAddRoom(event, hostelId) {
  event.preventDefault();

  const room_type = document.getElementById(`roomType_${hostelId}`).value;
  const price_per_year = parseFloat(document.getElementById(`roomPrice_${hostelId}`).value);
  const available_slots = parseInt(document.getElementById(`roomSlots_${hostelId}`).value);

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

function updateStats(hostels, rooms, slots) {
  document.getElementById('statHostels').textContent = hostels;
  document.getElementById('statRooms').textContent = rooms;
  document.getElementById('statSlots').textContent = slots;
}
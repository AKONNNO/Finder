// js/app.js - Student Search & Smart Budget Recommendation Engine

let allHostels = [];
let allRooms = [];
let bookmarkedHostels = JSON.parse(localStorage.getItem('bookmarked_hostels') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fetchHostelsAndRooms();
});

// 1. FETCH DATA FROM SUPABASE
async function fetchHostelsAndRooms() {
  const container = document.getElementById('hostelsGrid');
  if (container) {
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem;">Loading hostels from database...</div>';
  }

  try {
    // Fetch Hostels
    const { data: hostels, error: hostelErr } = await supabase
      .from('hostels')
      .select('*')
      .order('created_at', { ascending: false });

    if (hostelErr) throw hostelErr;

    // Fetch Rooms
    const { data: rooms, error: roomErr } = await supabase
      .from('rooms')
      .select('*');

    if (roomErr) throw roomErr;

    allHostels = hostels || [];
    allRooms = rooms || [];

    renderHostels(allHostels);
  } catch (err) {
    console.error('Error fetching data:', err);
    if (container) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: red; padding: 2rem;">Failed to load hostels. Please check your Supabase connection in js/supabase.js</div>';
    }
  }
}

// 2. RENDER HOSTELS TO MAIN GRID
function renderHostels(hostelsToRender) {
  const container = document.getElementById('hostelsGrid');
  if (!container) return;

  if (hostelsToRender.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
        <i data-lucide="building-2" style="width:48px; height:48px; color:#94A3B8; margin-bottom:1rem;"></i>
        <h3>No Hostels Found</h3>
        <p style="color: #64748B; margin-top: 0.5rem;">Try adjusting your search criteria or budget filter.</p>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = hostelsToRender.map(hostel => {
    // Find rooms for this hostel
    const hostelRooms = allRooms.filter(r => r.hostel_id === hostel.id);
    
    // Calculate price range
    const prices = hostelRooms.map(r => Number(r.price_per_year));
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const priceDisplay = prices.length > 0 
      ? (minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`)
      : 'Contact for price';

    const isBookmarked = bookmarkedHostels.includes(hostel.id);

    return `
      <div class="hostel-card" style="background:#fff; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; transition: transform 0.2s, box-shadow 0.2s;">
        <div style="position:relative; height: 200px;">
          <img src="${hostel.image_url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}" 
               alt="${hostel.name}" style="width:100%; height:100%; object-fit:cover;" />
          
          <button onclick="toggleBookmark('${hostel.id}')" 
                  style="position:absolute; top:12px; right:12px; background:white; border:none; border-radius:50%; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.15);">
            <i data-lucide="bookmark" style="width:18px; height:18px; color:${isBookmarked ? '#2563EB' : '#64748B'}; fill:${isBookmarked ? '#2563EB' : 'none'};"></i>
          </button>
        </div>

        <div style="padding: 1.25rem; display:flex; flex-direction:column; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
            <h3 style="font-size:1.1rem; font-weight:700; color:#0F172A;">${hostel.name}</h3>
            <span style="font-weight:700; color:#2563EB; font-size:0.95rem;">${priceDisplay}<small style="font-size:0.75rem; color:#64748B;">/yr</small></span>
          </div>

          <p style="font-size:0.85rem; color:#64748B; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.25rem;">
            <i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${hostel.distance_mins} mins walk to campus
          </p>

          <!-- Colleges Badges -->
          <div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom:1rem;">
            ${(hostel.suitable_colleges || []).map(col => `
              <span style="background:#F1F5F9; color:#475569; font-size:0.75rem; padding:0.2rem 0.5rem; border-radius:4px; font-weight:500;">
                ${col}
              </span>
            `).join('')}
          </div>

          <!-- Room Config Badges -->
          <div style="margin-top:auto; padding-top:0.75rem; border-top:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:0.8rem; color:#64748B;">
              ${hostelRooms.length > 0 ? hostelRooms.map(r => r.room_type).join(' | ') : 'No rooms listed'}
            </div>
            <button onclick="openHostelDetails('${hostel.id}')" 
                    style="background:#2563EB; color:white; border:none; padding:0.5rem 0.85rem; border-radius:6px; font-weight:600; font-size:0.85rem; cursor:pointer;">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// 3. REGULAR SEARCH & FILTERING
function applyFilters() {
  const college = document.getElementById('collegeFilter')?.value || 'ALL';
  const roomType = document.getElementById('roomTypeFilter')?.value || 'ALL';
  const maxDistance = parseInt(document.getElementById('distanceFilter')?.value || '999');

  let filtered = allHostels.filter(hostel => {
    // College Filter
    if (college !== 'ALL') {
      const matchCollege = hostel.suitable_colleges && hostel.suitable_colleges.includes(college);
      if (!matchCollege) return false;
    }

    // Distance Filter
    if (hostel.distance_mins > maxDistance) return false;

    // Room Type Filter
    if (roomType !== 'ALL') {
      const hostelRooms = allRooms.filter(r => r.hostel_id === hostel.id);
      const hasRoomType = hostelRooms.some(r => r.room_type === roomType && r.available_slots > 0);
      if (!hasRoomType) return false;
    }

    return true;
  });

  renderHostels(filtered);
}

// 4. SMART BUDGET RECOMMENDATION ENGINE
function runBudgetRecommendation() {
  const maxBudget = parseFloat(document.getElementById('budgetInput')?.value || 0);
  const preferredCollege = document.getElementById('budgetCollege')?.value || 'ALL';
  const preferredRoomType = document.getElementById('budgetRoomType')?.value || 'ALL';
  const maxDistance = parseInt(document.getElementById('budgetMaxDistance')?.value || '999');

  if (!maxBudget || maxBudget <= 0) {
    alert('Please enter a valid budget amount.');
    return;
  }

  // Scoring and Recommendation Logic
  let scoredHostels = [];

  allHostels.forEach(hostel => {
    const hostelRooms = allRooms.filter(r => r.hostel_id === hostel.id);
    
    // Find rooms in this hostel within budget
    const affordableRooms = hostelRooms.filter(r => 
      Number(r.price_per_year) <= maxBudget && r.available_slots > 0
    );

    // If no rooms fit within budget, exclude this hostel
    if (affordableRooms.length === 0) return;

    let score = 100; // Base match score

    // Distance Scoring (closer to campus = higher score)
    if (hostel.distance_mins <= maxDistance) {
      score += (30 - hostel.distance_mins); // Bonus for being closer
    } else {
      score -= 40; // Penalty for being too far
    }

    // College Preference Match
    if (preferredCollege !== 'ALL' && hostel.suitable_colleges?.includes(preferredCollege)) {
      score += 25;
    }

    // Preferred Room Type Match
    if (preferredRoomType !== 'ALL') {
      const matchesRoom = affordableRooms.some(r => r.room_type === preferredRoomType);
      if (matchesRoom) score += 20;
    }

    // Get cheapest affordable room for comparison
    const cheapestRoom = affordableRooms.reduce((prev, curr) => 
      Number(prev.price_per_year) < Number(curr.price_per_year) ? prev : curr
    );

    scoredHostels.push({
      hostel,
      cheapestRoom,
      affordableRoomsCount: affordableRooms.length,
      score
    });
  });

  // Sort highest matching score first
  scoredHostels.sort((a, b) => b.score - a.score);

  // Render Top Recommendations
  renderRecommendations(scoredHostels, maxBudget);
}

function renderRecommendations(recommendations, budget) {
  const container = document.getElementById('hostelsGrid');
  if (!container) return;

  if (recommendations.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
        <i data-lucide="frown" style="width:48px; height:48px; color:#EF4444; margin-bottom:1rem;"></i>
        <h3>No Matching Hostels Within $${budget} Budget</h3>
        <p style="color: #64748B; margin-top: 0.5rem;">Try increasing your budget or relaxing distance/college preferences.</p>
        <button onclick="renderHostels(allHostels)" style="margin-top:1rem; padding:0.5rem 1rem; background:#2563EB; color:white; border:none; border-radius:6px; cursor:pointer;">Show All Hostels</button>
      </div>`;
    lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div style="grid-column: 1/-1; background:#EFF6FF; border:1px solid #BFDBFE; padding:1rem 1.5rem; border-radius:8px; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="color:#1E40AF;">Smart Budget Recommendations (${recommendations.length} found)</strong>
        <p style="font-size:0.85rem; color:#1E3A8A; margin:0;">Sorted by price fit, college preference, and distance to campus.</p>
      </div>
      <button onclick="renderHostels(allHostels)" style="background:transparent; border:1px solid #1E40AF; color:#1E40AF; padding:0.4rem 0.8rem; border-radius:6px; cursor:pointer; font-size:0.85rem;">Reset Filters</button>
    </div>
  ` + recommendations.map(rec => {
    const { hostel, cheapestRoom, score } = rec;
    return `
      <div class="hostel-card" style="background:#fff; border:2px solid #2563EB; border-radius:12px; overflow:hidden; display:flex; flex-direction:column; position:relative;">
        <div style="position:absolute; top:12px; left:12px; background:#10B981; color:white; font-size:0.75rem; font-weight:700; padding:0.25rem 0.6rem; border-radius:20px; z-index:2;">
          ${Math.min(99, Math.max(70, Math.round(score)))}% Match
        </div>
        
        <div style="height: 180px; position:relative;">
          <img src="${hostel.image_url || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}" 
               alt="${hostel.name}" style="width:100%; height:100%; object-fit:cover;" />
        </div>

        <div style="padding: 1.25rem; display:flex; flex-direction:column; flex:1;">
          <h3 style="font-size:1.1rem; font-weight:700; color:#0F172A; margin-bottom:0.25rem;">${hostel.name}</h3>
          
          <div style="background:#F8FAFC; border:1px solid #E2E8F0; border-radius:6px; padding:0.5rem; margin: 0.5rem 0 0.75rem 0;">
            <div style="font-size:0.8rem; color:#64748B;">Cheapest Room Fitting Budget:</div>
            <div style="font-weight:700; color:#2563EB; font-size:1rem;">
              ${cheapestRoom.room_type} — $${cheapestRoom.price_per_year}/yr
            </div>
          </div>

          <p style="font-size:0.85rem; color:#64748B; margin-bottom:0.5rem; display:flex; align-items:center; gap:0.25rem;">
            <i data-lucide="map-pin" style="width:14px; height:14px;"></i> ${hostel.distance_mins} mins walk to campus
          </p>

          <button onclick="openHostelDetails('${hostel.id}')" 
                  style="margin-top:auto; width:100%; background:#2563EB; color:white; border:none; padding:0.6rem; border-radius:6px; font-weight:600; cursor:pointer;">
            View Room Options & Book
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

// 5. MODAL POPUP FOR DETAILS & INQUIRIES
function openHostelDetails(hostelId) {
  const hostel = allHostels.find(h => h.id === hostelId);
  if (!hostel) return;

  const hostelRooms = allRooms.filter(r => r.hostel_id === hostelId);

  const modalHtml = `
    <div id="hostelModal" style="position:fixed; inset:0; background:rgba(15,23,42,0.6); display:flex; justify-content:center; align-items:center; z-index:1000; padding:1rem;">
      <div style="background:white; border-radius:16px; max-width:600px; width:100%; max-height:90vh; overflow-y:auto; padding:2rem; position:relative; box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
        
        <button onclick="closeModal()" style="position:absolute; top:1.5rem; right:1.5rem; background:none; border:none; cursor:pointer;">
          <i data-lucide="x" style="width:24px; height:24px; color:#64748B;"></i>
        </button>

        <img src="${hostel.image_url}" alt="${hostel.name}" style="width:100%; height:220px; object-fit:cover; border-radius:12px; margin-bottom:1rem;" />

        <h2 style="font-size:1.5rem; font-weight:700; color:#0F172A;">${hostel.name}</h2>
        <p style="color:#64748B; font-size:0.9rem; margin-top:0.25rem; display:flex; align-items:center; gap:0.25rem;">
          <i data-lucide="map-pin" style="width:16px; height:16px;"></i> ${hostel.distance_mins} minutes walk to campus
        </p>

        <p style="margin: 1rem 0; color:#334155; line-height:1.5; font-size:0.95rem;">
          ${hostel.description || 'No description provided.'}
        </p>

        <h3 style="font-size:1.1rem; font-weight:700; margin-bottom:0.75rem;">Available Room Configurations</h3>
        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
          ${hostelRooms.length === 0 
            ? '<p style="color:#64748B;">No active room listings available.</p>' 
            : hostelRooms.map(r => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.75rem 1rem; border:1px solid #E2E8F0; border-radius:8px;">
                  <div>
                    <strong style="color:#0F172A;">${r.room_type}</strong>
                    <div style="font-size:0.8rem; color:#10B981;">${r.available_slots} slots remaining</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700; color:#2563EB; font-size:1.1rem;">$${r.price_per_year}</div>
                    <small style="color:#64748B;">/academic year</small>
                  </div>
                </div>
              `).join('')
          }
        </div>

        <!-- Direct Manager Contact Actions -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
          <a href="tel:${hostel.contact_phone}" style="text-decoration:none; display:flex; justify-content:center; align-items:center; gap:0.5rem; background:#F1F5F9; color:#0F172A; padding:0.75rem; border-radius:8px; font-weight:600;">
            <i data-lucide="phone" style="width:18px; height:18px;"></i> Call Manager
          </a>
          <a href="https://wa.me/${hostel.contact_phone.replace(/[^0-9]/g, '')}?text=Hi,%20I%20am%20interested%20in%20${encodeURIComponent(hostel.name)}" 
             target="_blank" style="text-decoration:none; display:flex; justify-content:center; align-items:center; gap:0.5rem; background:#25D366; color:white; padding:0.75rem; border-radius:8px; font-weight:600;">
            <i data-lucide="message-circle" style="width:18px; height:18px;"></i> WhatsApp Inquiry
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  lucide.createIcons();
}

function closeModal() {
  const modal = document.getElementById('hostelModal');
  if (modal) modal.remove();
}

// 6. BOOKMARK TOGGLE
function toggleBookmark(hostelId) {
  if (bookmarkedHostels.includes(hostelId)) {
    bookmarkedHostels = bookmarkedHostels.filter(id => id !== hostelId);
  } else {
    bookmarkedHostels.push(hostelId);
  }
  localStorage.setItem('bookmarked_hostels', JSON.stringify(bookmarkedHostels));
  renderHostels(allHostels);
}
const API_BASE_URL = 'http://localhost:4000';

// Helper for fetch with credentials (cookies)
async function request(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If a JWT exists in localStorage, add it to Authorization header
  const token = localStorage.getItem('access_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Support cookies for sessions
  });

  const json = await response.json();
  if (!response.ok) {
    let errMsg = json.message || json.error || 'API Request failed';
    if (json.details && Array.isArray(json.details)) {
      errMsg = `${json.error}: ${json.details.map((d: any) => d.message).join(', ')}`;
    }
    throw new Error(errMsg);
  }
  return json;
}

export const api = {
  // --- AUTHENTICATION ---
  auth: {
    async register(data: any) {
      return request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async login(data: any) {
      const res = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.data?.accessToken) {
        localStorage.setItem('access_token', res.data.accessToken);
      }
      return res;
    },
    async logout() {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } finally {
        localStorage.removeItem('access_token');
      }
    },
    async me() {
      return request('/api/auth/me');
    },
    async verifyEmail(email: string, token: string) {
      return request('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token, type: 'signup' }),
      });
    },
  },


  // --- PROFILES ---
  profile: {
    async getMyProfile() {
      return request('/api/profile');
    },
    async getPublicProfile(userId: string) {
      return request(`/api/profile/${userId}`);
    },
    async updateProfile(data: any) {
      return request('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async getAvailability() {
      return request('/api/profile/availability/list');
    },
    async setAvailability(slots: any[]) {
      return request('/api/profile/availability', {
        method: 'POST',
        body: JSON.stringify({ slots }),
      });
    },
    async getEducation() {
      return request('/api/profile/education/list');
    },
    async addEducation(data: any) {
      return request('/api/profile/education', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async getExperience() {
      return request('/api/profile/experience/list');
    },
    async addExperience(data: any) {
      return request('/api/profile/experience', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async follow(userId: string) {
      return request(`/api/profile/follow/${userId}`, { method: 'POST' });
    },
    async unfollow(userId: string) {
      return request(`/api/profile/unfollow/${userId}`, { method: 'DELETE' });
    },
  },

  // --- SKILLS ---
  skills: {
    async getCategories() {
      return request('/api/skills/categories');
    },
    async getCategory(categoryId: string) {
      return request(`/api/skills/categories/${categoryId}`);
    },
    async getAll() {
      return request('/api/skills');
    },
    async search(q: string) {
      return request(`/api/skills/search?q=${encodeURIComponent(q)}`);
    },
    async getMyOffered() {
      return request('/api/skills/user/offered');
    },
    async getMyWanted() {
      return request('/api/skills/user/wanted');
    },
    async addOffered(data: any) {
      return request('/api/skills/user/offered', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async addWanted(data: any) {
      return request('/api/skills/user/wanted', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // --- MATCHING ---
  matching: {
    async getMatches() {
      return request('/api/matching');
    },
    async getSuggestions() {
      return request('/api/matching/suggestions');
    },
    async getNearbyLearners() {
      return request('/api/matching/nearby-learners');
    },
    async getNearbyTeachers() {
      return request('/api/matching/nearby-teachers');
    },
    async runMatching() {
      return request('/api/matching/run', { method: 'POST' });
    },
    async acceptMatch(matchId: string) {
      return request(`/api/matching/${matchId}/accept`, { method: 'POST' });
    },
    async rejectMatch(matchId: string) {
      return request(`/api/matching/${matchId}/reject`, { method: 'POST' });
    },
    async sendMatchRequest(targetUserId: string) {
      return request(`/api/matching/request/${targetUserId}`, { method: 'POST' });
    },
  },

  // --- SESSIONS ---
  sessions: {
    async getMySessions() {
      return request('/api/sessions');
    },
    async getSession(id: string) {
      return request(`/api/sessions/${id}`);
    },
    async schedule(data: any) {
      return request('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async confirm(id: string) {
      return request(`/api/sessions/${id}/confirm`, { method: 'POST' });
    },
    async cancel(id: string, reason: string) {
      return request(`/api/sessions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    async join(id: string) {
      return request(`/api/sessions/${id}/join`, { method: 'POST' });
    },
    async complete(id: string, actualDurationMinutes?: number) {
      return request(`/api/sessions/${id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ actualDurationMinutes }),
      });
    },
    async saveNotes(id: string, notes: string) {
      return request(`/api/sessions/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
    },
  },

  // --- WHITEBOARD ---
  whiteboard: {
    async getState(sessionId: string) {
      return request(`/api/whiteboard/${sessionId}`);
    },
    async saveState(sessionId: string, elements: any[]) {
      return request(`/api/whiteboard/${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ elements }),
      });
    },
  },

  // --- VIDEO ---
  video: {
    async getRtcToken(channelName: string, role = 'publisher') {
      return request(`/api/video/token/rtc?channelName=${encodeURIComponent(channelName)}&role=${role}`);
    },
    async getRtmToken() {
      return request('/api/video/token/rtm');
    },
    async getScreenShareToken(channelName: string) {
      return request(`/api/video/token/screenshare?channelName=${encodeURIComponent(channelName)}`);
    },
    async getTrtcSig() {
      return request('/api/video/trtc-sig');
    },
  },

  // --- BADGES ---
  badges: {
    async getDefinitions() {
      return request('/api/badges/definitions');
    },
    async getMyBadges() {
      return request('/api/badges/my');
    },
    async getUserBadges(userId: string) {
      return request(`/api/badges/user/${userId}`);
    },
  },

  // --- FEED ---
  feed: {
    async getFeed(page = 1, limit = 20) {
      return request(`/api/feed?page=${page}&limit=${limit}`);
    },
    async createPost(data: { title: string; body: string }) {
      return request('/api/feed', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async getTrending(limit = 5) {
      return request(`/api/feed/trending?limit=${limit}`);
    },
  },

  // --- LOCATION ---
  location: {
    async getNearby(lat: number, lon: number, radiusKm = 50) {
      return request(`/api/location/nearby?latitude=${lat}&longitude=${lon}&radiusKm=${radiusKm}`);
    },
  },
};

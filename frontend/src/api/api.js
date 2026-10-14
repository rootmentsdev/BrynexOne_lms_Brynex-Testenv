const baseUrl = {
  // Automatically switch between local development and test Render URL!
  // https://lms-testenv-v0w5.onrender.com/
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? "http://localhost:7000/"
    : "https://lms-testenv-v0w5.onrender.com/",
};

/**
 * Generic API call function with error handling and CORS fallback
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise<any>} - API response data
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = `${baseUrl.baseUrl}${endpoint}`;

  // Default options
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  // Merge options
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    finalOptions.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, finalOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      try {
        const corsProxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(corsProxyUrl, finalOptions);

        if (!response.ok) {
          throw new Error(`CORS proxy failed: ${response.status}`);
        }

        return await response.json();
      } catch (corsError) {
        throw corsError;
      }
    }

    throw error;
  }
};

const notifyDashboardRefresh = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("dashboard:refresh"));
  }
};

/**
 * Mark video as complete
 * @param {Object} params - Parameters for marking video complete
 * @param {string} params.userId - User ID
 * @param {string} params.trainingId - Training ID
 * @param {string} params.moduleId - Module ID
 * @param {string} params.videoId - Video ID
 * @param {number} params.watchTime - Watch time in seconds (optional)
 * @param {number} params.totalDuration - Total duration in seconds (optional)
 * @returns {Promise<any>} - API response
 */
export const markVideoAsComplete = async ({ userId, trainingId, moduleId, videoId, watchTime, totalDuration }) => {
  const params = new URLSearchParams({
    userId,
    trainingId,
    moduleId,
    videoId,
  });

  if (watchTime) params.append('watchTime', watchTime.toString());
  if (totalDuration) params.append('totalDuration', totalDuration.toString());

  const response = await apiCall(`api/user/update/trainingprocess?${params.toString()}`, {
    method: 'PATCH',
  });

  notifyDashboardRefresh();
  return response;
};

/**
 * Update video progress
 * @param {Object} params - Parameters for updating video progress
 * @returns {Promise<any>} - API response
 */
export const updateVideoProgress = async (params) => {
  const response = await apiCall('api/video_progress', {
    method: 'POST',
    body: JSON.stringify(params),
  });

  notifyDashboardRefresh();
  return response;
};

export const formatStoreDisplayName = (rawName) => {
  if (!rawName) return '';
  const trimmed = String(rawName).trim();
  const lower = trimmed.toLowerCase();

  if (lower.startsWith('suitor guy') || lower.startsWith('zorucci') || lower.startsWith('dappr') || ['office', 'production', 'warehouse', 'all stores', 'all'].includes(lower)) {
    return trimmed;
  }

  const isZ = /^z[\.\-\s]/i.test(trimmed) || /^z/i.test(trimmed);

  let loc = trimmed
    .replace(/^(sg|g|z)[\.\-\s]*/i, '')
    .replace(/\d+$/g, '')
    .trim();

  loc = loc
    .replace(/\bedap{1,3}a?l{1,3}[yi]\b/i, 'Edappally')
    .replace(/\bedap{1,3}a?l\b/i, 'Edappal')
    .replace(/\bkottaka?l\b/i, 'Kottakkal')
    .replace(/\bperinthalman+a\b/i, 'Perinthalmanna')
    .replace(/\bkalpeta\b/i, 'Kalpetta')
    .replace(/\bmanjer[yi]\b/i, 'Manjeri');

  if (loc.length > 0) {
    loc = loc.charAt(0).toUpperCase() + loc.slice(1);
  }

  const prefix = isZ ? 'Z' : 'SG';
  return `${prefix} ${loc}`;
};

export default baseUrl;

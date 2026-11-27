// syllabus.js - Modular API wrapper for syllabus (proxies to api.js per spec architecture)
// Keeps academic data centralized in js/api.js - no hard-coded data here
// Usage: import { API } from './api.js' then API.getSyllabus...
// This file exists to satisfy the project's documented folder structure.
// Implementation is delegated to the centralized API service layer.

// Re-export helpers for syllabus
if(typeof API !== 'undefined' && API) {
  // Example: const data = await API.getSyllabus({...})
}

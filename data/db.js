'use strict';

const fs   = require('fs');
const path = require('path');

const FILES = {
  websites:      path.join(__dirname, 'suggestions.json'),
  features:      path.join(__dirname, 'features.json'),
  snippets:      path.join(__dirname, 'snippets.json'),
  events:        path.join(__dirname, 'events.json'),
  notifications: path.join(__dirname, 'notifications.json'),
};

function readFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
    return [];
  }
}

function writeFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e.message);
  }
}

// ── Website Suggestions ────────────────────────────────────
function getWebsiteSuggestions()    { return readFile(FILES.websites); }
function addWebsiteSuggestion(e)    { const i = getWebsiteSuggestions(); i.push(e); writeFile(FILES.websites, i); }

// ── Feature Suggestions ────────────────────────────────────
function getFeatureSuggestions()    { return readFile(FILES.features); }
function addFeatureSuggestion(e)    { const i = getFeatureSuggestions(); i.push(e); writeFile(FILES.features, i); }

// ── Code Snippets ──────────────────────────────────────────
function getSnippets()              { return readFile(FILES.snippets); }
function addSnippet(e)              { const i = getSnippets(); i.push(e); writeFile(FILES.snippets, i); }

function reviewSnippet(id, status) {
  // status: 'accepted' | 'declined'
  const items = getSnippets();
  const idx   = items.findIndex(s => s.id === id);
  if (idx === -1) return null;
  const snippet = items[idx];
  snippet.status    = status;
  snippet.reviewedAt = new Date().toISOString();
  writeFile(FILES.snippets, items);
  return snippet;
}

function getPendingSnippets()  { return getSnippets().filter(s => !s.status || s.status === 'pending'); }
function getReviewedSnippets() { return getSnippets().filter(s => s.status && s.status !== 'pending'); }

// ── Events ─────────────────────────────────────────────────
function getEvents()   { return readFile(FILES.events); }
function addEvent(e)   { const i = getEvents(); i.push(e); writeFile(FILES.events, i); }
function deleteEvent(id) {
  const items = getEvents().filter(e => e.id !== id);
  writeFile(FILES.events, items);
}
function getUpcomingEvents() {
  const now = new Date();
  return getEvents()
    .filter(e => new Date(e.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}
function getAllEventsSorted() {
  return getEvents().sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
}

// ── Notifications ──────────────────────────────────────────
function getNotifications()          { return readFile(FILES.notifications); }
function addNotification(n)          { const i = getNotifications(); i.push(n); writeFile(FILES.notifications, i); }
function getNotificationsFor(username) {
  return getNotifications()
    .filter(n => n.username === username)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}
function markNotificationRead(id) {
  const items = getNotifications();
  const n = items.find(x => x.id === id);
  if (n) { n.read = true; writeFile(FILES.notifications, items); }
}
function markAllNotificationsRead(username) {
  const items = getNotifications();
  items.forEach(n => { if (n.username === username) n.read = true; });
  writeFile(FILES.notifications, items);
}

module.exports = {
  getWebsiteSuggestions, addWebsiteSuggestion,
  getFeatureSuggestions, addFeatureSuggestion,
  getSnippets, addSnippet, reviewSnippet, getPendingSnippets, getReviewedSnippets,
  getEvents, addEvent, deleteEvent, getUpcomingEvents, getAllEventsSorted,
  getNotifications, addNotification, getNotificationsFor, markNotificationRead, markAllNotificationsRead,
};

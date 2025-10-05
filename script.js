// Base URL dinamis untuk Vercel
const API_BASE = window.location.origin + '/api';

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const isDark = localStorage.getItem('theme') !== 'light';
body.classList.toggle('light-mode', !isDark);
themeToggle.textContent = isDark ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggle.textContent = isLight ? '🌙' : '☀️';
});

// Fungsi Copy Endpoint URL (global untuk onclick di HTML)
window.copyEndpoint = function(category, inputValue = '') {
    let endpointUrl;
    let method = '

// Base URL dinamis untuk Vercel (atau localhost)
const API_BASE = window.location.origin + '/api';

// Theme Toggle (dari sebelumnya)
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
let isDark = localStorage.getItem('theme') !== 'light';
body.classList.toggle('light-mode', !isDark);
themeToggle.textContent = isDark ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    isDark = !isDark;
    body.classList.toggle('light-mode', !isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
});

// Fungsi Universal untuk Execute (reusable untuk semua cards)
async function executeEndpoint(formId, resultId, spinnerId, category, isPost = false, bodyKey = null) {
    const form = document.getElementById(formId);
    const result = document.getElementById(resultId);
    const spinner = document.getElementById(spinnerId);
    const submitBtn = form.querySelector('button[type="submit"]') || document.getElementById('all-btn');
    
    // Ambil input value
    let inputValue = '';
    if (bodyKey) {
        const input = document.getElementById(bodyKey + '-input'); // Misal 'prompt-input' atau 'url-input'
        inputValue = input ? input.value.trim() : '';
    } else {
        // Untuk GET, ambil dari query atau form
        const input = form.querySelector('input');
        inputValue = input ? input.value.trim() : '';
    }

    if (!inputValue && !isPost && category !== 'all') {
        showResult(result, { error: true, message: 'Input required!' }, 'error');
        return;
    }

    // Start Loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Loading...';
    result.className = ''; // Reset class
    result.style.display = 'none';
    spinner.classList.remove('hidden');
    result.innerHTML = ''; // Clear previous

    try {
        let response;
        if (isPost) {
            // POST untuk AI
            response = await fetch(`${API_BASE}/${category}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [bodyKey]: inputValue })
            });
        } else {
            // GET untuk lainnya
            const params = inputValue ? `?${bodyKey || 'url'}=${encodeURIComponent(inputValue)}` : '';
            response = await fetch(`${API_BASE}/${category}${params}`);
        }

        const data = await response.json();

        // End Loading
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Execute ➡️';

        // Display Result
        showResult(result, data, response.ok ? 'success' : 'error');
    } catch (error) {
        // Network Error
        spinner.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Execute ➡️';
        showResult(result, { 
            error: true, 
            message: 'Network error: ' + error.message + '. Check connection or API status.' 
        }, 'error');
    }
}

// Fungsi Display Result (dengan icon dan formatting)
function showResult(element, data, type) {
    element.style.display = 'block';
    element.className = type;
    
    // Prepend icon
    const icon = type === 'success' ? '✅ ' : '❌ ';
    const formatted = icon + JSON.stringify(data, null, 2);
    element.textContent = formatted; // Atau innerHTML jika mau bold keys

    // Scroll to result
    element.scrollIntoView({ behavior: 'smooth' });
}

// Fungsi Copy Endpoint URL (untuk Bot – Generate Full URL + cURL)
window.copyEndpoint = function(category, inputId = null) {
    let inputValue = '';
    if (inputId) {
        const input = document.getElementById(inputId);
        inputValue = input ? input.value.trim() : '';
    }

    let endpointUrl;
    let curlCommand;
    let isPost = category === 'ai';

    if (isPost) {
        // Untuk AI (POST)
        const body = inputValue ? ` -d '{"prompt":"${inputValue.replace(/"/g, '\\"')}"}'` : ' -d "{}"';
        curlCommand = `curl -X POST "${API_BASE}/${category}" -H "Content-Type: application/json"${body}`;
        endpointUrl = `${API_BASE}/${category} (POST with JSON body)`;
    } else {
        // Untuk GET (downloader, all, instagram)
        const param = inputValue ? `?${inputId ? inputId.replace('-input', '') : 'url'}=${encodeURIComponent(inputValue)}` : '';
        endpointUrl = `${API_BASE}/${category}${param}`;
        const paramName = inputId ? inputId.replace('-input', '') : 'url';
        curlCommand = `curl "${endpointUrl.replace(paramName + '=', paramName + '=URL_VALUE')}"`; // Generic untuk copy
    }

    // Copy ke Clipboard
    const toCopy = inputValue ? endpointUrl : curlCommand; // Prioritaskan full URL jika ada input
    navigator.clipboard.writeText(toCopy).then(() => {
        showToast('Copied to clipboard! Paste ke bot code atau terminal Anda. 🚀');
    }).catch(() => {
        // Fallback
        prompt('Copy this URL/Command:', toCopy);
        showToast('Copied via prompt – Use for your bot!');
    });
}

// Fungsi Toast Notification (sederhana, hilang setelah 3s)
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #4ecdc4; color: white; 
            padding: 12px 20px; border-radius: 10px; z-index: 1000; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// Event Listeners untuk Forms (Prevent Refresh + Execute)
document.addEventListener('DOMContentLoaded', () => {
    // Downloader
    document.getElementById('downloader-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Fix: Prevent refresh
        executeEndpoint('downloader-form', 'downloader-result', 'downloader-spinner', 'downloader', false, 'url');
    });

    // AI
    document.getElementById('ai-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Fix: Prevent refresh
        executeEndpoint('ai-form', 'ai-result', 'ai-spinner', 'ai', true, 'prompt');
    });

    // All
    document.getElementById('all-btn').addEventListener('click', async (e) => {
        e.preventDefault(); // Fix: Meski button, prevent jika di form
        executeEndpoint(null, 'all-result', 'all-spinner', 'all', false);
    });

    // Instagram (jika ada)
    const igForm = document.getElementById('instagram-form');
    if (igForm) {
        igForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Fix: Prevent refresh
            executeEndpoint('instagram-form', 'instagram-result', 'instagram-spinner', 'instagram', false, 'ig-url');
        });
    }

    // Auto-focus first input
    document.querySelector('input')?.focus();
});

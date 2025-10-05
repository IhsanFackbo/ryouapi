// Base URL dinamis
const API_BASE = window.location.origin + '/api';

// Theme Toggle
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

// Fungsi Universal Execute (Fixed: No Parse Error, Handle Raw HTML/Text)
async function executeEndpoint(formId, resultId, spinnerId, category, isPost = false, bodyKey = null) {
    const form = document.getElementById(formId);
    const result = document.getElementById(resultId);
    const spinner = document.getElementById(spinnerId);
    const submitBtn = form ? form.querySelector('button[type="submit"]') : document.getElementById('all-btn');
    
    let inputValue = '';
    if (bodyKey) {
        const input = document.getElementById(bodyKey + '-input');
        inputValue = input ? input.value.trim() : '';
    } else {
        const input = form ? form.querySelector('input') : null;
        inputValue = input ? input.value.trim() : '';
    }

    if (!inputValue && !isPost && category !== 'all') {
        showResult(result, { error: true, message: 'Input required!' }, 'error');
        return;
    }

    // Start Loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Loading...';
    }
    result.className = '';
    result.style.display = 'none';
    spinner.classList.remove('hidden');
    result.innerHTML = '';

    try {
        let response;
        if (isPost) {
            response = await fetch(`${API_BASE}/${category}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [bodyKey]: inputValue })
            });
        } else {
            const params = inputValue ? `?${bodyKey || 'url'}=${encodeURIComponent(inputValue)}` : '';
            response = await fetch(`${API_BASE}/${category}${params}`);
        }

        // Fix Full: Selalu baca sebagai TEXT dulu, lalu parse JSON
        const text = await response.text();
        let data;
        
        try {
            // Coba parse JSON
            data = text ? JSON.parse(text) : { error: true, message: 'Empty response from API.' };
        } catch (parseError) {
            // Parse fail (HTML atau invalid JSON) – tampilkan raw
            console.warn('JSON Parse Failed – Raw Response:', text.substring(0, 200));
            data = {
                error: true,
                message: `API returned invalid format (possibly server error HTML). Status: ${response.status} ${response.statusText}.`,
                rawResponse: text.length > 1000 ? text.substring(0, 1000) + '\n... (truncated)' : text,
                code: response.status,
                parseError: parseError.message // Untuk debug
            };
        }

        // End Loading
        spinner.classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Execute ➡️';
        }

        // Tampilkan (success jika no error, else error)
        const type = data.error ? 'error' : 'success';
        showResult(result, data, type);

    } catch (networkError) {
        // Network/Fetch Error
        spinner.classList.add('hidden');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Execute ➡️';
        }
        showResult(result, { 
            error: true, 
            message: `Network error: ${networkError.message}. Check connection or API availability.`,
            suggestion: 'Reload page or try different URL.'
        }, 'error');
    }
}

// Fungsi Display Result (Handle Raw Text dengan Wrapping)
function showResult(element, data, type) {
    element.style.display = 'block';
    element.className = type + (data.rawResponse ? ' raw-error' : '');
    
    const icon = type === 'success' ? '✅ ' : '❌ ';
    let displayText;
    
    if (data.rawResponse || typeof data === 'string') {
        // Raw text/HTML – tampilkan sebagai string wrapped
        displayText = icon + (data.message || 'Raw API Response:') + '\n\n' + (data.rawResponse || data);
    } else {
        // JSON – stringify dengan indent
        displayText = icon + JSON.stringify(data, null, 2);
    }
    
    element.textContent = displayText; // textContent + CSS wrap = no overflow
    element.scrollIntoView({ behavior: 'smooth' });
}

// Copy Endpoint (Sama seperti sebelumnya)
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
        const body = inputValue ? ` -d '{"prompt":"${inputValue.replace(/"/g, '\\"')}"}'` : ' -d "{}"';
        curlCommand = `curl -X POST "${API_BASE}/${category}" -H "Content-Type: application/json"${body}`;
        endpointUrl = `${API_BASE}/${category} (POST with JSON body)`;
    } else {
        const param = inputValue ? `?${inputId ? inputId.replace('-input', '') : 'url'}=${encodeURIComponent(inputValue)}` : '';
        endpointUrl = `${API_BASE}/${category}${param}`;
        const paramName = inputId ? inputId.replace('-input', '') : 'url';
        curlCommand = `curl "${endpointUrl.replace(paramName + '=', paramName + '=URL_VALUE')}"`;
    }

    const toCopy = inputValue ? endpointUrl : curlCommand;
    navigator.clipboard.writeText(toCopy).then(() => {
        showToast('Copied! Paste to bot code. 🚀');
    }).catch(() => {
        prompt('Copy this:', toCopy);
        showToast('Copied via prompt!');
    });
}

// Toast
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `position: fixed; top: 20px; right: 20px; background: #4ecdc4; color: white; padding: 12px 20px; border-radius: 10px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: opacity 0.3s; opacity: 0;`;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// Event Listeners (Prevent Refresh)
document.addEventListener('DOMContentLoaded', () => {
    // Downloader
    document.getElementById('downloader-form').addEventListener('submit', (e) => {
        e.preventDefault();
        executeEndpoint('downloader-form', 'downloader-result', 'downloader-spinner', 'downloader', false, 'url');
    });

    // AI
    document.getElementById('ai-form').addEventListener('submit', (e) => {
        e.preventDefault();
        executeEndpoint('ai-form', 'ai-result', 'ai-spinner', 'ai', true, 'prompt');
    });

    // All
    document.getElementById('all-btn').addEventListener('click', (e) => {
        e.preventDefault();
        executeEndpoint(null, 'all-result', 'all-spinner', 'all', false);
    });

    // Instagram (jika ada)
    const igForm = document.getElementById('instagram-form');
    if (igForm) {
        igForm.addEventListener('submit', (e) => {
            e.preventDefault();
            executeEndpoint('instagram-form', 'instagram-result', 'instagram-spinner', 'instagram', false, 'ig-url');
        });
    }

    // Auto-focus
    document.querySelector('input')?.focus();
});

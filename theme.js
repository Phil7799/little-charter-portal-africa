// theme.js - Light/Dark theme toggle, persists via localStorage
(function () {
    const STORAGE_KEY = 'la_theme';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
        // Update all toggle buttons on the page
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.innerHTML = theme === 'dark'
                ? '<i class="fas fa-sun"></i> Light Mode'
                : '<i class="fas fa-moon"></i> Dark Mode';
            btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        });
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    }

    // Apply saved theme immediately (before paint) to avoid flash
    const saved = localStorage.getItem(STORAGE_KEY) || 'light';
    applyTheme(saved);

    // Inject the button into every page's header portal-toggle area
    document.addEventListener('DOMContentLoaded', function () {
        applyTheme(localStorage.getItem(STORAGE_KEY) || 'light');

        // Create button
        const btn = document.createElement('button');
        btn.className = 'theme-toggle-btn toggle-btn';
        btn.style.cssText = 'margin-left:10px;background:var(--surface-2,#e8eaed);color:var(--text-primary,#202124);border:1px solid var(--border-color,#dadce0);';
        btn.addEventListener('click', toggleTheme);

        // Insert into .portal-toggle div if exists, else append to header
        const portalToggle = document.querySelector('.portal-toggle');
        if (portalToggle) {
            portalToggle.appendChild(btn);
        } else {
            const header = document.querySelector('.header');
            if (header) header.appendChild(btn);
        }

        // Set correct icon
        applyTheme(localStorage.getItem(STORAGE_KEY) || 'light');
    });
})();
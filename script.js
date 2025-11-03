/*
 * ArtNepalaya Frontend Logic (v7 - JSON Mismatch Fix)
 *
 * This file handles:
 * 1. Fetching content from the Google Sheet CMS.
 * 2. Rendering the dynamic content onto the page.
 * 3. Handling the multi-step survey form logic.
 * 4. Submitting the form data to the Google Apps Script.
 * 5. Showing success/error messages.
 * 6. Scroll animations.
 *
 * --- NOTE ON CORS FIX ---
 * Google Apps Script (ContentService) does not allow setting CORS headers.
 * The backend (code.gs) now uses HtmlService as a workaround.
 * This means our response is NOT 'application/json', it's 'text/html' containing a JSON string.
 * We MUST use res.text() and then JSON.parse() to read the data.
 */

// ===============================
// CONFIGURATION
// ===============================
//
// !!! FIX APPLIED !!!
// I have pasted your new, working URL here.
//
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxzKx2lP66Cmy0aLYkJlJkUfYzQcCt1K0NPs3rJ6ppr8_SJUhLTYEFuky42uENaxuVE/exec';

// ===============================
// DOMContentLoaded
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    loadContent();
    initFormLogic();
    initScrollAnimations();
    initParticles();
});

// ===============================
// 1. CONTENT LOADING
// ===============================

/**
 * Fetches the site content from the Google Apps Script.
 */
function loadContent() {
    const loader = document.getElementById('loader-container');
    
    fetch(`${APPS_SCRIPT_URL}?action=getContent`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            // --- CORS FIX ---
            // The response is text, not JSON, so we must parse it manually.
            return res.text();
        })
        .then(text => {
            // Check if text is empty or not valid JSON
            if (!text || (text.charAt(0) !== '{' && text.charAt(0) !== '[')) {
                console.error('Received non-JSON response from server:', text);
                throw new Error('Server returned an invalid response.');
            }
            
            const data = JSON.parse(text);

            if (data.status === 'success') {
                populateContent(data.content);
                // Hide loader
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 400);
            } else {
                throw new Error(data.message || 'Failed to parse content.');
            }
        })
        .catch(error => {
            console.error('Failed to load site content.', error);
            const loaderText = loader.querySelector('p');
            if (loaderText) {
                loaderText.textContent = `Failed to load site content. Error: ${error.message}`;
                loaderText.style.color = 'var(--color-primary-red)';
            }
        });
}

/**
 * Populates the HTML with the fetched content.
 * (FIXED to match the user's provided JSON structure)
 */
function populateContent(content) {
    // 0. Apply dynamic colors
    // We need to parse the colorTheme JSON string first
    let colors = {};
    if (typeof content.colorTheme === 'string') {
        colors = JSON.parse(content.colorTheme);
    } else {
        colors = content.colorTheme || {};
    }
    applyColors(colors); // Pass the inner color object

    // 1. Hero Section
    setElementText('hero-title', content.heroTitle);
    setElementText('hero-subtitle', content.heroSubtitle);
    setElementText('hero-cta-btn', content.heroCtaText);

    // 2. Social Links
    const socialNav = document.getElementById('social-links-nav');
    if (socialNav && content.socialLinks) {
        // Ensure socialLinks is parsed if it's a string
        let socialLinks = [];
        if (typeof content.socialLinks === 'string') {
            socialLinks = JSON.parse(content.socialLinks);
        } else {
            socialLinks = content.socialLinks;
        }
        
        socialNav.innerHTML = socialLinks.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.name}" class="btn btn-icon">
                <i class="icon-${link.name.toLowerCase()}"></i>
            </a>
        `).join('');
    }

    // 3. Pain Points (Market Lack)
    setElementText('pain-title', content.painPointsTitle); // Use painPointsTitle
    const painGrid = document.getElementById('pain-grid');
    if (painGrid) {
        // Manually build from individual keys
        painGrid.innerHTML = `
            <div class="card fade-in">
                <h3>${content.painPoint1Title || ''}</h3>
                <p>${content.painPoint1Text || ''}</p>
            </div>
            <div class="card fade-in">
                <h3>${content.painPoint2Title || ''}</h3>
                <p>${content.painPoint2Text || ''}</p>
            </div>
            <div class="card fade-in">
                <h3>${content.painPoint3Title || ''}</h3>
                <p>${content.painPoint3Text || ''}</p>
            </div>
        `;
    }

    // 4. "How It Works" Section
    setElementText('how-title', content.howItWorksTitle); // Use howItWorksTitle
    const howGrid = document.getElementById('how-grid');
    if (howGrid) {
        // Manually build from individual keys
        // Note: The SVGs are hardcoded here, you can move them to the sheet if needed
        howGrid.innerHTML = `
            <div class="how-step-card fade-in">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <h3>${content.howItWorksStep1Title || ''}</h3>
                <p>${content.howItWorksStep1Text || ''}</p>
            </div>
            <div class="how-step-card fade-in">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                <h3>${content.howItWorksStep2Title || ''}</h3>
                <p>${content.howItWorksStep2Text || ''}</p>
            </div>
            <div class="how-step-card fade-in">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"></path><path d="M12 16.5V12"></path><path d="M12 8.5h.01"></path></svg>
                <h3>${content.howItWorksStep3Title || ''}</h3>
                <p>${content.howItWorksStep3Text || ''}</p>
            </div>
        `;
    }

    // 5. "Why Join?" (Benefits) Section
    setElementText('why-title', content.whyJoinTitle); // Use whyJoinTitle
    const whyGrid = document.getElementById('why-grid');
    if (whyGrid) {
        // Manually build from individual keys
        whyGrid.innerHTML = `
            <li class="fade-in">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p><strong>${content.whyJoinBenefit1Title || ''}:</strong> ${content.whyJoinBenefit1Text || ''}</p>
            </li>
            <li class="fade-in">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p><strong>${content.whyJoinBenefit2Title || ''}:</strong> ${content.whyJoinBenefit2Text || ''}</p>
            </li>
            <li class="fade-in">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-check"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <p><strong>${content.whyJoinBenefit3Title || ''}:</strong> ${content.whyJoinBenefit3Text || ''}</p>
            </li>
        `;
    }
    
    // 6. Mission Section
    setElementText('mission-title', content.aboutTitle); // Use aboutTitle
    setElementText('mission-text', content.aboutText); // Use aboutText

    // 7. Partners Section
    setElementText('partners-title', content.partnersTitle);
    const partnersGrid = document.getElementById('partners-logo-grid');
    if (partnersGrid && content.partnersLogos) { // Use partnersLogos
        let partners = [];
        if (typeof content.partnersLogos === 'string') {
            partners = JSON.parse(content.partnersLogos);
        } else {
            partners = content.partnersLogos;
        }

        partnersGrid.innerHTML = partners.map(partner => `
            <div class="partner-logo fade-in" title="${partner.name}">
                <img src="${partner.logoUrl}" alt="${partner.name} Logo">
            </div>
        `).join('');
    }

    // 8. Survey Section
    setElementText('survey-title', content.formTitle); // Use formTitle
    setElementText('survey-subtitle', content.formSubtitle); // Use formSubtitle

    // 9. Final CTA
    setElementText('final-cta-title', content.finalCtaTitle);
    setElementText('final-cta-subtitle', content.finalCtaSubtitle);
    const finalCtaLinks = document.getElementById('final-cta-links');
    if (finalCtaLinks && content.socialLinks) { // We can re-use the socialLinks variable from above
        let socialLinks = [];
        if (typeof content.socialLinks === 'string') {
            socialLinks = JSON.parse(content.socialLinks);
        } else {
            socialLinks = content.socialLinks;
        }

         finalCtaLinks.innerHTML = socialLinks.map(link => `
            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
                Follow on ${link.name}
            </a>
        `).join('');
    }
    
    // 10. Footer
    setElementText('footer-text', content.footerText);
}

/**
 * Helper to set text content of an element by ID.
 */
function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text || '';
    }
}

/**
* Applies dynamic colors from the sheet to the :root.
* (FIXED to match the user's colorTheme object)
*/
function applyColors(colors) {
    const root = document.documentElement;
    const colorMap = {
        'colorBgDark': colors.bgDark,
        'colorBgDarkSurface': colors.bgDarkSurface,
        'colorTextLight': colors.textLight,
        'colorTextLightSecondary': colors.textLightSecondary,
        'colorBorder': colors.bgDarkSurface, // Use a derived value
        'colorAccent': colors.primaryYellow,
        'colorPrimaryBlue': colors.primaryBlue,
        'colorPrimaryRed': colors.primaryRed,
        'colorPrimaryOrange': colors.primaryOrange,
        'colorPrimaryYellow': colors.primaryYellow,
        'colorPrimaryGreen': colors.primaryGreen
    };
    
    for (const [key, value] of Object.entries(colorMap)) {
        if (value) {
            // Converts 'colorBgDark' to '--color-bg-dark'
            const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
            root.style.setProperty(cssVar, value);
        }
    }
}

// ===============================
// 2. FORM & SURVEY LOGIC
// ===============================

function initFormLogic() {
    const surveyForm = document.getElementById('survey-form');
    const formSteps = document.querySelectorAll('.form-step');
    const nextBtn = document.getElementById('form-next-btn');
    const prevBtn = document.getElementById('form-prev-btn');
    const submitBtn = document.getElementById('form-submit-btn');
    const personaCards = document.querySelectorAll('.persona-card');
    const formProgress = document.getElementById('form-progress-steps');

    let currentStep = 0;
    let selectedPersona = '';

    // Step 1: Persona Selection
    personaCards.forEach(card => {
        card.addEventListener('click', () => {
            selectedPersona = card.dataset.persona;
            document.getElementById('selected-persona-input').value = selectedPersona;
            
            // Update UI
            personaCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            // Update next button
            nextBtn.disabled = false;
            setElementText('form-next-btn', `Continue as ${selectedPersona.charAt(0).toUpperCase() + selectedPersona.slice(1)}`);

            // Show persona title on next step
            setElementText('persona-specific-title', `${selectedPersona.charAt(0).toUpperCase() + selectedPersona.slice(1)} Questions`);
        });
    });

    // Next Button Click
    nextBtn.addEventListener('click', () => {
        if (currentStep === 0) {
            // Show the correct set of questions for the persona
            ['creator', 'business', 'enthusiast'].forEach(persona => {
                document.getElementById(`persona-${persona}-questions`).style.display = (persona === selectedPersona) ? 'block' : 'none';
            });
        }
        
        if (currentStep < formSteps.length - 1) {
            goToStep(currentStep + 1);
        }
    });

    // Prev Button Click
    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            goToStep(currentStep - 1);
        }
    });

    // Form Submission
    surveyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (currentStep === formSteps.length - 1) {
            submitForm(surveyForm, submitBtn);
        }
    });

    // Step Navigation Function
    function goToStep(stepIndex) {
        formSteps[currentStep].classList.remove('active');
        formSteps[stepIndex].classList.add('active');
        currentStep = stepIndex;

        // Update button visibility
        prevBtn.style.display = (currentStep > 0) ? 'inline-block' : 'none';
        nextBtn.style.display = (currentStep < formSteps.length - 1) ? 'inline-block' : 'none';
        submitBtn.style.display = (currentStep === formSteps.length - 1) ? 'inline-block' : 'none';

        // Update progress bar
        const progressSteps = formProgress.querySelectorAll('li');
        progressSteps.forEach((step, index) => {
            if (index < currentStep) {
                step.className = 'complete';
            } else if (index === currentStep) {
                step.className = 'active';
            } else {
                step.className = '';
            }
        });
    }

    goToStep(0); // Initialize
}

/**
 * Submits the form data to the Google Apps Script.
 */
function submitForm(form, submitBtn) {
    const formData = new FormData(form);
    const data = {};
    
    // Set initial button text
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // 1. Basic Fields
    data.name = formData.get('name');
    data.email = formData.get('email');
    data.persona = formData.get('persona');
    data.message = formData.get('message');
    data.environment = formData.get('environment');

    // 2. Persona-Specific Fields
    if (data.persona === 'creator') {
        data.creator_experience = formData.get('creator_experience');
        data.creator_income = formData.get('creator_income');
        data.creator_challenges = formData.getAll('creator_challenges');
    } else if (data.persona === 'business') {
        data.business_type = formData.get('business_type');
        data.business_reach = formData.get('business_reach');
        data.business_goals = formData.getAll('business_goals');
    } else if (data.persona === 'enthusiast') {
        data.enthusiast_interest = formData.getAll('enthusiast_interest');
        data.enthusiast_motivation = formData.get('enthusiast_motivation');
    }

    // 3. Send to Apps Script
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'cors', // Required for cross-origin
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        // --- CORS FIX ---
        // The response is text, not JSON, so we must parse it manually.
        return res.text();
    })
    .then(text => {
        // Check if text is empty or not valid JSON
        if (!text || (text.charAt(0) !== '{' && text.charAt(0) !== '[')) {
            console.error('Received non-JSON response from server:', text);
            throw new Error('Server returned an invalid response.');
        }
        
        const responseData = JSON.parse(text);
        
        if (responseData.status === 'success') {
            showMessage('✅ Thank you! Your survey has been submitted.', 'success');
            // Show the "Thank You" step
            document.getElementById('form-steps-container').style.display = 'none';
            document.getElementById('form-thank-you').style.display = 'block';
        } else {
            throw new Error(responseData.message || 'An unknown error occurred.');
        }
    })
    .catch(error => {
        console.error('Submission failed:', error);
        showMessage(`Submission failed: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
    });
}

// ===============================
// 3. UI HELPERS (Message Box)
// ===============================

/**
 * Shows a success or error message pop-up.
 */
function showMessage(message, type = 'info') {
    const msgBox = document.getElementById('message-box');
    const msgText = document.getElementById('message-text');
    const msgClose = document.getElementById('message-close-btn');

    msgText.textContent = message;
    msgBox.className = type; // 'success' or 'error'
    msgBox.classList.add('show');

    // Close button
    msgClose.onclick = () => msgBox.classList.remove('show');

    // Auto-hide
    setTimeout(() => {
        msgBox.classList.remove('show');
    }, 5000);
}

// ===============================
// 4. SCROLL ANIMATIONS
// ===============================

function initScrollAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1 // Trigger when 10% of the element is visible
    });

    fadeElements.forEach(el => {
        observer.observe(el);
    });
}


// ===============================
// 5. PARTICLE JS HERO
// ===============================

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let particlesArray = [];
    const particleCount = 70;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = canvas.parentElement.offsetHeight;

    // Particle properties
    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = 'rgba(253, 184, 19, 0.5)'; // Accent color
        }
        update() {
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
            this.x += this.speedX;
            this.y += this.speedY;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Initialize particles
    function init() {
        particlesArray = [];
        for (let i = 0; i < particleCount; i++) {
            particlesArray.push(new Particle());
        }
    }

    // Animation loop
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
        }
        requestAnimationFrame(animate);
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        init();
    });

    init();
    animate();
}




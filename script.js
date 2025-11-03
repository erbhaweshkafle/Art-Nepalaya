// ---------------------------------------------------------------------
// ArtNepalaya - script.js
// ---------------------------------------------------------------------
//
// IMPORTANT: Paste your Google Apps Script Web App URL here
//
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyLKmuN20Lh6ESYZD21PUOto6gg9jdP3MZfeCg2IBrxWNQngdzHuATSUgyeNPtZ9pf/exec';
//
// ---------------------------------------------------------------------


document.addEventListener('DOMContentLoaded', () => {
  // --- Get references to DOM elements ---
  const inquiryForm = document.getElementById('inquiryForm');
  const submitButton = document.getElementById('submit-button');
  const formMessage = document.getElementById('form-message');
  const loadingOverlay = document.getElementById('loading-overlay');
  
  /**
   * Fetches content from the Google Apps Script backend and renders it.
   */
  async function loadContent() {
    // Check if URL has been replaced
    if (APPS_SCRIPT_URL.includes('{{REPLACE_ME')) {
      console.error("ERROR: APPS_SCRIPT_URL has not been set in script.js.");
      showLoadingError("Developer error: Web App URL is not configured.");
      return;
    }

    try {
      // Fetch content from the ?action=getContent endpoint
      const response = await fetch(`${APPS_SCRIPT_URL}?action=getContent`);
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'success') {
        renderContent(data.content);
        hideLoadingOverlay();
      } else {
        throw new Error(data.message || 'Failed to parse content.');
      }

    } catch (error) {
      console.error('Failed to load content:', error);
      showLoadingError(`Failed to load site content. ${error.message}`);
    }
  }

  /**
   * Populates the webpage with content fetched from the Google Sheet.
   * @param {object} content - The content object from the backend.
   */
  function renderContent(content) {
    // 1. Render all [data-content] elements
    document.querySelectorAll('[data-content]').forEach(element => {
      const key = element.getAttribute('data-content');
      if (content[key]) {
        element.textContent = content[key];
      }
    });

    // 2. Render special cases: Social Links
    const socialNav = document.getElementById('social-nav');
    if (socialNav && content.socialLinks && Array.isArray(content.socialLinks)) {
      socialNav.innerHTML = ''; // Clear any existing links
      content.socialLinks.forEach(link => {
        socialNav.innerHTML += `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.name}</a>`;
      });
    }
    
    // 3. Apply theme colors
    if (content.colorTheme && typeof content.colorTheme === 'object') {
      const root = document.documentElement;
      const { primary, secondary, accent, bg, text } = content.colorTheme;
      if (primary) root.style.setProperty('--color-primary', primary);
      if (secondary) root.style.setProperty('--color-secondary', secondary);
      if (accent) root.style.setProperty('--color-accent', accent);
      if (bg) root.style.setProperty('--color-bg', bg);
      if (text) root.style.setProperty('--color-text', text);
    }
  }
  
  /**
   * Handles the survey form submission.
   * @param {Event} e - The form submission event.
   */
  async function handleFormSubmit(e) {
    e.preventDefault(); // Stop default form submission
    
    // Disable button and show loading text
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    showMessage('', 'clear'); // Clear previous messages

    try {
      // 1. Get all form data
      const formData = new FormData(inquiryForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        persona: formData.get('persona'),
        environment: formData.get('environment'),
        message: formData.get('message'),
        // Get all checked 'involvement' checkboxes
        involvement: Array.from(formData.getAll('involvement')),
      };

      // 2. Client-side validation (basic)
      if (!data.name || !data.email || !data.persona) {
        throw new Error('Please fill out all required fields (*).');
      }

      // 3. Send data to Google Apps Script
      // We use 'text/plain' to avoid a CORS pre-flight OPTIONS request
      // which Google Apps Script handles poorly.
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(data), // GAS will parse this string
        mode: 'cors',
      });

      const result = await response.json();

      if (result.status === 'success') {
        // Success!
        showMessage('Thank you! Your feedback has been submitted successfully.', 'success');
        inquiryForm.reset(); // Clear the form
      } else {
        // Error from the server
        throw new Error(result.message || 'An unknown error occurred.');
      }

    } catch (error) {
      // Error from fetch or client-side validation
      showMessage(error.message, 'error');
    } finally {
      // Re-enable the button
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Feedback';
    }
  }

  /**
   * Displays a message to the user in the form message box.
   * @param {string} message - The text to display.
   * @param {'success'|'error'|'clear'} type - The type of message.
   */
  function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = type; // 'success', 'error', or ''
  }
  
  /**
   * Hides the loading overlay.
   */
  function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
  }

  /**
   * Shows an error message in the loading overlay.
   * @param {string} message - The error message.
   */
  function showLoadingError(message) {
    const p = loadingOverlay.querySelector('p');
    const spinner = loadingOverlay.querySelector('.spinner');
    if (p) p.textContent = message;
    if (spinner) spinner.style.display = 'none';
    loadingOverlay.style.backgroundColor = 'var(--color-error)';
    loadingOverlay.style.color = 'white';
  }

  // --- Initialize ---
  
  // 1. Add form submit listener
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', handleFormSubmit);
  }
  
  // 2. Load the initial page content
  loadContent();
  
});

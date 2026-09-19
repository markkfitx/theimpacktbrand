class PasswordCountdown {
  constructor() {
    this.timers = document.querySelectorAll('.password-countdown__timer[data-countdown-date]');
    this.init();
  }

  init() {
    // Initialize countdown timers
    this.timers.forEach(timer => {
      const countdownDate = timer.getAttribute('data-countdown-date');
      if (countdownDate) {
        this.startCountdown(timer, countdownDate);
      }
    });

    // Open password modal automatically if not already authenticated
    this.initPasswordModal();
  }

  initPasswordModal() {
    // Find the modal details element - it could be inside password-modal or directly in the DOM
    const modalDetails = document.querySelector('[data-password-modal]') || 
                         document.querySelector('.password-popup-modal');
    
    if (!modalDetails) {
      console.warn('Password modal not found');
      return;
    }

    // Check if user is already authenticated (has access)
    const isAuthenticated = document.cookie.includes('storefront_digest') || 
                           document.cookie.includes('_shopify_y');
    
    // Only auto-open if not authenticated and modal is not already open
    if (!isAuthenticated && !modalDetails.hasAttribute('open')) {
      // Small delay to ensure smooth page load
      setTimeout(() => {
        modalDetails.setAttribute('open', '');
      }, 500);
    }

    // Close modal when clicking overlay
    const overlay = document.querySelector('.password-popup-modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        // Only close if clicking the overlay itself, not the content
        if (e.target === overlay) {
          modalDetails.removeAttribute('open');
        }
      });
    }

    // Close button handler
    const closeButton = document.querySelector('[data-close-modal]');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        modalDetails.removeAttribute('open');
      });
    }

    // Open button handler (for navigation button) - use event delegation for reliability
    document.addEventListener('click', (e) => {
      const openButton = e.target.closest('[data-open-password-modal]');
      if (openButton) {
        e.preventDefault();
        e.stopPropagation();
        modalDetails.setAttribute('open', '');
        // Also trigger a custom event in case the details element needs it
        modalDetails.dispatchEvent(new Event('toggle', { bubbles: true }));
      }
    });

    // Store reference for external access if needed
    window.passwordModalDetails = modalDetails;
  }

  startCountdown(timerElement, targetDateString) {
    const targetDate = new Date(targetDateString).getTime();
    
    const daysElement = timerElement.querySelector('[data-days]');
    const hoursElement = timerElement.querySelector('[data-hours]');
    const minutesElement = timerElement.querySelector('[data-minutes]');
    const secondsElement = timerElement.querySelector('[data-seconds]');

    if (!daysElement || !hoursElement || !minutesElement || !secondsElement) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        // Countdown has ended
        daysElement.textContent = '00';
        hoursElement.textContent = '00';
        minutesElement.textContent = '00';
        secondsElement.textContent = '00';
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      daysElement.textContent = this.padNumber(days);
      hoursElement.textContent = this.padNumber(hours);
      minutesElement.textContent = this.padNumber(minutes);
      secondsElement.textContent = this.padNumber(seconds);
    };

    // Update immediately
    updateCountdown();

    // Update every second
    setInterval(updateCountdown, 1000);
  }

  padNumber(number) {
    return number.toString().padStart(2, '0');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PasswordCountdown();
  });
} else {
  new PasswordCountdown();
}


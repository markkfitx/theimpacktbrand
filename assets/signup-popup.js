(function () {
  const KLAVIYO_ENDPOINT = 'https://a.klaviyo.com/client/subscriptions/';
  const PUBLIC_API_KEY = 'St3hS5';
  const LIST_ID = 'SRLhrU';
  const REVISION = '2024-07-15';
  const MIN_SUBMIT_INTERVAL_MS = 1500;
  const REQUEST_TIMEOUT_MS = 15000;
  const EMAIL_PATTERN =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const NAME_PATTERN = /^[\p{L}\p{M}\s'\-.]+$/u;
  const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
  const SUCCESS_CLOSE_DELAY_MS = 2500;

  const popup = document.getElementById('signup-form-wrapper');
  const form = document.getElementById('signup_form');
  const closeButton = document.getElementById('signup-form-close');
  const submitButton = form ? form.querySelector('[type="submit"]') : null;
  const honeypot = document.getElementById('SignupForm-company');
  const statusEl = document.getElementById('signup-form-status');
  const successEl = document.getElementById('signup-form-success');

  if (!popup || !form || !closeButton || !successEl) return;

  let activeController = null;
  let requestId = 0;
  let lastSubmitAt = 0;
  let autoCloseTimer = null;

  function setStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message || '';
    statusEl.classList.remove('signup-form__status--error');
    if (type === 'error') statusEl.classList.add('signup-form__status--error');
  }

  function sanitizeText(value, maxLength) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .replace(/[<>]/g, '')
      .trim()
      .slice(0, maxLength);
  }

  function getFieldValue(id, maxLength) {
    const field = document.getElementById(id);
    if (!field) return '';
    return sanitizeText(field.value, maxLength);
  }

  function abortActiveRequest() {
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }

  function clearAutoCloseTimer() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer);
      autoCloseTimer = null;
    }
  }

  function resetSuccessState() {
    form.classList.remove('is-success');
    successEl.hidden = true;
    successEl.setAttribute('aria-hidden', 'true');
  }

  function clearFormData() {
    clearAutoCloseTimer();
    requestId += 1;
    abortActiveRequest();
    form.reset();
    resetSuccessState();
    form.querySelectorAll('input, textarea, select').forEach(function (field) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.checked = false;
      } else if (field.type !== 'submit' && field.type !== 'button') {
        field.value = '';
      }
    });
    setStatus('');
    form.removeAttribute('aria-busy');
    if (submitButton) submitButton.disabled = false;
  }

  function openPopup() {
    clearAutoCloseTimer();
    resetSuccessState();
    popup.classList.remove('is-hidden');
    popup.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closePopup() {
    clearFormData();
    popup.classList.add('is-hidden');
    popup.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showSuccessAndClose() {
    setStatus('');
    if (submitButton) submitButton.disabled = true;
    successEl.hidden = false;
    successEl.setAttribute('aria-hidden', 'false');
    form.classList.add('is-success');
    clearAutoCloseTimer();
    autoCloseTimer = setTimeout(function () {
      autoCloseTimer = null;
      closePopup();
    }, SUCCESS_CLOSE_DELAY_MS);
  }

  function validatePayload(data) {
    if (!data.email || !EMAIL_PATTERN.test(data.email) || data.email.length > 254) {
      return 'Please enter a valid email address.';
    }
    if (!data.firstName || data.firstName.length < 1 || !NAME_PATTERN.test(data.firstName)) {
      return 'Please enter a valid first name.';
    }
    if (!data.lastName || data.lastName.length < 1 || !NAME_PATTERN.test(data.lastName)) {
      return 'Please enter a valid last name.';
    }
    if (data.phone && !PHONE_PATTERN.test(data.phone)) {
      return 'Please enter a valid phone number.';
    }

    const requiredChecks = form.querySelectorAll('input[type="checkbox"][required]');
    for (let i = 0; i < requiredChecks.length; i++) {
      if (!requiredChecks[i].checked) {
        return 'Please accept the required acknowledgement.';
      }
    }

    return null;
  }

  async function submitSignup(event) {
    event.preventDefault();

    if (honeypot && honeypot.value) {
      setStatus('Unable to submit right now. Please try again later.', 'error');
      return;
    }

    const now = Date.now();
    if (now - lastSubmitAt < MIN_SUBMIT_INTERVAL_MS && activeController) {
      // Allow resubmit by aborting the in-flight request below.
    } else if (now - lastSubmitAt < MIN_SUBMIT_INTERVAL_MS) {
      setStatus('Please wait a moment before submitting again.', 'error');
      return;
    }

    const data = {
      firstName: getFieldValue('SignupForm-first_name', 100),
      lastName: getFieldValue('SignupForm-last_name', 100),
      email: getFieldValue('SignupForm-email', 254).toLowerCase(),
      phone: getFieldValue('SignupForm-phone', 20),
    };

    const validationError = validatePayload(data);
    if (validationError) {
      setStatus(validationError, 'error');
      return;
    }

    abortActiveRequest();
    activeController = new AbortController();
    const currentRequestId = ++requestId;
    const { signal } = activeController;
    const timeoutId = setTimeout(function () {
      if (currentRequestId === requestId) {
        abortActiveRequest();
      }
    }, REQUEST_TIMEOUT_MS);

    lastSubmitAt = now;
    form.setAttribute('aria-busy', 'true');
    setStatus('Submitting…');

    const profileAttributes = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
    };
    if (data.phone) profileAttributes.phone_number = data.phone;

    const payload = {
      data: {
        type: 'subscription',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: profileAttributes,
            },
          },
        },
        relationships: {
          list: {
            data: {
              type: 'list',
              id: LIST_ID,
            },
          },
        },
      },
    };

    try {
      const response = await fetch(
        KLAVIYO_ENDPOINT + '?company_id=' + encodeURIComponent(PUBLIC_API_KEY),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            revision: REVISION,
          },
          body: JSON.stringify(payload),
          signal: signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          cache: 'no-store',
        }
      );

      if (currentRequestId !== requestId) return;

      if (!response.ok) {
        throw new Error('request_failed');
      }

      if (honeypot) honeypot.value = '';
      form.reset();
      showSuccessAndClose();
    } catch (error) {
      if (currentRequestId !== requestId) return;
      if (error && error.name === 'AbortError') {
        setStatus('Request timed out. Please try again.', 'error');
        return;
      }
      setStatus('Something went wrong. Please try again.', 'error');
    } finally {
      clearTimeout(timeoutId);
      if (currentRequestId === requestId) {
        activeController = null;
        form.removeAttribute('aria-busy');
      }
    }
  }

  form.addEventListener('submit', submitSignup);
  closeButton.addEventListener('click', closePopup);
  window.openSignupPopup = openPopup;
  window.closeSignupPopup = closePopup;
})();

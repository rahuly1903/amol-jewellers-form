const PHONE = /^[6-9]\d{9}$/;
const PINCODE = /^[1-9]\d{5}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_URL = /^https?:\/\/\S+$/i;

function clean(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

function normalizePhone(value) {
  let phone = clean(value, 16).replace(/[\s()-]/g, '');
  if (phone.startsWith('+91')) phone = phone.slice(3);
  else if (phone.startsWith('91') && phone.length === 12) phone = phone.slice(2);
  else if (phone.startsWith('0') && phone.length === 11) phone = phone.slice(1);
  return phone;
}

function validateEnquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Invalid enquiry' };
  }

  if (clean(body.company, 200)) {
    return { honeypot: true };
  }

  const name = clean(body.name, 80);
  const phone = normalizePhone(body.phone);
  const email = clean(body.email, 254).toLowerCase();
  const pincode = clean(body.pincode, 6);
  const comments = clean(body.comments, 1000);
  const pageUrl = clean(body.pageUrl, 500);

  if (!name) return { error: 'Name is required' };
  if (!PHONE.test(phone)) return { error: 'Enter a 10-digit mobile number' };
  if (!EMAIL.test(email)) return { error: 'Enter a valid email address' };
  if (!PINCODE.test(pincode)) return { error: 'Enter a valid 6-digit pincode' };
  if (pageUrl && !PAGE_URL.test(pageUrl)) return { error: 'Invalid page URL' };

  return {
    value: {
      name,
      phone,
      email,
      pincode,
      comments,
      pageUrl
    }
  };
}

module.exports = { validateEnquiry };

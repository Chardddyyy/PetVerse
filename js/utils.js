// =====================================================
// utils.js — ES Module: Reusable utility functions
// =====================================================

// Shows a toast notification at the bottom right
export function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Smoothly scrolls to a section by its id
export function scrollToSection(id) {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

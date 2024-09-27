
document.addEventListener('DOMContentLoaded', function () {
  const logoutButton = document.getElementById('logoutButton');
  const logoutModal = document.getElementById('logoutModal');
  const confirmLogout = document.getElementById('confirmLogout');
  const cancelLogout = document.getElementById('cancelLogout');

  if (logoutButton) {
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      logoutModal.style.display = 'block'; // Show the modal
    });
  }

  confirmLogout.addEventListener('click', function () {
    // Redirect to the logout route if user confirms
    window.location.href = '/logout'; // Adjust the path if needed
  });

  cancelLogout.addEventListener('click', function () {
    // Hide the modal
    logoutModal.style.display = 'none';
  });

  // Close modal when clicking outside of the modal content
  window.addEventListener('click', function (event) {
    if (event.target === logoutModal) {
      logoutModal.style.display = 'none';
    }
  });
});

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', function () {
    // Select all alert elements
    const alerts = document.querySelectorAll('.alert-danger, .alert-success');
  
    alerts.forEach(alert => {
      // Set a timeout to start the fade-out animation
      setTimeout(() => {
        alert.classList.add('fade-out');
        
        // After the animation completes (1 second), remove the element
        setTimeout(() => {
          alert.remove();
        }, 1000); // Match this time with your CSS transition duration
      }, 2000); // Delay before fade-out starts (2 seconds)
    });
  });
  
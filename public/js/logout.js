function logout() {
    fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => {
            if (response.ok) {
                window.location.href = '/'; // Redirect to login page
            }
        })
        .catch(error => {
            console.error('Logout failed:', error);
        });
}
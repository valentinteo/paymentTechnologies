document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', event => {
      const productId = event.target.dataset.id;
  
      fetch(`/cart/add/${productId}`, {
        method: 'POST',
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // Update cart count
            const cartCount = document.getElementById('cart-count');
            cartCount.textContent = data.cartCount; // Update badge with new count
          } else {
            alert(data.message || 'Failed to add to cart');
          }
        })
        .catch(error => console.error('Error:', error));
    });
  });
  
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyATGZZIFmo63NoKmREdQmF4_2JJMlm6pQM",
    authDomain: "flora-de713.firebaseapp.com",
    projectId: "flora-de713",
    storageBucket: "flora-de713.firebasestorage.app",
    messagingSenderId: "993675243646",
    appId: "1:993675243646:web:57f9c90cc9d9c0251ee82f",
    measurementId: "G-DNZ03J2EL8"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==================== FIRESTORE CRUD OPERATIONS ====================

// Add a product to Firestore
async function addProduct(product) {
    try {
        const docRef = await db.collection("products").add({
            ...product,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Product added with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error adding product:", error);
        throw error;
    }
}

// Get all products from Firestore
async function getProducts() {
    try {
        const snapshot = await db.collection("products").get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error getting products:", error);
        throw error;
    }
}

// Get a single product by ID
async function getProduct(productId) {
    try {
        const doc = await db.collection("products").doc(productId).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
        console.error("Error getting product:", error);
        throw error;
    }
}

// Update a product
async function updateProduct(productId, updates) {
    try {
        await db.collection("products").doc(productId).update(updates);
        console.log("Product updated successfully");
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}

// Delete a product
async function deleteProduct(productId) {
    try {
        await db.collection("products").doc(productId).delete();
        console.log("Product deleted successfully");
    } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
}

// Listen to real-time product updates
function listenToProducts(callback) {
    return db.collection("products").onSnapshot(
        snapshot => {
            const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(products);
        },
        error => {
            console.error("Error fetching products:", error);
            // Hide loading and show error
            const loading = document.getElementById('productsLoading');
            if (loading) {
                loading.innerHTML = `
                    <div style="color: #dc3545;">
                        <p>⚠️ Error loading products</p>
                        <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
                        <p style="font-size: 12px; margin-top: 5px;">Check browser console for details</p>
                    </div>
                `;
            }
        }
    );
}

// ==================== END FIRESTORE OPERATIONS ====================

// ==================== PRODUCT DISPLAY ====================

// Category to emoji mapping
const categoryEmojis = {
    'roses': '🌹',
    'tulips': '🌷',
    'lilies': '🌺',
    'orchids': '🪻',
    'sunflowers': '🌻',
    'mixed': '💐',
    'seasonal': '🌼',
    'plants': '🌿',
    'accessories': '🎀',
    'default': '🌸'
};

// Get emoji for category
function getCategoryEmoji(category) {
    return categoryEmojis[category?.toLowerCase()] || categoryEmojis['default'];
}

// Create product card HTML
function createProductCard(product) {
    const emoji = getCategoryEmoji(product.category);
    const imageHtml = product.imageUrl
        ? `<img src="${product.imageUrl}" alt="${product.name}" class="product-img">`
        : `<div class="image-placeholder">${emoji}</div>`;

    const badgeHtml = product.quantity <= 5 && product.quantity > 0
        ? '<span class="product-badge">Low Stock</span>'
        : product.quantity === 0
            ? '<span class="product-badge out-of-stock">Out of Stock</span>'
            : '';

    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                ${imageHtml}
                ${badgeHtml}
            </div>
            <div class="product-info">
                <span class="product-category">${product.category || 'Flowers'}</span>
                <h3>${product.name}</h3>
                <p>${product.description || ''}</p>
                <div class="product-footer">
                    <span class="price">$${product.price?.toFixed(2) || '0.00'}</span>
                    <button class="add-to-cart" 
                        onclick="addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price})"
                        ${product.quantity === 0 ? 'disabled' : ''}>
                        ${product.quantity === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render all products to the grid
function renderProducts(products) {
    const grid = document.getElementById('productsGrid');
    const loading = document.getElementById('productsLoading');
    const empty = document.getElementById('productsEmpty');

    if (!grid) return; // Not on main page

    // Hide loading
    if (loading) loading.style.display = 'none';

    if (products.length === 0) {
        // Show empty state
        if (empty) empty.style.display = 'block';
        grid.innerHTML = '';
        return;
    }

    // Hide empty state and render products
    if (empty) empty.style.display = 'none';
    grid.innerHTML = products.map(createProductCard).join('');
}

// Initialize products display with real-time updates
function initProductsDisplay() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return; // Not on main page

    // Listen for real-time updates
    listenToProducts((products) => {
        console.log('Products updated:', products.length, 'items');
        renderProducts(products);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProductsDisplay);

// ==================== END PRODUCT DISPLAY ====================

// Cart functionality
let cart = [];

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartCount();
    showNotification(`${name} added to cart!`);
}

function updateCartCount() {
    document.getElementById('cartCount').textContent = cart.length;
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 25px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Modal functionality
const modal = document.getElementById('cartModal');
const cartBtn = document.getElementById('cartBtn');
const closeBtn = document.querySelector('.close');

cartBtn.onclick = function () {
    displayCart();
    modal.style.display = 'block';
}

closeBtn.onclick = function () {
    modal.style.display = 'none';
}

window.onclick = function (event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

function displayCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalSpan = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Your cart is empty</p>';
        cartTotalSpan.textContent = '0.00';
        return;
    }

    let total = 0;
    cartItemsDiv.innerHTML = '';

    cart.forEach((item, index) => {
        total += item.price;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <span>${item.name}</span>
            <div>
                <span style="margin-right: 15px; color: #d4a5a5; font-weight: bold;">$${item.price.toFixed(2)}</span>
                <button onclick="removeFromCart(${index})" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">Remove</button>
            </div>
        `;
        cartItemsDiv.appendChild(itemDiv);
    });

    cartTotalSpan.textContent = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    displayCart();
    showNotification('Item removed from cart');
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Add animations on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
        }
    });
}, observerOptions);

document.querySelectorAll('.product-card').forEach(card => {
    card.style.opacity = '0';
    observer.observe(card);
});

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
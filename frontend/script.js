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
const auth = firebase.auth();

// ==================== AUTH STATE MANAGEMENT ====================
auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
});

function updateAuthUI(user) {
    const authLinks = document.getElementById('authLinks');
    if (!authLinks) return;

    if (user) {
        // User is logged in
        const displayName = user.displayName || user.email.split('@')[0];
        const initials = displayName.charAt(0).toUpperCase();

        authLinks.innerHTML = `
            <div class="user-dropdown">
                <button class="user-btn" onclick="toggleDropdown()">
                    <span class="user-avatar">${initials}</span>
                    <span>${displayName}</span>
                    <i class="fas fa-chevron-down" style="font-size: 10px;"></i>
                </button>
                <div class="dropdown-menu" id="userDropdown">
                    <a href="#"><i class="fas fa-user"></i> My Profile</a>
                    <a href="#" onclick="openMyOrders(event)"><i class="fas fa-shopping-bag"></i> My Orders</a>
                    <div class="divider"></div>
                    <button onclick="logoutUser()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                </div>
            </div>
        `;
    } else {
        // User is logged out
        authLinks.innerHTML = `
            <a href="frontend/login.html" class="auth-link"><i class="fas fa-user"></i> Login</a>
        `;
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userBtn = e.target.closest('.user-btn');
    if (dropdown && !userBtn) {
        dropdown.classList.remove('active');
    }
});

async function logoutUser() {
    try {
        await auth.signOut();
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// ==================== MY ORDERS ====================
function openMyOrders(event) {
    event.preventDefault();
    event.stopPropagation();

    // Close dropdown
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.classList.remove('active');

    // Open modal
    const modal = document.getElementById('ordersModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        loadUserOrders();
    }
}

function closeOrdersModal() {
    const modal = document.getElementById('ordersModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function loadUserOrders() {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    // Show loading
    container.innerHTML = `
        <div class="orders-loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Loading your orders...</p>
        </div>
    `;

    try {
        const user = auth.currentUser;
        if (!user) {
            container.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-sign-in-alt"></i>
                    <p>Please login to view your orders</p>
                </div>
            `;
            return;
        }

        // Fetch orders for current user (without orderBy to avoid needing composite index)
        const ordersSnapshot = await db.collection('orders')
            .where('userId', '==', user.uid)
            .get();

        if (ordersSnapshot.empty) {
            container.innerHTML = `
                <div class="no-orders">
                    <i class="fas fa-shopping-bag"></i>
                    <p>You haven't placed any orders yet</p>
                </div>
            `;
            return;
        }

        // Collect orders and sort by createdAt descending (client-side)
        let orders = [];
        ordersSnapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
        });

        // Sort by createdAt descending (newest first)
        orders.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
            const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
            return dateB - dateA;
        });

        // Build orders HTML
        let ordersHTML = '';
        orders.forEach(order => {
            ordersHTML += createOrderCardHTML(order.id, order);
        });

        container.innerHTML = ordersHTML;

    } catch (error) {
        console.error('Error loading orders:', error);
        container.innerHTML = `
            <div class="no-orders">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading orders. Please try again.</p>
            </div>
        `;
    }
}

function createOrderCardHTML(orderId, order) {
    const status = order.status || 'pending';
    const createdAt = order.createdAt ? order.createdAt.toDate() : new Date();
    const formattedDate = createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Build items list
    let itemsHTML = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            itemsHTML += `
                <div class="order-item-row">
                    <span class="order-item-name">${item.name}</span>
                    <span class="order-item-price">Rs.${item.price}</span>
                </div>
            `;
        });
    }

    // Delivery address
    const addr = order.deliveryAddress || {};
    const addressHTML = `
        <p><strong>Name:</strong> ${addr.name || 'N/A'}</p>
        <p><strong>Phone:</strong> ${addr.phone || 'N/A'}</p>
        <p><strong>Address:</strong> ${addr.addressLine1 || ''} ${addr.addressLine2 || ''}</p>
        <p><strong>City:</strong> ${addr.city || 'N/A'} ${addr.postalCode || ''}</p>
        ${addr.specialInstructions ? `<p><strong>Notes:</strong> ${addr.specialInstructions}</p>` : ''}
    `;

    return `
        <div class="order-card status-${status}">
            <div class="order-header">
                <div class="order-id-date">
                    <span class="order-id-text">Order #${orderId.slice(-8).toUpperCase()}</span>
                    <span class="order-date">${formattedDate}</span>
                </div>
                <span class="order-status ${status}">${status}</span>
            </div>
            <div class="order-items-list">
                ${itemsHTML}
            </div>
            <div class="order-footer">
                <div class="order-total">Total: <span>Rs.${order.totalAmount || 0}</span></div>
                <button class="order-address-toggle" onclick="toggleOrderAddress(this)">
                    <i class="fas fa-map-marker-alt"></i> View Address
                </button>
            </div>
            <div class="order-address-details">
                ${addressHTML}
            </div>
        </div>
    `;
}

function toggleOrderAddress(button) {
    const addressDiv = button.closest('.order-card').querySelector('.order-address-details');
    if (addressDiv) {
        addressDiv.classList.toggle('show');
        const icon = button.querySelector('i');
        if (addressDiv.classList.contains('show')) {
            button.innerHTML = '<i class="fas fa-times"></i> Hide Address';
        } else {
            button.innerHTML = '<i class="fas fa-map-marker-alt"></i> View Address';
        }
    }
}

// Close orders modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('ordersModal');
    if (e.target === modal) {
        closeOrdersModal();
    }
});

// ==================== URL CONVERSION ====================
// Convert Google Drive links to direct image URLs
function convertToDirectUrl(url) {
    if (!url) return url;

    // Google Drive file link: https://drive.google.com/file/d/FILE_ID/view
    const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveFileMatch) {
        const fileId = driveFileMatch[1];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // Google Drive open link: https://drive.google.com/open?id=FILE_ID
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (driveOpenMatch) {
        const fileId = driveOpenMatch[1];
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    }

    // Already uses lh3 format or other direct URL
    return url;
}

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

// Store products globally for modal access
let allProducts = [];

// Category to emoji mapping
const categoryEmojis = {
    'scrunchies': '🎀',
    'keytags': '🔑',
    'hairclips': '💇',
    'flowerbouquets': '💐',
    'flowerpots': '🌸',
    'giftboxes': '🎁',
    'chocoboxes': '🍫',
    'chocobouquets': '🍬',
    'default': '🎀'
};

// Get emoji for category
function getCategoryEmoji(category) {
    return categoryEmojis[category?.toLowerCase()] || categoryEmojis['default'];
}

// Create product card HTML
function createProductCard(product) {
    const emoji = getCategoryEmoji(product.category);
    const hasMultipleImages = product.imageUrls && product.imageUrls.length > 1;

    // Convert image URL for display
    const displayImageUrl = convertToDirectUrl(product.imageUrl);
    const imageHtml = displayImageUrl
        ? `<img src="${displayImageUrl}" alt="${product.name}" class="product-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="image-placeholder" style="display:none;">${emoji}</div>`
        : `<div class="image-placeholder">${emoji}</div>`;

    const badgeHtml = product.quantity <= 5 && product.quantity > 0
        ? '<span class="product-badge">Low Stock</span>'
        : product.quantity === 0
            ? '<span class="product-badge out-of-stock">Out of Stock</span>'
            : '';

    // Color dots preview
    let colorsHtml = '';
    if (product.colors && product.colors.length > 0) {
        colorsHtml = `<div class="product-colors-preview">
            ${product.colors.slice(0, 4).map(c => `<span class="color-dot" style="background: ${c.hex};" title="${c.name}"></span>`).join('')}
            ${product.colors.length > 4 ? `<span class="color-more">+${product.colors.length - 4}</span>` : ''}
        </div>`;
    }

    // Multiple images indicator
    const multiImageBadge = hasMultipleImages ? `<span class="multi-image-badge"><i class="fas fa-images"></i> ${product.imageUrls.length}</span>` : '';

    return `
        <div class="product-card" data-id="${product.id}" onclick="openProductModal('${product.id}')">
            <div class="product-image">
                ${imageHtml}
                ${badgeHtml}
                ${multiImageBadge}
            </div>
            <div class="product-info">
                <span class="product-category">${product.category || 'Products'}</span>
                <h3>${product.name}</h3>
                <p>${product.description || ''}</p>
                ${colorsHtml}
                <div class="product-footer">
                    <span class="price">Rs.${product.price?.toFixed(0) || '0'}</span>
                    <button class="add-to-cart" 
                        onclick="event.stopPropagation(); addToCart('${product.name.replace(/'/g, "\\'")}', ${product.price})"
                        ${product.quantity === 0 ? 'disabled' : ''}>
                        ${product.quantity === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render all products to the grid by category
function renderProducts(products) {
    const container = document.getElementById('allCategorySections');
    const loading = document.getElementById('productsLoading');

    if (!container) return; // Not on main page

    // Store products globally
    allProducts = products;

    // Hide loading
    if (loading) loading.style.display = 'none';

    // Define all 8 categories in order with display names
    const categories = [
        { id: 'scrunchies', name: 'Scrunchies', emoji: '🎀' },
        { id: 'keytags', name: 'Keytags', emoji: '🔑' },
        { id: 'hairclips', name: 'Fancy Hair Clips', emoji: '💇' },
        { id: 'flowerbouquets', name: 'Flower Bouquets', emoji: '💐' },
        { id: 'flowerpots', name: 'Flower Pots', emoji: '🌸' },
        { id: 'giftboxes', name: 'Customized Gift Boxes', emoji: '🎁' },
        { id: 'chocoboxes', name: 'Customized Choco Boxes', emoji: '🍫' },
        { id: 'chocobouquets', name: 'Customized Choco Bouquets', emoji: '🍬' }
    ];

    // Group products by category
    const productsByCategory = {};
    categories.forEach(cat => productsByCategory[cat.id] = []);

    products.forEach(product => {
        const catId = product.category?.toLowerCase();
        if (productsByCategory[catId]) {
            productsByCategory[catId].push(product);
        }
    });

    // Build HTML for all categories
    let html = '';
    categories.forEach(category => {
        const categoryProducts = productsByCategory[category.id];

        html += `
            <div class="category-block" id="cat-${category.id}">
                <h3 class="category-title">${category.emoji} ${category.name}</h3>
                ${categoryProducts.length > 0
                ? `<div class="products-grid">${categoryProducts.map(createProductCard).join('')}</div>`
                : `<p class="no-products">No ${category.name.toLowerCase()} available yet</p>`
            }
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==================== PRODUCT MODAL ====================
let currentProduct = null;
let selectedColor = null;

function openProductModal(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    currentProduct = product;
    const modal = document.getElementById('productModal');
    const emoji = getCategoryEmoji(product.category);

    // Set basic info
    document.getElementById('modalName').textContent = product.name;
    document.getElementById('modalCategory').textContent = product.category || 'Products';
    document.getElementById('modalDescription').textContent = product.description || '';
    document.getElementById('modalPrice').textContent = `Rs.${product.price?.toFixed(0) || '0'}`;

    // Stock status
    const stockEl = document.getElementById('modalStock');
    if (product.quantity === 0) {
        stockEl.textContent = 'Out of Stock';
        stockEl.style.color = '#e74c3c';
    } else if (product.quantity <= 5) {
        stockEl.textContent = `Low Stock (${product.quantity} left)`;
        stockEl.style.color = '#e67e22';
    } else {
        stockEl.textContent = `Available (${product.quantity} in stock)`;
        stockEl.style.color = '#27ae60';
    }

    // Main image
    const mainImage = document.getElementById('modalMainImage');
    const rawImages = product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : (product.imageUrl ? [product.imageUrl] : []);

    // Convert all image URLs
    const images = rawImages.map(url => convertToDirectUrl(url));

    if (images.length > 0) {
        mainImage.innerHTML = `<img src="${images[0]}" alt="${product.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\'placeholder-emoji\\'>${emoji}</span>';">`;
    } else {
        mainImage.innerHTML = `<span class="placeholder-emoji">${emoji}</span>`;
    }

    // Thumbnails
    const thumbnails = document.getElementById('modalThumbnails');
    if (images.length > 1) {
        thumbnails.innerHTML = images.map((url, index) =>
            `<img src="${url}" alt="Image ${index + 1}" class="${index === 0 ? 'active' : ''}" onclick="setModalMainImage('${url}', this)">`
        ).join('');
        thumbnails.style.display = 'flex';
    } else {
        thumbnails.style.display = 'none';
    }

    // Colors
    const colorsSection = document.getElementById('modalColorsSection');
    const colorsContainer = document.getElementById('modalColors');

    if (product.colors && product.colors.length > 0) {
        colorsSection.style.display = 'block';
        selectedColor = product.colors[0];
        colorsContainer.innerHTML = product.colors.map((color, index) =>
            `<div class="color-option ${index === 0 ? 'selected' : ''}" 
                 style="background: ${color.hex};" 
                 title="${color.name}"
                 onclick="selectColor(${index}, this)"></div>`
        ).join('');
    } else {
        colorsSection.style.display = 'none';
    }

    // Add to cart button
    const addBtn = document.getElementById('modalAddToCart');
    addBtn.onclick = function () {
        const colorInfo = selectedColor ? ` (${selectedColor.name})` : '';
        addToCart(product.name + colorInfo, product.price);
    };
    addBtn.disabled = product.quantity === 0;
    addBtn.innerHTML = product.quantity === 0
        ? '<i class="fas fa-times"></i> Out of Stock'
        : '<i class="fas fa-shopping-cart"></i> Add to Cart';

    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    currentProduct = null;
    selectedColor = null;
}

function setModalMainImage(url, thumbEl) {
    const mainImage = document.getElementById('modalMainImage');
    mainImage.innerHTML = `<img src="${url}" alt="Product">`;

    // Update active state
    document.querySelectorAll('#modalThumbnails img').forEach(img => img.classList.remove('active'));
    thumbEl.classList.add('active');
}

function selectColor(index, el) {
    if (!currentProduct || !currentProduct.colors) return;

    selectedColor = currentProduct.colors[index];

    // Update selected state
    document.querySelectorAll('#modalColors .color-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
}

// Close modal when clicking outside
window.addEventListener('click', function (event) {
    const productModal = document.getElementById('productModal');
    if (event.target === productModal) {
        closeProductModal();
    }
});

// Close modal with Escape key
window.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeProductModal();
    }
});

// ==================== END PRODUCT MODAL ====================

// Initialize products display with real-time updates
function initProductsDisplay() {
    const container = document.getElementById('allCategorySections');
    if (!container) return; // Not on main page

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

// ==================== CHECKOUT & ORDER FUNCTIONALITY ====================
let checkoutData = {};
let confirmationResult = null;
let recaptchaVerifier = null;

function proceedToCheckout() {
    const user = auth.currentUser;

    if (!user) {
        showNotification('Please login to place an order');
        document.getElementById('cartModal').style.display = 'none';
        window.location.href = 'frontend/login.html';
        return;
    }

    if (cart.length === 0) {
        showNotification('Your cart is empty');
        return;
    }

    // Close cart modal and open checkout modal
    document.getElementById('cartModal').style.display = 'none';
    document.getElementById('checkoutModal').style.display = 'block';

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    // Reset to address step
    document.getElementById('addressStep').style.display = 'block';
    document.getElementById('successStep').style.display = 'none';

    // Display order summary
    displayOrderSummary();

    // Pre-fill user data
    loadUserDataForCheckout(user.uid);
}

function displayOrderSummary() {
    const summaryItems = document.getElementById('summaryItems');
    const summaryTotal = document.getElementById('summaryTotal');

    let total = 0;
    summaryItems.innerHTML = '';

    cart.forEach(item => {
        total += item.price;
        summaryItems.innerHTML += `
            <div class="summary-item">
                <span class="item-name">${item.name}</span>
                <span class="item-price">Rs.${item.price}</span>
            </div>
        `;
    });

    summaryTotal.textContent = total.toFixed(0);
}

async function loadUserDataForCheckout(userId) {
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('deliveryName').value = userData.fullName || '';
            document.getElementById('deliveryPhone').value = userData.phone || '';
            checkoutData.userPhone = userData.phone;
            checkoutData.userId = userId;
            checkoutData.userEmail = userData.email;
            checkoutData.userName = userData.fullName;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').style.display = 'none';
    // Restore body scroll
    document.body.style.overflow = '';
    // Reset OTP inputs
    const otpInputs = document.querySelectorAll('#checkoutOtpInputs input');
    otpInputs.forEach(input => input.value = '');
}

function showCheckoutError(message) {
    const errorEl = document.getElementById('checkoutError');
    errorEl.querySelector('span').textContent = message;
    errorEl.style.display = 'flex';
}

function hideCheckoutError() {
    document.getElementById('checkoutError').style.display = 'none';
}

// Initialize reCAPTCHA for phone verification
function initRecaptcha() {
    if (!recaptchaVerifier) {
        recaptchaVerifier = new firebase.auth.RecaptchaVerifier('addressForm', {
            'size': 'invisible',
            'callback': (response) => {
                // reCAPTCHA solved
            }
        });
    }
}

// Address form submission
document.addEventListener('DOMContentLoaded', function () {
    const addressForm = document.getElementById('addressForm');
    if (addressForm) {
        addressForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            hideCheckoutError();

            // Validate required fields
            const addressLine1 = document.getElementById('addressLine1').value.trim();
            const city = document.getElementById('city').value.trim();

            if (!addressLine1 || !city) {
                showCheckoutError('Please fill in all required fields');
                return;
            }

            // Collect address data
            checkoutData.address = {
                name: document.getElementById('deliveryName').value,
                phone: document.getElementById('deliveryPhone').value,
                addressLine1: addressLine1,
                addressLine2: document.getElementById('addressLine2').value,
                city: city,
                postalCode: document.getElementById('postalCode').value,
                specialInstructions: document.getElementById('specialInstructions').value
            };

            const submitBtn = addressForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="checkout-spinner"></span>';

            try {
                // Create order directly in Firestore
                const orderId = await createOrder();

                // Show success step
                document.getElementById('addressStep').style.display = 'none';
                document.getElementById('successStep').style.display = 'block';
                document.getElementById('orderId').textContent = orderId;

                // Clear cart
                cart = [];
                updateCartCount();

            } catch (error) {
                console.error('Error placing order:', error);
                showCheckoutError('Failed to place order. Please try again.');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>Confirm & Place Order</span>';
            }
        });
    }
});

// OTP input navigation
function moveOtpFocus(input, index) {
    const inputs = document.querySelectorAll('#checkoutOtpInputs input');
    if (input.value.length === 1 && index < 5) {
        inputs[index + 1].focus();
    }
}

// Verify OTP and place order
async function verifyOrderOTP() {
    const inputs = document.querySelectorAll('#checkoutOtpInputs input');
    let otp = '';
    inputs.forEach(input => otp += input.value);

    if (otp.length !== 6) {
        showCheckoutError('Please enter the complete 6-digit code');
        return;
    }

    const verifyBtn = document.querySelector('#otpStep .btn-primary');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="checkout-spinner"></span>';
    hideCheckoutError();

    try {
        // Verify OTP
        await confirmationResult.confirm(otp);

        // Create order in Firestore
        const orderId = await createOrder();

        // Show success
        document.getElementById('otpStep').style.display = 'none';
        document.getElementById('successStep').style.display = 'block';
        document.getElementById('orderId').textContent = orderId;

        // Clear cart
        cart = [];
        updateCartCount();

    } catch (error) {
        console.error('OTP verification error:', error);
        showCheckoutError('Invalid verification code. Please try again.');
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = '<span>Verify & Place Order</span>';
    }
}

// Create order in Firestore
async function createOrder() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);

    const orderData = {
        // User details
        userId: checkoutData.userId,
        userName: checkoutData.userName,
        userEmail: checkoutData.userEmail,
        userPhone: checkoutData.userPhone,

        // Delivery address
        deliveryAddress: {
            name: checkoutData.address.name,
            phone: checkoutData.address.phone,
            addressLine1: checkoutData.address.addressLine1,
            addressLine2: checkoutData.address.addressLine2,
            city: checkoutData.address.city,
            postalCode: checkoutData.address.postalCode,
            specialInstructions: checkoutData.address.specialInstructions
        },

        // Order details
        items: cart.map(item => ({
            name: item.name,
            price: item.price
        })),
        itemCount: cart.length,
        totalAmount: total,

        // Order status
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'cod', // Cash on delivery

        // Timestamps
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const orderRef = await db.collection('orders').add(orderData);
    return orderRef.id;
}

// Resend OTP
async function resendOrderOTP(e) {
    e.preventDefault();

    try {
        // Reset reCAPTCHA
        if (recaptchaVerifier) {
            recaptchaVerifier.clear();
            recaptchaVerifier = null;
        }
        initRecaptcha();

        confirmationResult = await auth.signInWithPhoneNumber(checkoutData.userPhone, recaptchaVerifier);
        showNotification('Verification code resent!');

        // Clear and focus OTP inputs
        const inputs = document.querySelectorAll('#checkoutOtpInputs input');
        inputs.forEach(input => input.value = '');
        inputs[0].focus();

    } catch (error) {
        console.error('Resend OTP error:', error);
        showCheckoutError('Failed to resend code. Please try again.');
    }
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
                <span style="margin-right: 15px; color: #d4a5a5; font-weight: bold;">Rs.${item.price.toFixed(0)}</span>
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
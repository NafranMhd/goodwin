// ===== GLOBAL VARIABLES =====
const BUSINESS_PHONE = '+94756272858';
const BUSINESS_PHONE_DISPLAY = '+94 75 627 2858';

let products = []; // Start empty, load from Firebase
let cart = JSON.parse(localStorage.getItem('goodwinCart')) || [];
let orders = []; // Start empty, load from Firebase
let isAdminLoggedIn = localStorage.getItem('goodwinAdminLoggedIn') === 'true';
let editingProductId = null;
let currentImageData = '';
let currentOrderId = null;
let selectedOrders = new Set();

// ===== INITIALIZATION =====
window.initApp = function () {
    if (isAdminLoggedIn) {
        showAdminDashboard();
    } else {
        showWebsite();
    }

    // Real-time listener for Products
    const productsQuery = window.query(window.collection(window.db, "products"), window.orderBy("id", "asc"));
    window.onSnapshot(productsQuery, (snapshot) => {
        products = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
        renderProducts();
        if (isAdminLoggedIn) {
            loadProductsTable();
            document.getElementById('totalProducts').textContent = products.length;
            loadLowStockTable();
        }
    }, (error) => {
        console.error("Error loading products:", error);
    });

    // Real-time listener for Orders
    const ordersQuery = window.query(window.collection(window.db, "orders"), window.orderBy("id", "desc"));
    window.onSnapshot(ordersQuery, (snapshot) => {
        orders = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
        if (isAdminLoggedIn) {
            loadAdminData();
        }
    }, (error) => {
        console.error("Error loading orders:", error);
    });

    updateCartBadge();
    setupEventListeners();
};

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Mobile menu toggle
    document.getElementById('mobileMenuBtn').addEventListener('click', function () {
        const nav = document.getElementById('mobileNav');
        nav.classList.toggle('hidden');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function (e) {
        const nav = document.getElementById('mobileNav');
        const menuBtn = document.getElementById('mobileMenuBtn');

        if (!nav.contains(e.target) && !menuBtn.contains(e.target) && !nav.classList.contains('hidden')) {
            nav.classList.add('hidden');
        }
    });

    // Navigation links (Desktop & Mobile)
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) showSection(section);

            // Close mobile menu if open
            document.getElementById('mobileNav').classList.add('hidden');

            // Update active states
            document.querySelectorAll('.nav-link').forEach(l => {
                // Remove active styling from all links
                l.classList.remove('text-yellow-400');
                if (l.querySelector('span.absolute')) {
                    l.querySelector('span.absolute').classList.remove('w-full');
                    l.querySelector('span.absolute').classList.add('w-0');
                }
            });

            // Add active styling to clicked/current section links
            document.querySelectorAll(`.nav-link[data-section="${section}"]`).forEach(l => {
                l.classList.add('text-yellow-400');
                if (l.querySelector('span.absolute')) {
                    l.querySelector('span.absolute').classList.remove('w-0');
                    l.querySelector('span.absolute').classList.add('w-full');
                }
            });
        });
    });

    // Admin login button logic
    document.getElementById('adminLoginBtn').addEventListener('click', function (e) {
        e.preventDefault();
        showAdminLogin();
        document.querySelector('.nav-link[data-section="home"]')?.classList.remove('text-yellow-400');
    });

    const mobileAdminBtn = document.getElementById('mobileAdminBtn');
    if (mobileAdminBtn) {
        mobileAdminBtn.addEventListener('click', function (e) {
            e.preventDefault();
            showAdminLogin();
            document.getElementById('mobileNav').classList.add('hidden');
        });
    }

    // Product Search & Filter (Auto-Update)
    const productSearch = document.getElementById('productSearchInput');
    const productFilter = document.getElementById('productFilterSelect');
    if (productSearch) {
        productSearch.addEventListener('input', loadProductsTable);
    }
    if (productFilter) {
        productFilter.addEventListener('change', loadProductsTable);
    }

    // Order Filter (Auto-Update)
    const orderFilter = document.getElementById('orderFilter');
    if (orderFilter) {
        orderFilter.addEventListener('change', loadOrdersTable);
    }

    // Back to website button
    document.getElementById('backToWebsite').addEventListener('click', function (e) {
        e.preventDefault();
        showWebsite();
    });

    // Login form
    document.getElementById('loginForm').addEventListener('submit', function (e) {
        e.preventDefault();
        adminLogin();
    });

    // Admin logout
    document.getElementById('adminLogout').addEventListener('click', adminLogout);

    // Setup admin listeners (once)
    setupAdminEventDelegation();

    // Refresh orders button (Static listener)
    const refreshBtn = document.getElementById('refreshOrdersBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadAdminData();
            showNotification('Orders refreshed!', 'success');
        });
    }

    // Listen for dashboard show to refresh data
    document.addEventListener('adminDashboardShown', function () {
        loadAdminData();
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            showTab(tabId);
        });
    });
}

// ===== ADMIN EVENT DELEGATION =====
function setupAdminEventDelegation() {
    // Use event delegation for the entire document to capture modal clicks
    document.addEventListener('click', function (e) {
        // Add product button
        if (e.target.closest('#addProductBtn')) {
            e.preventDefault();
            openProductModal();
        }

        // Save product button
        if (e.target.closest('#saveProductBtn')) {
            e.preventDefault();
            saveProduct();
        }

        // Save changes button (Edit)
        if (e.target.closest('#saveChangesBtn')) {
            e.preventDefault();
            saveProduct();
        }

        // Export buttons
        if (e.target.closest('#exportCsvBtn')) { exportProductsToCSV(); }
        if (e.target.closest('#exportPdfBtn')) { exportProductsToPDF(); }
        if (e.target.closest('#exportOrdersCsvBtn')) { exportOrdersToCSV(); }
        if (e.target.closest('#exportOrdersPdfBtn')) { exportOrdersToPDF(); }
        if (e.target.closest('#downloadOrderHistoryBtn')) { downloadAllOrders(); }
    });
}

// ===== ADMIN EVENT LISTENERS SETUP =====
// This function is no longer needed as its logic has been moved to setupEventListeners and setupAdminEventDelegation
// function setupAdminEventListeners() {
//     setupAdminEventDelegation();
//     // Refresh orders button
//     const refreshBtn = document.getElementById('refreshOrdersBtn');
//     if (refreshBtn) {
//         refreshBtn.addEventListener('click', function () {
//             loadAdminData();
//             showNotification('Orders refreshed!', 'success');
//         });
//     }
//     loadAdminData();
// }

// ===== WEBSITE FUNCTIONS =====
function showWebsite() {
    document.getElementById('website').classList.remove('hidden');
    document.getElementById('admin').classList.add('hidden');
    showSection('home');
    window.scrollTo(0, 0);
}

function showAdminLogin() {
    document.getElementById('website').classList.add('hidden');
    document.getElementById('admin').classList.remove('hidden');
    document.getElementById('adminLogin').classList.remove('hidden');
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('loginError').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('website').classList.add('hidden');
    document.getElementById('admin').classList.remove('hidden');
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');

    // Load admin data
    loadAdminData();

    // Trigger event to setup admin listeners
    const event = new Event('adminDashboardShown');
    document.dispatchEvent(event);
}

function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-slate-800', 'shadow-sm', 'ring-1', 'ring-black/5');
        btn.classList.add('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50');
    });

    const tab = document.getElementById(tabId + 'Tab');
    if (tab) {
        tab.classList.remove('hidden');
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (tabBtn) {
            tabBtn.classList.remove('text-slate-500', 'hover:text-slate-700', 'hover:bg-slate-200/50');
            tabBtn.classList.add('bg-white', 'text-slate-800', 'shadow-sm', 'ring-1', 'ring-black/5');
        }
    }

    if (tabId === 'orders') {
        loadOrdersTable();
    } else if (tabId === 'products') {
        loadProductsTable();
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));

    // Animate in
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
        // trigger reflow to restart animation if needed, or rely on CSS class
    }

    if (sectionId === 'products') {
        renderProducts();
    } else if (sectionId === 'cart') {
        renderCart();
    }

    window.scrollTo(0, 0);
}

// ===== PRODUCT FUNCTIONS =====
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const visibleProducts = products.filter(p => p.visible);

    if (visibleProducts.length === 0) {
        grid.innerHTML = `
        <div class="col-span-full text-center py-20">
            <div class="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <i class="fas fa-seedling text-4xl"></i>
            </div>
            <h3 class="text-xl font-bold text-slate-700 mb-2">No Products Available</h3>
            <p class="text-slate-500">Our stocks are refilling. Please check back soon!</p>
        </div>
        `;
        return;
    }

    visibleProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'group bg-white rounded-2xl shadow-soft hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border border-slate-100 flex flex-col h-full';

        const sizes = [
            { size: '5kg', price: Math.round(product.price * 0.2) },
            { size: '10kg', price: Math.round(product.price * 0.4) },
            { size: '25kg', price: product.price }
        ];

        const sizeHTML = sizes.map(s =>
            `<button class="bag-size flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 border border-transparent focus:outline-none" data-size="${s.size}" data-price="${s.price}">${s.size}</button>`
        ).join('');

        let imageHTML = product.image ?
            `<img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700">` :
            `<i class="fas fa-leaf text-4xl opacity-50"></i>`;

        // Dynamic background color for placeholder/type
        const typeColors = {
            'Samba': 'bg-green-50 text-green-700',
            'Basmati': 'bg-amber-50 text-amber-700',
            'Raw': 'bg-blue-50 text-blue-700',
            'Boiled': 'bg-purple-50 text-purple-700',
            'Red': 'bg-red-50 text-red-700'
        };
        const bgClass = product.image ? '' : (typeColors[product.type] || 'bg-slate-100 text-slate-500');

        card.innerHTML = `
            <div class="h-56 overflow-hidden relative ${bgClass} flex items-center justify-center">
                ${imageHTML}
                <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                    <span class="text-white text-sm font-medium px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/30">View Details</span>
                </div>
            </div>
            
            <div class="p-5 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">${product.type}</span>
                        <h3 class="text-lg font-bold text-slate-900 mt-1 leading-tight group-hover:text-primary-700 transition-colors">${product.name}</h3>
                    </div>
                </div>

                <div class="mt-auto">
                    <div class="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-xl border border-slate-100" id="size-container-${product.id}">
                        ${sizeHTML}
                    </div>

                    <div class="flex items-center justify-between gap-3">
                        <div class="product-price text-xl font-bold text-slate-900">
                            Rs.${product.price}
                        </div>
                        <button class="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary-900/20 hover:shadow-primary-900/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>
                           <i class="fas fa-cart-plus"></i> ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                    </div>
                </div>
            </div>
        `;

        grid.appendChild(card);

        // Size Selection Logic
        const sizeButtons = card.querySelectorAll('.bag-size');
        const priceDisplay = card.querySelector('.product-price');

        sizeButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                sizeButtons.forEach(b => {
                    b.classList.remove('bg-white', 'text-primary-700', 'shadow-sm', 'border-slate-200');
                    b.classList.add('text-slate-500', 'hover:bg-slate-200');
                });
                this.classList.remove('text-slate-500', 'hover:bg-slate-200');
                this.classList.add('bg-white', 'text-primary-700', 'shadow-sm', 'border-slate-200', 'active-size');

                const size = this.getAttribute('data-size');
                const price = this.getAttribute('data-price');
                priceDisplay.innerHTML = `Rs.${price} <span class="text-xs font-medium text-slate-400">/ ${size}</span>`;
            });
        });

        // Select first size by default
        if (sizeButtons.length > 0) {
            const firstBtn = sizeButtons[0];
            firstBtn.classList.add('bg-white', 'text-primary-700', 'shadow-sm', 'border-slate-200', 'active-size');
            const size = firstBtn.getAttribute('data-size');
            const price = firstBtn.getAttribute('data-price');
            priceDisplay.innerHTML = `Rs.${price} <span class="text-xs font-medium text-slate-400">/ ${size}</span>`;
        }
    });
}

// ===== CART FUNCTIONS =====
// ===== CART FUNCTIONS =====
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
        showNotification('Product is out of stock!', 'error');
        return;
    }

    const productCard = document.querySelector(`[onclick="addToCart(${productId})"]`).closest('.group');
    const selectedSizeBtn = productCard?.querySelector('.active-size');

    if (!selectedSizeBtn) {
        showNotification('Please select a bag size first', 'warning');
        return;
    }

    const size = selectedSizeBtn.getAttribute('data-size');
    const price = parseInt(selectedSizeBtn.getAttribute('data-price'));

    const existingItem = cart.find(item => item.productId === productId && item.size === size);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId,
            name: product.name,
            type: product.type,
            size,
            price,
            quantity: 1,
            image: product.image
        });
    }

    localStorage.setItem('goodwinCart', JSON.stringify(cart));
    updateCartBadge();
    showNotification(`${product.name} (${size}) added to cart!`, 'success');
}

function renderCart() {
    const cartContent = document.getElementById('cartContent');
    if (!cartContent) return;

    if (cart.length === 0) {
        cartContent.innerHTML = `
        <div class="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div class="inline-flex items-center justify-center w-24 h-24 bg-slate-50 rounded-full mb-6 text-slate-300">
                <i class="fas fa-shopping-cart text-4xl"></i>
            </div>
            <h3 class="text-2xl font-bold text-slate-800 mb-2">Your cart is empty</h3>
            <p class="text-slate-500 mb-8 max-w-sm mx-auto">Looks like you haven't added any rice to your cart yet.</p>
            <button class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3.5 rounded-xl font-bold transition shadow-lg shadow-primary-900/20 inline-flex items-center gap-2" onclick="showSection('products')">
            <i class="fas fa-arrow-left"></i> Browse Products
            </button>
        </div>
        `;
        return;
    }

    let total = 0;
    let itemsHTML = '';

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        itemsHTML += `
        <div class="flex flex-col sm:flex-row items-center gap-6 py-6 border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition duration-200 px-4 -mx-4">
            <div class="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `<i class="fas fa-leaf text-primary-600 text-2xl"></i>`}
            </div>
            
            <div class="flex-1 text-center sm:text-left">
                <h4 class="font-bold text-slate-900 text-lg">${item.name}</h4>
                <p class="text-sm text-slate-500 font-medium">${item.type} • ${item.size} • <span class="text-slate-700">Rs.${item.price}</span></p>
            </div>
            
            <div class="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200">
                <button class="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 transition" onclick="updateCartQuantity(${index}, -1)">
                    <i class="fas fa-minus text-xs"></i>
                </button>
                <span class="font-bold w-8 text-center text-slate-800">${item.quantity}</span>
                <button class="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 transition" onclick="updateCartQuantity(${index}, 1)">
                    <i class="fas fa-plus text-xs"></i>
                </button>
            </div>
            
            <div class="font-bold text-slate-900 min-w-[100px] text-right text-lg">Rs.${itemTotal}</div>
            
            <button class="text-red-400 hover:text-red-600 hover:bg-red-50 w-10 h-10 rounded-full transition flex items-center justify-center" onclick="removeFromCart(${index})">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        `;
    });

    cartContent.innerHTML = `
    <div class="lg:grid lg:grid-cols-3 lg:gap-8">
        <div class="lg:col-span-2 mb-8 lg:mb-0">
            <div class="bg-white rounded-2xl shadow-soft border border-slate-100 overflow-hidden">
                <div class="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 class="font-bold text-slate-800 text-lg">Order Summary</h2>
                    <span class="text-sm font-medium text-slate-500">${cart.length} Items</span>
                </div>
                <div class="p-6">
                    ${itemsHTML}
                </div>
                <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <span class="text-lg font-medium text-slate-600">Total Amount</span>
                    <span class="text-3xl font-bold text-primary-700">Rs.${total}</span>
                </div>
            </div>
        </div>

        <div class="lg:col-span-1">
            <div class="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 sticky top-24">
                <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-secondary-100 flex items-center justify-center text-secondary-600 text-sm">
                        <i class="fas fa-truck"></i>
                    </div>
                    Delivery Details
                </h3>
                
                <form id="checkoutForm" onsubmit="placeOrder(event)" class="space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name <span class="text-red-500">*</span></label>
                        <input type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" id="customerName" placeholder="John Doe" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number <span class="text-red-500">*</span></label>
                        <input type="tel" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" id="customerPhone" placeholder="+94 7X XXX XXXX" required>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Delivery Address <span class="text-red-500">*</span></label>
                        <textarea class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" id="deliveryAddress" rows="2" placeholder="Street, Area" required></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">City <span class="text-red-500">*</span></label>
                            <input type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" id="city" placeholder="Colombo" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                            <input type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition" id="deliveryNotes" placeholder="Optional">
                        </div>
                    </div>
                    
                    <button type="submit" class="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2 mt-2">
                        <i class="fab fa-whatsapp text-lg"></i> Place Order via WhatsApp
                    </button>
                    
                    <button type="button" class="w-full py-3 text-slate-500 font-medium hover:text-slate-700 transition" onclick="showSection('products')">
                        Continue Shopping
                    </button>
                </form>
            </div>
        </div>
    </div>
    `;
}

function updateCartQuantity(index, change) {
    const item = cart[index];
    const product = products.find(p => p.id === item.productId);

    if (change > 0) {
        if (product && product.stock <= item.quantity) {
            showNotification('No more stock available!', 'warning');
            return;
        }
        item.quantity += 1;
    } else {
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            removeFromCart(index);
            return;
        }
    }
    localStorage.setItem('goodwinCart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    localStorage.setItem('goodwinCart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
    showNotification('Item removed from cart', 'info');
}

function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cartBadge');
    const mobileBadge = document.getElementById('mobileCartBadge');

    if (badge) badge.textContent = totalItems;
    if (mobileBadge) {
        mobileBadge.textContent = totalItems;
        if (totalItems === 0) {
            mobileBadge.classList.add('hidden');
        } else {
            mobileBadge.classList.remove('hidden');
        }
    }
}

async function placeOrder(event) {
    event.preventDefault();
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }

    const customerName = document.getElementById('customerName').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const deliveryAddress = document.getElementById('deliveryAddress').value;
    const city = document.getElementById('city').value;
    const deliveryNotes = document.getElementById('deliveryNotes').value;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderId = 'ORD' + Date.now().toString().slice(-6);

    const order = {
        id: orderId,
        customerName,
        phone: customerPhone,
        address: deliveryAddress,
        city,
        deliveryNotes,
        items: [...cart],
        total,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };

    try {
        await window.addDoc(window.collection(window.db, "orders"), order);

        // Update Stock
        for (const item of cart) {
            const product = products.find(p => p.id === item.productId);
            if (product && product.firestoreId) {
                const newStock = Math.max(0, product.stock - item.quantity); // Ensure non-negative
                await window.updateDoc(window.doc(window.db, "products", product.firestoreId), {
                    stock: newStock
                });
            }
        }

    } catch (e) {
        console.error("Error placing order:", e);
        showNotification("Error placing order. Please contact support.", "error");
        return;
    }

    let message = `*New Order - Goodwin Traders*\n`;
    message += `Order ID: ${orderId}\n`;
    message += `Customer: ${customerName}\n`;
    message += `Phone: ${customerPhone}\n`;
    message += `Address: ${deliveryAddress}, ${city}\n\n`;
    message += `*Order Details:*\n`;

    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name} (${item.size}) - ${item.quantity} x Rs.${item.price}\n`;
    });

    message += `\n*Total: Rs.${total}*\n`;
    if (deliveryNotes) message += `Note: ${deliveryNotes}\n`;

    const encodedMessage = encodeURIComponent(message);
    const cleanPhone = BUSINESS_PHONE.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    cart = [];
    localStorage.setItem('goodwinCart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
    showNotification(`Order #${orderId} placed successfully!`, 'success');
}

// ===== ADMIN FUNCTIONS =====
function adminLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === 'admin' && password === 'admin123') {
        isAdminLoggedIn = true;
        localStorage.setItem('goodwinAdminLoggedIn', 'true');
        showAdminDashboard();
        showNotification('Admin login successful!', 'success');
    } else {
        document.getElementById('loginError').classList.remove('hidden');
        showNotification('Invalid credentials!', 'error');
    }
}

function adminLogout() {
    isAdminLoggedIn = false;
    localStorage.removeItem('goodwinAdminLoggedIn');
    showAdminLogin();
    showNotification('Logged out successfully', 'info');
}

function loadAdminData() {
    document.getElementById('totalProducts').textContent = products.length;
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('totalSales').textContent = `Rs. ${totalSales}`;
    document.getElementById('pendingOrders').textContent = orders.filter(o => o.status === 'pending').length;
    document.getElementById('totalOrders').textContent = orders.length;

    loadLowStockTable();
    loadRecentOrders();
    loadOrdersTable(); // Ensure this is called if on Orders Tab
}

function loadLowStockTable() {
    const table = document.getElementById('lowStockTable');
    table.innerHTML = '';
    const low = products.filter(p => p.stock <= 5);
    if (low.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="px-6 py-8 text-center text-slate-400 text-sm">No low stock items</td></tr>`;
    } else {
        low.forEach(p => {
            table.innerHTML += `
      <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition">
        <td class="px-6 py-4 font-medium text-slate-700">${p.name}</td>
        <td class="px-6 py-4 text-red-600 font-bold">${p.stock}</td>
        <td class="px-6 py-4"><span class="bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Low Stock</span></td>
      </tr>`;
        });
    }
}

function loadRecentOrders() {
    const table = document.getElementById('recentOrdersTable');
    if (!table) return;
    table.innerHTML = '';
    orders.slice(0, 5).forEach(o => {
        const bgColors = {
            pending: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
            processing: 'bg-blue-50 text-blue-700 border border-blue-100',
            completed: 'bg-green-50 text-green-700 border border-green-100',
            cancelled: 'bg-red-50 text-red-700 border border-red-100'
        };
        table.innerHTML += `
    <tr class="border-b border-slate-100 hover:bg-slate-50/50 transition">
      <td class="px-6 py-4 font-medium text-slate-700">#${o.id.slice(-6)}</td>
      <td class="px-6 py-4 text-slate-600">${o.customerName}</td>
      <td class="px-6 py-4 font-bold text-slate-800">Rs.${o.total}</td>
      <td class="px-6 py-4"><span class="${bgColors[o.status] || 'bg-slate-100 text-slate-600'} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">${o.status}</span></td>
      <td class="px-6 py-4 text-slate-400 text-xs">${o.date}</td>
    </tr>`;
    });
}

function loadOrdersTable() {
    const table = document.getElementById('adminOrderTable');
    if (!table) return;
    table.innerHTML = '';

    const filter = document.getElementById('orderFilter')?.value || 'all';
    const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter);

    if (filtered.length === 0) {
        table.innerHTML = `<tr><td colspan="9" class="text-center py-12 text-slate-400 font-medium">No orders found matching your criteria</td></tr>`;
        return;
    }

    filtered.forEach(o => {
        const bgColors = {
            pending: 'bg-yellow-50 text-yellow-700 border border-yellow-100',
            processing: 'bg-blue-50 text-blue-700 border border-blue-100',
            completed: 'bg-green-50 text-green-700 border border-green-100',
            cancelled: 'bg-red-50 text-red-700 border border-red-100'
        };
        table.innerHTML += `
    <tr class="hover:bg-slate-50 transition border-b border-slate-100 last:border-0 group">
      <td class="px-6 py-4"><input type="checkbox" class="order-checkbox rounded border-slate-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer" data-order-id="${o.id}" onchange="toggleOrderSelection('${o.id}')" ${selectedOrders.has(o.id) ? 'checked' : ''}></td>
      <td class="px-6 py-4 font-mono text-xs text-slate-500">#${o.id.slice(-6)}</td>
      <td class="px-6 py-4">
        <div class="font-bold text-slate-800">${o.customerName}</div>
        <div class="text-xs text-slate-500 flex items-center gap-1"><i class="fas fa-map-marker-alt text-slate-400"></i> ${o.city}</div>
      </td>
      <td class="px-6 py-4 text-sm text-slate-600 font-mono">${o.phone}</td>
      <td class="px-6 py-4 text-sm text-slate-600"><span class="font-bold text-slate-800">${o.items.reduce((s, i) => s + i.quantity, 0)}</span> items</td>
      <td class="px-6 py-4 font-bold text-slate-800">Rs.${o.total}</td>
      <td class="px-6 py-4"><span class="${bgColors[o.status]} px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">${o.status}</span></td>
      <td class="px-6 py-4 text-xs text-slate-400">${o.date}</td>
      <td class="px-6 py-4">
        <div class="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition" onclick="viewOrderDetails('${o.id}')" title="View"><i class="fas fa-eye text-xs"></i></button>
            <button class="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition" onclick="deleteSingleOrder('${o.id}')" title="Delete"><i class="fas fa-trash-alt text-xs"></i></button>
        </div>
      </td>
    </tr>`;
    });
}

function loadProductsTable() {
    const table = document.getElementById('adminProductTable');
    if (!table) return;
    table.innerHTML = '';

    const searchTerm = document.getElementById('productSearchInput')?.value.toLowerCase() || '';
    const category = document.getElementById('productFilterSelect')?.value || 'all';

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
            (p.id && p.id.toString().includes(searchTerm)) ||
            (p.type && p.type.toLowerCase().includes(searchTerm));
        const matchesCategory = category === 'all' || (p.type && p.type.toLowerCase() === category.toLowerCase());
        return matchesSearch && matchesCategory;
    });

    if (filteredProducts.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-12">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4 text-slate-300">
                        <i class="fas fa-search text-2xl"></i>
                    </div>
                    <p class="text-slate-500 font-medium">No products found matching your criteria</p>
                    <button onclick="clearProductFilters()" class="text-primary-600 hover:text-primary-700 text-sm font-semibold mt-2 hover:underline">Clear Filters</button>
                </td>
            </tr>`;
        return;
    }

    filteredProducts.forEach(p => {
        table.innerHTML += `
    <tr class="hover:bg-slate-50 border-b border-slate-100 last:border-0 group transition">
      <td class="px-6 py-4">
        ${p.image ?
                `<div class="w-12 h-12 rounded-lg overflow-hidden shadow-sm hover:scale-110 transition cursor-pointer border border-slate-200"><img src="${p.image}" class="w-full h-full object-cover"></div>` :
                `<div class="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200"><i class="fas fa-image"></i></div>`
            }
      </td>
      <td class="px-6 py-4 font-bold text-slate-800">${p.name}</td>
      <td class="px-6 py-4 text-sm text-slate-600"><span class="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium">${p.type}</span></td>
      <td class="px-6 py-4 font-bold text-slate-800">Rs.${p.price}</td>
      <td class="px-6 py-4">
         <span class="${p.stock <= 5 ? 'text-red-600 bg-red-50 border-red-100' : 'text-slate-600 bg-slate-100 border-slate-200'} px-2.5 py-1 rounded-full text-xs font-bold border">${p.stock}</span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${p.visible ? 'border-green-100 text-green-700 bg-green-50' : 'border-slate-200 text-slate-500 bg-slate-100'}">
            ${p.visible ? 'Active' : 'Hidden'}
        </span>
      </td>
      <td class="px-6 py-4">
         <div class="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition" onclick="editProduct(${p.id})" title="Edit"><i class="fas fa-pen text-xs"></i></button>
            <button class="w-8 h-8 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center transition" onclick="deleteProduct(${p.id})" title="Delete"><i class="fas fa-trash-alt text-xs"></i></button>
            <button class="w-8 h-8 rounded-lg ${p.visible ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} flex items-center justify-center transition" onclick="toggleProductVisibility(${p.id})" title="Toggle Visibility"><i class="fas ${p.visible ? 'fa-eye-slash' : 'fa-eye'} text-xs"></i></button>
         </div>
      </td>
    </tr>`;
    });
}

// ===== UTILS & MODALS =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');

    const styles = {
        success: 'bg-green-100 border-l-4 border-green-500 text-green-700',
        error: 'bg-red-100 border-l-4 border-red-500 text-red-700',
        warning: 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700',
        info: 'bg-blue-100 border-l-4 border-blue-500 text-blue-700'
    };
    const icon = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };

    notification.className = `${styles[type]} px-4 py-3 rounded shadow-md flex items-center gap-3 transform transition-all duration-300 translate-x-full opacity-0 max-w-sm`;
    notification.innerHTML = `<i class="fas fa-${icon[type]}"></i> <span class="font-medium text-sm">${message}</span>`;

    container.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
        notification.classList.remove('translate-x-full', 'opacity-0');
    });

    setTimeout(() => {
        notification.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => container.removeChild(notification), 300);
    }, 4000);
}

// Global Exports
Object.assign(window, {
    addToCart, updateCartQuantity, removeFromCart, placeOrder, showSection, editProduct,
    deleteProduct, deleteSingleOrder, downloadSingleOrder, toggleProductVisibility,
    closeProductModal, saveProduct, previewImage, showTab, filterOrders, viewOrderDetails,
    closeOrderModal, updateOrderStatus, contactCustomer, downloadOrderAsText, deleteOrder,
    toggleOrderSelection, toggleMasterCheckbox, toggleSelectAll, deleteSelectedOrders,
    exportProductsToCSV, exportProductsToPDF, exportOrdersToCSV, exportOrdersToPDF, downloadAllOrders,
    // Helper function for Modal logic moved to top level
    openProductModal
});

function viewOrderDetails(orderId) {
    currentOrderId = orderId;
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    document.getElementById('modalOrderId').textContent = orderId;
    document.getElementById('modalCustomerName').textContent = order.customerName;
    document.getElementById('modalCustomerPhone').textContent = order.phone;
    document.getElementById('modalDeliveryAddress').textContent = order.address;
    document.getElementById('modalCity').textContent = order.city;
    document.getElementById('modalOrderDate').textContent = order.date;
    document.getElementById('modalOrderTotal').textContent = `Rs.${order.total}`;

    const statusEl = document.getElementById('modalOrderStatus');
    statusEl.textContent = order.status;
    statusEl.className = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    }[order.status] + ' px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider';

    document.getElementById('modalStatusUpdate').value = order.status;

    const itemsContainer = document.getElementById('modalOrderItems');
    itemsContainer.innerHTML = '';
    order.items.forEach(item => {
        itemsContainer.innerHTML += `
        <div class="flex justify-between items-center py-4 px-4 bg-slate-50/50 hover:bg-slate-50 transition first:rounded-t-xl last:rounded-b-xl border-b border-slate-100 last:border-0">
            <div>
                <p class="font-bold text-slate-800 text-sm mb-0.5">${item.name}</p>
                <p class="text-xs text-slate-500 font-medium">${item.size} • ${item.type}</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-slate-500 mb-0.5">${item.quantity} x Rs.${item.price}</p>
                <p class="font-bold text-slate-700">Rs.${item.quantity * item.price}</p>
            </div>
        </div>`;
    });

    // WhatsApp Link
    const whatsappBtn = document.getElementById('whatsappCustomerBtn');
    const msg = `Hello ${order.customerName}, regarding your Order ${orderId}...`;
    whatsappBtn.href = `https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;

    document.getElementById('orderDetailsModal').classList.remove('hidden');
}

function closeOrderModal() {
    document.getElementById('orderDetailsModal').classList.add('hidden');
    currentOrderId = null;
}
function updateOrderStatus() {
    if (!currentOrderId) return;
    const newStatus = document.getElementById('modalStatusUpdate').value;
    const order = orders.find(o => o.id === currentOrderId);
    if (order && order.firestoreId) {
        window.updateDoc(window.doc(window.db, "orders", order.firestoreId), { status: newStatus })
            .then(() => {
                showNotification('Order status updated!', 'success');
                viewOrderDetails(currentOrderId); // Refresh modal view
            });
    }
}
async function deleteSingleOrder(orderId) {
    if (!confirm('Delete this order?')) return;
    const o = orders.find(or => or.id === orderId);
    if (o) await window.deleteDoc(window.doc(window.db, "orders", o.firestoreId));
    showNotification('Order deleted', 'success');
    closeOrderModal();
}
function contactCustomer(phone) {
    if (phone) window.open(`tel:${phone}`);
    else if (currentOrderId) {
        const o = orders.find(or => or.id === currentOrderId);
        if (o) window.open(`tel:${o.phone}`);
    }
}
function downloadOrderAsText() {
    if (currentOrderId) downloadSingleOrder(currentOrderId);
}

// ===== PRODUCT MODAL FUNCTIONS =====
function openProductModal(productId = null) {
    editingProductId = productId;
    const modal = document.getElementById('productModal');
    const preview = document.getElementById('modalProductImagePreview');
    const saveBtn = document.getElementById('saveProductBtn');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const form = document.getElementById('productForm');

    if (!productId) {
        modal.querySelector('h3').textContent = 'Add New Product';
        form.reset();
        document.getElementById('modalProductVisible').checked = true;
        preview.classList.add('hidden');
        currentImageData = '';
        saveBtn.classList.remove('hidden');
        saveChangesBtn.classList.add('hidden');
    } else {
        modal.querySelector('h3').textContent = 'Edit Product';
        const p = products.find(prod => prod.id === productId);
        document.getElementById('modalProductName').value = p.name;
        document.getElementById('modalProductType').value = p.type;
        document.getElementById('modalProductPrice').value = p.price;
        document.getElementById('modalProductStock').value = p.stock;
        document.getElementById('modalProductVisible').checked = p.visible;

        if (p.image) {
            preview.src = p.image;
            preview.classList.remove('hidden');
            currentImageData = p.image;
        } else {
            preview.classList.add('hidden');
            currentImageData = '';
        }
        saveBtn.classList.add('hidden');
        saveChangesBtn.classList.remove('hidden');
    }
    modal.classList.remove('hidden');
}

function closeProductModal() {
    document.getElementById('productModal').classList.add('hidden');
    editingProductId = null;
}

function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('modalProductImagePreview').src = e.target.result;
            document.getElementById('modalProductImagePreview').classList.remove('hidden');
            currentImageData = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

async function saveProduct() {
    const name = document.getElementById('modalProductName').value;
    const type = document.getElementById('modalProductType').value;
    const price = document.getElementById('modalProductPrice').value;
    const stock = document.getElementById('modalProductStock').value;
    const visible = document.getElementById('modalProductVisible').checked;

    if (!name || !price || !stock) {
        showNotification('Please fill all required fields', 'error');
        return;
    }

    const productData = {
        name, type, price: parseInt(price), stock: parseInt(stock), visible, image: currentImageData
    };

    try {
        if (editingProductId) {
            const p = products.find(prod => prod.id === editingProductId);
            await window.updateDoc(window.doc(window.db, "products", p.firestoreId), productData);
            showNotification('Product updated', 'success');
        } else {
            const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
            await window.addDoc(window.collection(window.db, "products"), { ...productData, id: newId });
            showNotification('Product created', 'success');
        }
        closeProductModal();
    } catch (e) {
        console.error(e);
        showNotification('Error saving product', 'error');
    }
}
// ===== PRODUCT ACTION FUNCTIONS =====
function editProduct(id) {
    if (window.openProductModal) {
        window.openProductModal(id);
    } else {
        console.error("openProductModal is not defined");
    }
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        const p = products.find(prod => prod.id === id);
        if (p && p.firestoreId) {
            await window.deleteDoc(window.doc(window.db, "products", p.firestoreId));
            showNotification('Product deleted successfully', 'success');
        } else {
            showNotification('Product not found or invalid ID', 'error');
        }
    } catch (e) {
        console.error("Error deleting product:", e);
        showNotification('Error deleting product', 'error');
    }
}

async function toggleProductVisibility(id) {
    try {
        const p = products.find(prod => prod.id === id);
        if (p && p.firestoreId) {
            await window.updateDoc(window.doc(window.db, "products", p.firestoreId), {
                visible: !p.visible
            });
            showNotification(`Product is now ${!p.visible ? 'visible' : 'hidden'}`, 'success');
        }
    } catch (e) {
        console.error("Error toggling product visibility:", e);
        showNotification('Error updating visibility', 'error');
    }
}

// ===== EXPORT & DOWNLOAD FUNCTIONS =====

function downloadSingleOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let text = `ORDER RECEIPT - Goodwin Traders\n`;
    text += `--------------------------------\n`;
    text += `Order ID: ${order.id}\n`;
    text += `Date: ${order.date}\n`;
    text += `Customer: ${order.customerName}\n`;
    text += `Phone: ${order.phone}\n`;
    text += `Address: ${order.address}, ${order.city}\n`;
    text += `--------------------------------\n\n`;
    text += `ITEMS:\n`;

    order.items.forEach((item, index) => {
        text += `${index + 1}. ${item.name} (${item.size}) - ${item.quantity} x Rs.${item.price} = Rs.${item.quantity * item.price}\n`;
    });

    text += `\n--------------------------------\n`;
    text += `TOTAL AMOUNT: Rs.${order.total}\n`;
    text += `--------------------------------\n`;
    if (order.deliveryNotes) text += `Notes: ${order.deliveryNotes}\n`;

    downloadFile(text, `Order_${order.id}.txt`, 'text/plain');
}

function exportProductsToCSV() {
    if (products.length === 0) {
        showNotification('No products to export', 'warning');
        return;
    }

    const headers = ['ID', 'Name', 'Type', 'Price', 'Stock', 'Visible'];
    const rows = products.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        p.type,
        p.price,
        p.stock,
        p.visible ? 'Yes' : 'No'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'goodwin_products.csv', 'text/csv');
}

function exportProductsToPDF() {
    if (products.length === 0) {
        showNotification('No products to export', 'warning');
        return;
    }

    if (!window.jspdf) { showNotification('PDF library not loaded', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Goodwin Traders - Product List", 14, 15);
    doc.autoTable({
        head: [['ID', 'Name', 'Type', 'Price', 'Stock', 'Visible']],
        body: products.map(p => [p.id, p.name, p.type, `Rs.${p.price}`, p.stock, p.visible ? 'Yes' : 'No']),
        startY: 20
    });
    doc.save('goodwin_products.pdf');
}

function exportOrdersToCSV() {
    if (orders.length === 0) {
        showNotification('No orders to export', 'warning');
        return;
    }

    const headers = ['Order ID', 'Date', 'Customer', 'Phone', 'City', 'Total', 'Status', 'Items Account'];
    const rows = orders.map(o => [
        o.id,
        o.date,
        `"${o.customerName.replace(/"/g, '""')}"`,
        o.phone,
        o.city,
        o.total,
        o.status,
        o.items.length
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csvContent, 'goodwin_orders.csv', 'text/csv');
}

function exportOrdersToPDF() {
    if (orders.length === 0) {
        showNotification('No orders to export', 'warning');
        return;
    }

    if (!window.jspdf) { showNotification('PDF library not loaded', 'error'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.text("Goodwin Traders - Order History", 14, 15);
    doc.autoTable({
        head: [['ID', 'Date', 'Customer', 'Phone', 'Total', 'Status']],
        body: orders.map(o => [o.id, o.date, o.customerName, o.phone, `Rs.${o.total}`, o.status]),
        startY: 20
    });
    doc.save('goodwin_orders.pdf');
}

function downloadAllOrders() {
    if (orders.length === 0) {
        showNotification('No orders to download', 'warning');
        return;
    }
    // Detailed JSON dump as backup
    const data = JSON.stringify(orders, null, 2);
    downloadFile(data, `goodwin_orders_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.toggleOrderSelection = function (id) {
    if (selectedOrders.has(id)) selectedOrders.delete(id);
    else selectedOrders.add(id);
    document.getElementById('deleteSelectedBtn').disabled = selectedOrders.size === 0;
}
window.toggleSelectAll = function () {
    const all = document.getElementById('selectAllCheckbox').checked;
    const master = document.getElementById('masterCheckbox');
    if (master) master.checked = all;

    document.querySelectorAll('.order-checkbox').forEach(cb => {
        cb.checked = all;
        const id = cb.getAttribute('data-order-id');
        if (all) selectedOrders.add(id); else selectedOrders.delete(id);
    });
    document.getElementById('deleteSelectedBtn').disabled = selectedOrders.size === 0;
}
window.deleteSelectedOrders = async function () {
    if (!confirm(`Delete ${selectedOrders.size} orders?`)) return;
    for (const id of selectedOrders) {
        const o = orders.find(or => or.id === id);
        if (o) await window.deleteDoc(window.doc(window.db, "orders", o.firestoreId));
    }
    selectedOrders.clear();
    showNotification('Orders deleted', 'success');
    document.getElementById('deleteSelectedBtn').disabled = true;
    if (document.getElementById('selectAllCheckbox')) document.getElementById('selectAllCheckbox').checked = false;
}
window.toggleMasterCheckbox = function () {
    // Logic merged with toggleSelectAll generally, but if used separately:
    const master = document.getElementById('masterCheckbox').checked;
    document.querySelectorAll('.order-checkbox').forEach(cb => {
        cb.checked = master;
        const id = cb.getAttribute('data-order-id');
        if (master) selectedOrders.add(id); else selectedOrders.delete(id);
    });
    document.getElementById('deleteSelectedBtn').disabled = selectedOrders.size === 0;
}

// ===== PRODUCT FILTERING =====
window.filterProducts = function () {
    loadProductsTable();
};

window.clearProductFilters = function () {
    const searchInput = document.getElementById('productSearchInput');
    const filterSelect = document.getElementById('productFilterSelect');
    if (searchInput) searchInput.value = '';
    if (filterSelect) filterSelect.value = 'all';
    loadProductsTable();
};

// ===== WHATSAPP CONTACT =====
// ===== WHATSAPP CONTACT =====
window.sendWhatsAppMessage = function (event) {
    event.preventDefault();
    const name = document.getElementById('contactName').value;
    const phone = document.getElementById('contactPhone').value;
    const message = document.getElementById('contactMessage').value;

    if (!name || !phone || !message) {
        alert('Please fill in all fields');
        return;
    }

    const targetNumber = '+94756272858';
    const text = `Hi Goodwin Traders, I'm ${name}. My number is ${phone}. ${message}`;
    const url = `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
};

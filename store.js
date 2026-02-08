// Django API Configuration
const API_URL = window.location.origin + '/api';

const DB_KEYS = {
    ORDERS: 'dia_orders',
    PURCHASES: 'dia_my_purchases',
    USERS: 'dia_users',
    SESSION: 'dia_current_user'
};

const Store = {
    // Fetch videos from Django API
    async getVideos() {
        try {
            const response = await fetch(`${API_URL}/videos/`);
            const videos = await response.json();
            return videos.map(v => ({
                id: v.id.toString(),
                title: v.title,
                price: parseFloat(v.price),
                image: window.location.origin + v.image,
                videoFileName: window.location.origin + v.video_file,
                views: v.views
            }));
        } catch (error) {
            console.error('Error fetching videos:', error);
            return [];
        }
    },

    // User Auth (still LocalStorage for now)
    registerUser(username, email, password) {
        const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
        if (users.find(u => u.username === username)) throw new Error("Username taken");
        if (users.find(u => u.email === email)) throw new Error("Email already registered");

        const newUser = { id: 'u_' + Date.now(), username, email, password };
        users.push(newUser);
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
        return newUser;
    },

    validateCredentials(identifier, password) {
        const users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
        const user = users.find(u => (u.username === identifier || u.email === identifier) && u.password === password);
        if (user) return user;
        throw new Error("Invalid Credentials");
    },

    setSession(user) {
        localStorage.setItem(DB_KEYS.SESSION, JSON.stringify(user));
    },

    logoutUser() {
        localStorage.removeItem(DB_KEYS.SESSION);
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
    },

    // Orders
    getOrders() {
        return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS) || '[]');
    },

    addOrder(order) {
        const orders = this.getOrders();
        if (!order.status) order.status = 'pending';
        orders.unshift(order);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    approveOrder(txnId) {
        let orders = this.getOrders();
        let approvedOrder = null;
        orders = orders.map(o => {
            if (o.txnId === txnId) {
                o.status = 'approved';
                o.approvalDate = Date.now();
                approvedOrder = o;
            }
            return o;
        });
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));

        if (approvedOrder && approvedOrder.videoId) {
            this.addPurchase(approvedOrder.videoId);
        }
    },

    deleteOrder(txnId) {
        let orders = this.getOrders();
        orders = orders.filter(o => o.txnId !== txnId);
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    // Purchases
    getPurchases() {
        return JSON.parse(localStorage.getItem(DB_KEYS.PURCHASES) || '[]');
    },

    addPurchase(videoId) {
        const purchases = this.getPurchases();
        if (!purchases.includes(videoId.toString())) {
            purchases.push(videoId.toString());
            localStorage.setItem(DB_KEYS.PURCHASES, JSON.stringify(purchases));
        }
    }
};

window.Store = Store;

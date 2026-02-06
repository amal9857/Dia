// Simple LocalStorage Database
// In a real app, this would be a server-side database (MongoDB/SQL)

const DB_KEYS = {
    VIDEOS: 'dia_videos',
    ORDERS: 'dia_orders',
    PURCHASES: 'dia_my_purchases',
    USERS: 'dia_users',
    SESSION: 'dia_current_user'
};

// IndexedDB Helper for Large Files (VideoBlobs)
const IDB_NAME = 'dia_media_db';
const IDB_STORE = 'videos';

function openMediaDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(IDB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e);
    });
}

const Store = {
    // Initial Seed Data
    init() {
        if (!localStorage.getItem(DB_KEYS.VIDEOS)) {
            const seedVideos = [
                { id: 'video1', title: 'Midnight Session', price: 49.99, image: 'images/img1.jpg', views: 120, videoFileName: 'demo.mp4' },
                { id: 'video2', title: 'Anklet Tease', price: 59.99, image: 'images/img2.jpg', views: 85, videoFileName: 'demo.mp4' },
                { id: 'video3', title: 'Rose Petals', price: 79.99, image: 'images/img3.jpg', views: 200, videoFileName: 'demo.mp4' },
                { id: 'video4', title: 'Sole Fetish', price: 99.99, image: 'images/img4.jpg', views: 150, videoFileName: 'demo.mp4' }
            ];
            localStorage.setItem(DB_KEYS.VIDEOS, JSON.stringify(seedVideos));
        }

        if (!localStorage.getItem(DB_KEYS.ORDERS)) localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify([]));
        if (!localStorage.getItem(DB_KEYS.PURCHASES)) localStorage.setItem(DB_KEYS.PURCHASES, JSON.stringify([]));
        if (!localStorage.getItem(DB_KEYS.USERS)) localStorage.setItem(DB_KEYS.USERS, JSON.stringify([]));
    },

    // --- User Auth ---
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
        // Mark user as active in the global list
        this.setUserActiveStatus(user.username, true);
    },

    setUserActiveStatus(username, isActive) {
        let users = JSON.parse(localStorage.getItem(DB_KEYS.USERS) || '[]');
        users = users.map(u => {
            if (u.username === username) {
                return { ...u, isActiveSession: isActive };
            }
            return u;
        });
        localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
    },

    // Email Service (Real + Mock Fallback)
    async sendVerificationEmail(email, code) {
        console.log(`[EMAIL SERVICE] Preparing to send code ${code} to ${email}`);

        // CHECK: If EmailJS is loaded and configured
        if (window.emailjs && window.EMAILJS_CONFIGURED) {
            try {
                await emailjs.send(
                    "service_default", // Service ID (Change if needed)
                    "template_default", // Template ID (Change if needed)
                    {
                        to_email: email,
                        verification_code: code,
                        reply_to: "dia_support@example.com"
                    }
                );
                console.log("[EMAIL SERVICE] Real email sent successfully via EmailJS");
                alert(`A verification code has been sent to ${email}. Please check your Gmail (Inbox or Spam).`);
                return;
            } catch (error) {
                console.warn("[EMAIL SERVICE] EmailJS failed, falling back to mock.", error);
                alert("Email Service Error: Could not send real email. Falling back to simulation.");
            }
        }

        // Fallback: Simulation
        setTimeout(() => {
            alert(`[SIMULATION]\nReason: Email Service not set up yet.\n\nTo: ${email}\nYour Code: ${code}`);
        }, 1000);
    },

    logoutUser() {
        const user = this.getCurrentUser();
        if (user) {
            this.setUserActiveStatus(user.username, false);
        }
        localStorage.removeItem(DB_KEYS.SESSION);
    },

    getCurrentUser() {
        return JSON.parse(localStorage.getItem(DB_KEYS.SESSION));
    },
    // ----------------

    getVideos() {
        this.init();
        return JSON.parse(localStorage.getItem(DB_KEYS.VIDEOS));
    },

    addVideo(video) {
        const videos = this.getVideos();
        videos.push(video);
        localStorage.setItem(DB_KEYS.VIDEOS, JSON.stringify(videos));
    },

    deleteVideo(id) {
        const videos = this.getVideos().filter(v => v.id !== id);
        localStorage.setItem(DB_KEYS.VIDEOS, JSON.stringify(videos));
    },

    updateVideo(id, updatedData) {
        let videos = this.getVideos();
        videos = videos.map(v => v.id === id ? { ...v, ...updatedData } : v);
        localStorage.setItem(DB_KEYS.VIDEOS, JSON.stringify(videos));
        localStorage.setItem(DB_KEYS.VIDEOS, JSON.stringify(videos));
    },

    // --- MEDIA BLOB STORAGE (IndexedDB) ---
    async saveVideoFile(videoId, fileBlob) {
        const db = await openMediaDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            store.put(fileBlob, videoId);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    },

    async getVideoFile(videoId) {
        const db = await openMediaDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(videoId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject();
        });
    },

    async deleteVideoFile(videoId) {
        const db = await openMediaDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(videoId);
    },
    // --------------------------------------

    // Orders
    getOrders() {
        this.init();
        return JSON.parse(localStorage.getItem(DB_KEYS.ORDERS));
    },

    addOrder(order) {
        const orders = this.getOrders();
        // Default new orders to 'pending'
        if (!order.status) order.status = 'pending';
        orders.unshift(order); // Add to top
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));
    },

    approveOrder(txnId) {
        let orders = this.getOrders();
        let approvedOrder = null;
        orders = orders.map(o => {
            if (o.txnId === txnId) {
                o.status = 'approved';
                o.approvalDate = Date.now(); // Save Timestamp for 3-day deletion rule
                approvedOrder = o;
            }
            return o;
        });
        localStorage.setItem(DB_KEYS.ORDERS, JSON.stringify(orders));

        // Unlock the video globally (conceptually) or specifically for this user
        // In this local demo, adding to PURCHASE list effectively unlocks it for this "User"
        // But since we are distinguishing Users now, usually purchase history is per user.
        // However, Store.addPurchase() works on a global/local list.
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
        if (!purchases.includes(videoId)) {
            purchases.push(videoId);
            localStorage.setItem(DB_KEYS.PURCHASES, JSON.stringify(purchases));
        }
    },

    getPurchases() {
        this.init();
        return JSON.parse(localStorage.getItem(DB_KEYS.PURCHASES));
    },

    addPurchase(videoId) {
        const purchases = this.getPurchases();
        if (!purchases.includes(videoId)) {
            purchases.push(videoId);
            localStorage.setItem(DB_KEYS.PURCHASES, JSON.stringify(purchases));
        }
    }
};

// Expose to window
window.Store = Store;

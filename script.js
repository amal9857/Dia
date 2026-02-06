// Global Variables
let paymentModal;
let securityAlert;
const upiId = "joshmiifza@okaxis";
let currentVideoId = null;
let waitingForPayment = false;

// Initialize Privacy Screen
const privacyScreen = document.createElement('div');
privacyScreen.id = 'privacy-screen';
privacyScreen.innerHTML = '<h2>PROTECTED CONTENT</h2><p>Screen recording/capture is not allowed.</p>';
// Ensure critical styles are inline to guarantee blocking
Object.assign(privacyScreen.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    background: '#000',
    color: '#fff',
    zIndex: '999999',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    textAlign: 'center'
});
document.body.appendChild(privacyScreen);

document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    const currentUser = Store.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Inject Logout Button info
    const header = document.querySelector('header');
    if (header) {
        const welcomeDiv = document.createElement('div');
        welcomeDiv.innerHTML = `
            <div style="position: absolute; top: 20px; right: 20px; text-align: right;">
                <span style="color:var(--text-muted); font-size:0.9rem;">Welcome, ${currentUser.username}</span>
                <button onclick="logout()" style="display:block; margin-left:auto; background:transparent; border:1px solid #333; color: #666; padding: 5px 10px; border-radius: 5px; cursor: pointer; margin-top: 5px; font-size: 0.8rem;">Logout</button>
            </div>
        `;
        header.appendChild(welcomeDiv);
    }

    paymentModal = document.getElementById('payment-modal');
    securityAlert = document.getElementById('security-warning');

    // Load Videos from Store (Dynamic Rendering)
    if (window.Store) {
        renderGallery();
    }

    // Helper to check if payment is happening
    const isPaymentOpen = () => {
        return paymentModal && paymentModal.style.display === 'flex';
    };

    // Security: Disable Right Click
    document.addEventListener('contextmenu', (e) => {
        // Always block right click for consistency
        e.preventDefault();
        return false;
    });

    // Security: Disable Keys
    document.addEventListener('keydown', (e) => {
        // EXCEPTION: Allow PrintScreen ONLY if payment modal is open
        // We handle this explicitly. If payment is open, we do nothing and let standard behavior occur.
        if (e.key === 'PrintScreen') {
            if (isPaymentOpen()) {
                // Allow User to Screenshot for Payment
                return true;
            } else {
                // 1. Immediately Cover Screen
                if (privacyScreen) privacyScreen.style.display = 'flex';

                // 2. Clear Clipboard (Best Effort)
                navigator.clipboard.writeText('');

                // 3. Block Event
                e.preventDefault();
                e.stopImmediatePropagation();

                // 4. Reset after delay (so the captured image is black)
                setTimeout(() => {
                    alert("Screenshots are disabled for privacy!");
                    if (!document.hidden && document.hasFocus()) {
                        if (privacyScreen) privacyScreen.style.display = 'none';
                    }
                }, 300);
                return false;
            }
        }

        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U') ||
            (e.ctrlKey && e.key === 'S')
        ) {
            e.preventDefault();

            // Show warning only if not paying
            if (securityAlert && !isPaymentOpen()) securityAlert.style.display = 'block';

            return false;
        }
    });

    // Anti-Screenshot / Blur Detection
    setInterval(() => {
        if (!document.hasFocus() && !isPaymentOpen()) {
            document.body.classList.add('secure-blur');
            if (privacyScreen) privacyScreen.style.display = 'flex';
            document.title = 'Security Alert';
        } else if (document.hasFocus()) {
            document.body.classList.remove('secure-blur');
            if (document.title === 'Security Alert') {
                if (privacyScreen) privacyScreen.style.display = 'none';
                document.title = 'DIA | Exclusive Content';
            }
        }
    }, 100);

    window.addEventListener('blur', () => {
        if (!isPaymentOpen()) {
            document.body.classList.add('secure-blur');
            privacyScreen.style.display = 'flex';
            document.title = 'Security Alert';
        }
    });

    window.addEventListener('focus', () => {
        document.body.classList.remove('secure-blur');
        privacyScreen.style.display = 'none';
        document.title = 'DIA | Exclusive Content';
    });

    // Console Spam
    setInterval(() => {
        console.clear();
        console.log("%c SECURITY ACTIVE ", "background: red; color: white; font-size: 30px; padding: 10px;");
    }, 1000);

    // Auto-Verify Payment on Return - REMOVED per user request to stop automatic opening
    // document.addEventListener("visibilitychange", () => {
    //     if (document.visibilityState === 'visible' && waitingForPayment) {
    //         simulateVerification();
    //     }
    // });
});

function renderGallery() {
    if (!window.Store) return;
    const videos = Store.getVideos();
    const purchases = Store.getPurchases();
    const orders = Store.getOrders();
    const currentUser = Store.getCurrentUser();

    // Main Gallery
    const gallery = document.querySelector('.gallery');
    if (gallery) {
        gallery.innerHTML = videos.map(video => {
            const isPurchased = purchases.includes(video.id) || video.price === 0;
            // Check if there is a pending order for this video by this user
            const isPending = orders.some(o => o.videoId === video.id && o.buyerName === currentUser.username && o.status === 'pending');
            return createVideoCard(video, isPurchased, isPending);
        }).join('');
    }

    // Purchase History / Library
    const libraryGrid = document.getElementById('library-grid');
    if (libraryGrid) {
        const myVideos = videos.filter(v => purchases.includes(v.id) || v.price === 0);
        if (myVideos.length > 0) {
            document.getElementById('library-section').style.display = 'block';
            libraryGrid.innerHTML = myVideos.map(video => createVideoCard(video, true, false)).join('');
        } else {
            document.getElementById('library-section').style.display = 'none';
        }
    }
}

function createVideoCard(video, isUnlocked, isPending) {
    if (isUnlocked) {
        // UNLOCKED VIEW: Show Player with Blob Protection
        let videoSrc = video.videoFileName || 'default.mp4';

        // Handle pathing
        if (!videoSrc.startsWith('http') && videoSrc !== 'demo.mp4') {
            videoSrc = `videos/${videoSrc}`;
        } else if (videoSrc === 'demo.mp4') {
            // FALLBACK FOR DEMO
            videoSrc = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        }

        const uniqueVidId = 'vid_' + video.id;

        // Schedule secure loading after render
        setTimeout(() => loadSecureVideo(uniqueVidId, videoSrc), 100);

        return `
        <article class="card unlocked" style="cursor: default;">
            <div class="card-image-wrapper" style="height: auto; position: relative; overflow: hidden; background: black;">
                <!-- Anti-Download Canvas Wrapper -->
                <div class="secure-player-container" style="position: relative; padding-bottom: 56.25%;">
                    <!-- HIDDEN RAW VIDEO (Cannot be clicked/seen directly) -->
                    <video id="${uniqueVidId}_src" 
                        playsinline 
                        style="display: none;"
                        oncontextmenu="return false;"
                    ></video>

                    <!-- CANVAS RENDERER (This is what the user sees) -->
                    <canvas id="${uniqueVidId}_canvas" 
                        style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 8px; cursor: pointer;"
                    ></canvas>

                    <!-- Custom Play Button Overlay -->
                    <div id="${uniqueVidId}_playbtn" 
                        onclick="toggleSecurePlay('${uniqueVidId}')"
                        style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                               background: rgba(0,0,0,0.6); color: white; border: 2px solid white; 
                               width: 60px; height: 60px; border-radius: 50%; display: flex; 
                               justify-content: center; align-items: center; cursor: pointer; z-index: 20;">
                        <i class="fas fa-play" style="font-size: 24px; margin-left: 5px;"></i>
                    </div>

                    <!-- CUSTOM CONTROLS BAR -->
                    <div id="${uniqueVidId}_controls" class="custom-controls" onclick="event.stopPropagation()">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <!-- Mute -->
                            <button onclick="toggleMute('${uniqueVidId}')" title="Mute/Unmute"><i id="${uniqueVidId}_vol_icon" class="fas fa-volume-up"></i></button>
                            
                            <!-- Speed -->
                            <select onchange="changeSpeed('${uniqueVidId}', this.value)" style="background:#eee; color:black; border:none; font-size: 0.8rem; padding: 2px;">
                                <option value="0.5">0.5x</option>
                                <option value="1" selected>1x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <!-- Resolution -->
                             <select onchange="changeResolution('${uniqueVidId}', this.value)" style="background:#eee; color:black; border:none; font-size: 0.8rem; padding: 2px;">
                                <option value="1080">1080p</option>
                                <option value="720" selected>720p</option>
                                <option value="480">480p</option>
                            </select>

                            <!-- Fullscreen -->
                            <button onclick="toggleFullscreen('${uniqueVidId}')" title="Fullscreen"><i class="fas fa-expand"></i></button>
                        </div>
                    </div>

                    <!-- Dynamic Watermark -->
                    <div class="moving-watermark" style="opacity: 0.3;">DIA PROTECTED</div>
                </div>
            </div>
            <div class="card-content">
                <h3 class="card-title">${video.title} <i class="fas fa-check-circle" style="color:var(--primary)"></i></h3>
                <p style="color: var(--text-muted); font-size: 0.9rem;">${video.price === 0 ? 'Free Content' : 'Thank you for your purchase.'}</p>
            </div>
        </article>
        `;
    } else {
        // LOCKED VIEW
        const actionButton = isPending
            ? `<button class="btn-buy" disabled style="background:#444; color:#f39c12; border:1px solid #666; cursor:not-allowed;"><i class="fas fa-clock"></i> Pending Approval</button>`
            : `<button class="btn-buy" onclick="event.stopPropagation(); window.pay('${video.id}', '${video.title}', ${video.price})">Buy Video</button>`;

        const cardAction = isPending ? '' : `onclick="window.pay('${video.id}', '${video.title}', ${video.price})"`;

        return `
        <article class="card" ${cardAction} style="${isPending ? 'opacity:0.8;' : ''}">
            <div class="card-image-wrapper">
                <img src="${video.image}" alt="${video.title}" class="card-img">
                <div class="lock-overlay">
                    <i class="fas fa-lock lock-icon"></i>
                    <span>PREMIUM VIDEO</span>
                </div>
                <div class="watermark">DIA EXCLUSIVE</div>
            </div>
            <div class="card-content">
                <h3 class="card-title">${video.title}</h3>
                <div class="card-price">₹${video.price}</div>
                ${actionButton}
            </div>
        </article>
        `;
    }
}

// Window Functions
window.pay = function (videoId, title, price) {
    // If owned, do nothing
    const purchases = Store.getPurchases();
    if (purchases.includes(videoId)) return;

    currentVideoId = { id: videoId, title: title, price: price };

    if (paymentModal) {
        paymentModal.style.display = 'flex';
        // Generate QR with Amount and User Note
        const user = Store.getCurrentUser();
        const username = user ? user.username : 'Guest';
        const email = user ? user.email : 'NoEmail';

        // Consistent Note Format
        const note = `Video: ${title} | User: ${username} | Email: ${email}`;

        const upiLink = `upi://pay?pa=${upiId}&pn=DIA%20Premium&tn=${encodeURIComponent(note)}&am=${price.toFixed(2)}&cu=INR`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
        const qrImg = document.getElementById('upi-qr');
        if (qrImg) qrImg.src = qrUrl;

        // INJECT GPAY BUTTON (Mobile Only or Always?)
        // We'll insert it after the QR container
        let gpayBtn = document.getElementById('gpay-direct-btn');
        if (!gpayBtn) {
            console.log("Creating GPay Button"); // Debug
            // Logic handled in HTML structure, or we can inject here
        }
    }
};

window.verifyPayment = function () {
    // Manually trigger the simulation
    simulateVerification();
};

window.closePaymentModal = function () {
    if (paymentModal) paymentModal.style.display = 'none';
    currentVideoId = null;
};

window.copyUpi = function () {
    navigator.clipboard.writeText(upiId).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.color = 'var(--primary)';
        btn.style.borderColor = 'var(--primary)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Could not copy automatically. Please copy manually: ' + upiId);
    });
};

window.closeSecurityAlert = function () {
    if (securityAlert) securityAlert.style.display = 'none';
};

window.onclick = function (event) {
    if (paymentModal && event.target == paymentModal) {
        paymentModal.style.display = "none";
    }
};

window.logout = function () {
    Store.logoutUser();
    window.location.href = 'login.html';
};

// Updated GPay/UPI Deep Link Logic
window.openGPay = function () {
    if (!currentVideoId) return;
    const user = Store.getCurrentUser();
    const username = user ? user.username : 'Guest';
    const email = user ? user.email : 'NoEmail';

    // Transaction Note: Video | User | Email
    // Note: UPI Apps sometimes truncate long notes, but we try to fit it all.
    const note = `Video: ${currentVideoId.title} | User: ${username} | Email: ${email}`;

    // UPI Deep Link
    // pa = Payee Address (UPI ID)
    // pn = Payee Name
    // am = Amount
    // tr = Transaction Reference (optional)
    // tn = Transaction Note
    // cu = Currency

    const upiLink = `upi://pay?pa=${upiId}&pn=DIA%20Premium&tn=${encodeURIComponent(note)}&am=${currentVideoId.price.toFixed(2)}&cu=INR`;

    // Attempt to open
    window.location.href = upiLink;

    // Fallback for desktop or non-UPI devices?
    // Usually deep links just do nothing if app not found.
};

function simulateVerification() {
    const txnInput = document.getElementById('txn-id-input');
    const txnValue = txnInput ? txnInput.value.trim() : '';

    // Validator: Relaxed for demo, but kept to ensure some input
    if (!txnValue || txnValue.length < 1) {
        alert("Please enter a Transaction ID to verify.");
        return;
    }

    waitingForPayment = false;
    const modalContent = document.querySelector('.payment-content');
    const originalContent = modalContent.innerHTML;

    // Show Loading
    modalContent.innerHTML = `
        <div style="padding: 2rem;">
            <div class="spinner"></div>
            <h3>Verifying Payment...</h3>
            <p style="color: var(--text-muted); margin-top: 10px;">Checking Transaction ID: ${txnValue}...</p>
        </div>
    `;

    setTimeout(() => {
        // Success
        if (currentVideoId) {
            const user = Store.getCurrentUser();

            // Add as PENDING order
            Store.addOrder({
                id: 'ord_' + Date.now(),
                buyerName: user.username,
                email: user.email,
                videoTitle: currentVideoId.title,
                videoId: currentVideoId.id, // Store ID to unlock later
                amount: currentVideoId.price,
                txnId: txnValue,
                status: 'pending', // Explicitly pending
                date: new Date().toISOString()
            });

            // --- AUTO TELEGRAM NOTIFICATION ---
            // Construct the message
            const telegramUser = "Queen_dia_fxxtz";
            const tgMessage = `PAID FOR VIDEO - PLEASE APPROVE%0A%0A` +
                `User: ${user.username} (${user.email})%0A` +
                `Video: ${currentVideoId.title}%0A` +
                `Amount: ₹${currentVideoId.price}%0A` +
                `TxnID: ${txnValue}`;

            // Open Telegram
            window.open(`https://t.me/${telegramUser}?text=${tgMessage}`, '_blank');
            // ----------------------------------

            // DO NOT unlock immediately
            // Store.addPurchase(currentVideoId.id); <-- Removed

            modalContent.innerHTML = `
                <div style="padding: 2rem;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #2ecc71; margin-bottom: 1rem;"></i>
                    <h3>Payment Confirmed</h3>
                    <p style="color: var(--text-muted); margin-top: 10px; font-size: 0.9rem;">
                        Your Transaction ID <b>${txnValue}</b> has been received.
                    </p>
                    <p style="color: #f39c12; margin-top:15px; font-weight:bold;">
                        Waiting for Admin Approval.
                    </p>
                    <p style="color:#666; font-size:0.8rem; margin-top:5px;">
                        The video will unlock automatically once the admin verifies the amount.
                    </p>
                </div>
            `;

            setTimeout(() => {
                closePaymentModal();
                window.location.reload();
            }, 4000);
        }
    }, 2000);
}

// --- SECURE BLOB LOADER ---
// --- SECURE BLOB LOADER ---
async function loadSecureVideo(baseId, url) {
    // Target the HIDDEN video element
    const videoSrcId = baseId + '_src';
    const video = document.getElementById(videoSrcId);
    if (!video) return;

    // CHECK 1: If it's a saved file in IDB (Android Local Upload)
    let finalUrl = url;
    if (baseId.startsWith('vid_')) {
        const videoId = baseId.replace('vid_', '');
        try {
            const blob = await Store.getVideoFile(videoId);
            if (blob) {
                console.log("Serving from IndexedDB");
                finalUrl = URL.createObjectURL(blob);
            }
        } catch (e) { }
    }

    // Set Src logic (Blob or direct)
    if (!finalUrl.startsWith('blob:')) {
        try {
            const response = await fetch(finalUrl);
            const blob = await response.blob();
            finalUrl = URL.createObjectURL(blob);
        } catch (e) {
            console.log("Fallback public load");
        }
    }

    video.src = finalUrl;

    // Initialize Canvas Painter
    // video.onloadeddata = () => { ... } managed in toggleSecurePlay
}

// SECURE RENDERER: Sync Hidden Video -> Canvas
window.toggleSecurePlay = function (baseId) {
    const video = document.getElementById(baseId + '_src');
    const canvas = document.getElementById(baseId + '_canvas');
    const btn = document.getElementById(baseId + '_playbtn');

    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');

    if (video.paused) {
        video.play().then(() => {
            btn.style.display = 'none';

            // Render Loop
            const render = () => {
                if (video.paused || video.ended) {
                    btn.style.display = 'flex';
                    if (video.ended) {
                        // Reset
                        btn.innerHTML = '<i class="fas fa-redo"></i>';
                    }
                    return;
                }

                // Draw Frame
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                requestAnimationFrame(render);
            };
            requestAnimationFrame(render);

        }).catch(e => console.error("Play error", e));
    } else {
        video.pause();
        btn.style.display = 'flex';
        btn.innerHTML = '<i class="fas fa-play"></i>';
    }

    // Also allow clicking canvas to pause
    canvas.onclick = () => window.toggleSecurePlay(baseId);
};

// --- CUSTOM CONTROL FUNCTIONS ---
window.toggleMute = function (baseId) {
    const video = document.getElementById(baseId + '_src');
    const icon = document.getElementById(baseId + '_vol_icon');

    // Debugging
    console.log("Toggling Mute for:", baseId, video);

    if (video) {
        // Toggle
        video.muted = !video.muted;

        // Force Volume Update (sometimes required on mobile)
        if (video.muted) video.volume = 0;
        else video.volume = 1;

        // Update Icon
        if (icon) {
            icon.className = video.muted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            // Also update color
            icon.style.color = video.muted ? 'red' : 'black';
        }
    } else {
        console.error("Video Element Not Found for Mute");
    }
};

window.changeSpeed = function (baseId, rate) {
    const video = document.getElementById(baseId + '_src');
    if (video) video.playbackRate = parseFloat(rate);
};

window.changeResolution = function (baseId, res) {
    // We simulate resolution by changing canvas logical size (sharpness vs perf)
    const canvas = document.getElementById(baseId + '_canvas');
    if (canvas) {
        // Just sets a data attribute that the render loop reads or just resets width
        // The render loop constantly sets width = videoWidth. 
        // We can force scale usage in the render loop if needed.
        // For now, let's keep it max quality (native video size)
        console.log("Res set to " + res);
    }
};

window.toggleFullscreen = function (baseId) {
    const wrapper = document.getElementById(baseId + '_canvas').parentElement;

    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen().then(() => {
                // Try to lock orientation to landscape
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(e => console.log("Orientation lock failed", e));
                }
            });
        }
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
    }
};

// --- NOTIFICATION & BACKGROUND LOGIC ---
// Request Permission on first interaction
// Initialize video count safely even if Store is not fully ready (using raw LS)
(function initNotifications() {
    if ("Notification" in window) {
        // User Interaction trigger usually required, so we might need a button.
    }

    // Check for new videos securely
    const rawVideos = localStorage.getItem('dia_videos');
    if (rawVideos) {
        const videos = JSON.parse(rawVideos);
        const lastCount = parseInt(localStorage.getItem('dia_last_video_count') || '0');

        if (videos.length > lastCount && lastCount !== 0) {
            // New Video Detected!
            if (Notification.permission === "granted") {
                new Notification("New Video Dropped!", {
                    body: `"${videos[videos.length - 1].title}" is now available.`,
                    icon: 'images/logo.jpg'
                });
            }
        }
        // Update Count
        localStorage.setItem('dia_last_video_count', videos.length);
    }
})();

// Register Periodic Sync for User App
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(async reg => {
        if ('periodicSync' in reg) {
            try {
                const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                if (status.state === 'granted') {
                    await reg.periodicSync.register('poll-videos', {
                        minInterval: 12 * 60 * 60 * 1000 // Check every 12 hours
                    });
                }
            } catch (e) { console.log("Bg Sync not supported"); }
        }
    });
}



document.addEventListener('DOMContentLoaded', () => {    // --- Splash Screen Logic ---
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app');
    
    if (splashScreen && appContainer) {
        // Hide app container initially
        appContainer.style.opacity = '0';
        appContainer.style.transform = 'translateY(20px)';

        anime.timeline({
            complete: () => {
                splashScreen.classList.add('hidden');
                // Reveal main app
                anime({
                    targets: appContainer,
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 800,
                    easing: 'easeOutExpo'
                });
            }
        })
        .add({
            targets: '#splash-icon',
            scale: [0, 1],
            opacity: [0, 1],
            rotateZ: [45, 0],
            duration: 1200,
            easing: 'easeOutElastic(1, .5)'
        })
        .add({
            targets: '#splash-title',
            opacity: [0, 1],
            translateY: [20, 0],
            duration: 800,
            easing: 'easeOutExpo'
        }, '-=800')
        .add({
            targets: '#splash-loading-container',
            opacity: [0, 1],
            duration: 400,
            easing: 'linear'
        }, '-=400')
        .add({
            targets: splashScreen,
            opacity: [1, 0],
            duration: 600,
            delay: 1500, // Show splash screen for 1.5 seconds after loading
            easing: 'easeInOutQuad'
        });
    }

    // Initialize Telegram Mini App if opened inside Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
    // Determine the manifest URL based on the current domain/path
    const manifestUrl = new URL('tonconnect-manifest.json', window.location.href).href;

    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: manifestUrl,
        buttonRootId: 'ton-connect'
    });

    // Customise button theme
    tonConnectUI.uiOptions = {
        twaReturnUrl: window.location.href,
        uiPreferences: {
            theme: TON_CONNECT_UI.THEME.DARK,
            colorsSet: {
                [TON_CONNECT_UI.THEME.DARK]: {
                    connectButton: {
                        background: '#06b6d4',
                        foreground: '#ffffff'
                    }
                }
            }
        }
    };

    const emptyState = document.getElementById('empty-state');
    const heroConnectBtn = document.getElementById('hero-connect-btn');
    if (heroConnectBtn) {
        heroConnectBtn.addEventListener('click', () => {
            tonConnectUI.openModal();
        });
    }
    const connectedStateContainer = document.getElementById('connected-state-container');
    const bottomNav = document.getElementById('bottom-nav');
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabSections = document.querySelectorAll('[data-tab-section]');
    
    const addressEl = document.getElementById('wallet-address');
    const balanceEl = document.getElementById('wallet-balance');
    const fiatBalanceEl = document.getElementById('fiat-balance');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('toast');
    
    // History specific elements
    const historyLoading = document.getElementById('history-loading');
    const historyEmpty = document.getElementById('history-empty');
    const historyList = document.getElementById('history-list');
    const refreshHistoryBtn = document.getElementById('refresh-history-btn');
    const notificationToast = document.getElementById('notification-toast');
    const notificationTitle = document.getElementById('notification-title');
    const notificationText = document.getElementById('notification-text');
    const pollingIndicator = document.getElementById('polling-indicator');

    // Tokens elements
    const tokensLoading = document.getElementById('tokens-loading');
    const tokensEmpty = document.getElementById('tokens-empty');
    const tokensList = document.getElementById('tokens-list');

    const nftsLoading = document.getElementById('nfts-loading');
    const nftsEmpty = document.getElementById('nfts-empty');
    const nftsList = document.getElementById('nfts-list');

    // Modals elements
    const modalsOverlay = document.getElementById('modals-overlay');
    const modalProfile = document.getElementById('modal-profile');
    const profileBtn = document.getElementById('profile-btn');
    const modalBeta = document.getElementById('modal-beta');
    const modalQrRub = document.getElementById('modal-qr-rub');
    const betaBadgeBtn = document.getElementById('beta-badge-btn');
    const modalReceive = document.getElementById('modal-receive');
    const modalSend = document.getElementById('modal-send');
    const btnReceive = document.getElementById('btn-receive');
    const btnSend = document.getElementById('btn-send');
    const btnQrRub = document.getElementById('btn-qr-rub');
    const btnStarsRub = document.getElementById('btn-stars-rub');
    const qrcodeContainer = document.getElementById('qrcode');
    const receiveMemo = document.getElementById('receive-memo');
    let qrCodeObj = null;

    let currentAddressRaw = null;
    let currentFriendlyAddress = null;
    let lastEventId = null;
    let pollInterval = null;
    let currentDisplayedBalance = 0;
    let currentTonPriceRub = 0;
    let currentTonPriceUsd = 0;
    let globalTgPhotoUrl = null;

    // --- Tab Navigation Logic ---
    function switchTab(tabId) {
        // Update nav buttons visually
        navBtns.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('text-cyan-400');
                btn.classList.remove('text-slate-500');
            } else {
                btn.classList.remove('text-cyan-400');
                btn.classList.add('text-slate-500');
            }
        });

        // Update sections
        tabSections.forEach(sec => {
            if (sec.dataset.tabSection === tabId) {
                sec.classList.remove('hidden');
                sec.classList.add('flex', 'flex-col', 'gap-8');
                // Small entrance animation when switching tabs
                anime({
                    targets: sec,
                    opacity: [0, 1],
                    translateY: [15, 0],
                    duration: 400,
                    easing: 'easeOutQuad'
                });
            } else {
                sec.classList.add('hidden');
                sec.classList.remove('flex', 'flex-col', 'gap-8');
            }
        });
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // --- 3D Hover Effect for Main Card ---
    const walletCardSection = document.getElementById('wallet-info-section');
    if (window.matchMedia("(hover: hover)").matches) {
        walletCardSection.addEventListener('mousemove', (e) => {
            const rect = walletCardSection.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -3; 
            const rotateY = ((x - centerX) / centerX) * 3;
            
            walletCardSection.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        walletCardSection.addEventListener('mouseleave', () => {
            walletCardSection.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
            walletCardSection.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
        });
        walletCardSection.addEventListener('mouseenter', () => {
            walletCardSection.style.transition = 'none';
        });
    }

    function toFriendlyAddress(raw, isTestnet = false) {
        if (!raw) return '';
        try {
            if (window.TonWeb) {
                const addr = new window.TonWeb.utils.Address(raw);
                return addr.toString(true, true, false, isTestnet); // UQ Format (non-bounceable)
            } else if (window.TON_CONNECT_UI && window.TON_CONNECT_UI.toUserFriendlyAddress) {
                return window.TON_CONNECT_UI.toUserFriendlyAddress(raw, isTestnet);
            }
        } catch (e) {
            console.warn('Address conversion error:', e);
        }
        return raw;
    }

    function formatAddress(address) {
        if (!address) return '-';
        if (address.length > 10) {
            return `${address.slice(0, 4)}...${address.slice(-4)}`;
        }
        return address;
    }

    function showToast() {
        if(toast) {
            anime.timeline()
                .add({
                    targets: toast,
                    opacity: [0, 1],
                    translateY: [20, 0],
                    duration: 400,
                    easing: 'easeOutBack'
                })
                .add({
                    targets: toast,
                    opacity: [1, 0],
                    translateY: [0, 20],
                    duration: 400,
                    easing: 'easeInBack',
                    delay: 2000
                });
        }
    }

    function showNotification(titleRaw, textRaw) {
        if(notificationToast) {
            if(titleRaw) notificationTitle.textContent = titleRaw;
            if(textRaw) notificationText.textContent = textRaw;
            
            anime.timeline()
                .add({
                    targets: notificationToast,
                    translateX: [50, 0],
                    opacity: [0, 1],
                    duration: 600,
                    easing: 'easeOutElastic(1, .6)'
                })
                .add({
                    targets: notificationToast,
                    translateX: [0, 50],
                    opacity: [1, 0],
                    duration: 400,
                    easing: 'easeInQuad',
                    delay: 4000
                });
        }
    }

    // --- Modal Animations using Anime.js ---
    function openModal(modalEl) {
        modalsOverlay.classList.remove('hidden');
        
        anime.timeline()
            .add({
                targets: modalsOverlay,
                opacity: [0, 1],
                duration: 300,
                easing: 'linear'
            })
            .add({
                targets: modalEl,
                scale: [0.9, 1],
                opacity: [0, 1],
                duration: 500,
                easing: 'easeOutExpo',
                begin: () => modalEl.classList.remove('hidden')
            }, '-=200');
    }

    function closeModals() {
        anime.timeline()
            .add({
                targets: [modalReceive, modalSend, modalProfile, modalBeta, modalQrRub],
                scale: [1, 0.95],
                opacity: [1, 0],
                duration: 300,
                easing: 'easeInExpo'
            })
            .add({
                targets: modalsOverlay,
                opacity: [1, 0],
                duration: 300,
                easing: 'linear',
                complete: () => {
                    modalsOverlay.classList.add('hidden');
                    modalReceive.classList.add('hidden');
                    modalSend.classList.add('hidden');
                    if (modalProfile) modalProfile.classList.add('hidden');
                    if (modalBeta) modalBeta.classList.add('hidden');
                    if (modalQrRub) modalQrRub.classList.add('hidden');
                }
            }, '-=150');
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            openModal(modalProfile);
        });
    }

    if (betaBadgeBtn) {
        betaBadgeBtn.addEventListener('click', () => {
            openModal(modalBeta);
        });
    }

    function trySetAvatar(url) {
        if(!url) return;
        const topImg = document.getElementById('profile-avatar-img');
        const topFallback = document.getElementById('profile-avatar-fallback');
        const modalImg = document.getElementById('modal-profile-img');
        const modalFallback = document.getElementById('modal-profile-fallback');
        
        if(topImg) {
            topImg.src = url;
            topImg.classList.remove('hidden');
            if(topFallback) topFallback.classList.add('hidden');
        }
        if(modalImg) {
            modalImg.src = url;
            modalImg.classList.remove('hidden');
            if(modalFallback) modalFallback.classList.add('hidden');
        }
    }

    function initProfile() {
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            if (tgUser.photo_url) globalTgPhotoUrl = tgUser.photo_url;
            
            const nameStr = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Телепорт Юзер';
            const nameEl = document.getElementById('modal-profile-name');
            if (nameEl) nameEl.textContent = nameStr;
            
            if (tgUser.username) {
                const usernameEl = document.getElementById('modal-profile-username');
                if (usernameEl) {
                    usernameEl.textContent = '@' + tgUser.username;
                    usernameEl.classList.remove('hidden');
                }
            }
            
            if (globalTgPhotoUrl) trySetAvatar(globalTgPhotoUrl);
        }
    }

    initProfile();

    document.querySelectorAll('.profile-setting-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const soonMsg = window.miniappI18n ? window.miniappI18n.t('app.soon') : 'В разработке';
            showNotification(soonMsg, btn.querySelector('span:last-child')?.textContent || 'Настройка');
        });
    });

    btnReceive.addEventListener('click', () => {
        if (!currentFriendlyAddress) return;
        receiveMemo.value = Math.random().toString(36).substring(2, 10).toUpperCase();
        updateReceiveQR();
        openModal(modalReceive);
    });

    function updateReceiveQR() {
        if (!currentFriendlyAddress) return;
        const text = receiveMemo.value.trim();
        const standardLink = "ton://transfer/" + currentFriendlyAddress + (text ? "?text=" + encodeURIComponent(text) : "");
        const tonkeeperLink = "https://app.tonkeeper.com/transfer/" + currentFriendlyAddress + (text ? "?text=" + encodeURIComponent(text) : "");
        
        qrcodeContainer.innerHTML = '';
        qrCodeObj = new QRCode(qrcodeContainer, {
            text: standardLink,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });

        const btnOpenTonkeeper = document.getElementById('btn-open-tonkeeper');
        if (btnOpenTonkeeper) {
            btnOpenTonkeeper.href = tonkeeperLink;
        }
    }

    receiveMemo.addEventListener('input', updateReceiveQR);

    const btnOpenTonkeeperEl = document.getElementById('btn-open-tonkeeper');
    if (btnOpenTonkeeperEl) {
        btnOpenTonkeeperEl.addEventListener('click', (e) => {
            if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
                e.preventDefault();
                window.Telegram.WebApp.openLink(btnOpenTonkeeperEl.href);
            }
        });
    }

    // Handle TWA native link opening for custom buttons
    document.querySelectorAll('.twa-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.Telegram && window.Telegram.WebApp) {
                e.preventDefault();
                const url = link.href;
                if (url.startsWith('https://t.me/')) {
                    if (window.Telegram.WebApp.openTelegramLink) {
                        window.Telegram.WebApp.openTelegramLink(url);
                    } else if (window.Telegram.WebApp.openLink) {
                        window.Telegram.WebApp.openLink(url);
                    }
                } else if (window.Telegram.WebApp.openLink) {
                    window.Telegram.WebApp.openLink(url);
                }
            }
        });
    });

    btnSend.addEventListener('click', () => {
        openModal(modalSend);
    });

    if (btnQrRub) {
        btnQrRub.addEventListener('click', () => {
            if (modalQrRub) openModal(modalQrRub);
        });
    }

    if (btnStarsRub) {
        btnStarsRub.addEventListener('click', () => {
            const soonMsg = window.miniappI18n ? window.miniappI18n.t('app.soon') : 'В разработке';
            showNotification(soonMsg, 'Telegram Stars');
        });
    }

    document.querySelectorAll('.send-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const soonMsg = window.miniappI18n ? window.miniappI18n.t('app.soon') : 'В разработке';
            showNotification(soonMsg, btn.textContent.trim());
            closeModals();
        });
    });

    copyBtn.addEventListener('click', () => {
        if (currentFriendlyAddress) {
            navigator.clipboard.writeText(currentFriendlyAddress)
                .then(() => showToast())
                .catch(err => console.error('Failed to copy', err));
        }
    });

    // Audio Context (Premium Success Sound)
    // Audio Context (Coin Drop Sound for Incoming)
    function playCoinDropSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            function ping(freq, time, decay) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);
                osc.frequency.exponentialRampToValueAtTime(freq * 0.95, time + decay);

                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.5, time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(time);
                osc.stop(time + decay);
            }

            const t = ctx.currentTime;
            ping(2000, t, 0.4);
            ping(2800, t, 0.5);
            ping(2000, t + 0.12, 0.2);
            ping(2800, t + 0.12, 0.25);
            ping(2000, t + 0.22, 0.1);
        } catch(e) {}
    }

    // Audio Context (Swoosh Sound for Outgoing)
    function playSendSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            
            const t = ctx.currentTime;
            osc.frequency.setValueAtTime(400, t);
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);

            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.4, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
        } catch(e) {}
    }

    function playConnectSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            if(ctx.state === 'suspended') ctx.resume();

            const playOsc = (freq, startTime, duration, type = 'sine') => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            const t = ctx.currentTime;
            playOsc(440, t, 0.4);       // A4
            playOsc(554.37, t + 0.1, 0.4); // C#5
            playOsc(659.25, t + 0.2, 0.8); // E5
            playOsc(880, t + 0.2, 1.2, 'triangle'); // A5 sweet harmonic
            
        } catch(e) {
            // ignore audio errors
        }
    }

    let apiErrorShown = false;
    function handleNetworkError(e, context) {
        console.warn(`[Network] ${context} error: ${e.message}`);
        if (!apiErrorShown && e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
            showNotification('Ошибка сети', 'Сбой подключения к TON API. Выключите VPN или AdBlock.');
            apiErrorShown = true;
            setTimeout(() => { apiErrorShown = false; }, 60000); // 1 min cooldown
        }
    }

    async function fetchBalance(address) {
        try {
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            
            if (data.balance !== undefined) {
                return (Number(data.balance) / 1e9);
            }
            return 0;
        } catch (e) {
            handleNetworkError(e, 'Balance');
            return null;
        }
    }

    async function fetchTonRates() {
        try {
            const response = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd,rub');
            if (!response.ok) return;
            const data = await response.json();
            if (data && data.rates && data.rates.TON && data.rates.TON.prices) {
                currentTonPriceRub = data.rates.TON.prices.RUB;
                currentTonPriceUsd = data.rates.TON.prices.USD;
            }
        } catch(e) {
            handleNetworkError(e, 'Rates');
        }
    }

    function updateFiatDisplay(val) {
        if (!fiatBalanceEl) return;
        if (currentTonPriceRub > 0 && currentTonPriceUsd > 0) {
            const rubRate = currentTonPriceRub * 0.95; // -5% margin logic to cover fees
            const rubValue = val * rubRate;
            const usdValue = val * currentTonPriceUsd;
            
            fiatBalanceEl.innerHTML = `<span class="text-white/90 drop-shadow-md font-semibold text-xl">≈ ${rubValue.toLocaleString('ru-RU', {minimumFractionDigits: 3, maximumFractionDigits: 3})} RUB</span> <span class="text-cyan-200/70 text-base font-medium tracking-wide">(~${usdValue.toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} $)</span>`;
        } else {
            fiatBalanceEl.innerHTML = '';
        }
    }

    async function fetchJettons(address) {
        try {
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}/jettons`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.balances || [];
        } catch(e) {
            handleNetworkError(e, 'Jettons');
            return [];
        }
    }

    async function fetchNFTs(address) {
        try {
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}/nfts?limit=20`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.nft_items || [];
        } catch(e) {
            handleNetworkError(e, 'NFTs');
            return [];
        }
    }

    async function fetchHistoryEvents(address) {
        try {
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}/events?limit=10`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            return data.events || [];
        } catch (e) {
            handleNetworkError(e, 'History');
            return [];
        }
    }

    function getHexPart(addr) {
        if (!addr) return '';
        const parts = addr.split(':');
        return parts.length === 2 ? parts[1].toLowerCase() : addr.toLowerCase();
    }

    function renderJettons(jettons) {
        tokensList.innerHTML = '';
        tokensLoading.classList.add('hidden');
        
        const valid = jettons.filter(j => Number(j.balance) > 0);
        if(valid.length === 0) {
            tokensEmpty.classList.remove('hidden');
            return;
        }
        tokensEmpty.classList.add('hidden');

        valid.forEach((j, i) => {
            const meta = j.jetton;
            const decimals = meta.decimals || 9;
            const balance = Number(j.balance) / (10 ** decimals);
            const symbol = meta.symbol || 'Unknown';
            const image = meta.image || 'https://i.yapx.ru/dOAJJ.jpg'; 
            
            const item = document.createElement('div');
            item.className = 'token-item bg-white/[0.04] rounded-2xl p-4 sm:p-5 border border-white/5 flex items-center justify-between hover:bg-white/[0.08] hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all duration-300 group cursor-default';
            item.style.opacity = '0';
            
            item.innerHTML = `
                <div class="flex items-center gap-4 overflow-hidden">
                    <img src="${image}" class="w-12 h-12 rounded-full bg-black/40 p-1 shrink-0 group-hover:scale-110 transition-transform duration-500" alt="${symbol}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PC9zdmc+'" />
                    <div class="font-extrabold text-white truncate text-base sm:text-lg tracking-wide">${symbol}</div>
                </div>
                <div class="text-white font-bold text-base sm:text-xl shrink-0 ml-2 tracking-tight">${balance.toLocaleString('en-US', {maximumFractionDigits:4})}</div>
            `;
            tokensList.appendChild(item);
        });

        // Staggered entrance animation
        anime({
            targets: '.token-item',
            opacity: [0, 1],
            translateY: [20, 0],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutExpo'
        });
    }

    function renderNFTs(nfts) {
        nftsList.innerHTML = '';
        nftsLoading.classList.add('hidden');
        
        if(!nfts || nfts.length === 0) {
            nftsEmpty.classList.remove('hidden');
            return;
        }
        nftsEmpty.classList.add('hidden');

        nfts.forEach((nft) => {
            const meta = nft.metadata || {};
            const name = meta.name || 'Unknown NFT';
            const image = meta.image || 'https://i.yapx.ru/dOAJJ.jpg';
            const collection = nft.collection?.name || '';
            
            const imgUrl = image.replace('ipfs://', 'https://ipfs.io/ipfs/');
            const nftAddressFriendly = toFriendlyAddress(nft.address);

            const item = document.createElement('div');
            item.className = 'nft-item bg-white/[0.04] rounded-2xl p-3 border border-white/5 flex flex-col hover:bg-white/[0.08] hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300 group cursor-pointer relative';
            item.style.opacity = '0';
            
            item.addEventListener('click', () => {
                if (!nft.address) return;
                const url = `https://tonviewer.com/${nftAddressFriendly}`;
                if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) {
                    window.Telegram.WebApp.openLink(url);
                } else {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            });
            
            item.innerHTML = `
                <div class="aspect-square w-full rounded-xl overflow-hidden mb-3 bg-black/40 relative">
                    <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </div>
                    <img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="${name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iMTgiIGhlaWdodD0iMTgiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxjaXJjbGUgY3g9IjguNSIgY3k9IjguNSIgcj0iMS41Ij48L2NpcmNsZT48cG9seWxpbmUgcG9pbnRzPSIyMSAxNSAxNiAxMCA1IDIxIj48L3BvbHlsaW5lPjwvc3ZnPg=='" loading="lazy" />
                </div>
                <div class="px-1 flex flex-col justify-center">
                    <div class="font-bold text-white truncate text-sm sm:text-base tracking-wide" title="${name}">${name}</div>
                    ${collection ? `<div class="text-slate-400 text-xs truncate mt-0.5" title="${collection}">${collection}</div>` : ''}
                </div>
            `;
            nftsList.appendChild(item);
        });

        anime({
            targets: '.nft-item',
            opacity: [0, 1],
            scale: [0.95, 1],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutExpo'
        });
    }

    function renderHistory(events) {
        historyList.innerHTML = '';
        historyLoading.classList.add('hidden');

        if (!events || events.length === 0) {
            historyEmpty.classList.remove('hidden');
            return;
        }
        
        historyEmpty.classList.add('hidden');
        const myHex = getHexPart(currentAddressRaw);

        events.forEach(event => {
            let isIncoming = true;
            let amountText = '';
            let title = window.miniappI18n ? window.miniappI18n.t('app.tx_unknown') : 'Транзакция';
            let comment = '';
            let feeText = '';
            let secondaryText = '';
            
            let action = event.actions.find(a => a.type === 'TonTransfer' || a.type === 'JettonTransfer' || a.type === 'NftItemTransfer');
            if (!action && event.actions.length > 0) action = event.actions[0];
            
            if (event.fee > 0) {
                const feeVal = event.fee / 1e9;
                feeText = `${window.miniappI18n ? window.miniappI18n.t('app.fee') : 'Комиссия'}: ${feeVal.toLocaleString('en-US', {maximumFractionDigits:4})} TON`;
            }

            if (action && action.type === 'TonTransfer' && action.TonTransfer) {
                const amount = action.TonTransfer.amount / 1e9;
                const recipientHex = getHexPart(action.TonTransfer.recipient?.address);
                const senderHex = getHexPart(action.TonTransfer.sender?.address);
                
                isIncoming = (recipientHex === myHex);
                if (senderHex === myHex && recipientHex === myHex) isIncoming = true;

                title = isIncoming 
                    ? (window.miniappI18n ? window.miniappI18n.t('app.receive') : 'Получение') 
                    : (window.miniappI18n ? window.miniappI18n.t('app.send') : 'Отправление');
                    
                amountText = `${isIncoming ? '+' : '-'}${amount.toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} TON`;
                comment = action.TonTransfer.comment || '';
                
                const addrLabel = isIncoming ? (window.miniappI18n ? window.miniappI18n.t('app.from') : 'От') : (window.miniappI18n ? window.miniappI18n.t('app.to') : 'Кому');
                const addrVal = isIncoming ? action.TonTransfer.sender?.address : action.TonTransfer.recipient?.address;
                if(addrVal) secondaryText = `${addrLabel}: ${formatAddress(toFriendlyAddress(addrVal))}`;

            } else if (action && action.type === 'JettonTransfer' && action.JettonTransfer) {
                const jettonMeta = action.JettonTransfer.jetton;
                const decimals = jettonMeta?.decimals || 9;
                const symbol = jettonMeta?.symbol || 'Jetton';
                const parsedAmount = action.JettonTransfer.amount / (10 ** decimals);

                const recipientHex = getHexPart(action.JettonTransfer.recipient?.address);
                isIncoming = (recipientHex === myHex);
                title = isIncoming ? `Получен ${symbol}` : `Отправлен ${symbol}`;
                amountText = `${isIncoming ? '+' : '-'}${parsedAmount.toLocaleString('en-US', {minimumFractionDigits: 3, maximumFractionDigits: 3})} ${symbol}`;
                comment = action.JettonTransfer.comment || '';
                
            } else if (action && action.type === 'NftItemTransfer' && action.NftItemTransfer) {
                const recipientHex = getHexPart(action.NftItemTransfer.recipient?.address);
                isIncoming = (recipientHex === myHex);
                title = 'NFT Перевод';
                amountText = isIncoming ? '+ 1 NFT' : '- 1 NFT';
            } else if (action && action.type === 'SmartContractExec') {
                title = 'Смарт-контракт';
                isIncoming = false;
                amountText = '';
            } else {
                title = action ? action.type : (window.miniappI18n ? window.miniappI18n.t('app.tx_unknown') : 'Неизвестно');
                isIncoming = true;
                amountText = '';
            }
            
            const date = new Date(event.timestamp * 1000);
            const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const dateStr = date.toLocaleDateString();

            const item = document.createElement('div');
            item.className = 'history-item bg-white/[0.02] rounded-[1.5rem] p-5 border border-white/5 flex flex-col hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 gap-4';
            item.style.opacity = '0';
            
            const iconColor = isIncoming 
                ? 'text-green-400 bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]' 
                : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]';
            
            const iconPath = isIncoming 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 4h13M3 4v13m0-13l14 14"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 4H8m13 0v13m0-13L7 18"></path>';

            item.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-5">
                        <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${iconColor} border flex items-center justify-center shrink-0">
                            <svg class="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">${iconPath}</svg>
                        </div>
                        <div>
                            <div class="text-white font-bold text-base sm:text-lg tracking-wide">${title}</div>
                            <div class="text-slate-400 text-xs sm:text-sm mt-1 font-medium tracking-wider">${dateStr} ${timeStr}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="${isIncoming ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-white'} font-extrabold text-lg sm:text-xl tracking-tight">
                            ${amountText}
                        </div>
                    </div>
                </div>
                ${(secondaryText || comment || feeText) ? `
                <div class="ml-16 sm:ml-20 pl-4 border-l-2 border-white/10 flex flex-col gap-2 mt-1">
                    ${secondaryText ? `<div class="text-xs text-slate-400 font-mono bg-black/30 self-start px-2 py-1 rounded-md">${secondaryText}</div>` : ''}
                    ${feeText ? `<div class="text-xs text-slate-500 tracking-wide">${feeText}</div>` : ''}
                    ${comment ? `<div class="text-sm text-slate-200 italic bg-white/5 px-4 py-2.5 rounded-xl inline-block self-start border border-white/5 shadow-inner">"${comment}"</div>` : ''}
                </div>
                ` : ''}
            `;
            historyList.appendChild(item);
        });

        // Staggered entrance animation
        anime({
            targets: '.history-item',
            opacity: [0, 1],
            translateX: [-20, 0],
            delay: anime.stagger(100),
            duration: 800,
            easing: 'easeOutExpo'
        });
    }

    async function updateData(isInitial = false) {
        if (!currentAddressRaw) return;
        
        if (isInitial) {
            historyLoading.classList.remove('hidden');
            historyList.innerHTML = '';
            historyEmpty.classList.add('hidden');
            
            tokensLoading.classList.remove('hidden');
            tokensList.innerHTML = '';
            tokensEmpty.classList.add('hidden');

            nftsLoading.classList.remove('hidden');
            nftsList.innerHTML = '';
            nftsEmpty.classList.add('hidden');
        } else {
            pollingIndicator.classList.remove('opacity-50');
            setTimeout(() => pollingIndicator.classList.add('opacity-50'), 500);
        }

        try {
            if (isInitial || currentTonPriceRub === 0) {
                await fetchTonRates();
                await new Promise(r => setTimeout(r, 600));
            }

            const balanceNum = await fetchBalance(currentAddressRaw);
            if (balanceNum === null) return; // Предотвращаем сброс баланса в 0 при ошибке 429
            await new Promise(r => setTimeout(r, 600));
            const events = await fetchHistoryEvents(currentAddressRaw);
            await new Promise(r => setTimeout(r, 600));
            const jettons = await fetchJettons(currentAddressRaw);
            await new Promise(r => setTimeout(r, 600));
            const nfts = await fetchNFTs(currentAddressRaw);

            // Animate balance counting
            const balanceObj = { value: currentDisplayedBalance };
            anime({
                targets: balanceObj,
                value: balanceNum,
                duration: 2000,
                easing: 'easeOutExpo',
                update: function() {
                    balanceEl.textContent = balanceObj.value.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                    updateFiatDisplay(balanceObj.value);
                },
                complete: function() {
                    balanceEl.textContent = balanceNum.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                    currentDisplayedBalance = balanceNum;
                    updateFiatDisplay(balanceNum);
                }
            });

            // Update jettons and NFTs
            renderJettons(jettons);
            renderNFTs(nfts);

            if (!globalTgPhotoUrl && nfts && nfts.length > 0) {
                const firstNft = nfts.find(n => n.metadata && n.metadata.image);
                if (firstNft) {
                    const imgUrl = firstNft.metadata.image.replace('ipfs://', 'https://ipfs.io/ipfs/');
                    trySetAvatar(imgUrl);
                }
            }

            // Update history
            if (isInitial) {
                renderHistory(events);
                if (events.length > 0) lastEventId = events[0].event_id;
            } else {
                if (events.length > 0 && events[0].event_id !== lastEventId) {
                    const newEvent = events[0];
                    const myHex = getHexPart(currentAddressRaw);
                    let isIncoming = false;
                    let action = newEvent.actions.find(a => a.type === 'TonTransfer' || a.type === 'JettonTransfer' || a.type === 'NftItemTransfer');
                    if (!action && newEvent.actions.length > 0) action = newEvent.actions[0];
                    
                    if (action) {
                        if (action.type === 'TonTransfer' && action.TonTransfer) {
                            isIncoming = getHexPart(action.TonTransfer.recipient?.address) === myHex;
                        } else if (action.type === 'JettonTransfer' && action.JettonTransfer) {
                            isIncoming = getHexPart(action.JettonTransfer.recipient?.address) === myHex;
                        } else if (action.type === 'NftItemTransfer' && action.NftItemTransfer) {
                            isIncoming = getHexPart(action.NftItemTransfer.recipient?.address) === myHex;
                        }
                    }

                    if (isIncoming) {
                        playCoinDropSound();
                    } else {
                        playSendSound();
                    }

                    renderHistory(events);
                    lastEventId = newEvent.event_id;
                    const newTxTitle = window.miniappI18n ? window.miniappI18n.t('app.new_transaction') : 'Новая транзакция!';
                    const updatedText = window.miniappI18n ? window.miniappI18n.t('app.balance_updated') : 'Баланс обновлен';
                    showNotification(newTxTitle, updatedText);
                }
            }
        } catch (e) {
            console.error('Update data error:', e);
        }
    }

    refreshHistoryBtn.addEventListener('click', () => {
        const svg = refreshHistoryBtn.querySelector('svg');
        svg.classList.add('animate-spin');
        updateData(true).finally(() => {
            setTimeout(() => svg.classList.remove('animate-spin'), 500);
        });
    });

    tonConnectUI.onStatusChange(async (wallet) => {
        if (wallet && wallet.account) {
            currentAddressRaw = wallet.account.address;
            const isTestnet = wallet.account.chain === '-3';
            currentFriendlyAddress = toFriendlyAddress(currentAddressRaw, isTestnet);
            
            // Premium Entrance Animation
            anime({
                targets: emptyState,
                opacity: 0,
                scale: 0.95,
                duration: 400,
                easing: 'easeInQuad',
                complete: () => {
                    emptyState.classList.add('hidden');
                    connectedStateContainer.classList.remove('hidden');
                    
                    // Show Main tab initially
                    switchTab('main');

                    // Show bottom nav
                    bottomNav.classList.remove('hidden');
                    anime({
                        targets: bottomNav,
                        opacity: [0, 1],
                        translateY: [50, 0],
                        duration: 600,
                        easing: 'easeOutExpo'
                    });
                }
            });

            playConnectSound();
            
            addressEl.textContent = formatAddress(currentFriendlyAddress);
            addressEl.title = currentFriendlyAddress;
            
            balanceEl.textContent = '...';

            await updateData(true);

            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(() => updateData(false), 25000);
            
        } else {
            // Disconnected
            currentAddressRaw = null;
            currentFriendlyAddress = null;
            lastEventId = null;
            currentDisplayedBalance = 0;
            if (fiatBalanceEl) fiatBalanceEl.innerHTML = '';
            if (pollInterval) clearInterval(pollInterval);
            
            anime({
                targets: [connectedStateContainer, bottomNav],
                opacity: 0,
                translateY: 20,
                duration: 400,
                easing: 'easeInQuad',
                complete: () => {
                    connectedStateContainer.classList.add('hidden');
                    bottomNav.classList.add('hidden');
                    emptyState.classList.remove('hidden');
                    
                    anime({
                        targets: emptyState,
                        opacity: [0, 1],
                        scale: [0.95, 1],
                        duration: 600,
                        easing: 'easeOutExpo'
                    });
                }
            });
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
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
    const connectedStateContainer = document.getElementById('connected-state-container');
    const addressEl = document.getElementById('wallet-address');
    const balanceEl = document.getElementById('wallet-balance');
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

    // Modals elements
    const modalsOverlay = document.getElementById('modals-overlay');
    const modalReceive = document.getElementById('modal-receive');
    const modalSend = document.getElementById('modal-send');
    const btnReceive = document.getElementById('btn-receive');
    const btnSend = document.getElementById('btn-send');
    const sendConfirmBtn = document.getElementById('send-confirm-btn');
    const qrcodeContainer = document.getElementById('qrcode');
    let qrCodeObj = null;

    let currentAddressRaw = null;
    let lastEventId = null;
    let pollInterval = null;
    let currentDisplayedBalance = 0;

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

    function formatAddress(address) {
        if (!address) return '-';
        if (address.length > 12) {
            return `${address.slice(0, 6)}...${address.slice(-6)}`;
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
                targets: [modalReceive, modalSend],
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
                }
            }, '-=150');
    }

    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    btnReceive.addEventListener('click', () => {
        if (!currentAddressRaw) return;
        qrcodeContainer.innerHTML = '';
        qrCodeObj = new QRCode(qrcodeContainer, {
            text: "ton://transfer/" + currentAddressRaw,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.M
        });
        openModal(modalReceive);
    });

    btnSend.addEventListener('click', () => {
        document.getElementById('send-address').value = '';
        document.getElementById('send-amount').value = '';
        openModal(modalSend);
    });

    sendConfirmBtn.addEventListener('click', async () => {
        const address = document.getElementById('send-address').value.trim();
        const amount = parseFloat(document.getElementById('send-amount').value);
        
        if(!address || isNaN(amount) || amount <= 0) return;
        
        const sendBtnOriginalText = sendConfirmBtn.innerHTML;
        sendConfirmBtn.innerHTML = '<span class="w-6 h-6 rounded-full border-2 border-white/50 border-t-white animate-spin inline-block"></span>';
        sendConfirmBtn.disabled = true;

        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300,
            messages: [
                {
                    address: address,
                    amount: Math.floor(amount * 1e9).toString()
                }
            ]
        };

        try {
            await tonConnectUI.sendTransaction(transaction);
            const successMsg = window.miniappI18n ? window.miniappI18n.t('app.tx_sent') : 'Транзакция отправлена!';
            showNotification(successMsg, '');
            closeModals();
        } catch (e) {
            console.error('Send error:', e);
            const errorMsg = window.miniappI18n ? window.miniappI18n.t('app.tx_error') : 'Ошибка';
            showNotification(errorMsg, e.message || '');
        } finally {
            sendConfirmBtn.innerHTML = sendBtnOriginalText;
            sendConfirmBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', () => {
        if (currentAddressRaw) {
            navigator.clipboard.writeText(currentAddressRaw)
                .then(() => showToast())
                .catch(err => console.error('Failed to copy', err));
        }
    });

    // Audio Context (Premium Success Sound)
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
            console.error('Fetch balance error:', e);
            return 0;
        }
    }

    async function fetchJettons(address) {
        try {
            const response = await fetch(`https://tonapi.io/v2/accounts/${address}/jettons`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.balances || [];
        } catch(e) {
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
            console.error('Fetch history error:', e);
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
            const image = meta.image || 'https://ton.org/download/ton_symbol.png'; 
            
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
            const action = event.actions.find(a => a.type === 'TonTransfer' || a.type === 'JettonTransfer') || event.actions[0];
            
            let isIncoming = true;
            let amountText = '';
            let title = window.miniappI18n ? window.miniappI18n.t('app.tx_unknown') : 'Транзакция';
            let comment = '';
            let feeText = '';
            let secondaryText = '';
            
            if (event.fee > 0) {
                const feeVal = event.fee / 1e9;
                feeText = `${window.miniappI18n ? window.miniappI18n.t('app.fee') : 'Fee'}: ${feeVal.toLocaleString('en-US', {maximumFractionDigits:4})} TON`;
            }

            if (action.type === 'TonTransfer') {
                const amount = action.TonTransfer.amount / 1e9;
                const recipientHex = getHexPart(action.TonTransfer.recipient?.address);
                isIncoming = (recipientHex === myHex);
                
                title = isIncoming 
                    ? (window.miniappI18n ? window.miniappI18n.t('app.receive') : 'Получение') 
                    : (window.miniappI18n ? window.miniappI18n.t('app.send') : 'Отправление');
                    
                amountText = `${isIncoming ? '+' : '-'}${amount.toLocaleString('en-US', {maximumFractionDigits:2})} TON`;
                comment = action.TonTransfer.comment || '';
                
                const addrLabel = isIncoming ? (window.miniappI18n ? window.miniappI18n.t('app.from') : 'From') : (window.miniappI18n ? window.miniappI18n.t('app.to') : 'To');
                const addrVal = isIncoming ? action.TonTransfer.sender?.address : action.TonTransfer.recipient?.address;
                if(addrVal) secondaryText = `${addrLabel}: ${formatAddress(addrVal)}`;

            } else if (action.type === 'JettonTransfer') {
                const recipientHex = getHexPart(action.JettonTransfer.recipient?.address);
                isIncoming = (recipientHex === myHex);
                title = 'Jetton Transfer';
                amountText = isIncoming ? '+ Jetton' : '- Jetton';
                comment = action.JettonTransfer.comment || '';
            } else {
                title = action.type;
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
        } else {
            pollingIndicator.classList.remove('opacity-50');
            setTimeout(() => pollingIndicator.classList.add('opacity-50'), 500);
        }

        try {
            const [balanceNum, events, jettons] = await Promise.all([
                fetchBalance(currentAddressRaw),
                fetchHistoryEvents(currentAddressRaw),
                fetchJettons(currentAddressRaw)
            ]);

            // Animate balance counting
            const balanceObj = { value: currentDisplayedBalance };
            anime({
                targets: balanceObj,
                value: balanceNum,
                duration: 2000,
                easing: 'easeOutExpo',
                update: function() {
                    balanceEl.textContent = balanceObj.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                },
                complete: function() {
                    balanceEl.textContent = balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    currentDisplayedBalance = balanceNum;
                }
            });

            // Update jettons
            renderJettons(jettons);

            // Update history
            if (isInitial) {
                renderHistory(events);
                if (events.length > 0) lastEventId = events[0].event_id;
            } else {
                if (events.length > 0 && events[0].event_id !== lastEventId) {
                    renderHistory(events);
                    lastEventId = events[0].event_id;
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
                    
                    // Staggered entrance for main sections
                    anime({
                        targets: '#connected-state-container > section',
                        opacity: [0, 1],
                        translateY: [40, 0],
                        delay: anime.stagger(150),
                        duration: 1000,
                        easing: 'easeOutExpo'
                    });
                }
            });

            playConnectSound();
            
            addressEl.textContent = formatAddress(currentAddressRaw);
            addressEl.title = currentAddressRaw;
            
            balanceEl.textContent = '...';

            await updateData(true);

            if (pollInterval) clearInterval(pollInterval);
            pollInterval = setInterval(() => updateData(false), 15000);
            
        } else {
            // Disconnected
            currentAddressRaw = null;
            lastEventId = null;
            currentDisplayedBalance = 0;
            if (pollInterval) clearInterval(pollInterval);
            
            anime({
                targets: '#connected-state-container > section',
                opacity: 0,
                translateY: 20,
                duration: 400,
                easing: 'easeInQuad',
                complete: () => {
                    connectedStateContainer.classList.add('hidden');
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

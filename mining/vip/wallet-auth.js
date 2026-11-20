(function () {
    "use strict";

    const wallets = new Map();
    const standardApi = Object.freeze({ register: (...items) => items.forEach(registerWallet) });
    let modal = null;
    let selectedWallet = null;
    let selectedAccount = null;
    let currentWalletAddress = null;
    let metamaskClientPromise = null;

    function announce(message) {
        if (typeof window.showActionMessage === "function") {
            window.showActionMessage(message);
        } else {
            const status = document.getElementById("wallet-status");
            if (status) status.textContent = message;
            window.dispatchEvent(new CustomEvent("synbai:wallet-status", { detail: { message } }));
        }
    }

    async function refreshWalletInventory() {
        if (typeof window.updateInventory === "function") await window.updateInventory();
    }

    async function setDashboardWallet(address) {
        if (typeof window.setSynbaiWalletAddress === "function") {
            await window.setSynbaiWalletAddress(address);
        }
    }

    function registerWallet(wallet) {
        if (!wallet || !wallet.name || !wallet.features || !wallet.features["standard:connect"]) return;
        if (!wallet.chains || !wallet.chains.some(chain => chain.startsWith("solana:"))) return;
        wallets.set(wallet.name, wallet);
        renderWallets();
    }

    window.addEventListener("wallet-standard:register-wallet", event => {
        if (typeof event.detail === "function") event.detail(standardApi);
    });
    window.dispatchEvent(new CustomEvent("wallet-standard:app-ready", { detail: standardApi }));

    async function loadMetaMask() {
        if (!metamaskClientPromise) {
            metamaskClientPromise = import("https://esm.sh/@metamask/connect-solana@2.1.1?bundle")
                .then(async module => {
                    const client = await module.createSolanaClient({
                        dapp: {
                            name: "SYNBAI Mining",
                            url: window.location.origin,
                            iconUrl: window.location.origin + "/logo-synbai.png"
                        }
                    });
                    if (typeof client.registerWallet === "function") await client.registerWallet();
                    const wallet = client.getWallet();
                    registerWallet(wallet);
                    return client;
                });
        }
        return metamaskClientPromise;
    }

    function addStyles() {
        if (document.getElementById("synbai-wallet-styles")) return;
        const style = document.createElement("style");
        style.id = "synbai-wallet-styles";
        style.textContent = ".synbai-wallet-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px}.synbai-wallet-overlay[hidden]{display:none!important}.synbai-wallet-dialog{width:min(440px,100%);background:#0a0f1d;border:1px solid rgba(74,222,128,.4);border-radius:20px;padding:24px;box-shadow:0 20px 70px rgba(0,0,0,.65);color:#e2e8f0;font-family:sans-serif}.synbai-wallet-dialog h2{margin:0 0 8px;color:#fff;font-size:20px}.synbai-wallet-dialog p{margin:0 0 16px;color:#94a3b8;font-size:14px}.synbai-wallet-list{display:grid;gap:10px}.synbai-wallet-choice,.synbai-wallet-close{border-radius:10px;padding:12px 14px;font-weight:700;cursor:pointer}.synbai-wallet-choice{background:#101a2a;border:1px solid #263449;color:#e2e8f0;text-align:left}.synbai-wallet-choice:hover{border-color:#4ade80}.synbai-wallet-close{margin-top:14px;width:100%;background:transparent;border:1px solid #475569;color:#cbd5e1}.synbai-wallet-status{min-height:20px;margin-top:12px!important;color:#94a3b8!important}";
        document.head.appendChild(style);
    }

    function openPicker() {
        addStyles();
        if (!modal) {
            modal = document.createElement("div");
            modal.className = "synbai-wallet-overlay";
            modal.innerHTML = '<section class="synbai-wallet-dialog" role="dialog" aria-modal="true" aria-labelledby="synbai-wallet-title"><h2 id="synbai-wallet-title">Connect a Solana wallet</h2><p>Choose Phantom, Solflare, MetaMask, or another Wallet Standard wallet. Message signing verifies your address and does not submit a blockchain transaction.</p><div class="synbai-wallet-list"></div><p class="synbai-wallet-status" role="status"></p><button type="button" class="synbai-wallet-close">Close</button></section>';
            modal.addEventListener("click", event => { if (event.target === modal) closePicker(); });
            modal.querySelector(".synbai-wallet-close").addEventListener("click", closePicker);
            document.body.appendChild(modal);
        }
        modal.hidden = false;
        modal.style.display = "flex";
        renderWallets();
        loadMetaMask().then(renderWallets).catch(() => {
            if (modal && !wallets.size) setWalletStatus("MetaMask Connect did not load. Check your connection and try again.");
        });
    }

    function closePicker() {
        if (modal) {
            modal.hidden = true;
            modal.style.display = "none";
        }
    }

    function setWalletStatus(message) {
        if (!modal) return;
        const status = modal.querySelector(".synbai-wallet-status");
        if (status) status.textContent = message;
    }

    function renderWallets() {
        if (!modal) return;
        const list = modal.querySelector(".synbai-wallet-list");
        list.replaceChildren();
        const providers = [
            ["Phantom", window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null)],
            ["Solflare", window.solflare || (window.solana?.isSolflare ? window.solana : null)]
        ];
        const available = providers.map(([name, provider]) => {
            const standard = [...wallets.values()].find(wallet =>
                wallet.name.toLowerCase() === name.toLowerCase() && wallet.features["solana:signMessage"]);
            if (standard) return standard;
            if (typeof provider?.connect !== "function" || typeof provider?.signMessage !== "function") return { name };
            return {
                name,
                features: {
                    "standard:connect": { async connect() {
                        const result = await provider.connect();
                        const address = (result?.publicKey || provider.publicKey)?.toString();
                        return { accounts: address ? [{ address }] : [] };
                    } },
                    "standard:disconnect": { disconnect: () => provider.disconnect?.() },
                    "solana:signMessage": { async signMessage({ message }) {
                        const result = await provider.signMessage(message, "utf8");
                        return { signature: result.signature || result };
                    } }
                }
            };
        });
        available.push(...[...wallets.values()].filter(wallet =>
            !providers.some(([name]) => name.toLowerCase() === wallet.name.toLowerCase())));
        available.forEach(wallet => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "synbai-wallet-choice";
            button.textContent = wallet.name;
            button.addEventListener("click", () => {
                if (wallet.features) return signIn(wallet);
                setWalletStatus(wallet.name + " was not detected. Open this page in Chrome or Edge with the extension enabled and unlocked, then reload.");
            });
            list.appendChild(button);
        });
    }

    async function postJson(path, body) {
        const response = await fetch(path, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || "The wallet request failed.");
        return data;
    }

    function encodeBase64(bytesLike) {
        const bytes = new Uint8Array(bytesLike);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
    }

    async function signIn(wallet) {
        setWalletStatus("Waiting for wallet confirmation...");
        const buttons = modal.querySelectorAll("button");
        buttons.forEach(button => { button.disabled = true; });
        try {
            const connect = wallet.features["standard:connect"];
            const connected = await connect.connect();
            const account = connected.accounts && connected.accounts[0];
            if (!account || !account.address) throw new Error("The wallet did not return a Solana account.");
            const signFeature = wallet.features["solana:signMessage"];
            if (!signFeature || typeof signFeature.signMessage !== "function") throw new Error("This wallet does not support Solana message signing.");
            const challenge = await postJson("/vip/api/auth/nonce", { wallet_address: account.address });
            const signed = await signFeature.signMessage({ account, message: new TextEncoder().encode(challenge.message) });
            const result = Array.isArray(signed) ? signed[0] : signed;
            if (!result || !result.signature) throw new Error("The wallet did not return a signature.");
            await postJson("/vip/api/auth/verify", {
                wallet_address: account.address,
                nonce: challenge.nonce,
                signature: encodeBase64(result.signature)
            });
            selectedWallet = wallet;
            selectedAccount = account.address;
            currentWalletAddress = account.address;
            await setDashboardWallet(currentWalletAddress);
            updateWalletButton(account.address);
            closePicker();
            announce("Wallet authenticated. This connection is read-only; no blockchain transaction was sent.");
            watchAccount(wallet, account.address);
            await refreshWalletInventory();
        } catch (error) {
            setWalletStatus(error && error.code === 4001
                ? "Wallet signing was cancelled."
                : "Wallet authentication failed. Please try again.");
        } finally {
            buttons.forEach(button => { button.disabled = false; });
        }
    }

    function watchAccount(wallet, address) {
        const events = wallet.features && wallet.features["standard:events"];
        if (!events || typeof events.on !== "function") return;
        events.on("change", event => {
            const accounts = event && event.accounts;
            if (Array.isArray(accounts) && !accounts.some(account => account.address === address)) disconnectWallet(false);
        });
    }

    function updateWalletButton(address) {
        const button = document.getElementById("wallet-connect-btn");
        if (!button) return;
        if (button.hasAttribute("data-full-address")) {
            button.textContent = address || "Connect Wallet";
            button.disabled = Boolean(address);
            const disconnect = document.getElementById("wallet-disconnect-btn");
            if (disconnect) disconnect.hidden = !address;
        } else {
            button.textContent = address ? address.slice(0, 4) + "..." + address.slice(-4) : "Connect Wallet";
        }
        button.classList.toggle("connected", Boolean(address));
    }

    async function restoreSession() {
        try {
            const response = await fetch(window.snbaiApiUrl("/vip/api/auth/session"), { credentials: "include" });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.authenticated || !data.wallet_address) return;
            currentWalletAddress = data.wallet_address;
            await setDashboardWallet(currentWalletAddress);
            updateWalletButton(currentWalletAddress);
            await refreshWalletInventory();
        } catch (_) { /* Offline or not signed in. */ }
    }

    async function disconnectWallet(callWallet = true) {
        try { await postJson("/vip/api/auth/logout", {}); } catch (_) { }
        if (callWallet && selectedWallet) {
            try {
                const disconnect = selectedWallet.features["standard:disconnect"];
                if (disconnect && typeof disconnect.disconnect === "function") await disconnect.disconnect();
            } catch (_) { }
        }
        selectedWallet = null;
        selectedAccount = null;
        currentWalletAddress = null;
        await setDashboardWallet(null);
        updateWalletButton(null);
        await refreshWalletInventory();
        announce("Wallet disconnected.");
    }

    async function connectWallet() {
        if (currentWalletAddress) return disconnectWallet();
        openPicker();
    }

    window.connectWallet = connectWallet;
    window.disconnectSolanaWallet = disconnectWallet;
    restoreSession();
})();




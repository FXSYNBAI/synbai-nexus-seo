(function () {
    "use strict";

    const wallets = new Map();
    const API_BASE = new URL(window.SYNBAI_API_BASE || "https://api.fxsynbai.eu/api/mining").href.replace(/\/*$/, "");
    const standardApi = Object.freeze({ register: (...items) => items.forEach(registerWallet) });
    let metamaskClientPromise = null;
    let modal = null;
    let authenticatedAddress = null;
    let selectedWallet = null;
    let selectedAccount = null;

    function registerWallet(wallet) {
        if (!wallet || !wallet.name || !wallet.features?.["standard:connect"]) return;
        if (!wallet.chains?.some(chain => chain.startsWith("solana:"))) return;
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
                            iconUrl: window.location.origin + "/mining/logo-synbai.png"
                        }
                    });
                    if (typeof client.registerWallet === "function") await client.registerWallet();
                    return client;
                });
        }
        return metamaskClientPromise;
    }

    function discoverLegacyWallets() {
        const providers = [
            ["Phantom", window.phantom?.solana],
            ["Solflare", window.solflare]
        ];
        providers.forEach(([name, provider]) => {
            if (!provider?.connect || !provider?.signMessage) return;
            registerWallet({
                name,
                chains: ["solana:mainnet"],
                features: {
                    "standard:connect": { connect: async () => {
                        const response = await provider.connect();
                        const address = response?.publicKey?.toString() || provider.publicKey?.toString();
                        return { accounts: address ? [{ address, chains: ["solana:mainnet"] }] : [] };
                    } },
                    "solana:signMessage": { signMessage: async ({ message }) => {
                        const response = await provider.signMessage(message, "utf8");
                        return [{ signature: response?.signature || response }];
                    } },
                    "standard:disconnect": { disconnect: () => provider.disconnect?.() }
                }
            });
        });
    }

    function addStyles() {
        if (document.getElementById("synbai-wallet-styles")) return;
        const style = document.createElement("style");
        style.id = "synbai-wallet-styles";
        style.textContent = ".synbai-wallet-overlay{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:20px}.synbai-wallet-overlay[hidden]{display:none!important}.synbai-wallet-dialog{width:min(440px,100%);background:#0a0f1d;border:1px solid rgba(74,222,128,.4);border-radius:20px;padding:24px;box-shadow:0 20px 70px rgba(0,0,0,.65);color:#e2e8f0;font-family:sans-serif}.synbai-wallet-dialog h2{margin:0 0 8px;color:#fff;font-size:20px}.synbai-wallet-dialog p{margin:0 0 16px;color:#94a3b8;font-size:14px}.synbai-wallet-list{display:grid;gap:10px}.synbai-wallet-choice,.synbai-wallet-close{border-radius:10px;padding:12px 14px;font-weight:700;cursor:pointer}.synbai-wallet-choice{background:#101a2a;border:1px solid #263449;color:#e2e8f0;text-align:left}.synbai-wallet-choice:hover{border-color:#4ade80}.synbai-wallet-close{margin-top:14px;width:100%;background:transparent;border:1px solid #475569;color:#cbd5e1}.synbai-wallet-status{min-height:20px;margin-top:12px!important;color:#94a3b8!important}";
        document.head.appendChild(style);
    }

    function setAuthenticatedAddress(address) {
        authenticatedAddress = address || null;
        document.querySelectorAll("#connect-wallet-btn, #wallet-btn, #wallet-connect-btn").forEach(button => {
            button.textContent = authenticatedAddress
                ? `🟢 ${authenticatedAddress.slice(0, 4)}…${authenticatedAddress.slice(-4)} · Disconnect`
                : "🔴 Connect Solana Wallet";
            button.classList.toggle("connected", Boolean(authenticatedAddress));
            button.setAttribute("aria-label", authenticatedAddress ? `Authenticated wallet ${authenticatedAddress}; click to disconnect` : "Connect Solana wallet");
        });
        if (typeof window.onSynbaiWalletAuthChanged === "function") {
            window.onSynbaiWalletAuthChanged(authenticatedAddress);
        }
    }

    function setStatus(message) {
        const status = modal?.querySelector(".synbai-wallet-status");
        if (status) status.textContent = message;
    }

    function ensurePicker() {
        addStyles();
        if (modal) return;
        modal = document.createElement("div");
        modal.className = "synbai-wallet-overlay";
        modal.hidden = true;
        const dialog = document.createElement("section");
        dialog.className = "synbai-wallet-dialog";
        dialog.setAttribute("role", "dialog");
        dialog.setAttribute("aria-modal", "true");
        dialog.setAttribute("aria-labelledby", "synbai-wallet-title");
        const heading = document.createElement("h2");
        heading.id = "synbai-wallet-title";
        heading.textContent = "Connect a Solana wallet";
        const intro = document.createElement("p");
        intro.textContent = "Choose Phantom or MetaMask. Signing proves wallet ownership and does not submit a transaction.";
        const list = document.createElement("div");
        list.className = "synbai-wallet-list";
        const status = document.createElement("p");
        status.className = "synbai-wallet-status";
        status.setAttribute("role", "status");
        const close = document.createElement("button");
        close.type = "button";
        close.className = "synbai-wallet-close";
        close.textContent = "Close";
        close.addEventListener("click", closePicker);
        dialog.append(heading, intro, list, status, close);
        modal.appendChild(dialog);
        modal.addEventListener("click", event => { if (event.target === modal) closePicker(); });
        document.body.appendChild(modal);
    }

    function openPicker() {
        ensurePicker();
        discoverLegacyWallets();
        modal.hidden = false;
        renderWallets();
        loadMetaMask().then(renderWallets).catch(() => renderWallets());
        modal.querySelector(".synbai-wallet-close").focus();
    }

    function closePicker() {
        if (modal) modal.hidden = true;
    }

    function renderWallets() {
        if (!modal) return;
        const list = modal.querySelector(".synbai-wallet-list");
        list.replaceChildren();
        const available = [...wallets.values()].sort((a, b) => a.name.localeCompare(b.name));
        if (!available.length) {
            const message = document.createElement("p");
            message.textContent = "No compatible Solana wallet was detected. Install or unlock Phantom or Solflare, then reload this page.";
            list.appendChild(message);
            return;
        }
        available.forEach(wallet => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "synbai-wallet-choice";
            button.textContent = wallet.name;
            button.addEventListener("click", () => signIn(wallet));
            list.appendChild(button);
        });
    }

    async function postJson(path, body) {
        const response = await fetch(new URL(String(path).replace(/^\/+/, ""), API_BASE.replace(/\/*$/, "") + "/"), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || `Request failed (${response.status}).`);
        return data;
    }

    function encodeBase64(bytesLike) {
        const bytes = new Uint8Array(bytesLike);
        let binary = "";
        for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
        return btoa(binary);
    }

    async function signIn(wallet) {
        setStatus("Approve the wallet connection, then review and sign the login message.");
        const buttons = modal.querySelectorAll("button");
        buttons.forEach(button => { button.disabled = true; });
        try {
            const connected = await wallet.features["standard:connect"].connect();
            const account = connected.accounts?.find(item => item.chains?.some(chain => chain.startsWith("solana:"))) || connected.accounts?.[0];
            if (!account?.address) throw new Error("The wallet did not provide a Solana account.");

            const challenge = await fetchNonce(account.address);
            let signed;
            const standardSign = wallet.features["solana:signMessage"];
            if (standardSign && typeof standardSign.signMessage === "function") {
                signed = await standardSign.signMessage({ account, message: new TextEncoder().encode(challenge.message) });
            } else {
                const provider = wallet.name.toLowerCase().includes("phantom") ? window.phantom?.solana : window.solflare;
                if (!provider || typeof provider.signMessage !== "function") throw new Error("This wallet does not support Solana message signing.");
                signed = await provider.signMessage(new TextEncoder().encode(challenge.message), "utf8");
            }
            const signature = Array.isArray(signed) ? signed[0]?.signature : signed?.signature;
            if (!challenge || !signature) throw new Error("The wallet did not return a valid login signature.");
            await postJson("/api/auth/verify", {
                wallet_address: account.address,
                nonce: challenge.nonce,
                signature: encodeBase64(signature)
            });
            selectedWallet = wallet;
            selectedAccount = account.address;
            closePicker();
            setAuthenticatedAddress(account.address);
            watchAccount(wallet, account.address);
        } catch (error) {
            setStatus(error?.code === 4001 ? "Signing was cancelled." : (error.message || "Wallet authentication failed."));
        } finally {
            buttons.forEach(button => { button.disabled = false; });
        }
    }

    async function fetchNonce(address) {
        return postJson("/api/auth/nonce", { wallet_address: address });
    }

    function watchAccount(wallet, address) {
        const events = wallet.features?.["standard:events"];
        if (events && typeof events.on === "function") {
            events.on("change", event => {
                const accounts = event?.accounts;
                if (Array.isArray(accounts) && !accounts.some(account => account.address === address)) disconnectWallet(false);
            });
        }
        const provider = wallet.name.toLowerCase().includes("phantom") ? window.phantom?.solana : window.solflare;
        provider?.on?.("accountChanged", next => {
            if (!next || next.toString() !== address) disconnectWallet(false);
        });
    }

    async function restoreSession() {
        try {
            const response = await fetch(new URL("api/auth/session", API_BASE.replace(/\/*$/, "") + "/"), {
                credentials: "include",
                headers: { Accept: "application/json" }
            });
            if (!response.ok) return;
            const data = await response.json();
            if (data.authenticated && typeof data.wallet_address === "string") setAuthenticatedAddress(data.wallet_address);
        } catch (_) { /* The server session cannot be confirmed while offline. */ }
    }

    async function disconnectWallet(callWallet = true) {
        try { await postJson("/api/auth/logout", {}); } catch (_) { /* The server session may already be expired. */ }
        if (callWallet && selectedWallet) {
            try { await selectedWallet.features["standard:disconnect"]?.disconnect?.(); } catch (_) { /* Ignore wallet UI disconnect failures. */ }
        }
        selectedWallet = null;
        selectedAccount = null;
        setAuthenticatedAddress(null);
    }

    async function connectWallet() {
        if (authenticatedAddress) return disconnectWallet();
        openPicker();
    }

    document.querySelectorAll("#connect-wallet-btn, #wallet-connect-btn").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            connectWallet();
        });
    });
    window.connectWallet = connectWallet;
    window.disconnectSolanaWallet = disconnectWallet;
    window.addEventListener("load", restoreSession, { once: true });
})();

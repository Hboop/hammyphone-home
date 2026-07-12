const API_URL = "https://api.hammyphone.com/api/status";
const REFRESH_INTERVAL = 30000;

const services = [
    {
        id: "camera",
        name: "P1S",
        url: "https://camera.hammyphone.com",
        description: "Live view of the Bambu Lab P1S printer and workspace.",
        icon: "◉",
        glow: "rgba(255, 105, 112, .20)",
        span: 3
    },
    {
        id: "garage",
        name: "Garage",
        url: "https://garage.hammyphone.com",
        description: "Garage door status, control, and home arrival tools.",
        icon: "⌂",
        glow: "rgba(68, 215, 167, .18)",
        span: 3
    },
    {
        id: "files",
        name: "Files",
        url: "https://files.hammyphone.com",
        description: "Private browser access to shared files and storage.",
        icon: "▱",
        glow: "rgba(130, 102, 255, .16)",
        span: 2
    },
    {
        id: "jellyfin",
        name: "Jellyfin",
        url: "https://jelly.hammyphone.com",
        description: "Your personal media library.",
        icon: "▶",
        glow: "rgba(126, 102, 255, .16)",
        span: 2
    },
    {
        id: "projects",
        name: "Projects",
        url: "https://github.com/Hboop",
        description: "ESP32 builds, vehicle tools, automations, and experiments.",
        icon: "⌘",
        glow: "rgba(255, 183, 87, .15)",
        span: 2,
        external: true,
        staticDetail: "GitHub · Hboop"
    }
];

const template = document.getElementById("service-card-template");
const grid = document.getElementById("services");
const refreshButton = document.getElementById("refresh-button");
const cards = new Map();

let lastCheckedAt = null;

for (const service of services) {
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector(".service-card");

    card.href = service.url;
    card.style.setProperty("--glow", service.glow);
    card.style.setProperty("--span", service.span);

    if (service.external) {
        card.target = "_blank";
        card.rel = "noopener noreferrer";
    }

    fragment.querySelector(".service-icon").textContent = service.icon;
    fragment.querySelector("h3").textContent = service.name;
    fragment.querySelector(".description").textContent = service.description;
    fragment.querySelector(".detail").textContent =
        service.staticDetail || new URL(service.url).hostname;

    cards.set(service.id, {
        dot: fragment.querySelector(".service-status .dot"),
        status: fragment.querySelector(".status-text"),
        detail: fragment.querySelector(".detail")
    });

    grid.appendChild(fragment);
}

document.getElementById("service-count").textContent = services.length;
document.getElementById("year").textContent =
    `© ${new Date().getFullYear()} Hamlet Rodriguez`;

function updateClock() {
    const now = new Date();

    document.getElementById("clock").textContent =
        now.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit"
        });

    const hour = now.getHours();

    const greeting =
        hour < 12
            ? "Good morning, Hamlet."
            : hour < 18
                ? "Good afternoon, Hamlet."
                : "Good evening, Hamlet.";

    document.getElementById("greeting").textContent = greeting;

    if (lastCheckedAt) {
        const seconds = Math.max(
            0,
            Math.floor((Date.now() - lastCheckedAt.getTime()) / 1000)
        );

        document.getElementById("last-check").textContent =
            seconds < 5
                ? "Checked just now"
                : `Checked ${seconds} seconds ago`;
    }
}

function setServiceState(id, state) {
    const card = cards.get(id);
    const service = services.find(item => item.id === id);

    if (!card || !service) {
        return;
    }

    const online = state?.online;

    card.dot.className =
        `dot ${
            online === true
                ? "online"
                : online === false
                    ? "offline"
                    : "unknown"
        }`;

    card.status.textContent =
        online === true
            ? "Online"
            : online === false
                ? "Offline"
                : "Unknown";

    card.detail.textContent =
        state?.detail ||
        service.staticDetail ||
        new URL(service.url).hostname;
}

function updateSummary(payload) {
    const states = services
        .map(service => payload.services?.[service.id])
        .filter(Boolean);

    const online = states.filter(state => state.online === true).length;
    const offline = states.filter(state => state.online === false).length;

    document.getElementById("online-count").textContent =
        states.length ? online : "—";

    document.getElementById("offline-count").textContent =
        states.length ? offline : "—";

    const dot = document.getElementById("summary-dot");
    const text = document.getElementById("summary-text");

    if (!states.length) {
        dot.className = "dot unknown";
        text.textContent = "Status API unavailable";
        document.getElementById("last-check").textContent =
            "Unable to retrieve status";
        lastCheckedAt = null;
    } else if (offline === 0) {
        dot.className = "dot online";
        text.textContent = "All systems operational";
    } else {
        dot.className = "dot offline";
        text.textContent =
            `${offline} service${offline === 1 ? "" : "s"} offline`;
    }
}

async function refreshStatus() {
    refreshButton.classList.add("loading");
    refreshButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            cache: "no-store",
            headers: {
                Accept: "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();

        for (const service of services) {
            setServiceState(
                service.id,
                payload.services?.[service.id]
            );
        }

        lastCheckedAt = payload.checked_at
            ? new Date(payload.checked_at)
            : new Date();

        updateSummary(payload);
        updateClock();
    } catch (error) {
        for (const service of services) {
            setServiceState(service.id, null);
        }

        updateSummary({
            services: {}
        });

        console.error("Status API unavailable:", error);
    } finally {
        refreshButton.classList.remove("loading");
        refreshButton.disabled = false;
    }
}

refreshButton.addEventListener("click", refreshStatus);

updateClock();
refreshStatus();

setInterval(updateClock, 1000);
setInterval(refreshStatus, REFRESH_INTERVAL);

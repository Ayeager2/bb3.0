export async function fetchDashboardState() {
    const response = await fetch("/state", {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch dashboard state: ${response.status}`);
    }

    return response.json();
}

export async function fetchDashboardEvents() {
    const response = await fetch("/events", {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch dashboard events: ${response.status}`);
    }

    return response.json();
}

export async function fetchNetworkTopology() {
    const response = await fetch("/topology", {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch topology: ${response.status}`);
    }

    return response.json();
}

export async function sendDashboardCommand(command) {
    const response = await fetch("/command", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ command }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result?.error ?? `Command failed: ${response.status}`);
    }

    return result;
}

export async function fetchCommandStatus() {
    const response = await fetch("/command/status", {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch command status: ${response.status}`);
    }

    return response.json();
}
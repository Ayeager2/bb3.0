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
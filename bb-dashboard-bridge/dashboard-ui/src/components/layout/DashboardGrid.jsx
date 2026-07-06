import { useState, useEffect, useMemo } from "react";
import { FiCpu, FiGitBranch, FiServer, FiSettings, FiTrendingUp, FiUsers, FiZap } from "react-icons/fi";

import NetworkTopologyCard from "../cards/NetworkTopologyCard.jsx";
import ServerTickerCard from "../cards/ServerTickerCard.jsx";
import StockPortfolioCard from "../cards/StockPortfolioCard.jsx";
import HacknetMoneyCard from "../cards/HacknetMoneyCard.jsx";
import AugmentationTreeCard from "../cards/AugmentationTreeCard.jsx";
import GangCard from "../cards/GangCard.jsx";
import DashboardControlPanel from "../settings/DashboardControlPanel.jsx";

const DEFAULT_CARD_ORDER = [
    "gang",
    "hacknetMoney",
    "serverTicker",
    "augmentationTree",
    "stockPortfolio",
    "networkTopology",
];

const BN2_CARD_ORDER = [
    "gang",
    "serverTicker",
    "hacknetMoney",
    "augmentationTree",
    "networkTopology",
];

const DEFAULT_VISIBLE = {
    serverTicker: false,
    gang: false,
};

const CARD_STORAGE_KEY = "bbdash-card-layout-v4";

const CARD_REGISTRY = {
    gang: { title: "Gang Command", component: GangCard, icon: FiUsers },
    networkTopology: { title: "Network Topology", component: NetworkTopologyCard, icon: FiGitBranch },
    serverTicker: { title: "Server Ticker", component: ServerTickerCard, icon: FiServer },
    stockPortfolio: { title: "Stock Checker", component: StockPortfolioCard, icon: FiTrendingUp },
    hacknetMoney: { title: "Hacknet Hash Forge", component: HacknetMoneyCard, icon: FiCpu },
    augmentationTree: { title: "Augmentation Status", component: AugmentationTreeCard, icon: FiZap },
};

export default function DashboardGrid({
    state,
    events = [],
    topology = { nodes: [], edges: [] },
    toastSettings,
    onToastSettingsChange,
    workspaceSettings,
    onWorkspaceSettingsChange,
    fontOffset,
    onFontOffsetChange,
    themeAccent,
    activeAccent,
    onThemeAccentChange,
    themeSignal,
    activeSignal,
    onThemeSignalChange,
    gangSpriteSettings,
    onGangSpriteSettingsChange,
}) {
    const [layout, setLayout] = useState(() => loadLayout());
    const [settingsOpen, setSettingsOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(layout));
    }, [layout]);

    const orderedCards = useMemo(() => {
        const bitNode = Number(state?.bitnode?.number);
        const isBn2 = bitNode === 2;
        const isBn9 = Number(state?.bitnode?.number) === 9;
        const order =
            isBn2
                ? [
                    ...BN2_CARD_ORDER,
                    ...layout.order.filter(id => !BN2_CARD_ORDER.includes(id)),
                ]
                : layout.order;

        return order
            .filter(id => CARD_REGISTRY[id])
            .filter(id => !(isBn2 && id === "stockPortfolio"))
            .filter(id => !(isBn9 && id === "serverTicker"))
            .filter(id => isAutoVisible(id, bitNode, layout.visible));
    }, [layout.order, layout.visible, state?.bitnode?.number]);

    const activeCards = useMemo(() => {
        return orderedCards.filter(id => layout.collapsed[id] !== true);
    }, [orderedCards, layout.collapsed]);

    const minimizedCards = useMemo(() => {
        return orderedCards.filter(id => layout.collapsed[id] === true);
    }, [orderedCards, layout.collapsed]);

    function toggleCard(id) {
        setLayout(current => ({
            ...current,
            collapsed: {
                ...current.collapsed,
                [id]: !current.collapsed[id],
            },
        }));
    }

    function toggleVisible(id) {
        setLayout(current => ({
            ...current,
            visible: {
                ...current.visible,
                [id]: current.visible[id] === false,
            },
        }));
    }

    function setCardSize(id, size) {
        setLayout(current => ({
            ...current,
            sizes: {
                ...(current.sizes ?? {}),
                [id]: size,
            },
        }));
    }

    function moveCard(id, direction) {
        setLayout(current => {
            const order = [...current.order,];
            const index = order.indexOf(id);
            const nextIndex = index + direction;

            if (index < 0 || nextIndex < 0 || nextIndex >= order.length) {
                return current;
            }

            [order[index], order[nextIndex]] = [order[nextIndex], order[index]];

            return {
                ...current,
                order,
            };
        });
    }

    function resetLayout() {
        setLayout(defaultLayout());
    }

    if (!state) {
        return (
            <>
                <SettingsButton onClick={() => setSettingsOpen(open => !open)} active={settingsOpen} />

                <div className="grid">
                    <section className="card card-full">
                        <div className="card-title">No State</div>
                        <div className="card-body red">No dashboard state loaded.</div>
                    </section>
                </div>

                <DashboardControlPanel
                    open={settingsOpen}
                    layout={layout}
                    registry={CARD_REGISTRY}
                    onClose={() => setSettingsOpen(false)}
                    onToggleVisible={toggleVisible}
                    onSetCardSize={setCardSize}
                    onReset={resetLayout}
                    toastSettings={toastSettings}
                    onToastSettingsChange={onToastSettingsChange}
                    workspaceSettings={workspaceSettings}
                    onWorkspaceSettingsChange={onWorkspaceSettingsChange}
                    fontOffset={fontOffset}
                    onFontOffsetChange={onFontOffsetChange}
                    themeAccent={themeAccent}
                    activeAccent={activeAccent}
                    onThemeAccentChange={onThemeAccentChange}
                    themeSignal={themeSignal}
                    activeSignal={activeSignal}
                    onThemeSignalChange={onThemeSignalChange}
                    gangSpriteSettings={gangSpriteSettings}
                    onGangSpriteSettingsChange={onGangSpriteSettingsChange}
                />
            </>
        );
    }

    return (
        <>
            <main className="grid">
                {activeCards.map(id => {
                    const config = CARD_REGISTRY[id];
                    const Component = config.component;

                    return (
                        <Component
                            key={id}
                            id={id}
                            state={state}
                            events={events}
                            topology={topology}
                            workspaceSettings={workspaceSettings}
                            layoutSize={layout.sizes?.[id]}
                            collapsed={layout.collapsed[id] === true}
                            onToggle={() => toggleCard(id)}
                            onMoveUp={() => moveCard(id, -1)}
                            onMoveDown={() => moveCard(id, 1)}
                        />
                    );
                })}
            </main>

            <MinimizedCardDock
                cards={minimizedCards}
                registry={CARD_REGISTRY}
                onRestore={toggleCard}
            />

            <SettingsButton onClick={() => setSettingsOpen(open => !open)} active={settingsOpen} />

            <DashboardControlPanel
                open={settingsOpen}
                layout={layout}
                registry={CARD_REGISTRY}
                onClose={() => setSettingsOpen(false)}
                onToggleVisible={toggleVisible}
                onSetCardSize={setCardSize}
                onReset={resetLayout}
                toastSettings={toastSettings}
                onToastSettingsChange={onToastSettingsChange}
                workspaceSettings={workspaceSettings}
                onWorkspaceSettingsChange={onWorkspaceSettingsChange}
                fontOffset={fontOffset}
                onFontOffsetChange={onFontOffsetChange}
                themeAccent={themeAccent}
                activeAccent={activeAccent}
                onThemeAccentChange={onThemeAccentChange}
                themeSignal={themeSignal}
                activeSignal={activeSignal}
                onThemeSignalChange={onThemeSignalChange}
                gangSpriteSettings={gangSpriteSettings}
                onGangSpriteSettingsChange={onGangSpriteSettingsChange}
            />
        </>
    );
}

function MinimizedCardDock({ cards, registry, onRestore }) {
    if (cards.length === 0) return null;

    return (
        <aside className="minimized-card-dock" aria-label="Minimized dashboard cards">
            {cards.map(id => {
                const config = registry[id];
                const Icon = config?.icon ?? FiZap;

                return (
                    <button
                        key={id}
                        className="minimized-card-tab"
                        onClick={() => onRestore(id)}
                        title={`Restore ${config?.title ?? id}`}
                    >
                        <Icon />
                        <span>{config?.title ?? id}</span>
                    </button>
                );
            })}
        </aside>
    );
}

function SettingsButton({ onClick, active = false }) {
    return (
        <button
            className={`settings-gear ${active ? "active" : ""}`}
            onClick={onClick}
            title={active ? "Close dashboard control panel" : "Open dashboard control panel"}
            type="button"
        >
            <FiSettings />
        </button>
    );
}

function loadLayout() {
    try {
        const saved = JSON.parse(localStorage.getItem(CARD_STORAGE_KEY) || "null");
        if (!saved?.order) throw new Error("No saved layout.");

        const mergedOrder = [
            ...saved.order.filter(id => DEFAULT_CARD_ORDER.includes(id)),
            ...DEFAULT_CARD_ORDER.filter(id => !saved.order.includes(id)),
        ];

        return {
            order: mergedOrder,
            collapsed: saved.collapsed ?? {},
            visible: {
                ...Object.fromEntries(DEFAULT_CARD_ORDER.map(id => [id, true])),
                ...DEFAULT_VISIBLE,
                ...(saved.visible ?? {}),
            },
            sizes: saved.sizes ?? {},
        };
    } catch {
        return defaultLayout();
    }
}

function defaultLayout() {
    return {
        order: DEFAULT_CARD_ORDER,
        collapsed: {},
        visible: {
            ...Object.fromEntries(DEFAULT_CARD_ORDER.map(id => [id, true])),
            ...DEFAULT_VISIBLE,
        },
        sizes: {},
    };
}

function isAutoVisible(id, bitNode, visible = {}) {
    if (visible[id] === false) return false;
    if (visible[id] === true) return true;

    if (bitNode === 2) {
        if (id === "gang") return true;
        if (id === "serverTicker") return true;
        if (id === "stockPortfolio") return false;
    }

    if (id === "gang" && bitNode !== 2) return visible[id] === true;

    return true;
}

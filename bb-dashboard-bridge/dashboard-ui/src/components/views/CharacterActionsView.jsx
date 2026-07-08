import { useEffect, useMemo, useState } from "react";
import {
    FiBookOpen,
    FiCrosshair,
    FiDollarSign,
    FiRefreshCcw,
    FiShield,
    FiTarget,
    FiUserCheck,
    FiZap,
} from "react-icons/fi";

import { sendDashboardCommand } from "../../api/dashboardApi.js";
import "./CharacterActionsView.css";

const STUDY_ACTIONS = [
    { label: "Algorithms", course: "Algorithms" },
    { label: "Computer Science", course: "Study Computer Science" },
    { label: "Leadership", course: "Leadership" },
];

const CRIME_ACTIONS = ["Shoplift", "Rob Store", "Mug", "Larceny", "Homicide"];
const GYM_STATS = ["strength", "defense", "dexterity", "agility"];
const DEFAULT_FACTION_WORK_TYPES = ["hacking", "field", "security"];
const OFFICIAL_FACTIONS = [
    "CyberSec",
    "Tian Di Hui",
    "Netburners",
    "Shadows of Anarchy",
    "Sector-12",
    "Chongqing",
    "New Tokyo",
    "Ishima",
    "Aevum",
    "Volhaven",
    "NiteSec",
    "The Black Hand",
    "BitRunners",
    "ECorp",
    "MegaCorp",
    "KuaiGong International",
    "Four Sigma",
    "NWO",
    "Blade Industries",
    "OmniTek Incorporated",
    "Bachman & Associates",
    "Clarke Incorporated",
    "Fulcrum Secret Technologies",
    "Slum Snakes",
    "Tetrads",
    "Silhouette",
    "Speakers for the Dead",
    "The Dark Army",
    "The Syndicate",
    "The Covenant",
    "Illuminati",
    "Daedalus",
    "Bladeburners",
    "Church of the Machine God",
];

export default function CharacterActionsView({ state }) {
    const override = state?.characterOverride ?? {};
    const factionOptions = useFactionOptions(state);
    const [faction, setFaction] = useState(factionOptions[0] ?? "");
    const selectedFaction = faction || factionOptions[0] || "";
    const factionWorkTypes = getFactionWorkTypes(override, selectedFaction);
    const [focus, setFocus] = useState(false);
    const [donationAmount, setDonationAmount] = useState("");
    const [pending, setPending] = useState("");
    const [error, setError] = useState("");

    const activeLabel =
        override?.enabled === true
            ? override?.override?.label ?? override?.reason ?? "Manual override active"
            : "Daemon automation";

    useEffect(() => {
        if (!faction && factionOptions.length > 0) {
            setFaction(factionOptions[0]);
        }
    }, [faction, factionOptions]);

    async function runManualAction(payload) {
        setPending(payload.label ?? payload.action);
        setError("");

        try {
            await sendDashboardCommand("setCharacterAction", {
                ...payload,
                focus: String(focus),
            });
        } catch (actionError) {
            setError(String(actionError?.message ?? actionError));
        } finally {
            setPending("");
        }
    }

    async function resetToDaemon() {
        setPending("daemon");
        setError("");

        try {
            await sendDashboardCommand("clearCharacterActionOverride");
        } catch (actionError) {
            setError(String(actionError?.message ?? actionError));
        } finally {
            setPending("");
        }
    }

    async function buyMaxNeuroFlux() {
        setPending("NeuroFlux");
        setError("");

        try {
            await sendDashboardCommand("buyMaxNeuroFlux", {
                faction: selectedFaction.trim(),
            });
        } catch (actionError) {
            setError(String(actionError?.message ?? actionError));
        } finally {
            setPending("");
        }
    }

    async function donateFactionRep() {
        setPending("DonateRep");
        setError("");

        try {
            await sendDashboardCommand("donateFactionRep", {
                faction: selectedFaction.trim(),
                donationAmount: donationAmount.trim(),
            });
        } catch (actionError) {
            setError(String(actionError?.message ?? actionError));
        } finally {
            setPending("");
        }
    }

    return (
        <div className="character-actions-view">
            <section className={`character-control-hero ${override?.enabled ? "manual" : "daemon"}`}>
                <div>
                    <div className="character-kicker">Player Control</div>
                    <div className="character-mode">{override?.enabled ? "Manual" : "Daemon"}</div>
                    <div className="character-note">{activeLabel}</div>
                </div>

                <button
                    className="character-reset-button"
                    type="button"
                    onClick={resetToDaemon}
                    disabled={pending === "daemon"}
                    title="Return character control to daemon automation"
                >
                    <FiRefreshCcw />
                    Reset
                </button>
            </section>

            <label className="character-focus-toggle">
                <input
                    type="checkbox"
                    checked={focus}
                    onChange={event => setFocus(event.target.checked)}
                />
                <span>Focus work</span>
            </label>

            <ActionGroup title="Study" icon={<FiBookOpen />}>
                {STUDY_ACTIONS.map(action => (
                    <ActionButton
                        key={action.course}
                        icon={<FiZap />}
                        label={action.label}
                        pending={pending === action.label}
                        onClick={() => runManualAction({
                            action: "study",
                            label: action.label,
                            course: action.course,
                            university: "Rothman University",
                            city: "Sector-12",
                        })}
                    />
                ))}
            </ActionGroup>

            <ActionGroup title="Crime" icon={<FiTarget />}>
                {CRIME_ACTIONS.map(crime => (
                    <ActionButton
                        key={crime}
                        icon={<FiCrosshair />}
                        label={crime}
                        pending={pending === crime}
                        onClick={() => runManualAction({
                            action: "crime",
                            label: crime,
                            crime,
                        })}
                    />
                ))}
            </ActionGroup>

            <ActionGroup title="Faction Work" icon={<FiUserCheck />}>
                <select
                    className="character-faction-select"
                    value={selectedFaction}
                    onChange={event => setFaction(event.target.value)}
                >
                    {factionOptions.map(option => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <div className="character-action-grid">
                    {factionWorkTypes.map(workType => (
                        <ActionButton
                            key={`${faction}-${workType}`}
                            icon={getFactionWorkIcon(workType)}
                            label={getFactionWorkLabel(workType)}
                            disabled={!selectedFaction.trim()}
                            pending={pending === getFactionWorkLabel(workType)}
                            onClick={() => runManualAction({
                                action: "faction",
                                label: getFactionWorkLabel(workType),
                                faction: selectedFaction.trim(),
                                workType,
                            })}
                        />
                    ))}
                </div>
                <button
                    className="character-neuroflux-button"
                    type="button"
                    disabled={!selectedFaction.trim() || pending === "NeuroFlux"}
                    onClick={buyMaxNeuroFlux}
                    title={`Buy as many NeuroFlux Governor levels as possible from ${selectedFaction}`}
                >
                    <FiDollarSign />
                    <span>{pending === "NeuroFlux" ? "Buying..." : "Buy Max NeuroFlux Governor"}</span>
                </button>
                <div className="character-donation-control">
                    <input
                        value={donationAmount}
                        onChange={event => setDonationAmount(event.target.value)}
                        placeholder="Donation amount"
                        inputMode="decimal"
                    />
                    <button
                        type="button"
                        disabled={!selectedFaction.trim() || !donationAmount.trim() || pending === "DonateRep"}
                        onClick={donateFactionRep}
                        title={`Donate to ${selectedFaction} for reputation`}
                    >
                        <FiDollarSign />
                        <span>{pending === "DonateRep" ? "Donating..." : "Buy Rep"}</span>
                    </button>
                </div>
            </ActionGroup>

            <ActionGroup title="Gym" icon={<FiShield />}>
                {GYM_STATS.map(stat => (
                    <ActionButton
                        key={stat}
                        icon={<FiShield />}
                        label={formatStat(stat)}
                        pending={pending === formatStat(stat)}
                        onClick={() => runManualAction({
                            action: "gym",
                            label: formatStat(stat),
                            stat,
                            gym: "Powerhouse Gym",
                            city: "Sector-12",
                        })}
                    />
                ))}
            </ActionGroup>

            {error ? <div className="character-error">{error}</div> : null}
        </div>
    );
}

function ActionGroup({ title, icon, children }) {
    return (
        <section className="character-action-group">
            <div className="character-action-title">
                {icon}
                <span>{title}</span>
            </div>
            <div className="character-action-grid">{children}</div>
        </section>
    );
}

function ActionButton({ icon, label, pending, disabled, onClick }) {
    return (
        <button
            className="character-action-button"
            type="button"
            onClick={onClick}
            disabled={disabled || pending}
            title={label}
        >
            {icon}
            <span>{pending ? "..." : label}</span>
        </button>
    );
}

function useFactionOptions(state) {
    return useMemo(() => {
        const fromProfiles = Array.isArray(state?.augmentationIntel?.factionState?.profiles)
            ? state.augmentationIntel.factionState.profiles.map(profile => profile?.name)
            : [];
        const playerFactions = Array.isArray(state?.player?.factions)
            ? state.player.factions
            : [];

        return [...new Set([...playerFactions, ...fromProfiles, ...OFFICIAL_FACTIONS].filter(Boolean))];
    }, [state]);
}

function formatStat(stat) {
    return String(stat).slice(0, 1).toUpperCase() + String(stat).slice(1);
}

function getFactionWorkTypes(override, faction) {
    const workTypes = override?.factionWorkTypes?.[faction];

    if (!Array.isArray(workTypes) || workTypes.length === 0) {
        return DEFAULT_FACTION_WORK_TYPES;
    }

    return workTypes
        .map(normalizeFactionWorkType)
        .filter(Boolean);
}

function normalizeFactionWorkType(value) {
    const text = String(value ?? "").toLowerCase();
    if (text.includes("hack")) return "hacking";
    if (text.includes("field")) return "field";
    if (text.includes("security")) return "security";
    return null;
}

function getFactionWorkLabel(workType) {
    if (workType === "hacking") return "Hacking";
    if (workType === "field") return "Field";
    if (workType === "security") return "Security";
    return workType;
}

function getFactionWorkIcon(workType) {
    if (workType === "security") return <FiShield />;
    if (workType === "field") return <FiUserCheck />;
    return <FiZap />;
}

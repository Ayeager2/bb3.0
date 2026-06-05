export default function LayoutSettings({ onReset }) {
    return (
        <div className="settings-list">
            <div className="settings-item">
                <div>
                    <div className="settings-item-title">Reset Layout</div>
                    <div className="settings-item-id">Restore card order, visibility, and collapse defaults.</div>
                </div>

                <button className="control-action" onClick={onReset}>
                    Reset
                </button>
            </div>
        </div>
    );
}
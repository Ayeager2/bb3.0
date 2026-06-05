
# setup-structure.ps1

Write-Host ""
Write-Host "====================================="
Write-Host " BITBURNER DASHBOARD STRUCTURE SETUP "
Write-Host "====================================="
Write-Host ""

$dirs = @(
    "src/api",
    "src/components/cards",
    "src/components/layout",
    "src/components/shared",
    "src/styles",
    "src/utils"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Write-Host "[DIR] $dir"
}

$files = @(
    "src/App.jsx",
    "src/main.jsx",

    "src/api/dashboardApi.js",

    "src/components/cards/BN4ReadinessCard.jsx",
    "src/components/cards/CapabilitiesCard.jsx",
    "src/components/cards/CoreStateCard.jsx",
    "src/components/cards/LaneAllocationCard.jsx",
    "src/components/cards/PlayerCard.jsx",
    "src/components/cards/PolicyCard.jsx",
    "src/components/cards/ServerSummaryCard.jsx",
    "src/components/cards/TargetIntelCard.jsx",
    "src/components/cards/VictoryPlanCard.jsx",
    "src/components/cards/WidgetResolverCard.jsx",

    "src/components/layout/DashboardGrid.jsx",
    "src/components/layout/TopBar.jsx",

    "src/components/shared/Card.jsx",
    "src/components/shared/Chip.jsx",
    "src/components/shared/ProgressBar.jsx",
    "src/components/shared/Row.jsx",

    "src/styles/cards.css",
    "src/styles/globals.css",
    "src/styles/layout.css",

    "src/utils/formatters.js"
)

foreach ($file in $files) {
    if (!(Test-Path $file)) {
        New-Item -ItemType File -Path $file | Out-Null
        Write-Host "[FILE] $file"
    }
    else {
        Write-Host "[SKIP] $file already exists"
    }
}

Write-Host ""
Write-Host "Dashboard structure ready."
Write-Host ""


<#
.SYNOPSIS
  Records the five ASP.NET Web Forms portfolio projects on a Windows PC.

.DESCRIPTION
  TutorConnect, StudyLink, SmartShelf, BusNova and Logisticore cannot run in the Linux build
  container, so their portfolio cards say "Running capture coming soon". Run this script on a
  Windows PC that has the five repositories checked out. For each project it:

    1. creates a NEW database named <App>_PortfolioDemo from the repo's own scripts;
    2. copies the project to $env:TEMP\portfolio-capture\<slug> and points the COPY at that database;
    3. builds the copy with MSBuild and starts IIS Express on a free port;
    4. runs  node tools/capture/capture.js <slug> --url http://localhost:<port>/  from the portfolio root;
    5. stops IIS Express (always) and prints the data.js edit for you to make by hand.

  It never edits data.js, never changes the repositories' working trees, never drops, alters or
  reads an existing catalog, and never contacts the hosted Supabase database. See the README
  section "Capturing the Windows apps (on your PC)".

.PARAMETER ReposRoot
  The folder that holds the checkouts. A repo is found as <ReposRoot>\BigGee6566_<Repo> or
  <ReposRoot>\<Repo>, where <Repo> is TutorConnect, StudyLink, SmartShelf, BusNova_System or
  C-Sharp-Shooter.

.PARAMETER Slugs
  Which projects to record. Default: all five.

.PARAMETER SqlInstance
  The SQL Server instance for StudyLink, SmartShelf, BusNova and Logisticore. Default .\SQLEXPRESS.
  The machine name written in the repos' Web.config files is never used.

.PARAMETER PgHost
  The LOCAL PostgreSQL server for TutorConnect (default localhost).

.PARAMETER PgPort
  Its port (default 5432).

.PARAMETER PgUser
  Its user (default postgres). The password is read from the PGPASSWORD environment variable
  (set it in your shell first); it is written only into the temporary copy.

.PARAMETER Force
  Recreate a *_PortfolioDemo database that already exists. Only databases whose name ends in
  _PortfolioDemo can ever be dropped.

.PARAMETER KeepTemp
  Keep $env:TEMP\portfolio-capture after the run. Those files may contain the local database
  password (PGPASSWORD) and the generated demo passwords; by default they are always deleted,
  even after an error or Ctrl+C.

.EXAMPLE
  .\tools\capture\capture-windows.ps1 -ReposRoot C:\Users\me\source\repos -WhatIf

.EXAMPLE
  $env:PGPASSWORD = '<your local postgres password>'
  .\tools\capture\capture-windows.ps1 -ReposRoot C:\Users\me\source\repos
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$ReposRoot,

    [ValidateSet('tutorconnect', 'studylink', 'smartshelf', 'busnova', 'logisticore')]
    [string[]]$Slugs = @('tutorconnect', 'studylink', 'smartshelf', 'busnova', 'logisticore'),

    [string]$SqlInstance = '.\SQLEXPRESS',

    [string]$PgHost = 'localhost',
    [int]$PgPort = 5432,
    [string]$PgUser = 'postgres',

    [switch]$Force,
    [switch]$KeepTemp
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

$PortfolioRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TempRoot = Join-Path $env:TEMP 'portfolio-capture'
$DemoSuffix = '_PortfolioDemo'

# ---------------------------------------------------------------------------------------------
# What is known about each app. Db is the NEW database; OrigDb is the name the repo's own SQL
# scripts hard-code (rewritten to Db in a temporary copy of each script, never in the repo).
# Scripts are relative to the site folder and run in order; PostScripts run once the site is up.
# ---------------------------------------------------------------------------------------------
# Migrations the BusNova README says must run after a FRESH create (002-005 are already in the creation script).
$BusNovaFreshMigrations = @(6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19)

$Apps = [ordered]@{
    tutorconnect = @{
        Repo = 'TutorConnect'; Db = 'tutorconnect_portfoliodemo'; Engine = 'postgres'
        SiteDir = ''; Project = 'TutorConnect.vbproj'; ReadyPath = '/Account/Login.aspx'
    }
    studylink    = @{
        Repo = 'StudyLink'; Db = 'StudyLink_PortfolioDemo'; Engine = 'sqlserver'; OrigDb = 'StudyLink'
        SiteDir = ''; Project = 'StudyLink.Web.csproj'; ReadyPath = '/'
        Scripts = @()                              # the app creates its tables itself (EF6 migrations on first start)
        PostScripts = @('database\SeedData.sql')   # two months of sample activity, needs the demo accounts
    }
    smartshelf   = @{
        Repo = 'SmartShelf'; Db = 'SmartShelf_PortfolioDemo'; Engine = 'sqlserver'; OrigDb = 'SmartShelf'
        SiteDir = ''; Project = 'SmartShelf.csproj'; ReadyPath = '/Login.aspx'
        # A fresh install: schema + reference data (already includes migrations 001-004), then the trading history.
        Scripts = @('App_Data\SmartShelf_Schema.sql', 'App_Data\SeedDataSchema.sql')
    }
    busnova      = @{
        Repo = 'BusNova_System'; Db = 'BusNova_PortfolioDemo'; Engine = 'sqlserver'; OrigDb = 'BusNovaDB'
        SiteDir = 'BusNova_System_NoDB'; Project = 'BusNova System.csproj'; ReadyPath = '/Home.aspx'
        # README order for a fresh create: the creation script, the migrations it says must follow
        # a fresh create (006-015, 018, 019), then the two-month dataset.
        Scripts = @('App_Data\BusNova_Database_Script.sql') +
                  @($BusNovaFreshMigrations | ForEach-Object { 'App_Data\Migrations\{0:D3}_*.sql' -f $_ }) +
                  @('App_Data\Seed2MonthDataset.sql')
    }
    logisticore  = @{
        Repo = 'C-Sharp-Shooter'; Db = 'Logisticore_PortfolioDemo'; Engine = 'sqlserver'; OrigDb = 'Logisticore'
        SiteDir = ''; Project = 'FortCarrier&Logistics.csproj'; ReadyPath = '/Default.aspx'
        ScriptCreatesDb = $true   # its script refuses to run if the database already exists, so it is not pre-created
        # The "clean database + full demo data" script; it already creates every table.
        Scripts = @('App_Data\SEEDDATASCHEMA.sql')
    }
}

# ---------------------------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------------------------
function Write-Step([string]$Text) { Write-Host ('==> ' + $Text) -ForegroundColor Cyan }
function Write-Note([string]$Text) { Write-Host ('    ' + $Text) }
function Write-Warn([string]$Text) { Write-Host ('    ! ' + $Text) -ForegroundColor Yellow }

function Assert-DemoName([string]$Name) {
    # The one gate every create/drop goes through: a database we touch must be ours.
    if ($Name -notmatch ('^[A-Za-z][A-Za-z0-9]*' + [regex]::Escape($DemoSuffix) + '$')) {
        throw "Refusing to touch database '$Name': only names ending in $DemoSuffix are ever created or dropped."
    }
}

function Assert-UnderTemp([string]$Path) {
    $full = [System.IO.Path]::GetFullPath($Path)
    $root = [System.IO.Path]::GetFullPath($TempRoot) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify '$full': it is outside $TempRoot."
    }
}

function New-DemoPassword {
    # A fresh throw-away password per run: upper, lower, digit and symbol, so it passes any policy.
    $bytes = New-Object byte[] 12
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $chars = ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] }) -join ''
    return 'Dm' + $chars + '7!x'
}

function Find-FreePort {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
    $listener.Stop()
    return $port
}

function Get-HttpStatus([string]$Url) {
    # Any HTTP answer counts as "responding" (returns the status); 0 means no answer at all.
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 240 -MaximumRedirection 5
        return [int]$r.StatusCode
    }
    catch {
        # Windows PowerShell throws WebException, PowerShell 7 an HttpResponseException; both carry .Response.
        $resp = $null
        if ($_.Exception.PSObject.Properties['Response']) { $resp = $_.Exception.Response }
        if ($resp -and $resp.StatusCode) { return [int]$resp.StatusCode }
        return 0
    }
}

function Wait-ForSite([string]$Url, $Process, [string]$LogPath, [int]$TimeoutSec) {
    $until = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $until) {
        if ($Process.HasExited) {
            $tail = ''
            if (Test-Path $LogPath) { $tail = (Get-Content $LogPath -Tail 15 | Out-String) }
            throw "IIS Express exited before the site answered.`n$tail"
        }
        $status = Get-HttpStatus $Url
        if ($status -gt 0) { return $status }
        Start-Sleep -Seconds 2
    }
    throw "The site at $Url did not answer within $TimeoutSec seconds."
}

# ---------------------------------------------------------------------------------------------
# Prerequisites: collect everything that is missing, then stop once with the full list.
# ---------------------------------------------------------------------------------------------
function Test-Prerequisites([string[]]$Wanted) {
    $ErrorActionPreference = 'Continue'   # native probes write to stderr when something is missing
    $missing = New-Object System.Collections.Generic.List[string]
    $found = @{}

    # MSBuild with the web targets, via vswhere.
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path $vswhere)) {
        $missing.Add('MSBuild: Visual Studio 2022 (or Build Tools) is not installed. Get it from https://visualstudio.microsoft.com/downloads/ and tick the "ASP.NET and web development" workload (Build Tools: "Web development build tools").')
    }
    else {
        $msbuild = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
        $installRoot = & $vswhere -latest -products * -requires Microsoft.Component.MSBuild -property installationPath | Select-Object -First 1
        if (-not $msbuild) {
            $missing.Add('MSBuild: vswhere found no MSBuild. Install the "ASP.NET and web development" workload from the Visual Studio Installer.')
        }
        else {
            $web = Get-ChildItem -Path (Join-Path $installRoot 'MSBuild\Microsoft\VisualStudio') -Filter 'Microsoft.WebApplication.targets' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
            if (-not $web) {
                $missing.Add('MSBuild web targets (Microsoft.WebApplication.targets): add the "ASP.NET and web development" workload (Build Tools: "Web development build tools") in the Visual Studio Installer.')
            }
            else { $found.MSBuild = $msbuild }
        }
    }

    # IIS Express.
    $iis = @((Join-Path $env:ProgramFiles 'IIS Express\iisexpress.exe'), (Join-Path ${env:ProgramFiles(x86)} 'IIS Express\iisexpress.exe')) |
        Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $iis) { $missing.Add('IIS Express: install it from https://www.microsoft.com/download/details.aspx?id=48264 (it also ships with the Visual Studio web workload).') }
    else { $found.IisExpress = $iis }

    # sqlcmd, and the instance reachable with Windows authentication.
    $sqlApps = @($Wanted | Where-Object { $Apps[$_].Engine -eq 'sqlserver' })
    if ($sqlApps.Count -gt 0) {
        if (-not (Get-Command sqlcmd -ErrorAction SilentlyContinue)) {
            $missing.Add('sqlcmd (SQL Server command-line tools): install "sqlcmd" from https://learn.microsoft.com/sql/tools/sqlcmd/sqlcmd-utility (or SQL Server Express with its tools).')
        }
        else {
            $script:SqlTrust = @('-C')
            & sqlcmd -S $SqlInstance -E -b -C -Q 'SELECT 1' *> $null
            if ($LASTEXITCODE -ne 0) {
                $script:SqlTrust = @()
                & sqlcmd -S $SqlInstance -E -b -Q 'SELECT 1' *> $null
                if ($LASTEXITCODE -ne 0) {
                    $missing.Add("SQL Server instance '$SqlInstance': sqlcmd could not connect with Windows authentication. Start SQL Server Express, or pass -SqlInstance <your instance> (for example 'localhost\SQLEXPRESS' or '(localdb)\MSSQLLocalDB').")
                }
            }
        }
    }

    # psql, and the local PostgreSQL server, for TutorConnect only.
    if ($Wanted -contains 'tutorconnect') {
        if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
            $missing.Add('psql (PostgreSQL client, needed for TutorConnect): install PostgreSQL from https://www.postgresql.org/download/windows/ and add its bin folder to PATH.')
        }
        elseif (-not $env:PGPASSWORD) {
            $missing.Add("PGPASSWORD: set it to the password of your LOCAL PostgreSQL user '$PgUser' (for example: `$env:PGPASSWORD = 'your-password' ) before running. It is only written into the temporary copy.")
        }
        else {
            & psql -h $PgHost -p $PgPort -U $PgUser -d postgres -w -tAc 'SELECT 1' *> $null
            if ($LASTEXITCODE -ne 0) {
                $missing.Add("PostgreSQL at ${PgHost}:${PgPort}: psql could not connect as '$PgUser'. Start the local server, or pass -PgHost/-PgPort/-PgUser and check PGPASSWORD. This must be a LOCAL server, never the hosted Supabase one.")
            }
        }
    }

    # Node 20+, ffmpeg and Playwright (the capture tool's own needs).
    $node = Get-Command node -ErrorAction SilentlyContinue
    if (-not $node) { $missing.Add('Node.js 20 or newer: install it from https://nodejs.org/.') }
    else {
        $v = (& node --version) -replace '^v', ''
        if ([version]($v.Split('-')[0]) -lt [version]'20.0.0') { $missing.Add("Node.js 20 or newer (found $v): install it from https://nodejs.org/.") }
    }
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        $missing.Add('ffmpeg: install it (for example `winget install Gyan.FFmpeg`) and make sure ffmpeg is on PATH.')
    }
    if ($node) {
        Push-Location $PortfolioRoot
        try {
            & npx --no-install playwright --version *> $null
            if ($LASTEXITCODE -ne 0) { $missing.Add("Playwright: in $PortfolioRoot run npm install, then npx playwright install chromium.") }
        }
        finally { Pop-Location }
    }

    if ($missing.Count -gt 0) {
        $list = ($missing | ForEach-Object { '  - ' + $_ }) -join "`n"
        throw "Cannot start: $($missing.Count) prerequisite(s) missing.`n$list"
    }
    return $found
}

# ---------------------------------------------------------------------------------------------
# SQL Server and PostgreSQL helpers
# ---------------------------------------------------------------------------------------------
$script:SqlTrust = @()

function Invoke-SqlcmdTool([string[]]$Arguments) {
    $ErrorActionPreference = 'Continue'   # Windows PowerShell 5.1 turns native stderr into a terminating error under 'Stop'
    $all = @('-S', $SqlInstance, '-E', '-b') + $script:SqlTrust + $Arguments
    $out = & sqlcmd @all 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("sqlcmd failed:`n" + ($out | Out-String)) }
    return $out
}

function Test-SqlDatabaseExists([string]$Name) {
    # Looks only for the demo database's own name; no other catalog is read.
    $q = "SET NOCOUNT ON; SELECT COUNT(*) FROM sys.databases WHERE name = N'$Name'"
    $out = Invoke-SqlcmdTool @('-h', '-1', '-W', '-Q', $q)
    return (($out | Out-String).Trim() -eq '1')
}

function New-SqlDatabase([string]$Name) {
    Assert-DemoName $Name
    Invoke-SqlcmdTool @('-Q', "CREATE DATABASE [$Name]") | Out-Null
}

function Remove-SqlDatabase([string]$Name) {
    Assert-DemoName $Name
    Invoke-SqlcmdTool @('-Q', "ALTER DATABASE [$Name] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [$Name];") | Out-Null
}

function Invoke-Psql([string]$Database, [string[]]$Arguments) {
    $ErrorActionPreference = 'Continue'
    $all = @('-h', $PgHost, '-p', $PgPort, '-U', $PgUser, '-d', $Database, '-w', '-v', 'ON_ERROR_STOP=1', '-q') + $Arguments
    $out = & psql @all 2>&1
    if ($LASTEXITCODE -ne 0) { throw ("psql failed:`n" + ($out | Out-String)) }
    return $out
}

function Test-PgDatabaseExists([string]$Name) {
    $out = Invoke-Psql 'postgres' @('-tAc', "SELECT 1 FROM pg_database WHERE datname = '$Name'")
    return (($out | Out-String).Trim() -eq '1')
}

function New-PgDatabase([string]$Name) {
    Assert-DemoName $Name
    Invoke-Psql 'postgres' @('-c', "CREATE DATABASE $Name") | Out-Null
}

function Remove-PgDatabase([string]$Name) {
    Assert-DemoName $Name
    Invoke-Psql 'postgres' @('-c', "DROP DATABASE $Name WITH (FORCE)") | Out-Null
}

# ---------------------------------------------------------------------------------------------
# The repos' SQL scripts hard-code their own database name (USE SmartShelf; CREATE DATABASE ...).
# Run unchanged they would hit the owner's real catalog, so each is rewritten to the demo name in
# a temporary copy and then checked: if anything still targets another database, the run aborts.
# ---------------------------------------------------------------------------------------------
# One pass that tells string literals from comments correctly (a "/*" inside a string is not a
# comment). Comments are always dropped; string literals are blanked unless KeepStrings.
function Get-SqlStripped([string]$Text, [bool]$KeepStrings) {
    $keep = $KeepStrings
    return [regex]::Replace($Text, "'(?:[^']|'')*'|--[^\r\n]*|/\*[\s\S]*?\*/", {
            param($m)
            if ($m.Value.StartsWith("'")) { if ($keep) { return $m.Value } else { return "''" } }
            return ' '
        })
}

function Convert-SqlScriptForDemo([string]$SourcePath, [string]$DestPath, [string]$OriginalDb, [string]$DemoDb, [string]$Context) {
    Assert-DemoName $DemoDb
    Assert-UnderTemp $DestPath
    if ($Context -ne $DemoDb -and $Context -ne 'master') {
        throw "Refusing to run $SourcePath in database '$Context': a script starts in $DemoDb or in master only."
    }
    $text = [System.IO.File]::ReadAllText($SourcePath)
    # Every whole-word occurrence of the original name (USE, CREATE/DROP DATABASE, DB_ID('..'),
    # three-part names, quoted or bracketed, dynamic SQL inside strings, comments, PRINT text)
    # becomes the demo name, so nothing can point at the real catalog by any route.
    $text = [regex]::Replace($text, ('(?i)(?<![\w])' + [regex]::Escape($OriginalDb) + '(?![\w])'), $DemoDb)
    Assert-SqlTargetsOnlyDemo $text $OriginalDb $DemoDb $Context $SourcePath
    $dir = Split-Path -Parent $DestPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($DestPath, $text, (New-Object System.Text.UTF8Encoding($true)))
}

# A database name as T-SQL writes it: [bracketed], "quoted" or bare. Returns it unwrapped and in
# lower case ([Other Db] -> 'other db'). Nothing is trimmed, so '[ X ]' is not 'x'.
function Get-SqlNameValue([string]$Token) {
    if ($Token -match '^\[([\s\S]*)\]$' -or $Token -match '^"([\s\S]*)"$') { $Token = $Matches[1] }
    return $Token.ToLowerInvariant()
}

# A whitelist: the rewritten script is accepted only if
#   1. the original name is gone everywhere;
#   2. there are no sqlcmd directives;
#   3. every CREATE/ALTER/DROP/BACKUP/RESTORE DATABASE names only the demo database (each name in a
#      list, bracketed, quoted or bare), and so do DATABASE:: and DB_ID('...');
#   4. every USE in the code names the demo database or master, whatever follows it, and a USE in
#      a string (dynamic SQL) does too when it reads as a statement;
#   5. ALTER DATABASE CURRENT appears only as ALTER DATABASE CURRENT SET AUTO_CLOSE OFF [WITH NO_WAIT],
#      and only while the demo database is in effect: starting from $Context (the database sqlcmd
#      starts in, -d), each USE changes it, in code order;
#   6. nothing reaches outside the database or the server.
function Assert-SqlTargetsOnlyDemo([string]$Text, [string]$OriginalDb, [string]$DemoDb, [string]$Context, [string]$Label) {
    $problems = New-Object System.Collections.Generic.List[string]
    $demo = $DemoDb.ToLowerInvariant()
    $allowedUse = @($demo, 'master')

    # 1. The original name must not survive ANYWHERE (code, strings, comments), as a whole word
    #    or as the start of a longer identifier such as <Name>_Test.
    foreach ($m in [regex]::Matches($Text, ('(?i)(?<![\w])' + [regex]::Escape($OriginalDb) + '(?![\w])'))) { $problems.Add('original name: ' + $m.Value) }
    $codeNoStrings = Get-SqlStripped $Text $false     # comments dropped, string literals blanked
    $codeWithStrings = Get-SqlStripped $Text $true    # comments dropped, string literals kept
    foreach ($m in [regex]::Matches($codeNoStrings, ('(?i)(?<![\w])' + [regex]::Escape($OriginalDb) + '\w+'))) {
        if ($m.Value.ToLowerInvariant() -ne $demo) { $problems.Add('similar name: ' + $m.Value) }
    }

    # 2. sqlcmd directives (:connect, :r, !!cmd ...) are never allowed, on any line.
    foreach ($m in [regex]::Matches($Text, '(?m)^\s*(:|!!)\S*')) { $problems.Add('sqlcmd directive: ' + $m.Value.Trim()) }

    # 3. Database statements, checked in the whole text. A bare CURRENT after ALTER is left to
    #    step 5. A statement with no name at all (DROP DATABASE @x) is refused in the code.
    $dbStatement = '(?i)\b(DROP|ALTER|CREATE|RESTORE|BACKUP)\s+DATABASE\b(?:\s+IF\s+EXISTS\b)?\s*((?:\[[^\]]+\]|"[^"]+"|\w+)(?:\s*,\s*(?:\[[^\]]+\]|"[^"]+"|\w+))*)?'
    foreach ($m in [regex]::Matches($Text, $dbStatement)) {
        foreach ($n in [regex]::Matches($m.Groups[2].Value, '\[[^\]]+\]|"[^"]+"|\w+')) {
            $isCurrent = ($m.Groups[1].Value -ieq 'ALTER') -and ($n.Value -ieq 'CURRENT')
            if (-not $isCurrent -and (Get-SqlNameValue $n.Value) -ne $demo) { $problems.Add($m.Value.Trim()) }
        }
    }
    foreach ($m in [regex]::Matches($codeWithStrings, $dbStatement)) {
        if (-not $m.Groups[2].Success) { $problems.Add('database statement with no name: ' + $m.Value.Trim()) }
    }
    foreach ($m in [regex]::Matches($Text, '(?i)\bDATABASE\s*::\s*(\[[^\]]+\]|"[^"]+"|\w+)?')) {
        if (-not $m.Groups[1].Success -or (Get-SqlNameValue $m.Groups[1].Value) -ne $demo) { $problems.Add($m.Value.Trim()) }
    }
    foreach ($m in [regex]::Matches($Text, "(?i)DB_ID\(\s*N?'([^']+)'")) {
        if ($m.Groups[1].Value.ToLowerInvariant() -ne $demo) { $problems.Add($m.Value) }
    }

    # 4 and 5. One pass over the code in order: each USE must name the demo database or master
    #    and becomes the database in effect; each ALTER DATABASE CURRENT must be the allowed form,
    #    ending its statement, while the demo database is in effect.
    $inEffect = $Context.ToLowerInvariant()
    $ordered = '(?i)(?<use>(?<![\w@#.])USE\b\s*(?<name>\[[^\]]+\]|"[^"]+"|\w+)?)|(?<current>\bALTER\s+DATABASE\s+CURRENT\b(?<allowed>\s+SET\s+AUTO_CLOSE\s+OFF(?:\s+WITH\s+NO_WAIT)?(?=[ \t]*(?:;|\r?\n|\z)))?)'
    foreach ($m in [regex]::Matches($codeNoStrings, $ordered)) {
        if ($m.Groups['use'].Success) {
            if (-not $m.Groups['name'].Success) { $problems.Add('USE with no database name'); continue }
            $inEffect = Get-SqlNameValue $m.Groups['name'].Value
            if ($allowedUse -notcontains $inEffect) { $problems.Add('USE ' + $m.Groups['name'].Value) }
        }
        elseif (-not $m.Groups['allowed'].Success) {
            $problems.Add('ALTER DATABASE CURRENT other than SET AUTO_CLOSE OFF [WITH NO_WAIT]')
        }
        elseif ($inEffect -ne $demo) {
            $problems.Add("ALTER DATABASE CURRENT while the database in effect is $inEffect")
        }
    }

    # 4, in strings (dynamic SQL such as EXEC('USE Other SELECT 1')). A USE counts when it starts
    # a statement (the literal's start, or after ';' or a line break), is written in capitals, or
    # ends at ';', a line break or the literal's end; ordinary prose such as 'will use again.' does
    # not. ALTER DATABASE CURRENT is never allowed in a string: its database cannot be checked.
    foreach ($lit in [regex]::Matches($codeWithStrings, "'(?:[^']|'')*'")) {
        $inner = $lit.Value.Substring(1, $lit.Value.Length - 2).Replace("''", "'")
        $hits = @(
            [regex]::Matches($inner, '(?im)(?:^|;)\s*USE\b\s*(\[[^\]]+\]|"[^"]+"|\w+)?')
            [regex]::Matches($inner, '\bUSE\b\s*(\[[^\]]+\]|"[^"]+"|\w+)')
            [regex]::Matches($inner, '(?i)\bUSE\s+(\[[^\]]+\]|"[^"]+"|\w+)\s*(?=;|\r?\n|\z)')
        )
        foreach ($m in $hits) {
            if (-not $m.Groups[1].Success) { $problems.Add('USE with no database name in a string'); continue }
            if ($allowedUse -notcontains (Get-SqlNameValue $m.Groups[1].Value)) { $problems.Add('USE ' + $m.Groups[1].Value + ' in a string') }
        }
        if ($inner -match '(?i)\bALTER\s+DATABASE\s+CURRENT\b') { $problems.Add('ALTER DATABASE CURRENT in a string') }
    }
    # (The earlier whole-literal rule, kept as it was.)
    foreach ($m in [regex]::Matches($codeWithStrings, "(?i)'\s*USE\s+[\[""]?(\w+)[\]""]?\s*'")) {
        $name = $m.Groups[1].Value.ToLowerInvariant()
        if ($allowedUse -notcontains $name) { $problems.Add($m.Value.Trim()) }
    }

    # 6. Nothing that reaches outside the database or the server.
    foreach ($m in [regex]::Matches($codeWithStrings, '(?i)\b(DROP\s+LOGIN|CREATE\s+LOGIN|ALTER\s+LOGIN|xp_cmdshell|sp_configure|SHUTDOWN|sp_detach_db|sp_attach_db|sp_addsrvrolemember|OPENROWSET|OPENDATASOURCE|OPENQUERY|sp_addlinkedserver)\b')) {
        $problems.Add($m.Value)
    }

    if ($problems.Count -gt 0) {
        throw ("Safety check failed for $Label. After rewriting it to $DemoDb it still contains: " + (($problems | Select-Object -Unique) -join '; ') + '. Nothing was run.')
    }
}

# TutorConnect's PostgreSQL script: Supabase-only role grants are removed in the temp copy (the
# roles do not exist locally and are cluster-wide, so they are not created), then it must pass
# a whitelist: no backslash at all (so no psql meta-command) and no statement that touches
# databases, roles or the server.
function Convert-PgScriptForDemo([string]$SourcePath, [string]$DestPath) {
    Assert-UnderTemp $DestPath
    $text = [System.IO.File]::ReadAllText($SourcePath)
    $text = [regex]::Replace($text, '(?im)^[ \t]*REVOKE\s+ALL\s+ON\s+ALL\s+(?:TABLES|FUNCTIONS)\s+IN\s+SCHEMA\s+dbo\s+FROM\s+anon\s*,\s*authenticated\s*;[ \t]*\r?$', '-- (Supabase-only role revoke removed for the local demo)')
    Assert-PgScriptSafe $text $SourcePath
    $dir = Split-Path -Parent $DestPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($DestPath, $text, (New-Object System.Text.UTF8Encoding($false)))
}

function Assert-PgScriptSafe([string]$Text, [string]$Label) {
    $problems = New-Object System.Collections.Generic.List[string]
    # psql runs \c, \connect, \i, \! and the rest wherever they appear on a line, and the schema
    # script needs no backslash, so one anywhere (code, string or comment) stops the run.
    $slash = $Text.IndexOf([char]'\')
    if ($slash -ge 0) { $problems.Add('a backslash (psql meta-command) on line ' + $Text.Substring(0, $slash).Split("`n").Count) }
    $code = [regex]::Replace($Text, "'(?:[^']|'')*'|--[^\r\n]*|/\*[\s\S]*?\*/", { param($m) if ($m.Value.StartsWith("'")) { "''" } else { ' ' } })
    foreach ($m in [regex]::Matches($code, '(?i)\b(?:CREATE|DROP|ALTER)\s+(?:DATABASE|ROLE|USER|GROUP|TABLESPACE|SERVER|SYSTEM)\b')) { $problems.Add($m.Value) }
    foreach ($m in [regex]::Matches($code, '(?i)\b(?:SET\s+(?:SESSION\s+AUTHORIZATION|ROLE)|COPY\b[^;]*\bPROGRAM|dblink|postgres_fdw|pg_read_file|pg_read_binary_file|lo_import|lo_export|pg_terminate_backend)\b')) { $problems.Add($m.Value) }
    foreach ($m in [regex]::Matches($code, '(?i)\bCREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)')) {
        if ($m.Groups[1].Value.ToLowerInvariant() -ne 'citext') { $problems.Add($m.Value) }
    }
    if ($problems.Count -gt 0) {
        throw ("Safety check failed for $Label (PostgreSQL): " + (($problems | Select-Object -Unique) -join '; ') + '. Nothing was run.')
    }
}

function Invoke-SqlScripts([string]$SiteRoot, [string[]]$Patterns, $App, [string]$WorkDir, [string]$Context) {
    foreach ($pattern in $Patterns) {
        $files = @(Get-ChildItem -Path (Join-Path $SiteRoot $pattern) -File -ErrorAction SilentlyContinue | Sort-Object Name)
        if ($files.Count -eq 0) { throw "The repo has no script matching $pattern (looked in $SiteRoot)." }
        foreach ($f in $files) {
            $dest = Join-Path (Join-Path $WorkDir 'sql') $f.Name
            Convert-SqlScriptForDemo $f.FullName $dest $App.OrigDb $App.Db $Context
            Write-Note ('running ' + $f.Name)
            # -d names the demo database for scripts with no USE line (master when the script creates it); -I = QUOTED_IDENTIFIER ON; -f 65001 = UTF-8 input.
            Invoke-SqlcmdTool @('-d', $Context, '-I', '-f', '65001', '-i', $dest) | Out-Null
        }
    }
}

# ---------------------------------------------------------------------------------------------
# Demo logins, read from the repo's own documentation when the app has one
# ---------------------------------------------------------------------------------------------
function Get-MarkdownTableRows([string]$Path) {
    $rows = New-Object System.Collections.Generic.List[object]
    $header = $null
    foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
        $t = $line.Trim()
        if ($t -notmatch '^\|.*\|$') { $header = $null; continue }
        $cells = @($t.Trim('|').Split('|') | ForEach-Object { ($_ -replace '[`*]', '').Trim() })
        if ($null -eq $header) { $header = $cells; continue }
        if (-not ($cells | Where-Object { $_ -notmatch '^:?-{3,}:?$' })) { continue }   # the |---|---| row
        $row = [ordered]@{}
        for ($i = 0; $i -lt $header.Count -and $i -lt $cells.Count; $i++) { $row[$header[$i]] = $cells[$i] }
        $rows.Add($row)
    }
    return $rows
}

function Get-DocumentedLogin([string]$Path, [string]$UserColumn, [scriptblock]$Pick) {
    # Returns @{ User; Pass } from the first table row that Pick accepts, or $null. Values are
    # read at run time and never printed or written anywhere.
    if (-not (Test-Path $Path)) { return $null }
    foreach ($row in (Get-MarkdownTableRows $Path)) {
        if (-not ($row.Contains($UserColumn) -and $row.Contains('Password'))) { continue }
        if (-not (& $Pick $row)) { continue }
        $u = [string]$row[$UserColumn]; $p = [string]$row['Password']
        if ($u -and $p -and $p -notmatch '\s') { return @{ User = $u; Pass = $p } }
    }
    return $null
}

# ---------------------------------------------------------------------------------------------
# Patching the TEMPORARY copy of a site
# ---------------------------------------------------------------------------------------------
function Copy-SiteToTemp([string]$Source, [string]$Dest) {
    Assert-UnderTemp $Dest
    if (Test-Path $Dest) { Remove-Item -Recurse -Force $Dest -ErrorAction Stop }
    New-Item -ItemType Directory -Path $Dest -Force -ErrorAction Stop | Out-Null
    $ErrorActionPreference = 'Continue'
    # Skips VCS data, build output, SQL Server data files and git-ignored local secrets (local.settings.config
    # can hold hosted-database credentials; a fresh one is written for the apps that need one).
    & robocopy $Source $Dest /E /XD '.git' 'bin' 'obj' 'node_modules' /XF '*.mdf' '*.ldf' '*.user' 'local.settings.config' '.env' /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed (exit code $LASTEXITCODE) copying $Source." }
    $global:LASTEXITCODE = 0
}

function Update-WebConfig([string]$Path, $App, [string]$PgConnectionNoPassword) {
    Assert-UnderTemp $Path
    $xml = New-Object System.Xml.XmlDocument
    $xml.PreserveWhitespace = $true
    $xml.Load($Path)

    # Fail closed: a connection that cannot be seen and patched could fall back to the real database.
    if (@($xml.SelectNodes('//*[@configSource]')).Count -gt 0) { throw "Safety check: $Path uses configSource, so its connection strings live in another file. Nothing was started." }
    if (@($xml.SelectNodes('//connectionStrings/add')).Count -eq 0) { throw "Safety check: $Path has no connection-string entries to patch. Nothing was started." }

    foreach ($node in @($xml.SelectNodes('//connectionStrings/add'))) {
        $cs = $node.GetAttribute('connectionString')
        if ($App.Engine -eq 'postgres') {
            $node.SetAttribute('connectionString', $PgConnectionNoPassword)
        }
        elseif ($cs -match '(?i)(Initial Catalog|Database)\s*=') {
            $cs = $cs -replace '(?i)(Data Source|Server)\s*=\s*[^;]+', ('${1}=' + $SqlInstance)
            $cs = $cs -replace '(?i)(Initial Catalog|Database)\s*=\s*[^;]+', ('${1}=' + $App.Db)
            $node.SetAttribute('connectionString', $cs)
        }
    }
    # The demo is served over plain http on a random port, so cookies must not require HTTPS.
    foreach ($node in @($xml.SelectNodes('//*[@requireSSL="true"]'))) { $node.SetAttribute('requireSSL', 'false') }
    $xml.Save($Path)

    # Verify what was written: every catalog is the demo one, and no hosted database is named.
    $check = New-Object System.Xml.XmlDocument
    $check.Load($Path)
    $checked = 0
    foreach ($node in @($check.SelectNodes('//connectionStrings/add'))) {
        $cs = $node.GetAttribute('connectionString')
        if ($cs -match '(?i)(Initial Catalog|Database)\s*=\s*([^;]+)') {
            if ($Matches[2].Trim() -ne $App.Db) { throw "Safety check: connection '$($node.GetAttribute('name'))' still targets '$($Matches[2].Trim())'." }
            $checked++
        }
        else { throw "Safety check: connection '$($node.GetAttribute('name'))' names no database (Initial Catalog/Database), so it could use the login's default. Nothing was started." }
        if ($cs -match '(?i)supabase|pooler\.') { throw "Safety check: connection '$($node.GetAttribute('name'))' names a hosted database." }
    }
    if ($checked -eq 0) { throw "Safety check: no connection string in $Path was verified. Nothing was started." }
}

function Write-LocalSettings([string]$SiteRoot, [string]$Slug, $App, [string]$DemoPassword, [string]$PgConnection) {
    # The repos' own git-ignored App_Data\local.settings.config may hold real hosted credentials.
    # It is never copied into the temp site (a fresh one is written here instead).
    $path = Join-Path $SiteRoot 'App_Data\local.settings.config'
    Assert-UnderTemp $path
    if (Test-Path $path) { Remove-Item -Force $path }
    $lines = @('<?xml version="1.0" encoding="utf-8"?>', '<appSettings>')
    if ($Slug -eq 'tutorconnect') {
        $lines += ('  <add key="Db:ConnectionString" value="' + [System.Security.SecurityElement]::Escape($PgConnection) + '" />')
        $lines += ('  <add key="Seed:DevPassword" value="' + [System.Security.SecurityElement]::Escape($DemoPassword) + '" />')
    }
    elseif ($Slug -eq 'studylink') {
        $lines += '  <add key="Seed:Demo" value="true" />'
        $lines += ('  <add key="Seed:DevPassword" value="' + [System.Security.SecurityElement]::Escape($DemoPassword) + '" />')
    }
    else { return }   # the other three apps read no local settings file
    $lines += '</appSettings>'
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllLines($path, $lines, (New-Object System.Text.UTF8Encoding($false)))
}

function Assert-NoHostedDatabase([string]$SiteRoot) {
    # Belt and braces: no config the site reads may mention the hosted Supabase database.
    $files = @()
    $files += Get-ChildItem -Path $SiteRoot -Filter 'Web.config' -File -ErrorAction SilentlyContinue
    $files += Get-ChildItem -Path (Join-Path $SiteRoot 'App_Data') -Filter '*.config' -File -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        if (Select-String -Path $f.FullName -Pattern 'supabase\.(co|com|net)|\.pooler\.' -Quiet) {
            throw "Safety check: $($f.FullName) mentions a hosted Supabase database. Nothing was started."
        }
    }
}

# ---------------------------------------------------------------------------------------------
# TutorConnect only: create the administrator through the app's own first-run page, once, before
# the recording (the recipe is replayed twice, so it must not change state).
# ---------------------------------------------------------------------------------------------
function Invoke-TutorConnectSetup([string]$BaseUrl, [string]$WorkDir, [string]$User, [string]$Pass) {
    $js = Join-Path $WorkDir 'tutorconnect-setup.js'
    $pw = (Join-Path $PortfolioRoot 'node_modules\playwright') -replace '\\', '/'
    $code = @"
const { chromium } = require('$pw');
(async () => {
  const base = process.env.SETUP_BASE;
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(base + '/Account/Setup.aspx', { waitUntil: 'networkidle' });
  if (!(await p.`$('[id`$="txtUserName"]'))) { console.log('setup page already closed'); await b.close(); return; }
  await p.fill('[id`$="txtUserName"]', process.env.DEMO_USER);
  await p.fill('[id`$="txtFirstName"]', 'Demo');
  await p.fill('[id`$="txtLastName"]', 'Admin');
  await p.selectOption('[id`$="ddlGender"]', { index: 1 });
  await p.fill('[id`$="txtEmail"]', 'demo.admin@example.com');
  await p.fill('[id`$="txtCell"]', '0821234567');
  await p.fill('[id`$="txtLocation"]', 'Demo Town');
  await p.fill('[id`$="txtPassword"]', process.env.DEMO_PASS);
  await p.fill('[id`$="txtConfirm"]', process.env.DEMO_PASS);
  await p.click('[id`$="btnCreate"]');
  await p.waitForLoadState('networkidle');
  const err = await p.`$('[id`$="pnlError"]');
  if (err && (await err.isVisible())) { console.error('setup page reported: ' + (await err.innerText())); process.exitCode = 1; }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
"@
    [System.IO.File]::WriteAllText($js, $code, (New-Object System.Text.UTF8Encoding($false)))
    $env:SETUP_BASE = $BaseUrl.TrimEnd('/')
    $env:DEMO_USER = $User
    $env:DEMO_PASS = $Pass
    try {
        & node $js | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'The TutorConnect first-run setup (administrator account) did not complete.' }
    }
    finally { Remove-Item Env:SETUP_BASE, Env:DEMO_USER, Env:DEMO_PASS -ErrorAction SilentlyContinue }
}

# ---------------------------------------------------------------------------------------------
# The data.js edit, printed for a human to make (this script never edits data.js)
# ---------------------------------------------------------------------------------------------
function Write-DataJsEdit([string]$Slug) {
    $dir = Join-Path $PortfolioRoot ('media\projects\' + $Slug)
    $shots = @(Get-ChildItem -Path $dir -Filter 'shot-*.webp' -ErrorAction SilentlyContinue |
            Sort-Object { [int]($_.BaseName -replace '\D', '') })
    foreach ($need in @('poster.webp', 'demo.mp4', 'demo.webm')) {
        if (-not (Test-Path (Join-Path $dir $need))) { throw "Capture finished but $need is missing from $dir." }
    }
    $list = ($shots | ForEach-Object { "'media/projects/$Slug/$($_.Name)'" }) -join ', '
    Write-Host ''
    Write-Host "  Edit assets/js/data.js: in the project with slug '$Slug', replace" -ForegroundColor Green
    Write-Host "      capture: 'pending-pc',"
    Write-Host '      media: noCapture(...)'
    Write-Host '  with:' -ForegroundColor Green
    Write-Host "      capture: 'captured',"
    Write-Host '      media: {'
    Write-Host "        poster: 'media/projects/$Slug/poster.webp',"
    Write-Host "        shots: [$list],"
    Write-Host '        demoData: true,'
    Write-Host "        video: { mp4: 'media/projects/$Slug/demo.mp4', webm: 'media/projects/$Slug/demo.webm' }"
    Write-Host '      }'
    Write-Host '  (demoData is true: the recording shows seeded demo data, not real records.) Then run npm test.'
    Write-Host ''
}

# ---------------------------------------------------------------------------------------------
# One app, end to end
# ---------------------------------------------------------------------------------------------
function Find-RepoFolder([string]$Repo) {
    foreach ($name in @(('BigGee6566_' + $Repo), $Repo)) {
        $p = Join-Path $ReposRoot $name
        if (Test-Path $p) { return (Resolve-Path $p).Path }
    }
    return $null
}

function Invoke-App([string]$Slug, $Tools) {
    $app = $Apps[$Slug]
    $repo = Find-RepoFolder $app.Repo
    $work = Join-Path $TempRoot $Slug
    $copy = Join-Path $work 'site'
    $siteRoot = if ($app.SiteDir) { Join-Path $copy $app.SiteDir } else { $copy }
    $iisProc = $null
    $dbCreated = $false
    $demoPass = New-DemoPassword
    $login = $null
    $script:AppOk = $false

    try {
        Write-Step "$Slug : copying the project to a temporary folder"
        Copy-SiteToTemp $repo $copy
        $projPath = Join-Path $siteRoot $app.Project
        if ($app.Project -match '[&%]') {
            # '&' in a project file name upsets some tooling; the temp copy is renamed (the repo is not).
            $safe = $app.Project -replace '[&%]', 'And'
            Rename-Item -Path $projPath -NewName $safe
            $projPath = Join-Path $siteRoot $safe
        }

        $pgConnNoPw = $null; $pgConn = $null
        if ($app.Engine -eq 'postgres') {
            $pgConnNoPw = "Host=$PgHost;Port=$PgPort;Database=$($app.Db);Username=$PgUser;Search Path=dbo,extensions,public"
            $pgConn = $pgConnNoPw + ';Password=' + $env:PGPASSWORD
        }
        Write-LocalSettings $siteRoot $Slug $app $demoPass $pgConn
        Update-WebConfig (Join-Path $siteRoot 'Web.config') $app $pgConnNoPw
        Assert-NoHostedDatabase $siteRoot

        # ---- database ----
        Write-Step "$Slug : creating database $($app.Db) ($($app.Engine))"
        if ($app.Engine -eq 'postgres') {
            if ((Test-PgDatabaseExists $app.Db) -and $Force) { Remove-PgDatabase $app.Db }
            New-PgDatabase $app.Db; $dbCreated = $true
            # The schema script targets Supabase, which pre-creates the "extensions" schema.
            Invoke-Psql $app.Db @('-c', 'CREATE SCHEMA IF NOT EXISTS extensions') | Out-Null
            $schema = Join-Path $siteRoot 'App_Data\Scripts\postgres\01_CreateSchema.sql'
            $schemaSafe = Join-Path (Join-Path $work 'sql') '01_CreateSchema.sql'
            Convert-PgScriptForDemo $schema $schemaSafe
            Write-Note 'running postgres\01_CreateSchema.sql (checked copy; this connection is the demo database only)'
            Invoke-Psql $app.Db @('-f', $schemaSafe) | Out-Null
        }
        else {
            if ((Test-SqlDatabaseExists $app.Db) -and $Force) { Remove-SqlDatabase $app.Db }
            $context = $app.Db
            if ($app.ContainsKey('ScriptCreatesDb')) { $context = 'master' } else { New-SqlDatabase $app.Db }
            $dbCreated = $true
            Invoke-SqlScripts $siteRoot $app.Scripts $app $work $context
        }

        # ---- build ----
        Write-Step "$Slug : building with MSBuild (restores NuGet packages; needs internet)"
        $buildLog = Join-Path $work 'msbuild.log'
        $previousPreference = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        & $Tools.MSBuild $projPath '/restore' '/p:RestorePackagesConfig=true' '/p:Configuration=Debug' '/v:minimal' '/nologo' '/m' *> $buildLog
        $buildExit = $LASTEXITCODE
        $ErrorActionPreference = $previousPreference
        if ($buildExit -ne 0) {
            throw ("MSBuild failed; last lines of ${buildLog}:`n" + ((Get-Content $buildLog -Tail 25) -join "`n"))
        }

        # ---- site ----
        $port = Find-FreePort
        $url = "http://localhost:$port/"
        Write-Step "$Slug : starting IIS Express on $url"
        $iisLog = Join-Path $work 'iisexpress.log'
        $iisProc = Start-Process -FilePath $Tools.IisExpress -ArgumentList ('/path:"' + $siteRoot + '" /port:' + $port + ' /systray:false') `
            -PassThru -WindowStyle Hidden -RedirectStandardOutput $iisLog -RedirectStandardError (Join-Path $work 'iisexpress.err.log')
        $status = Wait-ForSite ($url.TrimEnd('/') + $app.ReadyPath) $iisProc $iisLog 300
        if ($status -ge 500) {
            throw "The site answered HTTP $status for $($app.ReadyPath). Open $url in a browser while IIS Express runs, or read $iisLog."
        }

        # ---- demo login ----
        switch ($Slug) {
            'tutorconnect' {
                Write-Step 'tutorconnect : creating the demo administrator through the app''s first-run setup page'
                $login = @{ User = 'demo.admin'; Pass = $demoPass }
                Invoke-TutorConnectSetup $url $work $login.User $login.Pass
            }
            'studylink' {
                # The DEBUG build seeds the demo accounts on first start, with the generated Seed:DevPassword.
                $login = @{ User = 'admin'; Pass = $demoPass }
                Write-Step 'studylink : loading the two-month sample data'
                Invoke-SqlScripts $siteRoot $app.PostScripts $app $work $app.Db
            }
            'smartshelf' {
                $login = Get-DocumentedLogin (Join-Path $siteRoot 'README.md') 'Username' { param($r) $r['Role'] -like 'Store Manager*' }
            }
            'busnova' {
                $login = Get-DocumentedLogin (Join-Path $siteRoot 'CREDENTIALS.md') 'Email' { param($r) $r['Username'] -eq 'admin' }   # BusNova signs in by Email, staff included
            }
            'logisticore' {
                $login = Get-DocumentedLogin (Join-Path $siteRoot 'CREDENTIALS.md') 'Email' { param($r) $r['Role'] -like '*Admin*' }
            }
        }
        if ($login) { Write-Note "demo login: user '$($login.User)' (password supplied for this run only, not shown)" }
        else { Write-Warn 'no documented demo login found: the login screens will be skipped and only public pages recorded.' }

        # ---- capture ----
        Write-Step "$Slug : recording"
        if ($login) { $env:DEMO_USER = $login.User; $env:DEMO_PASS = $login.Pass }
        Push-Location $PortfolioRoot
        try {
            & node 'tools/capture/capture.js' $Slug '--url' $url | Out-Host
            if ($LASTEXITCODE -ne 0) { throw "capture.js failed for $Slug." }
        }
        finally {
            Pop-Location
            Remove-Item Env:DEMO_USER, Env:DEMO_PASS -ErrorAction SilentlyContinue
        }
        Write-DataJsEdit $Slug
        $script:AppOk = $true
    }
    catch {
        Write-Host ("    FAILED ($Slug): " + $_.Exception.Message) -ForegroundColor Red
        $script:AppOk = $false
    }
    finally {
        if ($iisProc) {
            try {
                if (-not $iisProc.HasExited) { Stop-Process -Id $iisProc.Id -Force; $iisProc.WaitForExit(10000) | Out-Null }
            }
            catch { Write-Warn "Could not stop IIS Express (pid $($iisProc.Id)): $($_.Exception.Message)" }
        }
        Remove-Item Env:DEMO_USER, Env:DEMO_PASS, Env:SETUP_BASE -ErrorAction SilentlyContinue
        if ($dbCreated) { Write-Note "left database $($app.Db) in place (re-run with -Force to rebuild it)" }
    }
}

# =============================================================================================
# Main
# =============================================================================================
if ($PSVersionTable.PSVersion.Major -lt 5) { throw 'PowerShell 5.1 or newer is required.' }
# Before ANY probe: TutorConnect must use a local PostgreSQL server, never a remote or hosted one.
if (@('localhost', '127.0.0.1', '::1', '[::1]') -notcontains $PgHost.Trim().ToLowerInvariant()) {
    throw "-PgHost '$PgHost' is not a loopback address. Only localhost, 127.0.0.1 or ::1 are accepted, so the demo can never reach a hosted database."
}
if (-not (Test-Path $ReposRoot)) { throw "ReposRoot '$ReposRoot' does not exist." }
$Slugs = @($Slugs | Select-Object -Unique)

Write-Step 'Checking prerequisites'
$tools = Test-Prerequisites $Slugs
Write-Note 'all prerequisites found.'

# Pre-flight for every selected app BEFORE anything is created: the repo is there, and no
# demo database exists yet (or -Force was given). If one exists, stop here and ask.
$conflicts = @()
foreach ($slug in $Slugs) {
    $app = $Apps[$slug]
    if (-not (Find-RepoFolder $app.Repo)) {
        throw "Cannot find the $($app.Repo) checkout under $ReposRoot (looked for BigGee6566_$($app.Repo) and $($app.Repo))."
    }
    Assert-DemoName $app.Db
    $exists = if ($app.Engine -eq 'postgres') { Test-PgDatabaseExists $app.Db } else { Test-SqlDatabaseExists $app.Db }
    if ($exists -and -not $Force) { $conflicts += $app.Db }
}
if ($conflicts.Count -gt 0) {
    throw ("These demo databases already exist: $($conflicts -join ', '). Nothing was changed. Re-run with -Force to drop and recreate them " +
        "(only databases ending in $DemoSuffix are ever dropped), or drop them yourself, or leave that slug out with -Slugs.")
}

$ok = @(); $failed = @()
try {
    foreach ($slug in $Slugs) {
        $app = $Apps[$slug]
        $action = "Create $($app.Db), build a temporary copy, run IIS Express, record media/projects/$slug"
        if (-not $PSCmdlet.ShouldProcess($slug, $action)) {
            Write-Note "plan for ${slug}: copy to $TempRoot\$slug; patch the COPY's Web.config to $($app.Db); build; IIS Express on a free port; node tools/capture/capture.js $slug --url http://localhost:<port>/"
            continue
        }
        Invoke-App $slug $tools
        if ($script:AppOk) { $ok += $slug } else { $failed += $slug }
    }
}
finally {
    # Always, even after an error or Ctrl+C: the temp copies hold the local PostgreSQL password and
    # the generated demo passwords. Only -KeepTemp leaves them behind.
    if (-not $KeepTemp -and -not $WhatIfPreference -and (Test-Path $TempRoot)) {
        Assert-UnderTemp (Join-Path $TempRoot 'x')
        Remove-Item -Recurse -Force $TempRoot -ErrorAction SilentlyContinue -Confirm:$false -WhatIf:$false
        if (Test-Path $TempRoot) { Write-Warn "Could not fully delete $TempRoot. Delete it by hand: it may hold a local database password." }
    }
    elseif ($KeepTemp -and (Test-Path $TempRoot)) { Write-Warn "Kept $TempRoot (-KeepTemp). It may contain your local PostgreSQL password; delete it when done." }
}

if ($WhatIfPreference) { Write-Step 'Dry run only: nothing was created, built or recorded.'; return }
Write-Step ("Done. Recorded: " + $(if ($ok) { $ok -join ', ' } else { 'none' }) + $(if ($failed) { '. Failed: ' + ($failed -join ', ') } else { '' }))
Write-Host 'data.js was NOT edited. Make the edits printed above by hand, review them, then run npm test.'
if ($failed) { exit 1 }

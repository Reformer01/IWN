# I-World Networks — Digital Revenue Hub (Lead Engine v2)

Automated outbound discovery, deduplication, enrichment, territory routing, and inbound ad webhook engine for I-World Networks Limited.

Target Revenue: **₦1,400,000 / Day** | **₦42,000,000 / Month**  
Designed & Implemented for: **Reformer Ejembi** (Digital & Web Team Lead)

---

## 1. System Overview & Architecture

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 FREE DISCOVERY SOURCES                  │
                  │  • OSM Overpass (Hotels, Schools, Hospitals, Factories) │
                  │  • Business News RSS (Nairametrics, BusinessDay, etc.)  │
                  │  • Google Alerts RSS (Expansion / Tenders / Fiber)      │
                  │  • Job Boards RSS (Companies hiring IT in SW Nigeria)   │
                  │  • Trade Fair & Chamber Events (Opportunity Radar)      │
                  │  • Inbound Website Forms (Google/Facebook/LinkedIn Ads) │
                  └───────────────────────────┬─────────────────────────────┘
                                              │
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          APPS SCRIPT LEAD ENGINE CORE                                  │
│                                                                                        │
│  1. Harvest & Aggregate: dailyLeadHarvest() pulls 20–40 unique accounts / day          │
│  2. Normalize & SHA-256 Dedup: 90-day window against 05 Lead Registry                 │
│  3. Light Enrichment: Auto-generate Google Maps & LinkedIn links + safe Custom Search │
│  4. Territory Routing: Aligned with sales reps across Oyo, Ogun, Osun, Ondo & Lagos    │
│  5. Append-Only Pipeline: Writes fresh rows to 03 Sales Pipeline (never re-processes) │
│  6. Personalized Rep Digests: Formatted cards delivered by 7:30 AM WAT to each rep    │
│  7. Executive Tracking: Real-time revenue & source scoreboard sent to Jude & Reformer  │
└────────────────────────────────────────────────┬───────────────────────────────────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              GOOGLE SHEETS HUB (10 TABS)                               │
│  00 Config | 01 Raw Inbound | 02 Inbound Web Leads | 03 Sales Pipeline                 │
│  04 Daily Revenue Tracker | 05 Lead Registry | 06 Source Performance                   │
│  07 Events & Opportunities | 08 Rep Assignments Today | 09 Distribution Log            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
apps_script/lead_engine/
├── Code.gs                 # onOpen UI menu, trigger installer & sidebar handlers
├── Config.gs               # Reads 00 Config (settings, reps, feeds, bboxes)
├── DedupRegistry.gs        # Normalization, SHA-256 hashing, 90-day dedup ledger
├── Distribution.gs         # Rep daily digest emails + Jude daily executive summary
├── Enrichment.gs           # Light contact enrichment (Maps, LinkedIn, free CSE)
├── Harvest.gs              # Orchestrates multi-source sweeps & seasonal weighting
├── InboundWebhook.gs       # doPost handler for website forms + 15-min queue processor
├── Intelligence.gs         # Opportunity radar, 14-day stale recycling, source scoreboard
├── ManualLead.html         # Sidebar UI for field agents to submit discoveries
├── Pipeline.gs             # Append-only pipeline processor (Processed? flag enforcement)
├── Routing.gs              # Territory mapping aligned with form-validation.php
├── Schema.gs               # Idempotent sheet bootstrap & default config seeds
├── Tracker.gs              # Dynamic revenue tracker formulas & activity scoreboard
├── Utils.gs                # Fetching, RSS XML parsing, date/time & formatting helpers
├── Sources/
│   ├── EventsAdapter.gs        # Scrapes expos, tenders & updates Opportunity Radar
│   ├── GoogleAlertsAdapter.gs  # Polls user-configured Google Alerts RSS feeds
│   ├── JobSignalsAdapter.gs    # Captures IT Manager & Network Engineer hiring signals
│   ├── OsmAdapter.gs           # Overpass amenity query rotator by weekday
│   └── RssNewsAdapter.gs       # Business expansion & branch opening news adapter
└── README.md               # This deployment & operational guide
```

---

## 3. Step-by-Step Deployment Guide

### Step 1: Create or Open the Google Sheet
1. Open [Google Sheets](https://sheets.new) or your existing **IWN Sales Tracking Workbook**.
2. Set the Spreadsheet Timezone to **(GMT+01:00) Lagos** via `File > Settings > Calculation & Timezone`.

### Step 2: Open Apps Script Editor
1. In your spreadsheet, click `Extensions > Apps Script`.
2. Delete the default empty `Code.gs` and create the files listed above:
   - For each file in `apps_script/lead_engine/`, create a corresponding Script file (`.gs`) or HTML file (`.html`).
   - Create a subfolder or prefix filenames for adapter files (e.g., `OsmAdapter.gs`, `RssNewsAdapter.gs`, etc.).

### Step 3: Run One-Time Workbook Bootstrap
1. In the Apps Script dropdown, select the function `bootstrapLeadEngineWorkbook` and click **Run**.
2. Grant authorization when prompted by Google Workspace.
3. Switch back to your Google Sheet: All **10 tabs** (`00 Config` through `09 Distribution Log`) will be generated with proper formatting, headers, validation rules, and seed parameters.

### Step 4: Deploy the Inbound Webhook
1. In Apps Script, click the blue **Deploy** button (top right) > **New deployment**.
2. Select type: **Web app**.
3. Fill in:
   - **Description**: `IWN Lead Engine Inbound Webhook v2`
   - **Execute as**: `Me (your email address)`
   - **Who has access**: `Anyone` (required for receiving form POSTs from your PHP web server).
4. Click **Deploy** and copy the resulting **Web App URL** (ends in `/exec`).
5. Open [Assets/forms/form-validation.php](file:///c:/Users/NGFEP/IWN/Assets/forms/form-validation.php) in your codebase:
   - Paste the Web App URL into line 505:
     ```php
     $webhookUrl = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
     ```

### Step 5: Install Automated Triggers
1. Reload your Google Sheet in the browser. You will see a custom menu: **IWN Lead Engine**.
2. Click `IWN Lead Engine > 9. Install weekday triggers`.
3. The engine automatically creates all required time-driven triggers:
   - **6:00 AM WAT (Mon–Fri)**: `dailyLeadHarvest` (Harvests and dedupes 20–40 new leads).
   - **7:30 AM WAT (Mon–Fri)**: `sendRepDailyDigests` (Sends personalized lead cards to reps).
   - **7:35 AM WAT (Mon–Fri)**: `sendDailyReportEmail` (Sends report to Jude Alawode & Reformer).
   - **Every 15 minutes**: `processInboundWebhookQueue` (Routes hot ad submissions immediately).
   - **6:00 PM WAT (Daily)**: `recycleStaleLeads` (Reassigns leads unclaimed after 14 days).
   - **5:00 PM WAT (Friday)**: `weeklySourceReview` (Sends source efficiency summary to Reformer).

---

## 4. Google Alerts RSS Setup (High-Intent Signals)

To activate Source 3 (**Google Alerts RSS**), create the following alerts once at [google.com/alerts](https://www.google.com/alerts):

| # | Alert Search Query | How often | Sources | Language & Region | Deliver to |
|---|--------------------|-----------|---------|-------------------|------------|
| 1 | `"new hotel" (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 2 | `("factory" OR "plant" OR "warehouse" OR "manufacturing") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 3 | `("school" OR "university" OR "college" OR "polytechnic") ("smart classroom" OR internet OR "Google Workspace" OR "e-learning") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 4 | `("hospital" OR "medical center" OR "clinic" OR "diagnostic") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 5 | `("procurement" OR "tender" OR "RFQ" OR "expression of interest") ("internet" OR "fiber" OR "network infrastructure" OR "bandwidth") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 6 | `("Google Workspace" OR "Microsoft 365" OR "managed IT" OR "cloud hosting" OR "metro fiber") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |
| 7 | `("slow internet" OR "poor network" OR Spectranet OR "MTN business" OR "Airtel business" OR "Glo business") (Ogun OR Oyo OR Osun OR Ondo OR Lagos OR Ibadan OR Abeokuta OR Osogbo OR Akure OR Sagamu OR "Ijebu Ode" OR Mowe OR Ibafo OR Agbara OR Ota)` | As-it-happens | Automatic | English / Nigeria | **RSS feed** |

### How to add Alert feeds to the Lead Engine:
1. After creating an alert, right-click the **RSS icon** next to it on Google Alerts and copy the link.
2. Open tab **`00 Config`** in your Google Sheet.
3. In the section **Feeds Configuration**, insert a row:
   - **Kind**: `ALERT`
   - **Url**: `https://www.google.com/alerts/feeds/...`
   - **Enabled**: `TRUE`
4. The engine will automatically poll your alerts every weekday morning at 6:00 AM.

---

## 5. Sales Rep Territory Mapping & Roster

Aligned with [Assets/forms/form-validation.php](file:///c:/Users/NGFEP/IWN/Assets/forms/form-validation.php) and `00 Config`:

| Sales Rep | Job Title | Official Email | WhatsApp / Phone | Primary Territories | Office Location |
|---|---|---|---|---|---|
| **Titilade Bakare** | BDM (Ogun Region) | `titilade.bakare@iworldnetworks.net` | 08131529077 | Ogun, Abeokuta, Lagos | Omida Mall, Abeokuta |
| **Emmanuel Oladimeji** | Enterprise Internet Services | `emmanuel.oladimeji@iworldnetworks.net` | 08036265524 | Osun, Osogbo, Ilesa | Osogbo |
| **Janet Oke** | BDM (Sagamu/Ijebu) | `janet.oke@iworldnetworks.net` | 07066053380 | Sagamu, Ijebu-Ode, Mowe, Ibafo | Omida Mall, Abeokuta |
| **Ruth Suleimon** | Territory Growth Exec | `ruth.suleimon@iworldnetworks.net` | 08165106653 | Ondo, Akure | BOI Building, Alagbaka, Akure |
| **Henry Adiene** | Territory Growth Exec | `henry.adiene@iworldnetworks.net` | 09051118661 | Ogun, Abeokuta, Ota, Agbara | Omida Mall, Abeokuta |
| **Elizabeth Tola** | Territory Growth Exec | `elizabeth.tola@iworldnetworks.net` | 08130778963 | Osun, Osogbo | Behind GRA, Ring-Road, Osogbo |
| **Jeffery Udoji** | Internet Business Lead | `jeffery.udoji@iworldnetworks.net` | 08130589466 | Oyo, Ibadan, Enterprise, Overflow | Sijuwola House, Dugbe, Ibadan |

---

## 6. Daily Sales Workflow

### Lead Cards in Morning Digest
At 7:30 AM WAT, each sales rep receives an email digest containing formatted account cards:
```
IWN-1042 | West African Ceramik Plant Extension | Sagamu, Ogun
Sector: Industrial Manufacturing | Intent: Expansion Signal
Contact: Plant / IT Manager | Phone/Email: +234 803... | info@...
Source: https://businessday.ng/...
Maps: https://www.google.com/maps/search/?api=1&query=West+African+Ceramik+Sagamu
LinkedIn: https://www.linkedin.com/search/results/companies/?keywords=West+African+Ceramik
Suggested pitch: Enterprise dedicated metro fibre for plant operations
WhatsApp: https://wa.me/2348131529077?text=Hi...
```

### Claiming and Updating Leads
1. Reps open tab **`03 Sales Pipeline`**.
2. In Column **P (Claimed)**, select a status from the dropdown:
   - `Claimed` (Protects lead from being recycled)
   - `Contacted` (Rep has reached out)
   - `Meeting` (Discovery call / site survey booked)
   - `Closed` (Revenue won — reflects in Tracker)
   - `Dead` (Unqualified / no response)
3. Any lead left unclaimed for **14 days** is automatically recycled to a secondary rep during the evening sweep.

---

## 7. Operational Troubleshooting

- **Google Apps Script Execution Limits**: Overpass API calls in `OsmAdapter.gs` include built-in `Utilities.sleep(1100)` rate limiting to stay well within OpenStreetMap community guidelines.
- **Deduplication Validation**: To verify duplicate prevention, inspect tab **`05 Lead Registry`**. The SHA-256 key ensures identical company + city + sector entries are blocked within a 90-day window.
- **Manual Field Discovery**: Use `IWN Lead Engine > Add manual lead (sidebar)` to immediately inject field discoveries into the pipeline with full territory routing and tracking.

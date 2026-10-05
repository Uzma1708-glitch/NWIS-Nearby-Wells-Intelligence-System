# NWIS — Nearby Wells Intelligence System

### Smart Historical Well Intelligence for Safer Drilling Decisions

**Smart India Hackathon 2026 | Problem Statement: SIH26121 | Organization: Oil India Limited**

**Past Wells. Smarter Drilling.**

NWIS is a prototype decision-support platform that transforms historical drilling records and nearby well information into accessible, depth-aware intelligence. It helps drilling teams identify relevant offset wells, examine previous operational challenges, and make more informed decisions before approaching similar subsurface intervals.

---

## Overview

Drilling operations generate valuable information through well trajectories, drilling reports, formation records, and historical incidents. However, this information can be scattered across multiple datasets and documents, making it difficult to retrieve and compare relevant experiences efficiently.

The **Nearby Wells Intelligence System (NWIS)** addresses this challenge by bringing nearby well identification, historical comparison, depth-based risk screening, and evidence-linked insights into a unified interface.

NWIS is designed as an intelligence layer that complements existing drilling monitoring systems rather than replacing them.

## Problem Statement

Historical well information is often difficult to access and interpret in the context of an active drilling operation.

Engineers may need to manually search multiple reports to understand:

* Which nearby wells are relevant to the active well.
* What geological or operational similarities exist.
* At which depths previous drilling problems occurred.
* What causes and mitigation measures were recorded.
* Whether historical experience can inform upcoming drilling intervals.

This fragmented process can delay access to useful information and limit the effective reuse of previous drilling knowledge.

## Our Solution

NWIS combines geospatial well discovery, offset-well relevance assessment, historical incident screening, and document intelligence into one decision-support workflow.

The prototype enables users to:

* Identify nearby wells using location and radius-based filtering.
* Compare historical well information and available trajectories.
* Examine relevant drilling incidents against the active well's depth.
* Retrieve information from historical reports.
* View risk indicators alongside supporting historical evidence.
* Generate a consolidated intelligence brief for review.

The system emphasizes historical evidence and human review rather than presenting heuristic alerts as confirmed predictions.

## Key Features

| Feature                          | Description                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Interactive Well Map             | Visualizes available well locations and supports nearby-well discovery.                                            |
| Radius-Based Search              | Filters candidate offset wells using configurable geographic distance.                                             |
| Offset-Well Relevance            | Assesses well relevance using available distance, formation, depth, and historical information.                    |
| Depth-Aware Risk Screening       | Compares historical incident intervals with a configurable look-ahead depth window.                                |
| Historical Incident Intelligence | Organizes available records of drilling challenges such as mud losses, stuck pipe, and torque-related issues.      |
| Cross-Well Comparison            | Supports comparison of available drilling parameters and historical well information.                              |
| Document Intelligence            | Extracts relevant information from supported reports using PDF processing, OCR, and domain-specific text matching. |
| Evidence-Linked Insights         | Connects displayed findings with available historical source information.                                          |
| Intelligence Brief               | Provides a consolidated view of relevant findings for operational review.                                          |

## How NWIS Works

```text
       Select Active Well
               |
               v
      Identify Nearby Wells
               |
               v
     Assess Offset Relevance
               |
               v
    Examine Historical Records
               |
               v
    Match Relevant Depth Zones
               |
               v
     Screen Historical Hazards
               |
               v
   Present Evidence-Based Insights
               |
               v
       Engineer Review
```

## Technology Stack

| Layer               | Technologies                                      |
| ------------------- | ------------------------------------------------- |
| Frontend            | React, TypeScript, Tailwind CSS                   |
| Mapping             | Leaflet                                           |
| Backend             | Python, FastAPI                                   |
| Database            | SQLite                                            |
| Document Processing | PDF.js, Tesseract.js                              |
| Data Processing     | Python-based geospatial and rule-based processing |
| API Documentation   | FastAPI Swagger UI                                |

## System Architecture

```text
                  NWIS USER INTERFACE
                          |
                          v
              Interactive Well Map
                          |
                          v
                FastAPI Backend
                          |
           +--------------+--------------+
           |              |              |
           v              v              v
      Well Search     Relevance      Risk Screening
      & Filtering     Assessment     & Depth Matching
           |              |              |
           +--------------+--------------+
                          |
                          v
                Historical Data Store
                          |
             +------------+------------+
             |                         |
             v                         v
       Well Information          Historical Reports
             |                         |
             +------------+------------+
                          |
                          v
              Evidence-Based Insights
                          |
                          v
                 Intelligence Brief
```

## Prototype Data and Transparency

NWIS currently demonstrates its workflow using a combination of publicly available well information, derived historical data, and simulated demonstration inputs.

| Data Category                  | Usage                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Public NLOG Data               | Used for demonstration of well locations and available well information.              |
| Derived Historical Information | Used to demonstrate well comparison and historical intelligence workflows.            |
| Simulated Telemetry            | Used to demonstrate drilling parameter visualization and risk-screening interactions. |
| Demonstration Incidents        | Used to illustrate historical hazard matching and alert presentation.                 |

**Important:** Demonstration records and simulated telemetry are not verified Oil India Limited operational incidents or live drilling measurements.

The current prototype does not establish a live connection with Oil India's eRTMAC platform or operational WITSML feeds.

## Risk Screening Approach

The prototype uses rule-based and heuristic logic to demonstrate how historical drilling information can support early risk awareness.

The screening workflow considers available information such as:

* Active well depth.
* Nearby well relevance.
* Historical incident depth.
* Configurable look-ahead interval.
* Available drilling parameters.
* Supporting historical records.

The resulting indicators are intended to help engineers investigate relevant historical evidence.

They are not validated operational predictions, and any real deployment would require domain-expert review, approved field data, and systematic validation.

## Project Structure

```text
NWIS/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── README.md
└── ...
```

*The structure above is a simplified overview of the project.*

## Getting Started

### Prerequisites

* Python
* Node.js and npm
* Git

### Clone the Repository

```bash
git clone https://github.com/Uzma1708-glitch/NWIS-Nearby-Wells-Intelligence-System.git

cd NWIS-Nearby-Wells-Intelligence-System
```

### Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure the required environment variables using the project's example configuration, if provided.

Initialize the database using the project's setup procedure.

Start the backend using the applicable application entry point:

```bash
uvicorn main:app --reload
```

The API documentation is available at:

```text
http://127.0.0.1:8000/docs
```

### Frontend Setup

Open a separate terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API URL to point to the running backend.

Start the development server:

```bash
npm run dev
```

Follow the local URL displayed in the terminal to access the application.

*Note: The commands above describe the standard development workflow. Database initialization, environment configuration, and application entry points must match the repository's actual configuration.*

## Current Prototype Limitations

* No live integration with Oil India Limited's eRTMAC platform.
* No live operational telemetry feed.
* Demonstration telemetry and incident records may be simulated.
* Risk screening is heuristic and has not been validated for field operations.
* Available public datasets may not contain all geological or operational attributes required for accurate well-to-well correlation.
* Historical insights require verification by qualified drilling personnel.
* The current system is a prototype and is not intended for autonomous drilling decisions.

## Future Scope

* Integration with approved operational and historical well datasets.
* Validation of offset-well relevance using domain-expert feedback.
* Improved geological and depth correlation.
* Backtesting of historical hazard-screening logic.
* Integration with WITSML-compatible data sources.
* Potential integration with eRTMAC through authorized interfaces.
* Advanced analytics and predictive models after sufficient data validation.
* Enhanced reporting and operational knowledge management.

## Expected Impact

NWIS aims to support drilling operations through:

* Improved awareness of historical drilling challenges.
* Faster access to relevant offset-well information.
* Reduced manual effort in searching historical reports.
* Better preparation for previously encountered operational risks.
* Preservation and reuse of institutional drilling knowledge.
* More informed engineering review and planning.

These are intended benefits of the proposed system and have not yet been established through measured field trials.

## References

* [Oil India Limited — Technology Initiatives](https://www.oil-india.com/leveraging-technology)
* [NLOG — Dutch Oil and Gas Portal](https://www.nlog.nl/en/boreholes)
* [Energistics — WITSML](https://energistics.org/witsml-developers-users)

## Project Information

| Field                | Details                                                    |
| -------------------- | ---------------------------------------------------------- |
| Project              | Nearby Wells Intelligence System                           |
| Abbreviation         | NWIS                                                       |
| Hackathon            | Smart India Hackathon 2026                                 |
| Problem Statement ID | SIH26121                                                   |
| Organization         | Oil India Limited                                          |
| Project Type         | Software Prototype                                         |
| Focus Area           | Historical Well Intelligence and Drilling Decision Support |

---

<p align="center">
  <strong>NWIS — Past Wells. Smarter Drilling.</strong>
</p>

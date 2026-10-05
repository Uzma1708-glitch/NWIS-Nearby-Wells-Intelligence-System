\# NWIS — Nearby Wells Intelligence System



\### Smart India Hackathon 2026 | Problem Statement 26121



\*\*Organization:\*\* Oil India Limited (OIL)



NWIS is a prototype drilling decision-support platform designed to connect nearby and historical well information with the current drilling context.



It helps engineers explore relevant offset wells, compare historical drilling experiences, identify previously recorded risk intervals, and access supporting evidence before approaching similar conditions.



\## The Problem



Historical drilling knowledge is often distributed across daily drilling reports, well completion reports, mud logs, and other operational records.



Finding relevant information manually can be time-consuming, making it difficult to use previous well experiences during current drilling operations.



\## Our Solution



NWIS brings historical well information into a unified interface and demonstrates a workflow for:



\* Identifying nearby wells using geographical proximity.

\* Comparing historical wells using available well and depth information.

\* Screening historical drilling events around a selected depth interval.

\* Extracting information from reports using browser-based OCR and domain-specific text processing.

\* Presenting historical evidence and decision-support insights.

\* Preserving drilling knowledge for future reference.



\## Key Features



\* Interactive nearby-well map

\* Offset-well relevance assessment

\* Depth-based historical risk screening

\* Historical event and incident exploration

\* PDF text extraction and OCR-assisted processing

\* Evidence-oriented decision support

\* Printable intelligence brief



\## Technology Stack



| Layer               | Technologies                          |

| ------------------- | ------------------------------------- |

| Frontend            | React, TypeScript, Vite               |

| Mapping             | Leaflet                               |

| Backend             | Python, FastAPI                       |

| Database            | SQLAlchemy, SQLite/PostgreSQL support |

| Database migrations | Alembic                               |

| Document processing | PDF.js, Tesseract.js                  |

| API communication   | Axios                                 |



\## How It Works



1\. Select an active well and its current drilling context.

2\. Identify nearby historical wells.

3\. Assess offset-well relevance.

4\. Compare available depth and historical event information.

5\. Screen for relevant historical risk intervals.

6\. Present alerts and supporting information to the engineer.



\## Prototype Data and Limitations



This submission is a demonstration prototype.



\* Public NLOG borehole information is used where applicable.

\* Synthetic demonstration wells and simulated telemetry are used to illustrate selected operational scenarios.

\* Risk screening uses prototype logic and heuristic assessments.

\* The system is not currently connected to live Oil India rig telemetry or production eRTMAC services.

\* Historical recommendations require domain-expert review before operational use.



NWIS is intended to support engineering decisions, not replace the authority of drilling personnel.



\## Repository Structure



```text

NWIS/

├── backend/              # FastAPI backend and data services

├── frontend/             # React and TypeScript application

├── docs/                 # Product and technical documentation

├── presentation\_assets/  # SIH presentation visual assets

├── scripts/              # Utility scripts

└── README.md

```



\## Local Development



\### Frontend



```bash

cd frontend

npm install

npm run dev

```



The Vite development server will display its local URL in the terminal.



\### Backend



```bash

cd backend

python -m venv .venv

```



Activate the environment on Windows:



```cmd

.venv\\Scripts\\activate

```



Install dependencies:



```bash

pip install -r requirements.txt

```



Create a local `.env` using `.env.example` and configure the database and frontend origin before starting the application.



The FastAPI application entry point is `main.py`.



Run from the backend directory:



```bash

uvicorn main:app --reload

```



API documentation is available at `/docs` when the backend is running.



Database initialization may require the supplied SQL setup or migration configuration.



\## Future Scope



\* Validation with domain experts and historical operational datasets

\* Improved geological and depth correlation

\* Controlled historical backtesting

\* Integration with approved WITSML-compatible data feeds

\* Potential integration with Oil India's eRTMAC ecosystem

\* Further evaluation of predictive models using validated data



\## Project Context



Developed as a Smart India Hackathon 2026 solution for Oil India Limited, Problem Statement 26121.



\*\*NWIS — Past Wells, Smarter Drilling.\*\*




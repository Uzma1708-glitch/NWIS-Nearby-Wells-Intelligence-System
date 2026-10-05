# NWIS — Master Product Blueprint

**Project:** eRTMAC-NWIS (Nearby Wells Intelligence System)  
**SIH Problem Statement:** 26121  
**Status:** LOCKED  
**Document Type:** Master Product Blueprint  
**Implementation Rule:** This document is the product-level source of truth.

---

# 1. PRODUCT IDENTITY

## 1.1 Product Name

**NWIS — Nearby Wells Intelligence System**

Expanded SIH title:

**eRTMAC-NWIS (Nearby Wells Intelligence System): An AI-Powered Offset Well Knowledge and Decision Support Platform for Drilling Operations**

---

## 1.2 Product Purpose

NWIS is an AI-powered drilling decision-support platform that helps drilling engineers understand what happened in nearby and historical wells at comparable depths and formations, identify risks before they occur, and use historical mitigation knowledge to support current drilling decisions.

The core purpose is:

> Given the current state of the active well, determine what relevant nearby wells experienced at comparable depths and formations, identify approaching historical risks, and provide evidence-backed information and recommendations to the drilling engineer.

---

# 2. SOURCE OF TRUTH

The SIH Problem Statement 26121 is the authoritative source for product requirements.

The product must directly address the requirements described in the problem statement.

Implementation must NOT:

1. Remove an explicit SIH requirement.
2. Replace an explicit SIH requirement with an unrelated feature.
3. Add unnecessary features merely to make the application look larger.
4. Turn NWIS into a generic AI chatbot.
5. Turn NWIS into a generic analytics dashboard.
6. Claim access to real OIL data when the prototype uses synthetic data.
7. Claim production-validated AI predictions when the prototype uses explainable/demo models.
8. Change the locked architecture without a strong technical reason.
9. Skip required functionality simply because another feature looks more impressive.
10. Move to the next implementation phase before the current phase is working and verified.

Every major feature must satisfy at least one of these conditions:

- Explicitly required by SIH PS 26121.
- Directly enables an explicit SIH requirement.
- Directly improves the usability of an explicit SIH requirement.

---

# 3. PROBLEM BEING SOLVED

OIL's eRTMAC environment provides real-time drilling data, mud logging information, and wellsite analytics.

However, drilling decisions also require knowledge from nearby and historical wells drilled in the same or comparable reservoirs and formations.

Historical information is distributed across sources such as:

- Well Completion Reports (WCRs)
- Daily Drilling Reports (DDRs)
- Drilling reports
- Mud logging records
- Historical drilling parameters
- Geological and reservoir information
- Casing programs
- Cementing records
- Mud programs
- Operational event records
- Individual experience and memory

This makes historical knowledge difficult and slow to retrieve.

NWIS addresses this gap by connecting:

**Current Well State → Nearby Wells → Historical Knowledge → Correlation → Risk Detection → Alert → Recommendation**

---

# 4. CORE PRODUCT LOOP

The entire system should revolve around this operational loop:

```text
ACTIVE WELL
    ↓
CURRENT SITUATION
    ↓
FIND NEARBY / RELEVANT WELLS
    ↓
DETERMINE WELL RELEVANCE
    ↓
RETRIEVE HISTORICAL KNOWLEDGE
    ↓
CORRELATE DEPTH / FORMATION / PARAMETERS
    ↓
IDENTIFY HISTORICAL RISK INTERVALS
    ↓
PREDICT / SCORE APPROACHING RISKS
    ↓
GENERATE PROACTIVE ALERT
    ↓
PROVIDE HISTORICAL EVIDENCE
    ↓
PROVIDE MITIGATION RECOMMENDATION
    ↓
ENGINEER DECISION
    ↓
NEW KNOWLEDGE CAN BE STORED
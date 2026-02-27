# FUNCTIONAL REQUIREMENTS

## Rule of Precedence

1. Mockup defines visible features.
2. Caderno de Testes defines expected behaviors.
3. Technical PDF complements architecture/security.

---

## 1. Data Acquisition

- Import data from CSV (manual upload via UI)
- Automatic scheduled ingestion (if present in mockup)
- Store as raw_data (immutable)

---

## 2. Data Storage

- raw_data table (immutable)
- validated_data table (derived)
- Maintain separation permanently
- Historical storage up to 5 years per station

---

## 3. Data Validation

- Validate individual records
- Batch validation
- Mandatory reason for invalidation
- Cannot modify raw_data
- Validation history must be stored

---

## 4. Dashboards

Must match exactly what exists in mockup:

- Time series graphs
- KPI cards
- Availability indicators
- IQAR indicator (if shown in UI)
- Trend charts

No additional visualizations allowed.

---

## 5. Supervisory Module

If shown in UI:

- Real-time monitoring
- Visual alerts
- Highlight anomalous values

---

## 6. Export

✔ ONLY CSV

- Export filtered dataset
- Include validation flags
- Include timestamp
- UTF-8 encoding
- No other export formats

---

## 7. Role Management

- Admin
- Analyst
- View-only

Permissions must follow role matrix.
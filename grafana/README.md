# Grafana dashboard

`show-me-backend.json` is the "Show ME backend" dashboard in Grafana Cloud.
It reads straight from Google Cloud, so nothing is copied out of Google:

- **Metrics** that Cloud Run records for the `apiv2` service by itself
  (requests, failures, response time, servers, memory), through the
  **Google Cloud Monitoring** data source. These are free.
- **Log lines** written by `backend/middlewares/requestLog.ts`, through the
  **Google Cloud Logging** data source.

The **Environment** dropdown at the top switches every panel between
Production (`showme-backend-789`) and Staging (`showme-staging`).

## Import it

Grafana → **Dashboards** → **New** → **Import** → upload this file →
**Import**. It finds the two Google data sources by their type, so there are
no ids to fill in.

## Change it

Edit the dashboard in Grafana, then **Edit** → **Settings** → **JSON Model**,
copy the JSON into this file and commit it. The repo then keeps every
version, and the dashboard can be re-imported if it's ever lost.

## Keep it free

- Grafana reads Google's metrics only while the dashboard is open. The first
  million readings a month are free, so don't leave it open on a screen
  refreshing every minute around the clock.
- Each log panel fetches the newest 100 lines in one request; Google allows
  60 log searches a minute per project.

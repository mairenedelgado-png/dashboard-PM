#!/usr/bin/env python3
"""Sincroniza clientes de Zoho CRM con data/live.json.

Las credenciales se leen exclusivamente desde variables de entorno/GitHub Secrets.
El script conserva Jira, Gmail y el resto de la información existente en live.json.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
LIVE_FILE = ROOT / "data" / "live.json"


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Falta la variable requerida: {name}")
    return value


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, data: bytes | None = None) -> dict[str, Any]:
    request = urllib.request.Request(url, method=method, headers=headers or {}, data=data)
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Zoho respondió HTTP {exc.code}: {detail[:500]}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"No fue posible conectar con Zoho: {exc.reason}") from exc


def get_access_token() -> tuple[str, str]:
    accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.com").rstrip("/")
    payload = urllib.parse.urlencode(
        {
            "refresh_token": required("ZOHO_REFRESH_TOKEN"),
            "client_id": required("ZOHO_CLIENT_ID"),
            "client_secret": required("ZOHO_CLIENT_SECRET"),
            "grant_type": "refresh_token",
        }
    ).encode("utf-8")
    result = request_json(f"{accounts_url}/oauth/v2/token", method="POST", data=payload)
    token = result.get("access_token")
    if not token:
        raise RuntimeError(f"Zoho no devolvió access_token: {result}")
    api_domain = str(result.get("api_domain") or os.getenv("ZOHO_API_DOMAIN", "https://www.zohoapis.com")).rstrip("/")
    return str(token), api_domain


def fetch_records(token: str, api_domain: str, module: str, fields: list[str]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    page = 1
    while True:
        query = urllib.parse.urlencode({"fields": ",".join(fields), "page": page, "per_page": 200})
        result = request_json(
            f"{api_domain}/crm/v8/{urllib.parse.quote(module)}?{query}",
            headers={"Authorization": f"Zoho-oauthtoken {token}"},
        )
        records.extend(result.get("data", []))
        info = result.get("info", {})
        if not info.get("more_records"):
            break
        page += 1
    return records


def normalize(value: Any) -> Any:
    if isinstance(value, dict):
        return value.get("name") or value.get("display_value") or value.get("id")
    return value


def main() -> int:
    if not LIVE_FILE.exists():
        raise RuntimeError(f"No se encontró {LIVE_FILE}")

    live = json.loads(LIVE_FILE.read_text(encoding="utf-8"))
    module = os.getenv("ZOHO_MODULE", "Accounts")
    tenant_field = os.getenv("ZOHO_TENANT_FIELD", "Tenant")
    name_field = os.getenv("ZOHO_NAME_FIELD", "Account_Name")
    classification_field = os.getenv("ZOHO_CLASSIFICATION_FIELD", "Classification")
    status_field = os.getenv("ZOHO_STATUS_FIELD", "Status")
    payment_field = os.getenv("ZOHO_PAYMENT_FIELD", "Pending_Payment")
    fields = list(dict.fromkeys([tenant_field, name_field, classification_field, status_field, payment_field]))

    token, api_domain = get_access_token()
    records = fetch_records(token, api_domain, module, fields)

    matched: list[dict[str, Any]] = []
    skipped = 0
    for record in records:
        tenant = normalize(record.get(tenant_field))
        name = normalize(record.get(name_field))
        if tenant in (None, "") or name in (None, ""):
            skipped += 1
            continue
        try:
            tenant_value: Any = int(str(tenant))
        except ValueError:
            tenant_value = str(tenant)
        matched.append(
            {
                "tenant": tenant_value,
                "name": str(name),
                "classification": normalize(record.get(classification_field)) or "Pendiente de validación",
                "status": normalize(record.get(status_field)) or "Pendiente de validación",
                "pendingPayment": normalize(record.get(payment_field)) or "Pendiente de validación",
            }
        )

    matched.sort(key=lambda item: item["name"].casefold())
    now = datetime.now(ZoneInfo(os.getenv("DASHBOARD_TIMEZONE", "America/El_Salvador"))).isoformat(timespec="seconds")

    live.setdefault("meta", {})
    live["meta"].update({"mode": "automatic", "lastAttempt": now, "lastSuccessfulSync": now})
    live.setdefault("sources", {})["zoho"] = {
        "status": "ok",
        "message": f"Zoho CRM sincronizado automáticamente: {len(matched)} clientes válidos; {skipped} registros omitidos sin Tenant o nombre.",
    }
    live["zoho"] = {
        "module": module,
        "matchField": tenant_field,
        "paymentTermsField": payment_field,
        "matchedDashboardClients": matched,
    }
    live.setdefault("rules", {})["zohoMatchField"] = tenant_field

    LIVE_FILE.write_text(json.dumps(live, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Zoho sincronizado correctamente: {len(matched)} clientes.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)

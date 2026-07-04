from integrations.wazuh_indexer import get_recent_alerts

alerts = get_recent_alerts()

print(alerts)
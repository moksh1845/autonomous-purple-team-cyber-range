from integrations.wazuh_collector_client import get_alerts

alerts = get_alerts()

print(alerts)
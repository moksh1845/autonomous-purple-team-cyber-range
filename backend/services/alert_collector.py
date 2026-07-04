from integrations.wazuh_indexer import get_recent_alerts


def collect_alerts():

    data = get_recent_alerts()

    alerts = []

    for hit in data["hits"]["hits"]:

        source = hit["_source"]

        alerts.append({

            "rule_id":
                source.get("rule", {}).get("id"),

            "rule_description":
                source.get(
                    "rule",
                    {}
                ).get(
                    "description"
                ),

            "agent":
                source.get(
                    "agent",
                    {}
                ).get(
                    "name"
                ),

            "timestamp":
                source.get("@timestamp")
        })

    return alerts
from integrations.wazuh_client import get_agents


def get_agent_health():

    agents = get_agents()

    result = []

    for agent in agents.get(
        "affected_items",
        []
    ):

        result.append(
            {
                "id": agent.get("id"),
                "name": agent.get("name"),
                "status": agent.get("status")
            }
        )

    return result
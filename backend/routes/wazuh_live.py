from fastapi import APIRouter, Depends

from services.wazuh_live_service import get_live_alerts
from security.rbac import require_role

router = APIRouter()


@router.get("/wazuh/live-alerts")
def live_alerts(current_user=Depends(require_role(["Admin", "Purple Team Lead"]))):
    return get_live_alerts()

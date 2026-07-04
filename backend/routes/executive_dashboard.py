from fastapi import APIRouter

from services.executive_dashboard import (
    get_executive_dashboard
)

router = APIRouter()

@router.get("/executive-dashboard")
def executive_dashboard():

    return get_executive_dashboard()
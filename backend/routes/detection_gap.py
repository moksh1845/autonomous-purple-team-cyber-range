from fastapi import APIRouter, Depends

from services.detection_gap import calculate_detection_gaps
from security.auth import get_current_user

router = APIRouter()


@router.get("/detection-gaps")
def detection_gaps(current_user=Depends(get_current_user)):
    return calculate_detection_gaps()

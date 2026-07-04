from jose import jwt, JWTError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

from config.settings import settings

security = HTTPBearer()


def get_current_user(credentials=Depends(security)):
    """
    Decode and validate the bearer token, returning the JWT payload
    (contains at least 'sub' = username and 'role').

    NOTE: token contents are intentionally never logged — printing
    raw JWTs/decoded claims to stdout leaks valid session credentials
    into server logs.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        username = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Invalid Token")

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid Token")

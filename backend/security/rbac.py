from fastapi import Depends, HTTPException

from security.auth import get_current_user


def require_role(allowed_roles: list):

    def role_checker(current_user=Depends(get_current_user)):

        user_role = current_user.get("role")

        if user_role is None or user_role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Access Denied"
            )

        return current_user

    return role_checker
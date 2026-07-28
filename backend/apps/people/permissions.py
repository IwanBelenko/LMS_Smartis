from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.identity.models import User


class IsHcmUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return request.user.is_superuser or request.user.role in {
                User.Role.ADMIN,
                User.Role.HR,
                User.Role.LEADER,
            }
        return request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}


class IsRecruiter(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR})
        )

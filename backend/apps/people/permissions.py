from rest_framework.permissions import BasePermission

from apps.identity.models import User


class IsHcmUser(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR})
        )


class IsRecruiter(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR})
        )

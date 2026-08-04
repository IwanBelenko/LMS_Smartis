from rest_framework.permissions import BasePermission, SAFE_METHODS

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


class IsCandidateCollaborator(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}:
            return True
        return request.user.role == User.Role.LEADER and (request.method in SAFE_METHODS or request.method == "POST")


class IsHcmRegistryUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.role in {User.Role.ADMIN, User.Role.HR}:
            return True
        return request.user.role == User.Role.LEADER and request.method in SAFE_METHODS

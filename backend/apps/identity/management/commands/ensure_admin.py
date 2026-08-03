import os

from django.core.management.base import BaseCommand, CommandError

from apps.identity.models import User


class Command(BaseCommand):
    help = "Создаёт первого администратора без демонстрационных данных"

    def handle(self, *args, **options):
        email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip().lower()
        password = os.getenv("INITIAL_ADMIN_PASSWORD", "")
        if not email or not password:
            raise CommandError("Задайте INITIAL_ADMIN_EMAIL и INITIAL_ADMIN_PASSWORD")
        if len(password) < 12:
            raise CommandError("INITIAL_ADMIN_PASSWORD должен содержать не менее 12 символов")

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "role": User.Role.ADMIN,
                "status": User.Status.ACTIVE,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        changed = []
        if not user.is_staff:
            user.is_staff = True
            changed.append("is_staff")
        if not user.is_superuser:
            user.is_superuser = True
            changed.append("is_superuser")
        if user.role != User.Role.ADMIN:
            user.role = User.Role.ADMIN
            changed.append("role")
        if user.status != User.Status.ACTIVE:
            user.status = User.Status.ACTIVE
            changed.append("status")
        if created or not user.has_usable_password():
            user.set_password(password)
            changed.append("password")
        if changed:
            user.save(update_fields=list(dict.fromkeys(changed)))
        self.stdout.write(self.style.SUCCESS(
            f"Администратор {email} {'создан' if created else 'проверен'}",
        ))

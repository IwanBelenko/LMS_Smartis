import os
from django.core.management.base import BaseCommand
from apps.identity.models import Department, User


class Command(BaseCommand):
    help = "Создаёт демонстрационного администратора и отдел"

    def handle(self, *args, **options):
        department, _ = Department.objects.get_or_create(
            code="analytics",
            defaults={"name": "Аналитика"},
        )
        email = os.getenv("DEMO_ADMIN_EMAIL", "admin@smartis.local")
        password = os.getenv("DEMO_ADMIN_PASSWORD", "SmartisDemo123!")
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Иван",
                "last_name": "Администратор",
                "department": department,
                "role": User.Role.ADMIN,
                "status": User.Status.ACTIVE,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            user.set_password(password)
            user.save(update_fields=["password"])
            self.stdout.write(self.style.SUCCESS(f"Создан администратор {email}"))
        else:
            self.stdout.write(f"Администратор {email} уже существует")

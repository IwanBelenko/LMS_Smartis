from urllib.parse import urlencode

from django.conf import settings
from django.core.mail import EmailMultiAlternatives


def _send(subject, recipient, lines):
    message = EmailMultiAlternatives(
        subject=subject,
        body="\n\n".join(lines),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    message.send(fail_silently=False)


def send_invitation_email(invitation):
    from apps.core.models import get_system_settings

    configuration = get_system_settings()
    query = urlencode({"invite": str(invitation.token)})
    link = f"{settings.APP_PUBLIC_URL}/?{query}"
    name = invitation.user.get_full_name() or invitation.user.email
    support_line = (
        f"Если вы не ожидали это письмо, напишите в поддержку: {configuration.support_email}"
        if configuration.support_email
        else "Если вы не ожидали это письмо, сообщите администратору."
    )
    _send(
        f"Приглашение в {configuration.company_name}",
        invitation.user.email,
        [
            f"Здравствуйте, {name}!",
            f"Для вас создана учётная запись в корпоративной системе управления и обучения персонала {configuration.company_name}.",
            f"Задайте пароль и активируйте доступ: {link}",
            f"Ссылка действует {configuration.invitation_expiry_days} дн. и может быть использована только один раз.",
            support_line,
        ],
    )


def send_password_reset_email(user, uid, token):
    from apps.core.models import get_system_settings

    configuration = get_system_settings()
    query = urlencode({"reset_uid": uid, "reset_token": token})
    link = f"{settings.APP_PUBLIC_URL}/?{query}"
    name = user.get_full_name() or user.email
    _send(
        f"Восстановление доступа к {configuration.company_name}",
        user.email,
        [
            f"Здравствуйте, {name}!",
            f"Получен запрос на восстановление доступа к {configuration.company_name}.",
            f"Задайте новый пароль: {link}",
            "Ссылка одноразовая. Если вы не запрашивали восстановление, просто проигнорируйте письмо.",
        ],
    )

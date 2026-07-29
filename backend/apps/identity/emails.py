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
    query = urlencode({"invite": str(invitation.token)})
    link = f"{settings.APP_PUBLIC_URL}/?{query}"
    name = invitation.user.get_full_name() or invitation.user.email
    _send(
        "Приглашение в HCM / LMS Smartis",
        invitation.user.email,
        [
            f"Здравствуйте, {name}!",
            "Для вас создана учётная запись в корпоративной системе управления и обучения персонала HCM / LMS Smartis.",
            f"Задайте пароль и активируйте доступ: {link}",
            "Ссылка действует 7 дней и может быть использована только один раз.",
            "Если вы не ожидали это письмо, сообщите администратору.",
        ],
    )


def send_password_reset_email(user, uid, token):
    query = urlencode({"reset_uid": uid, "reset_token": token})
    link = f"{settings.APP_PUBLIC_URL}/?{query}"
    name = user.get_full_name() or user.email
    _send(
        "Восстановление доступа к HCM / LMS Smartis",
        user.email,
        [
            f"Здравствуйте, {name}!",
            "Получен запрос на восстановление доступа к HCM / LMS Smartis.",
            f"Задайте новый пароль: {link}",
            "Ссылка одноразовая. Если вы не запрашивали восстановление, просто проигнорируйте письмо.",
        ],
    )

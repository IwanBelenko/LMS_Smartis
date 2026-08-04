import secrets
import string


PASSWORD_LENGTH = 16
PASSWORD_SYMBOLS = "!@#$%&*+-?"


def generate_temporary_password():
    """Generate a strong password that is shown once and never stored as plaintext."""
    characters = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(PASSWORD_SYMBOLS),
    ]
    alphabet = string.ascii_letters + string.digits + PASSWORD_SYMBOLS
    characters.extend(secrets.choice(alphabet) for _ in range(PASSWORD_LENGTH - len(characters)))
    secrets.SystemRandom().shuffle(characters)
    return "".join(characters)

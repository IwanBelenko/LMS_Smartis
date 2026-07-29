from __future__ import annotations

import re

from rest_framework import serializers


SINGLE_CHOICE = "single_choice"
MULTIPLE_CHOICE = "multiple_choice"
TRUE_FALSE = "true_false"
MATCHING = "matching"
ORDERING = "ordering"
SHORT_TEXT = "short_text"
FILL_BLANK = "fill_blank"

QUESTION_TYPES = {
    SINGLE_CHOICE,
    MULTIPLE_CHOICE,
    TRUE_FALSE,
    MATCHING,
    ORDERING,
    SHORT_TEXT,
    FILL_BLANK,
}


def question_type(question):
    value = question.get("type", SINGLE_CHOICE) if isinstance(question, dict) else SINGLE_CHOICE
    return value if value in QUESTION_TYPES else SINGLE_CHOICE


def _clean_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def _option_texts(question):
    return [
        str(option.get("text", "")).strip()
        for option in question.get("options", [])
        if isinstance(option, dict)
    ]


def _rotated(values):
    if len(values) < 2:
        return values
    return values[1:] + values[:1]


def validate_quiz_question(question):
    if not isinstance(question, dict) or not str(question.get("prompt", "")).strip():
        raise serializers.ValidationError({"quiz_data": "Добавьте текст для каждого вопроса"})
    kind = question_type(question)
    image_url = question.get("image_url", "")
    if image_url is not None and not isinstance(image_url, str):
        raise serializers.ValidationError({"quiz_data": "Ссылка на изображение должна быть строкой"})
    if any(
        question.get(field) is not None and not isinstance(question.get(field), str)
        for field in ("feedback_correct", "feedback_incorrect")
    ):
        raise serializers.ValidationError({"quiz_data": "Пояснение к ответу должно быть текстом"})

    if kind in {SINGLE_CHOICE, MULTIPLE_CHOICE}:
        options = question.get("options", [])
        if len(options) < 2 or any(
            not isinstance(option, dict) or not str(option.get("text", "")).strip()
            for option in options
        ):
            raise serializers.ValidationError({"quiz_data": "Добавьте минимум два заполненных варианта ответа"})
        correct_count = sum(bool(option.get("correct")) for option in options)
        if kind == SINGLE_CHOICE and correct_count != 1:
            raise serializers.ValidationError({"quiz_data": "Отметьте один правильный ответ"})
        if kind == MULTIPLE_CHOICE and correct_count < 1:
            raise serializers.ValidationError({"quiz_data": "Отметьте хотя бы один правильный ответ"})
    elif kind == TRUE_FALSE:
        if not isinstance(question.get("correct_boolean"), bool):
            raise serializers.ValidationError({"quiz_data": "Укажите, верно утверждение или нет"})
    elif kind == MATCHING:
        pairs = question.get("pairs", [])
        if len(pairs) < 2 or any(
            not isinstance(pair, dict)
            or not str(pair.get("left", "")).strip()
            or not str(pair.get("right", "")).strip()
            for pair in pairs
        ):
            raise serializers.ValidationError({"quiz_data": "Добавьте минимум две заполненные пары"})
        left = [_clean_text(pair["left"]) for pair in pairs]
        right = [_clean_text(pair["right"]) for pair in pairs]
        if len(set(left)) != len(left) or len(set(right)) != len(right):
            raise serializers.ValidationError({"quiz_data": "Элементы сопоставления не должны повторяться"})
    elif kind == ORDERING:
        options = _option_texts(question)
        if len(options) < 2 or any(not item for item in options):
            raise serializers.ValidationError({"quiz_data": "Добавьте минимум два элемента последовательности"})
        if len({_clean_text(item) for item in options}) != len(options):
            raise serializers.ValidationError({"quiz_data": "Элементы последовательности не должны повторяться"})
    else:
        accepted = question.get("accepted_answers", [])
        if not isinstance(accepted, list) or not any(_clean_text(item) for item in accepted):
            raise serializers.ValidationError({"quiz_data": "Добавьте хотя бы один принимаемый ответ"})
        if kind == FILL_BLANK and "___" not in str(question.get("prompt", "")):
            raise serializers.ValidationError({"quiz_data": "Отметьте пропуск в тексте тремя подчёркиваниями: ___"})


def learner_question(question):
    kind = question_type(question)
    result = {
        "type": kind,
        "prompt": question.get("prompt", ""),
        "image_url": question.get("image_url", ""),
        "learner_view": True,
    }
    if kind in {SINGLE_CHOICE, MULTIPLE_CHOICE}:
        result["options"] = [{"text": option.get("text", "")} for option in question.get("options", [])]
    elif kind == MATCHING:
        pairs = question.get("pairs", [])
        result["left_items"] = [pair.get("left", "") for pair in pairs]
        result["right_items"] = _rotated([pair.get("right", "") for pair in pairs])
    elif kind == ORDERING:
        result["options"] = [{"text": item} for item in _rotated(_option_texts(question))]
    return result


def answer_is_correct(question, answer):
    kind = question_type(question)
    if kind == SINGLE_CHOICE:
        options = question.get("options", [])
        return isinstance(answer, int) and 0 <= answer < len(options) and bool(options[answer].get("correct"))
    if kind == MULTIPLE_CHOICE:
        if not isinstance(answer, list) or not all(isinstance(item, int) for item in answer):
            return False
        expected = {index for index, option in enumerate(question.get("options", [])) if option.get("correct")}
        return set(answer) == expected and len(answer) == len(set(answer))
    if kind == TRUE_FALSE:
        return isinstance(answer, bool) and answer == question.get("correct_boolean")
    if kind == MATCHING:
        expected = [pair.get("right", "") for pair in question.get("pairs", [])]
        return isinstance(answer, list) and [_clean_text(item) for item in answer] == [_clean_text(item) for item in expected]
    if kind == ORDERING:
        expected = _option_texts(question)
        return isinstance(answer, list) and [_clean_text(item) for item in answer] == [_clean_text(item) for item in expected]
    if kind in {SHORT_TEXT, FILL_BLANK}:
        accepted = {_clean_text(item) for item in question.get("accepted_answers", [])}
        return isinstance(answer, str) and _clean_text(answer) in accepted
    return False


def answer_is_valid(question, answer):
    kind = question_type(question)
    if kind == SINGLE_CHOICE:
        return isinstance(answer, int) and 0 <= answer < len(question.get("options", []))
    if kind == MULTIPLE_CHOICE:
        options = question.get("options", [])
        return (
            isinstance(answer, list)
            and bool(answer)
            and len(answer) == len(set(answer))
            and all(isinstance(item, int) and 0 <= item < len(options) for item in answer)
        )
    if kind == TRUE_FALSE:
        return isinstance(answer, bool)
    if kind == MATCHING:
        return (
            isinstance(answer, list)
            and len(answer) == len(question.get("pairs", []))
            and all(isinstance(item, str) and item.strip() for item in answer)
        )
    if kind == ORDERING:
        expected = _option_texts(question)
        return (
            isinstance(answer, list)
            and len(answer) == len(expected)
            and sorted(_clean_text(item) for item in answer) == sorted(_clean_text(item) for item in expected)
        )
    return isinstance(answer, str) and bool(answer.strip())

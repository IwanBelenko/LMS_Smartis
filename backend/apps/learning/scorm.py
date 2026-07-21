import html
import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree
from xml.sax.saxutils import escape as xml_escape
from xml.sax.saxutils import quoteattr

from django.conf import settings
from rest_framework import serializers

from .models import Course, Lesson


@dataclass(frozen=True)
class ScormManifest:
    title: str
    identifier: str
    entry_point: str
    members: tuple[str, ...]


SCORM_BRIDGE = """<script data-smartis-scorm-bridge>
(function(){
  if(window.API) return;
  var values={"cmi.core.lesson_status":"not attempted","cmi.core.score.raw":"","cmi.core.session_time":"00:00:00"};
  function send(action,key,value){try{window.parent.postMessage({type:"smartis-scorm-1.2",action:action,key:key||"",value:value||""},"*")}catch(e){}}
  window.API={
    LMSInitialize:function(){send("initialize");return "true"},
    LMSFinish:function(){send("finish");return "true"},
    LMSGetValue:function(key){return Object.prototype.hasOwnProperty.call(values,key)?values[key]:""},
    LMSSetValue:function(key,value){values[key]=String(value);send("set",key,String(value));return "true"},
    LMSCommit:function(){send("commit");return "true"},
    LMSGetLastError:function(){return "0"},
    LMSGetErrorString:function(){return "No error"},
    LMSGetDiagnostic:function(){return ""}
  };
})();
</script>"""


def ensure_scorm_runtime_bridge(course: Course) -> Path:
    media_root = Path(settings.MEDIA_ROOT).resolve()
    launch_file = (media_root / course.scorm_content_dir / course.scorm_entry_point).resolve()
    if media_root not in launch_file.parents or not launch_file.is_file():
        raise serializers.ValidationError("Стартовый файл SCORM не найден")
    if launch_file.suffix.lower() not in {".html", ".htm"}:
        return launch_file
    try:
        launch_html = launch_file.read_text(encoding="utf-8-sig")
        if "data-smartis-scorm-bridge" not in launch_html:
            lower_html = launch_html.lower()
            head_start = lower_html.find("<head")
            insert_at = lower_html.find(">", head_start) + 1 if head_start >= 0 else 0
            launch_html = launch_html[:insert_at] + SCORM_BRIDGE + launch_html[insert_at:]
            launch_file.write_text(launch_html, encoding="utf-8")
    except UnicodeError:
        pass
    return launch_file


def _safe_member_name(name: str) -> str:
    if "\\" in name:
        raise serializers.ValidationError("SCORM-пакет содержит недопустимый путь")
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or (path.parts and ":" in path.parts[0]):
        raise serializers.ValidationError("SCORM-пакет содержит недопустимый путь")
    normalized = path.as_posix().lstrip("./")
    if not normalized:
        raise serializers.ValidationError("SCORM-пакет содержит пустой путь")
    return normalized


def inspect_scorm_package(upload) -> ScormManifest:
    if upload.size > settings.MAX_SCORM_UPLOAD_SIZE:
        max_mb = settings.MAX_SCORM_UPLOAD_SIZE // (1024 * 1024)
        raise serializers.ValidationError(f"Размер SCORM-пакета не должен превышать {max_mb} МБ")
    if Path(upload.name).suffix.lower() != ".zip":
        raise serializers.ValidationError("SCORM 1.2 должен быть загружен как ZIP-архив")

    try:
        upload.seek(0)
        with zipfile.ZipFile(upload) as archive:
            infos = archive.infolist()
            if len(infos) > settings.MAX_SCORM_FILES:
                raise serializers.ValidationError("В SCORM-пакете слишком много файлов")
            unpacked_size = sum(info.file_size for info in infos)
            if unpacked_size > settings.MAX_SCORM_UNPACKED_SIZE:
                max_mb = settings.MAX_SCORM_UNPACKED_SIZE // (1024 * 1024)
                raise serializers.ValidationError(f"Распакованный SCORM-пакет не должен превышать {max_mb} МБ")

            members = tuple(_safe_member_name(info.filename) for info in infos if not info.is_dir())
            member_lookup = {name.casefold(): name for name in members}
            manifest_name = member_lookup.get("imsmanifest.xml")
            if not manifest_name:
                raise serializers.ValidationError("В корне SCORM-пакета не найден imsmanifest.xml")
            manifest_bytes = archive.read(manifest_name)
    except zipfile.BadZipFile as exc:
        raise serializers.ValidationError("Не удалось открыть ZIP-архив SCORM") from exc
    finally:
        upload.seek(0)

    if len(manifest_bytes) > 5 * 1024 * 1024:
        raise serializers.ValidationError("Файл imsmanifest.xml слишком большой")
    try:
        root = ElementTree.fromstring(manifest_bytes)
    except ElementTree.ParseError as exc:
        raise serializers.ValidationError("Файл imsmanifest.xml повреждён") from exc

    schema_version = root.findtext(".//{*}schemaversion", default="").strip()
    if "1.2" not in schema_version:
        raise serializers.ValidationError("Поддерживается только SCORM 1.2")

    organizations = root.find(".//{*}organizations")
    if organizations is None:
        raise serializers.ValidationError("В SCORM-манифесте отсутствует структура курса")
    default_organization = organizations.get("default", "")
    organization = next(
        (item for item in organizations.findall("{*}organization") if item.get("identifier") == default_organization),
        None,
    ) or organizations.find("{*}organization")
    if organization is None:
        raise serializers.ValidationError("В SCORM-манифесте не найдена организация")

    title = organization.findtext("{*}title", default="").strip() or "Импортированный курс SCORM"
    launch_item = next(
        (item for item in organization.iter() if item.tag.endswith("item") and item.get("identifierref")),
        None,
    )
    if launch_item is None:
        raise serializers.ValidationError("В SCORM-манифесте не найден стартовый материал")
    resource_identifier = launch_item.get("identifierref")
    resource = next(
        (item for item in root.findall(".//{*}resource") if item.get("identifier") == resource_identifier),
        None,
    )
    if resource is None or not resource.get("href"):
        raise serializers.ValidationError("В SCORM-манифесте не найден стартовый файл")

    entry_point = _safe_member_name(unquote(urlsplit(resource.get("href", "")).path))
    if entry_point.casefold() not in member_lookup:
        raise serializers.ValidationError("Стартовый файл SCORM отсутствует в архиве")
    return ScormManifest(
        title=title[:220],
        identifier=(root.get("identifier") or "")[:255],
        entry_point=member_lookup[entry_point.casefold()],
        members=members,
    )


def extract_scorm_package(course: Course, manifest: ScormManifest) -> None:
    package_stem = Path(course.scorm_package.name).stem
    relative_dir = Path("courses") / str(course.id) / "scorm" / package_stem
    destination = (Path(settings.MEDIA_ROOT) / relative_dir).resolve()
    media_root = Path(settings.MEDIA_ROOT).resolve()
    if media_root not in destination.parents:
        raise serializers.ValidationError("Не удалось подготовить каталог SCORM")
    destination.mkdir(parents=True, exist_ok=False)

    try:
        with zipfile.ZipFile(course.scorm_package.path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                safe_name = _safe_member_name(info.filename)
                target = (destination / safe_name).resolve()
                if destination not in target.parents:
                    raise serializers.ValidationError("SCORM-пакет содержит недопустимый путь")
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(info) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output, length=1024 * 1024)
    except Exception:
        shutil.rmtree(destination, ignore_errors=True)
        raise

    course.scorm_content_dir = relative_dir.as_posix()
    course.scorm_entry_point = manifest.entry_point
    course.save(update_fields=["scorm_content_dir", "scorm_entry_point", "updated_at"])
    ensure_scorm_runtime_bridge(course)


def _lesson_markup(lesson: Lesson, asset_paths: dict[int, str]) -> str:
    title = html.escape(lesson.title)
    if lesson.lesson_type == Lesson.Type.TEXT:
        body = lesson.content or "<p>Материал главы пока не заполнен.</p>"
    elif lesson.lesson_type == Lesson.Type.VIDEO and lesson.id in asset_paths:
        body = f'<video controls preload="metadata" src="{html.escape(asset_paths[lesson.id])}"></video>'
    elif lesson.lesson_type in {Lesson.Type.LINK, Lesson.Type.FILE}:
        url = html.escape(lesson.media_url, quote=True)
        body = f'<p><a class="material-link" href="{url}" target="_blank" rel="noopener">Открыть материал</a></p>'
    else:
        body = "<p>Материал доступен в исходной LMS.</p>"
    return f'<section class="chapter"><p class="chapter-number">Глава {lesson.position + 1}</p><h1>{title}</h1><div class="content">{body}</div></section>'


def _player_html(course: Course, asset_paths: dict[int, str], cover_path: str) -> str:
    lessons = list(course.lessons.all())
    chapters = "\n".join(_lesson_markup(lesson, asset_paths) for lesson in lessons)
    cover_style = f' style="background-image:linear-gradient(90deg,rgba(8,12,7,.86),rgba(8,12,7,.4)),url(\'{html.escape(cover_path)}\')"' if cover_path else ""
    return f"""<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(course.title)}</title><style>
:root{{--brand:#7ea935;--ink:#172014;--muted:#5d6858;--paper:#fff;--bg:#eef2e9}}*{{box-sizing:border-box}}
body{{margin:0;font-family:Arial,sans-serif;color:var(--ink);background:var(--bg)}}.progress{{position:fixed;inset:0 0 auto;height:5px;background:#dfe6d9;z-index:4}}.progress span{{display:block;height:100%;width:0;background:var(--brand);transition:.2s}}
.course{{width:min(900px,calc(100% - 24px));margin:24px auto 90px}}.cover,.chapter{{min-height:calc(100vh - 120px);padding:clamp(32px,7vw,88px);border-radius:18px;background:var(--paper);box-shadow:0 16px 45px #23311c1c}}
.cover{{display:flex;flex-direction:column;justify-content:center;background-size:cover;background-position:center}}.cover.has-image{{color:#fff}}.eyebrow,.chapter-number{{color:var(--brand);font-weight:800;letter-spacing:.12em;text-transform:uppercase}}h1{{font-size:clamp(2.2rem,6vw,4.6rem);line-height:1.04;margin:.35em 0}}.lead{{max-width:680px;font-size:1.2rem;line-height:1.65;color:var(--muted)}}.has-image .lead{{color:#f1f5ee}}
.chapter{{display:none}}.chapter.active{{display:block}}.content{{font-size:1.05rem;line-height:1.75}}.content h1{{font-size:2.2rem}}.content h2{{font-size:1.7rem}}.content img,.content video{{max-width:100%;border-radius:12px}}.content blockquote{{padding:12px 18px;border-left:4px solid var(--brand);background:#f3f6f0}}.material-link{{display:inline-block;padding:12px 16px;border-radius:9px;background:var(--brand);color:#142008;text-decoration:none;font-weight:700}}
.nav{{position:fixed;left:50%;bottom:18px;translate:-50% 0;display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #cad3c5;border-radius:14px;background:#fffffff2;box-shadow:0 8px 30px #18201624}}button{{min-height:42px;padding:9px 15px;border:1px solid #cad3c5;border-radius:9px;background:#fff;font-weight:700;cursor:pointer}}button.primary{{background:var(--brand);border-color:#6e962c}}button:disabled{{opacity:.45}}.counter{{min-width:70px;text-align:center;color:var(--muted);font-size:.85rem}}
@media(max-width:600px){{.cover,.chapter{{padding:28px 22px;border-radius:12px}}.nav{{width:calc(100% - 24px);justify-content:space-between}}}}
</style></head><body><div class="progress"><span id="progress"></span></div><main class="course">
<section class="cover{' has-image' if cover_path else ''}"{cover_style}><p class="eyebrow">SMARTIS · ОБУЧЕНИЕ</p><h1>{html.escape(course.title)}</h1><p class="lead">{html.escape(course.description)}</p></section>
{chapters}</main><nav class="nav"><button id="prev">Назад</button><span class="counter" id="counter"></span><button class="primary" id="next">Начать</button></nav>
<script>
(function(){{
var api=null,started=Date.now(),pages=[document.querySelector('.cover')].concat(Array.from(document.querySelectorAll('.chapter'))),current=0;
function findAPI(w){{var tries=0;while(w&&tries<10){{try{{if(w.API)return w.API}}catch(e){{}}if(w.parent===w)break;w=w.parent;tries++}}try{{if(window.opener)return findAPI(window.opener)}}catch(e){{}}return null}}
function init(){{api=findAPI(window);if(!api)return;try{{api.LMSInitialize('');var status=api.LMSGetValue('cmi.core.lesson_status');if(!status||status==='not attempted')api.LMSSetValue('cmi.core.lesson_status','incomplete');api.LMSCommit('')}}catch(e){{api=null}}}}
function sessionTime(){{var s=Math.floor((Date.now()-started)/1000),h=String(Math.floor(s/3600)).padStart(2,'0'),m=String(Math.floor((s%3600)/60)).padStart(2,'0'),x=String(s%60).padStart(2,'0');return h+':'+m+':'+x}}
function complete(){{if(!api)return;try{{api.LMSSetValue('cmi.core.lesson_status','completed');api.LMSSetValue('cmi.core.score.raw','100');api.LMSSetValue('cmi.core.score.min','0');api.LMSSetValue('cmi.core.score.max','100');api.LMSSetValue('cmi.core.session_time',sessionTime());api.LMSCommit('')}}catch(e){{}}}}
function finish(){{if(!api)return;try{{api.LMSSetValue('cmi.core.session_time',sessionTime());api.LMSCommit('');api.LMSFinish('')}}catch(e){{}}}}
function render(){{pages.forEach(function(p,i){{p.style.display=i===current?'flex':'none';if(p.classList.contains('chapter'))p.style.display=i===current?'block':'none'}});document.getElementById('prev').disabled=current===0;document.getElementById('next').textContent=current===0?'Начать':current===pages.length-1?'Завершить':'Далее';document.getElementById('counter').textContent=(current+1)+' / '+pages.length;document.getElementById('progress').style.width=((current+1)/pages.length*100)+'%'}}
document.getElementById('prev').onclick=function(){{if(current>0){{current--;render()}}}};document.getElementById('next').onclick=function(){{if(current<pages.length-1){{current++;render()}}else{{complete();this.textContent='Завершено'}}}};window.addEventListener('beforeunload',finish);init();render();
}})();
</script></body></html>"""


def build_scorm_12_package(course: Course):
    output = tempfile.SpooledTemporaryFile(max_size=20 * 1024 * 1024)
    asset_paths: dict[int, str] = {}
    cover_path = ""
    assets: list[tuple[str, object]] = []
    if course.cover_style == Course.CoverStyle.CUSTOM and course.cover_file:
        suffix = Path(course.cover_file.name).suffix.lower() or ".jpg"
        cover_path = f"assets/cover{suffix}"
        assets.append((cover_path, course.cover_file))
    for lesson in course.lessons.all():
        if lesson.lesson_type == Lesson.Type.VIDEO and lesson.video_file:
            suffix = Path(lesson.video_file.name).suffix.lower() or ".mp4"
            archive_path = f"assets/video-{lesson.id}{suffix}"
            asset_paths[lesson.id] = archive_path
            assets.append((archive_path, lesson.video_file))

    html_content = _player_html(course, asset_paths, cover_path)
    files = ["index.html", *[path for path, _ in assets]]
    identifier = f"smartis_course_{course.id}_v{course.version}"
    file_nodes = "".join(f'<file href={quoteattr(path)}/>' for path in files)
    manifest = f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier={quoteattr(identifier)} version="1.2"
 xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
 xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
 xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
 <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
 <organizations default="ORG1"><organization identifier="ORG1"><title>{xml_escape(course.title)}</title><item identifier="ITEM1" identifierref="RES1"><title>{xml_escape(course.title)}</title></item></organization></organizations>
 <resources><resource identifier="RES1" type="webcontent" adlcp:scormtype="sco" href="index.html">{file_nodes}</resource></resources>
</manifest>'''

    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, allowZip64=True) as archive:
        archive.writestr("imsmanifest.xml", manifest.encode("utf-8"))
        archive.writestr("index.html", html_content.encode("utf-8"))
        for archive_path, field_file in assets:
            with field_file.open("rb") as source, archive.open(archive_path, "w") as target:
                shutil.copyfileobj(source, target, length=1024 * 1024)
    output.seek(0)
    return output

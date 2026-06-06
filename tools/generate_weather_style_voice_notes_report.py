import html
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont

from generate_voice_notes_report import (
    OUT_DIR,
    MEDIA_DIR,
    add_relationships as _old_add_relationships,
    arrow,
    draw_centered,
    font,
    generate_dfd_level0,
    generate_dfd_level1,
    rounded_box,
)


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path("/Users/onlymec/Downloads/Weather_Data_Analysis.docx")
OUT_DOCX = OUT_DIR / "Voice_Notes_Studio_Weather_Style_Report.docx"
BACKUP_DOCX = OUT_DIR / "Weather_Data_Analysis_original_backup.docx"


def tnr(size=24, bold=False):
    path = "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Times New Roman.ttf"
    if Path(path).exists():
        return ImageFont.truetype(path, size)
    return font(size, bold)


def generate_login_screen(path):
    img = Image.new("RGB", (1600, 900), (8, 12, 28))
    draw = ImageDraw.Draw(img)
    for x in range(1600):
        r = int(10 + 40 * (1 - x / 1600))
        g = int(15 + 40 * (x / 1600))
        b = int(35 + 35 * (x / 1600))
        draw.line([(x, 0), (x, 900)], fill=(r, g, b))
    draw.rounded_rectangle((535, 195, 1065, 735), radius=26, fill=(16, 21, 38), outline=(57, 66, 91), width=2)
    draw.text((570, 235), "V O I C E  N O T E S  S T U D I O", font=tnr(20, True), fill=(178, 184, 210))
    draw.multiline_text((570, 300), "Continue\nwithout\npasswords.", font=tnr(66, True), fill=(245, 247, 255), spacing=10)
    draw.multiline_text((570, 525), "Sign in or create your account with OAuth 2.0. Your\nnotes stay tied to your verified Google account.", font=tnr(24), fill=(183, 189, 214), spacing=12)
    draw.rounded_rectangle((570, 625, 1025, 705), radius=18, fill=(32, 42, 73), outline=(91, 113, 178), width=2)
    draw.ellipse((592, 640, 642, 690), fill="white")
    draw.text((611, 651), "G", font=tnr(25, True), fill=(33, 42, 58))
    draw.text((662, 646), "Continue with Google", font=tnr(25, True), fill=(248, 249, 255))
    draw.text((662, 676), "OAuth 2.0 secure sign-in", font=tnr(20), fill=(178, 184, 210))
    labels = ["One-click\naccess", "No stored\npasswords", "Session\nrestored on\nrestart"]
    for i, label in enumerate(labels):
        x = 570 + i * 150
        draw.rounded_rectangle((x, 725, x + 135, 785), radius=14, fill=(29, 35, 52), outline=(60, 67, 86), width=2)
        draw.multiline_text((x + 20, 739), label, font=tnr(17, True), fill=(185, 190, 212), spacing=0)
    img.save(path)


def generate_user_dashboard(path):
    img = Image.new("RGB", (1600, 900), (8, 12, 28))
    draw = ImageDraw.Draw(img)
    for x in range(1600):
        draw.line([(x, 0), (x, 900)], fill=(18 + x // 95, 14 + x // 80, 42 + x // 35))
    draw.text((395, 55), "V O I C E  N O T E S  S T U D I O", font=tnr(19, True), fill=(178, 184, 210))
    draw.multiline_text((395, 95), "Capture, refine,\nand search every\nthought.", font=tnr(74, True), fill=(247, 247, 255), spacing=4)
    draw.rounded_rectangle((1110, 55, 1260, 105), radius=16, outline=(64, 75, 100), width=2)
    draw.text((1124, 63), "Parth Nadiyapara", font=tnr(20, True), fill="white")
    draw.text((1124, 86), "User", font=tnr(16), fill=(180, 188, 210))
    draw.rounded_rectangle((1185, 115, 1260, 155), radius=14, fill=(34, 42, 68), outline=(65, 75, 104))
    draw.text((1204, 124), "Logout", font=tnr(17), fill="white")
    draw.rounded_rectangle((395, 330, 1260, 455), radius=22, fill=(16, 22, 39), outline=(55, 65, 90), width=2)
    draw.ellipse((430, 355, 520, 445), fill=(47, 145, 248))
    draw.ellipse((468, 393, 484, 409), fill="white")
    draw.text((545, 375), "Ready to record", font=tnr(26, True), fill="white")
    draw.text((545, 407), "Start a new note with your voice.", font=tnr(20), fill=(183, 189, 214))
    draw.rounded_rectangle((395, 475, 1045, 525), radius=14, fill=(16, 22, 39), outline=(55, 65, 90))
    draw.text((435, 490), "Search your notes", font=tnr(21), fill=(150, 155, 170))
    draw.rounded_rectangle((1060, 475, 1260, 525), radius=14, fill=(16, 22, 39), outline=(55, 65, 90))
    draw.text((1080, 490), "Newest first", font=tnr(21), fill="white")
    for i, title in enumerate(["My name is Parth", "I'm going to start talking,\nand", "Hello, 1, 2, 3, my name"]):
        x = 395 + i * 285
        draw.rounded_rectangle((x, 550, x + 260, 755), radius=14, fill=(24, 78, 104), outline=(93, 112, 185), width=2)
        draw.text((x + 20, 575), title, font=tnr(20, True), fill="white")
        draw.text((x + 20, 635), "My name is Parth" if i == 0 else "Transcribed voice note preview.", font=tnr(18), fill=(222, 226, 245))
        draw.text((x + 20, 725), "28 May 2026", font=tnr(17, True), fill=(190, 198, 215))
    img.save(path)


def generate_admin_dashboard(path):
    img = Image.new("RGB", (1600, 900), (8, 12, 28))
    draw = ImageDraw.Draw(img)
    for x in range(1600):
        draw.line([(x, 0), (x, 900)], fill=(18 + x // 95, 14 + x // 80, 42 + x // 35))
    draw.text((365, 45), "V O I C E  N O T E S  S T U D I O", font=tnr(19, True), fill=(178, 184, 210))
    draw.multiline_text((365, 85), "Capture, refine,\nand search every\nthought.", font=tnr(70, True), fill=(247, 247, 255), spacing=4)
    draw.rounded_rectangle((365, 330, 1260, 500), radius=22, fill=(16, 22, 39), outline=(55, 65, 90), width=2)
    for i, (label, val) in enumerate([("Total Users", "2"), ("Total Notes", "8")]):
        x = 395 + i * 435
        draw.rounded_rectangle((x, 350, x + 405, 430), radius=14, fill=(30, 36, 58), outline=(70, 78, 103), width=1)
        draw.text((x + 20, 368), label, font=tnr(19), fill=(183, 189, 214))
        draw.text((x + 20, 395), val, font=tnr(32, True), fill="white")
    draw.text((395, 455), "User details are available on a dedicated admin page.", font=tnr(19), fill=(183, 189, 214))
    draw.rounded_rectangle((1088, 445, 1240, 485), radius=14, fill=(35, 45, 72), outline=(70, 88, 128))
    draw.text((1104, 455), "Open User Details", font=tnr(17), fill="white")
    draw.rounded_rectangle((365, 525, 1260, 650), radius=22, fill=(16, 22, 39), outline=(55, 65, 90), width=2)
    draw.ellipse((395, 555, 485, 645), fill=(47, 145, 248))
    draw.ellipse((433, 593, 449, 609), fill="white")
    draw.text((515, 575), "Ready to record", font=tnr(24, True), fill="white")
    draw.text((515, 608), "Start a new note with your voice.", font=tnr(20), fill=(183, 189, 214))
    draw.rounded_rectangle((365, 680, 1045, 730), radius=14, fill=(16, 22, 39), outline=(55, 65, 90))
    draw.text((405, 695), "Search your notes", font=tnr(20), fill=(150, 155, 170))
    draw.rounded_rectangle((1060, 680, 1260, 730), radius=14, fill=(16, 22, 39), outline=(55, 65, 90))
    draw.text((1080, 695), "Newest first", font=tnr(20), fill="white")
    img.save(path)


def generate_menu_screenshot(path):
    img = Image.new("RGB", (1600, 315), (8, 12, 28))
    draw = ImageDraw.Draw(img)
    for x in range(1600):
        draw.line([(x, 0), (x, 315)], fill=(23 + x // 110, 16 + x // 95, 48 + x // 50))
    draw.text((380, 38), "V O I C E  N O T E S  S T U D I O", font=tnr(18, True), fill=(178, 184, 210))
    draw.multiline_text((380, 78), "Capture, refine,\nand search every\nthought.", font=tnr(67, True), fill=(247, 247, 255), spacing=0)
    draw.rounded_rectangle((1265, 38, 1340, 92), radius=14, outline=(65, 75, 100), width=2)
    draw.text((1280, 48), "Parth", font=tnr(20, True), fill="white")
    draw.text((1280, 70), "Admin", font=tnr(16), fill=(180, 188, 210))
    draw.ellipse((1354, 38, 1408, 92), outline=(65, 75, 100), width=2)
    draw.text((1371, 52), "●", font=tnr(22, True), fill="white")
    draw.rounded_rectangle((1315, 105, 1408, 155), radius=14, fill=(34, 42, 68), outline=(65, 75, 104))
    draw.text((1336, 119), "Logout", font=tnr(20), fill="white")
    img.save(path)


def esc(text):
    return html.escape(text, quote=False)


def rpr(size=24, bold=False, underline=False, font_name="Times New Roman"):
    return (
        f'<w:rPr><w:rFonts w:ascii="{font_name}" w:eastAsia="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>'
        f'{"<w:b/>" if bold else ""}{"<w:u w:val=\"single\"/>" if underline else ""}'
        f'<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
    )


def para(text="", size=24, bold=False, align="both", underline=False, before=0, after=120, break_page=False):
    ppr = f'<w:pPr><w:spacing w:before="{before}" w:after="{after}" w:line="360" w:lineRule="auto"/><w:jc w:val="{align}"/></w:pPr>'
    br = '<w:br w:type="page"/>' if break_page else ""
    return f'<w:p>{ppr}<w:r>{rpr(size, bold, underline)}{br}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'


def cover_para(text="", size=32, bold=False, underline=False, after=120):
    return para(text, size=size, bold=bold, underline=underline, align="center", after=after)


def table(rows, widths):
    out = ['<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="8" w:color="000000"/><w:left w:val="single" w:sz="8" w:color="000000"/><w:bottom w:val="single" w:sz="8" w:color="000000"/><w:right w:val="single" w:sz="8" w:color="000000"/><w:insideH w:val="single" w:sz="8" w:color="000000"/><w:insideV w:val="single" w:sz="8" w:color="000000"/></w:tblBorders></w:tblPr><w:tblGrid>']
    out.append("".join(f'<w:gridCol w:w="{w}"/>' for w in widths))
    out.append("</w:tblGrid>")
    for ri, row in enumerate(rows):
        out.append("<w:tr>")
        for ci, cell in enumerate(row):
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[ci]}" w:type="dxa"/></w:tcPr>')
            out.append(para(str(cell), size=22, bold=(ri == 0), align="center" if ri == 0 else "left", after=0))
            out.append("</w:tc>")
        out.append("</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


def image_para(rid, wpx, hpx, width_in=6.2):
    cx = int(width_in * 914400)
    cy = int(cx * hpx / wpx)
    doc_id = "".join(ch for ch in rid if ch.isdigit()) or "1"
    return f'''<w:p><w:pPr><w:spacing w:after="120" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{doc_id}" name="Picture {doc_id}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="image.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'''


def page_break_section_without_footer():
    return '''<w:p><w:pPr><w:sectPr><w:pgSz w:w="11918" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:space="720"/></w:sectPr></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>'''


def build_document_xml():
    contents = [
        ["Chapters", "Particulars", "Page No."], ["1", "SYNOPSIS", "4"], ["2", "PREAMBLE", "5"], ["2.1", "General Introduction", "5"],
        ["2.2", "Statement of Problem", "5"], ["2.3", "Objective and Scope of the Study", "6"], ["2.4", "Module Description with functionality", "6"],
        ["3", "SYSTEM DESIGN AND DEVELOPMENT", "8"], ["3.1", "Data Flow Diagram (DFD)", "8"], ["3.2", "Table Structure", "10"],
        ["3.3", "Menu Design", "11"], ["3.4", "Screen Design (Screen shots with short description)", "12"], ["4", "CONCLUSION", "15"],
        ["5", "LEARNING DURING PROJECT WORK", "16"], ["6", "BIBLIOGRAPHY", "17"], ["6.1", "Online References", "17"], ["6.2", "Offline References", "17"],
    ]
    figures = [["Sr. No.", "Figure No.", "Particulars", "Page No."], ["1", "1", "DFD Level 0", "8"], ["2", "2", "DFD Level 1", "9"], ["3", "3", "Menu Design", "11"], ["4", "4", "Login/Register Page", "12"], ["5", "5", "User Dashboard", "13"], ["6", "6", "Admin Dashboard", "14"]]
    tables = [["Sr. No.", "Table No.", "Particulars", "Page No."], ["1", "1", "users", "10"], ["2", "2", "sessions", "10"], ["3", "3", "notes", "10"]]
    body = [
        cover_para("A Project Report On", 36, after=240), cover_para("Voice Notes Studio", 40, True, after=240),
        cover_para("Submitted in partial fulfillment of the requirement for the BCA Semester-4 Summer Internship Project-2 Subject", 28, after=180),
        cover_para("BACHELOR OF COMPUTER APPLICATIONS", 36, True, after=80), cover_para("(B.C.A.)", 32, True, after=160),
        cover_para("Academic Year 2026 - 27", 32, after=220), cover_para("Parth Nadiyapara - (92400527071)", 28, True, after=40),
        cover_para("Janvi Vaghela - (92400527105)", 28, True, after=40), cover_para("Niraj Vala - (92400527056)", 28, True, after=220),
        cover_para("Internal Guide", 38, True, True, after=40), cover_para("Prof. Jitesh Solanki", 34, after=260),
        image_para("rId7", 4057650, 1343025, width_in=4.6),
        '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:after="0" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:r>' + rpr(26) + '<w:t>Rajkot-Morbi Road, At &amp; PO : Gauridad, Rajkot 360 003. Gujarat. India.</w:t></w:r></w:p>',
        para("", break_page=True, align="center"),
        para("CONTENTS", 32, True, align="center", after=180), table(contents, [1500, 5700, 1600]),
        para("FIGURE INDEX", 32, True, align="center", before=300, after=180), table(figures, [1200, 1400, 4900, 1300]),
        para("TABLE INDEX", 32, True, align="center", before=300, after=180), table(tables, [1200, 1400, 4900, 1300]),
        page_break_section_without_footer(),
        para("1. SYNOPSIS", 32, True, align="center", after=240),
        para("Voice Notes Studio is a web based system developed to create, organize, and manage notes from recorded voice. The project helps users capture thoughts quickly by speaking instead of typing."),
        para("The system records audio from the browser, uploads it to the backend, converts the speech into text through a transcription service, and saves the final note in a MySQL database."),
        para("It also provides Google OAuth login, user wise note storage, searching, sorting, editing, deleting, and an admin dashboard for viewing total users and total notes."),
        para("", break_page=True, align="center"),
        para("2. PREAMBLE", 32, True, align="center", after=180),
        para("2.1 General Introduction", 28, True, align="left"),
        para("Voice based note taking is useful when users need to save ideas quickly. Instead of typing long text manually, users can record a thought and allow the system to convert it into editable text."),
        para("Voice Notes Studio is developed using React for the frontend, Express for the backend, and MySQL for database storage. It uses Google OAuth for secure login and a transcription API for converting audio to text."),
        para("2.2 Statement of Problem", 28, True, align="left"),
        para("Traditional note taking systems mainly depend on typing. This is slow for users who want to save information while studying, working, or discussing ideas. Users may also face difficulty in organizing and searching recorded thoughts."),
        para("The project solves this problem by providing a voice first notes system with secure account access, automatic transcription, and simple note management."),
        para("2.3 Objective and Scope of the Study", 28, True, align="left"),
        para("The objective of this project is to design and develop a system that records user voice, converts it into text, and stores it as a personal note. The project also aims to provide secure login, note search, note edit, note delete, and admin monitoring features."),
        para("The scope includes authentication, recording, audio upload, transcription, note storage, searching, sorting, session handling, and admin user details. Future scope includes folders, tags, reminders, export to PDF, and multilingual transcription."),
        para("2.4 Module Description with functionality", 28, True, align="left"),
        para("Authentication Module", 28, True, align="left"), para("This module manages Google OAuth login, user profile creation, session token generation, session validation, and logout."),
        para("Recorder Module", 28, True, align="left"), para("This module records audio using the browser microphone and sends the audio file to the backend API."),
        para("Transcription Module", 28, True, align="left"), para("This module converts uploaded audio into text and creates a note title from the transcribed content."),
        para("Notes Management Module", 28, True, align="left"), para("This module allows users to view, search, sort, edit, and delete their own notes."),
        para("Admin Module", 28, True, align="left"), para("This module displays total users, total notes, and user details for admin users."),
        para("", break_page=True, align="center"),
        para("3. SYSTEM DESIGN AND DEVELOPMENT", 32, True, align="center", after=180),
        para("3.1 Data Flow Diagram (DFD)", 28, True, align="left"), image_para("rId201", 1400, 850), para("Figure 1: DFD Level 0", 22, True, align="center"),
        image_para("rId202", 1400, 850), para("Figure 2: DFD Level 1", 22, True, align="center"),
        para("3.2 Table Structure", 28, True, align="left", break_page=True),
        para("Table 1: users", 24, True, align="left"), table([["Field", "Type", "Description"], ["id", "INT, Primary Key", "Unique user id"], ["name", "VARCHAR(120)", "User name"], ["email", "VARCHAR(255)", "User email"], ["oauth_provider", "VARCHAR(40)", "OAuth provider"], ["oauth_subject", "VARCHAR(255)", "OAuth user id"], ["avatar_url", "VARCHAR(500)", "Profile image"], ["last_login_at", "DATETIME", "Last login"], ["role", "ENUM", "User or admin"], ["created_at", "TIMESTAMP", "Creation time"]], [2300, 2700, 3900]),
        para("Table 2: sessions", 24, True, align="left"), table([["Field", "Type", "Description"], ["id", "INT, Primary Key", "Unique session id"], ["user_id", "INT", "Linked user"], ["token_hash", "CHAR(64)", "Secure token hash"], ["expires_at", "DATETIME", "Expiry time"], ["created_at", "TIMESTAMP", "Creation time"]], [2300, 2700, 3900]),
        para("Table 3: notes", 24, True, align="left"), table([["Field", "Type", "Description"], ["id", "INT, Primary Key", "Unique note id"], ["user_id", "INT", "Owner user"], ["title", "VARCHAR(255)", "Note title"], ["content", "TEXT", "Note content"], ["created_at", "TIMESTAMP", "Creation time"]], [2300, 2700, 3900]),
        para("3.3 Menu Design", 28, True, align="left", break_page=True), image_para("rId203", 1600, 315, 6.3), para("Figure 3: Menu Design", 22, True, align="center"),
        para("3.4 Screen Design (Screen shots with short description)", 28, True, align="left", break_page=True),
        para("Login/Register screen allows the user to continue with Google OAuth and start a secure session."), image_para("rId204", 1600, 900, 6.3), para("Figure 4: Login/Register Page", 22, True, align="center"),
        para("User dashboard shows the recorder, search box, sorting option, user menu, and note cards."), image_para("rId205", 1600, 900, 6.3), para("Figure 5: User Dashboard", 22, True, align="center"),
        para("Admin dashboard includes total user and note summary with access to user details."), image_para("rId206", 1600, 900, 6.3), para("Figure 6: Admin Dashboard", 22, True, align="center"),
        para("4. CONCLUSION", 32, True, align="center", break_page=True),
        para("Voice Notes Studio successfully provides a simple way to convert spoken thoughts into organized text notes. It combines secure login, audio recording, transcription, database storage, and note management in one system."),
        para("The project is useful for users who want faster note creation and easy searching of saved thoughts. It can be expanded in future with reminders, tags, sharing, export options, and more language support."),
        para("5. LEARNING DURING PROJECT WORK", 32, True, align="center", break_page=True),
        para("During this project work, we learned how to connect a React frontend with an Express backend and MySQL database. We also learned how to handle microphone recording, audio upload, transcription, authentication, sessions, and role based admin access."),
        para("This project improved our practical knowledge of full stack development, API integration, database table design, debugging, and user interface planning."),
        para("6. BIBLIOGRAPHY", 32, True, align="center", break_page=True),
        para("6.1 Online References", 28, True, align="left"), para("React Documentation - https://react.dev/"), para("Express Documentation - https://expressjs.com/"), para("MySQL Documentation - https://dev.mysql.com/doc/"), para("Google OAuth Documentation - https://developers.google.com/identity/protocols/oauth2"), para("MDN MediaRecorder API - https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder"),
        para("6.2 Offline References", 28, True, align="left"), para("College notes"), para("Faculty guidance"), para("Project source code"),
    ]
    sect = '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooterVoice"/><w:pgSz w:w="11918" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1800" w:header="720" w:footer="720" w:gutter="0"/><w:pgNumType w:start="4"/><w:cols w:space="720"/></w:sectPr>'
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + "".join(body) + sect + "</w:body></w:document>"


def footer_xml():
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>4</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'


def add_relations(xml_bytes):
    ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    root = ET.fromstring(xml_bytes)
    existing = {el.attrib.get("Id") for el in root}
    rels = [
        ("rId201", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_dfd_level0.png"),
        ("rId202", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_dfd_level1.png"),
        ("rId203", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_menu.png"),
        ("rId204", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_login.png"),
        ("rId205", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_user_dashboard.png"),
        ("rId206", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/voice_admin_dashboard.png"),
        ("rIdFooterVoice", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer", "footer_voice.xml"),
    ]
    for rid, typ, target in rels:
        if rid not in existing:
            ET.SubElement(root, "{%s}Relationship" % ns, {"Id": rid, "Type": typ, "Target": target})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def content_types(xml_bytes):
    ns = {"ct": "http://schemas.openxmlformats.org/package/2006/content-types"}
    root = ET.fromstring(xml_bytes)
    if not any(el.attrib.get("Extension") == "png" for el in root.findall("ct:Default", ns)):
        ET.SubElement(root, "{%s}Default" % ns["ct"], {"Extension": "png", "ContentType": "image/png"})
    if not any(el.attrib.get("PartName") == "/word/footer_voice.xml" for el in root.findall("ct:Override", ns)):
        ET.SubElement(root, "{%s}Override" % ns["ct"], {"PartName": "/word/footer_voice.xml", "ContentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def main():
    OUT_DIR.mkdir(exist_ok=True)
    MEDIA_DIR.mkdir(exist_ok=True)
    if not BACKUP_DOCX.exists():
        shutil.copyfile(TEMPLATE, BACKUP_DOCX)
    image_jobs = {
        "voice_dfd_level0.png": generate_dfd_level0,
        "voice_dfd_level1.png": generate_dfd_level1,
        "voice_menu.png": generate_menu_screenshot,
        "voice_login.png": generate_login_screen,
        "voice_user_dashboard.png": generate_user_dashboard,
        "voice_admin_dashboard.png": generate_admin_dashboard,
    }
    for name, fn in image_jobs.items():
        fn(MEDIA_DIR / name)
    with zipfile.ZipFile(TEMPLATE, "r") as zin:
        entries = {name: zin.read(name) for name in zin.namelist()}
    entries["word/document.xml"] = build_document_xml().encode("utf-8")
    entries["word/footer_voice.xml"] = footer_xml().encode("utf-8")
    entries["word/_rels/document.xml.rels"] = add_relations(entries["word/_rels/document.xml.rels"])
    entries["[Content_Types].xml"] = content_types(entries["[Content_Types].xml"])
    for image_name in image_jobs:
        entries[f"word/media/{image_name}"] = (MEDIA_DIR / image_name).read_bytes()
    with zipfile.ZipFile(OUT_DOCX, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries.items():
            zout.writestr(name, data)
    print(OUT_DOCX)


if __name__ == "__main__":
    main()

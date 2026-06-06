import html
import os
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path("/Users/onlymec/Downloads/SIP-2 DOCUMENT FORMAT.docx")
OUT_DIR = ROOT / "generated"
MEDIA_DIR = OUT_DIR / "media"
OUT_DOCX = OUT_DIR / "Voice_Notes_Studio_SIP2_Report.docx"

NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def font(size=28, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Times New Roman Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def draw_centered(draw, box, text, fill=(0, 0, 0), size=24, bold=False):
    fnt = font(size, bold)
    words = text.split()
    lines = []
    line = ""
    max_width = box[2] - box[0] - 24
    for word in words:
        test = (line + " " + word).strip()
        if draw.textbbox((0, 0), test, font=fnt)[2] <= max_width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    line_h = fnt.size + 6
    y = box[1] + ((box[3] - box[1]) - line_h * len(lines)) / 2
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=fnt)
        x = box[0] + ((box[2] - box[0]) - (bbox[2] - bbox[0])) / 2
        draw.text((x, y), line, font=fnt, fill=fill)
        y += line_h


def rounded_box(draw, box, text, fill, outline=(40, 40, 40), size=24, bold=False):
    draw.rounded_rectangle(box, radius=14, fill=fill, outline=outline, width=3)
    draw_centered(draw, box, text, size=size, bold=bold)


def arrow(draw, start, end, fill=(30, 30, 30), width=4):
    draw.line([start, end], fill=fill, width=width)
    ex, ey = end
    sx, sy = start
    import math

    ang = math.atan2(ey - sy, ex - sx)
    length = 16
    for delta in (2.55, -2.55):
        px = ex - length * math.cos(ang + delta)
        py = ey - length * math.sin(ang + delta)
        draw.line([(ex, ey), (px, py)], fill=fill, width=width)


def make_canvas(title):
    img = Image.new("RGB", (1400, 850), "white")
    draw = ImageDraw.Draw(img)
    draw.rectangle((20, 20, 1380, 830), outline=(30, 30, 30), width=3)
    draw.text((50, 45), title, font=font(34, True), fill=(0, 0, 0))
    return img, draw


def generate_dfd_level0(path):
    img, draw = make_canvas("DFD Level 0 - Voice Notes Studio")
    rounded_box(draw, (110, 330, 360, 470), "User", (235, 242, 255), size=28, bold=True)
    rounded_box(draw, (545, 285, 855, 515), "Voice Notes Studio System", (230, 255, 238), size=30, bold=True)
    rounded_box(draw, (1040, 145, 1300, 285), "Google OAuth", (255, 246, 220), size=26, bold=True)
    rounded_box(draw, (1040, 365, 1300, 505), "Transcription Service", (255, 230, 232), size=24, bold=True)
    rounded_box(draw, (1040, 585, 1300, 725), "MySQL Database", (238, 232, 255), size=26, bold=True)
    arrow(draw, (360, 400), (545, 400))
    arrow(draw, (545, 430), (360, 430))
    arrow(draw, (855, 330), (1040, 215))
    arrow(draw, (1040, 245), (855, 360))
    arrow(draw, (855, 430), (1040, 435))
    arrow(draw, (1040, 465), (855, 465))
    arrow(draw, (855, 515), (1040, 655))
    arrow(draw, (1040, 685), (855, 545))
    draw.text((395, 365), "Login, record, search,\nedit notes", font=font(20), fill=(0, 0, 0))
    draw.text((905, 170), "OAuth profile", font=font(20), fill=(0, 0, 0))
    draw.text((895, 400), "Audio / transcript", font=font(20), fill=(0, 0, 0))
    draw.text((900, 610), "Users, sessions,\nnotes", font=font(20), fill=(0, 0, 0))
    img.save(path)


def generate_dfd_level1(path):
    img, draw = make_canvas("DFD Level 1 - Main Processes")
    boxes = [
        ((80, 130, 350, 250), "1. Authentication"),
        ((560, 130, 840, 250), "2. Record Audio"),
        ((1030, 130, 1300, 250), "3. Transcribe Note"),
        ((330, 430, 610, 550), "4. Manage Notes"),
        ((790, 430, 1070, 550), "5. Admin Dashboard"),
        ((560, 650, 840, 770), "Database Store"),
    ]
    fills = [(235, 242, 255), (230, 255, 238), (255, 230, 232), (255, 246, 220), (238, 232, 255), (242, 242, 242)]
    for (box, label), fill in zip(boxes, fills):
        rounded_box(draw, box, label, fill, size=25, bold=True)
    arrow(draw, (350, 190), (560, 190))
    arrow(draw, (840, 190), (1030, 190))
    arrow(draw, (1165, 250), (930, 430))
    arrow(draw, (705, 250), (500, 430))
    arrow(draw, (470, 550), (620, 650))
    arrow(draw, (930, 550), (780, 650))
    arrow(draw, (700, 650), (700, 550))
    draw.text((75, 285), "User receives secure session token after Google sign-in.", font=font(21), fill=(0, 0, 0))
    draw.text((545, 285), "Browser captures microphone audio and uploads it.", font=font(21), fill=(0, 0, 0))
    draw.text((965, 285), "API converts audio to text and returns transcript.", font=font(21), fill=(0, 0, 0))
    img.save(path)


def generate_menu_design(path):
    img, draw = make_canvas("Menu Design")
    rounded_box(draw, (80, 115, 1320, 210), "Voice Notes Studio", (35, 45, 65), outline=(20, 25, 35), size=32, bold=True)
    items = [
        ((170, 290, 430, 395), "Dashboard / Home"),
        ((570, 290, 830, 395), "Record Voice Note"),
        ((970, 290, 1230, 395), "Search and Sort"),
        ((370, 500, 630, 605), "Note Detail"),
        ((770, 500, 1030, 605), "Admin Users"),
    ]
    for box, label in items:
        rounded_box(draw, box, label, (241, 247, 255), size=25, bold=True)
    arrow(draw, (300, 210), (300, 290))
    arrow(draw, (700, 210), (700, 290))
    arrow(draw, (1100, 210), (1100, 290))
    arrow(draw, (700, 395), (500, 500))
    arrow(draw, (700, 395), (900, 500))
    draw.text((140, 680), "Common menu actions: Login with Google, Theme Toggle, Logout, Load More Notes, Save Note, Delete Note, Back to Dashboard.", font=font(24), fill=(0, 0, 0))
    img.save(path)


def generate_screen_design(path):
    img, draw = make_canvas("Screen Design - Main Dashboard")
    draw.rounded_rectangle((90, 115, 1310, 750), radius=18, outline=(30, 30, 30), width=3, fill=(248, 250, 252))
    draw.rectangle((120, 145, 1280, 215), fill=(38, 48, 68))
    draw.text((150, 163), "Voice Notes Studio", font=font(28, True), fill="white")
    draw.text((980, 166), "Theme   User   Logout", font=font(22), fill="white")
    rounded_box(draw, (170, 260, 1230, 385), "Microphone Recorder Panel", (230, 255, 238), size=28, bold=True)
    draw.ellipse((220, 285, 335, 400), fill=(35, 45, 65), outline=(0, 0, 0), width=2)
    draw.text((253, 315), "REC", font=font(23, True), fill="white")
    draw.rounded_rectangle((170, 430, 860, 485), radius=8, fill="white", outline=(120, 120, 120), width=2)
    draw.text((195, 445), "Search your notes", font=font(22), fill=(80, 80, 80))
    draw.rounded_rectangle((905, 430, 1230, 485), radius=8, fill="white", outline=(120, 120, 120), width=2)
    draw.text((935, 445), "Newest first", font=font(22), fill=(80, 80, 80))
    for i, y in enumerate([530, 620]):
        draw.rounded_rectangle((170, y, 1230, y + 65), radius=8, fill="white", outline=(150, 150, 150), width=2)
        draw.text((200, y + 15), f"Note Card {i + 1}: title, content preview, created date", font=font(22), fill=(0, 0, 0))
    img.save(path)


def xml_escape(text):
    return html.escape(text, quote=False)


def rpr(size=24, font_name="Times New Roman", bold=False, underline=False):
    b = "<w:b/>" if bold else ""
    u = '<w:u w:val="single"/>' if underline else ""
    return (
        f"<w:rPr><w:rFonts w:ascii=\"{font_name}\" w:hAnsi=\"{font_name}\" w:eastAsia=\"{font_name}\" w:cs=\"{font_name}\"/>"
        f"{b}{u}<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/></w:rPr>"
    )


def para(text="", align=None, size=24, bold=False, style=None, page_break=False, underline=False):
    ppr = ""
    if style or align:
        parts = []
        if style:
            parts.append(f'<w:pStyle w:val="{style}"/>')
        if align:
            parts.append(f'<w:jc w:val="{align}"/>')
        ppr = f"<w:pPr>{''.join(parts)}</w:pPr>"
    br = '<w:br w:type="page"/>' if page_break else ""
    return f"<w:p>{ppr}<w:r>{rpr(size=size, bold=bold, underline=underline)}{br}<w:t xml:space=\"preserve\">{xml_escape(text)}</w:t></w:r></w:p>"


def spacer(lines=1):
    return "".join(para("") for _ in range(lines))


def table(rows, widths=None):
    cols = len(rows[0])
    widths = widths or [9000 // cols] * cols
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    out = [
        '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        '<w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        '<w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        '<w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        '<w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>'
        '<w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/></w:tblBorders></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>"
    ]
    for ri, row in enumerate(rows):
        out.append("<w:tr>")
        for ci, cell in enumerate(row):
            out.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[ci]}" w:type="dxa"/></w:tcPr>')
            out.append(para(str(cell), size=22, bold=(ri == 0), align="center" if ri == 0 else None))
            out.append("</w:tc>")
        out.append("</w:tr>")
    out.append("</w:tbl>")
    return "".join(out)


def image_para(rid, width_px, height_px):
    cx = int(5.9 * 914400)
    cy = int(cx * height_px / width_px)
    return f"""
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<wp:extent cx="{cx}" cy="{cy}"/><wp:docPr id="{rid[3:]}" name="Picture {rid[3:]}"/>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr><pic:cNvPr id="0" name="diagram.png"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>
"""


def build_document_xml():
    body = []
    body += [
        spacer(2),
        para("A Project Report On", align="center", size=28, bold=True),
        spacer(2),
        para("Voice Notes Studio", align="center", size=40, bold=True),
        spacer(2),
        para("Submitted in partial fulfillment of the requirement for the BCA Semester-4 Summer Internship Project-2 Subject", align="center", size=24),
        spacer(1),
        para("BACHELOR OF COMPUTER APPLICATIONS", align="center", size=28, bold=True),
        para("(B.C.A.)", align="center", size=26, bold=True),
        spacer(1),
        para("Academic Year 2026 - 27", align="center", size=24, bold=True),
        spacer(2),
        para("Parth Nadiyapara - (92400527071)", align="center", size=24, bold=True),
        para("Janvi Vaghela - (92400527105)", align="center", size=24, bold=True),
        para("Niraj Vala - (92400527056)", align="center", size=24, bold=True),
        spacer(2),
        para("Internal Guide", align="center", size=24, bold=True),
        para("Prof. Jitesh Solanki", align="center", size=24, bold=True),
        spacer(4),
        para("Rajkot-Morbi Road, At & PO : Gauridad, Rajkot 360 003. Gujarat. India.", align="center", size=22),
        para("", page_break=True),
    ]

    contents = [
        ["Chapters", "Particulars", "Page No."],
        ["1", "SYNOPSIS", "4"],
        ["2", "PREAMBLE", "5"],
        ["2.1", "General Introduction", "5"],
        ["2.2", "Statement of Problem", "5"],
        ["2.3", "Objective and Scope of the Study", "6"],
        ["2.4", "Module Description with functionality", "6"],
        ["3", "SYSTEM DESIGN AND DEVELOPMENT", "9"],
        ["3.1", "Data Flow Diagram (DFD)", "9"],
        ["3.2", "Table Structure", "11"],
        ["3.3", "Menu Design", "13"],
        ["3.4", "Screen Design (Screen shots with short description)", "14"],
        ["4", "CONCLUSION", "15"],
        ["5", "LEARNING DURING PROJECT WORK", "16"],
        ["6", "BIBLIOGRAPHY", "17"],
        ["6.1", "Online References", "17"],
        ["6.2", "Offline References", "17"],
    ]
    figures = [
        ["Sr. No.", "Figure No.", "Particulars", "Page No."],
        ["1", "1", "DFD Level 0", "9"],
        ["2", "2", "DFD Level 1", "10"],
        ["3", "3", "Menu Design", "13"],
        ["4", "4", "Main Dashboard Screen Design", "14"],
    ]
    tables = [
        ["Sr. No.", "Table No.", "Particulars", "Page No."],
        ["1", "1", "users", "11"],
        ["2", "2", "sessions", "12"],
        ["3", "3", "notes", "12"],
    ]
    body += [para("CONTENTS", align="center", size=30, bold=True, underline=True), spacer(1), table(contents, [1500, 5700, 1600]), spacer(2)]
    body += [para("FIGURE INDEX", align="center", size=28, bold=True, underline=True), spacer(1), table(figures, [1300, 1500, 4700, 1300]), spacer(2)]
    body += [para("TABLE INDEX", align="center", size=28, bold=True, underline=True), spacer(1), table(tables, [1300, 1500, 4700, 1300]), para("", page_break=True)]

    body += [
        para("1. SYNOPSIS", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("This project focuses on designing and developing Voice Notes Studio, a web based system that allows users to create text notes by recording their voice."),
        para("The system captures audio through the browser microphone, sends it securely to the backend, converts the speech into text using a transcription service, and stores the final note in a MySQL database."),
        para("It provides Google OAuth based authentication, a clean dashboard for note management, search and sorting facilities, and an admin dashboard for viewing user and note statistics."),
        para("The main goal of the project is to make note creation faster, simpler, and more accessible for users who prefer speaking their thoughts instead of typing them manually."),
        para("", page_break=True),
        para("2. PREAMBLE", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("2.1 General Introduction", size=28, bold=True),
        para("Voice notes are useful for students, professionals, and general users because ideas can be captured quickly without typing. Modern browsers, cloud APIs, and database systems make it possible to convert spoken information into organized digital notes."),
        para("Voice Notes Studio is developed as a React and Express application. The frontend provides the user interface, while the backend handles authentication, file upload, transcription, note storage, and admin data."),
        para("The system uses MySQL for persistent storage and Google OAuth for secure login without storing user passwords."),
        para("2.2 Statement of Problem", size=28, bold=True),
        para("Many users lose ideas because writing notes manually takes time, especially when they are busy or away from a keyboard. Traditional note systems mainly depend on typing and do not provide a simple voice-first workflow."),
        para("Another problem is secure note ownership. A notes system must ensure that every user can access only personal notes, while administrators can monitor basic user and note statistics."),
        para("This project solves these issues by providing a voice recording interface, automatic transcription, authenticated sessions, searchable note lists, and safe note update and delete operations."),
        para("2.3 Objective and Scope of the Study", size=28, bold=True),
        para("The main objective of this project is to design and develop a web application that converts recorded speech into editable notes. It aims to provide simple note creation, secure login, note searching, note editing, note deletion, and basic admin reporting."),
        para("The scope of the study includes user authentication, audio recording, audio upload, transcription processing, note storage, note listing, note search, session management, and admin user listing. The system can be extended in future with folders, tags, reminders, export options, and multi-language transcription."),
        para("2.4 Module Description with functionality", size=28, bold=True),
        para("User Authentication Module", size=26, bold=True),
        para("This module allows users to sign in using Google OAuth. It creates or updates the user profile, generates a secure session token, validates the token for protected API requests, and supports logout."),
        para("Voice Recording Module", size=26, bold=True),
        para("This module uses the browser microphone and MediaRecorder API to capture the user's voice. It starts and stops recording, prepares the audio file, and sends it to the backend for processing."),
        para("Transcription Module", size=26, bold=True),
        para("This module accepts the uploaded audio file and sends it to the configured transcription provider. The returned text is cleaned and saved as a note with a generated or user supplied title."),
        para("Notes Management Module", size=26, bold=True),
        para("This module stores notes in MySQL and allows users to view, search, sort, edit, and delete their own notes. It keeps note data linked with the logged-in user."),
        para("Admin Module", size=26, bold=True),
        para("This module provides summary information such as total users and total notes. Admin users can also view user details with role and note count."),
        para("Database Management Module", size=26, bold=True),
        para("This module creates and verifies the users, sessions, and notes tables. It stores user profiles, session tokens, note titles, note content, and timestamps."),
        para("", page_break=True),
        para("3. SYSTEM DESIGN AND DEVELOPMENT", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("3.1 Data Flow Diagram (DFD)", size=28, bold=True),
        para("The following DFDs show how users, authentication, transcription service, and database storage interact in Voice Notes Studio."),
        image_para("rId101", 1400, 850),
        para("Figure 1: DFD Level 0", align="center", size=22, bold=True),
        image_para("rId102", 1400, 850),
        para("Figure 2: DFD Level 1", align="center", size=22, bold=True),
        para("", page_break=True),
        para("3.2 Table Structure", size=28, bold=True),
        para("Table 1: users", size=24, bold=True),
        table([
            ["Field Name", "Data Type", "Description"],
            ["id", "INT, Primary Key", "Unique user id"],
            ["name", "VARCHAR(120)", "User full name"],
            ["email", "VARCHAR(255), UNIQUE", "User email address"],
            ["password_hash", "VARCHAR(255), NULL", "Reserved password hash field"],
            ["password_salt", "VARCHAR(255), NULL", "Reserved password salt field"],
            ["oauth_provider", "VARCHAR(40), NULL", "OAuth provider name"],
            ["oauth_subject", "VARCHAR(255), NULL", "Provider user id"],
            ["avatar_url", "VARCHAR(500), NULL", "User profile picture"],
            ["last_login_at", "DATETIME, NULL", "Last login date and time"],
            ["role", "ENUM('user','admin')", "Access role"],
            ["created_at", "TIMESTAMP", "Account creation time"],
        ], [2300, 2600, 4100]),
        spacer(1),
        para("Table 2: sessions", size=24, bold=True),
        table([
            ["Field Name", "Data Type", "Description"],
            ["id", "INT, Primary Key", "Unique session id"],
            ["user_id", "INT", "Reference to users table"],
            ["token_hash", "CHAR(64), UNIQUE", "Hashed session token"],
            ["expires_at", "DATETIME", "Session expiry time"],
            ["created_at", "TIMESTAMP", "Session creation time"],
        ], [2300, 2600, 4100]),
        spacer(1),
        para("Table 3: notes", size=24, bold=True),
        table([
            ["Field Name", "Data Type", "Description"],
            ["id", "INT, Primary Key", "Unique note id"],
            ["user_id", "INT, NULL", "Owner user id"],
            ["title", "VARCHAR(255), NULL", "Note title"],
            ["content", "TEXT", "Transcribed or edited note text"],
            ["created_at", "TIMESTAMP", "Note creation time"],
        ], [2300, 2600, 4100]),
        para("", page_break=True),
        para("3.3 Menu Design", size=28, bold=True),
        para("The menu design shows the main navigation and actions available in the Voice Notes Studio interface."),
        image_para("rId103", 1400, 850),
        para("Figure 3: Menu Design", align="center", size=22, bold=True),
        para("", page_break=True),
        para("3.4 Screen Design (Screen shots with short description)", size=28, bold=True),
        para("The main dashboard contains a header, recording panel, search box, sorting option, notes list, and note detail actions. Admin users can also open the user details page from the dashboard."),
        image_para("rId104", 1400, 850),
        para("Figure 4: Main Dashboard Screen Design", align="center", size=22, bold=True),
        para("", page_break=True),
        para("4. CONCLUSION", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("Voice Notes Studio successfully provides a simple and useful platform for converting spoken ideas into organized text notes. It combines React, Express, MySQL, OAuth authentication, and transcription service integration into one working system."),
        para("The project reduces the effort required to create notes and gives users an efficient way to record, search, edit, and manage personal note content. The admin dashboard also helps in monitoring users and note counts."),
        para("In future, the system can be improved by adding tags, folders, note sharing, reminders, PDF export, and support for more languages."),
        para("", page_break=True),
        para("5. LEARNING DURING PROJECT WORK", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("During this project work, we learned how to connect a frontend React application with a backend Express API. We also learned how to handle browser microphone recording, file upload, API based transcription, and MySQL database operations."),
        para("The project improved our understanding of OAuth authentication, session security, protected routes, role based admin access, and server side validation."),
        para("We also learned the importance of user friendly interface design, error handling, testing workflows, and maintaining clear project documentation."),
        para("", page_break=True),
        para("6. BIBLIOGRAPHY", align="center", size=30, bold=True, underline=True),
        spacer(1),
        para("6.1 Online References", size=28, bold=True),
        para("React Documentation - https://react.dev/"),
        para("Express Documentation - https://expressjs.com/"),
        para("MySQL Documentation - https://dev.mysql.com/doc/"),
        para("Google OAuth Documentation - https://developers.google.com/identity/protocols/oauth2"),
        para("MDN MediaRecorder API - https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder"),
        para("6.2 Offline References", size=28, bold=True),
        para("Class notes and practical guidance provided during BCA Semester-4."),
        para("Project source code and internal project discussion notes."),
    ]
    sect = """
<w:sectPr>
<w:footerReference w:type="default" r:id="rIdFooter1"/>
<w:pgSz w:w="11906" w:h="16838"/>
<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
<w:cols w:space="720"/><w:docGrid w:linePitch="360"/>
</w:sectPr>
"""
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
xmlns:v="urn:schemas-microsoft-com:vml"
xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
xmlns:w10="urn:schemas-microsoft-com:office:word"
xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
mc:Ignorable="w14 wp14"><w:body>{''.join(body)}{sect}</w:body></w:document>"""


def footer_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:p><w:pPr><w:jc w:val="right"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:t>1</w:t></w:r>
<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="22"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
</w:p></w:ftr>"""


def ensure_content_types(xml_bytes):
    ns = {"ct": "http://schemas.openxmlformats.org/package/2006/content-types"}
    root = ET.fromstring(xml_bytes)
    has_png = any(el.attrib.get("Extension") == "png" for el in root.findall("ct:Default", ns))
    if not has_png:
        ET.SubElement(root, "{%s}Default" % ns["ct"], {"Extension": "png", "ContentType": "image/png"})
    footer_part = "/word/footer1.xml"
    has_footer = any(el.attrib.get("PartName") == footer_part for el in root.findall("ct:Override", ns))
    if not has_footer:
        ET.SubElement(root, "{%s}Override" % ns["ct"], {"PartName": footer_part, "ContentType": "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def add_relationships(xml_bytes):
    ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    root = ET.fromstring(xml_bytes)
    existing = {el.attrib.get("Id") for el in root}
    rels = [
        ("rId101", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/dfd_level0.png"),
        ("rId102", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/dfd_level1.png"),
        ("rId103", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/menu_design.png"),
        ("rId104", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image", "media/screen_design.png"),
        ("rIdFooter1", "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer", "footer1.xml"),
    ]
    for rid, typ, target in rels:
        if rid not in existing:
            ET.SubElement(root, "{%s}Relationship" % ns, {"Id": rid, "Type": typ, "Target": target})
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def main():
    OUT_DIR.mkdir(exist_ok=True)
    MEDIA_DIR.mkdir(exist_ok=True)
    diagrams = {
        "dfd_level0.png": generate_dfd_level0,
        "dfd_level1.png": generate_dfd_level1,
        "menu_design.png": generate_menu_design,
        "screen_design.png": generate_screen_design,
    }
    for name, generator in diagrams.items():
        generator(MEDIA_DIR / name)

    temp_docx = OUT_DIR / "_base.docx"
    shutil.copyfile(TEMPLATE, temp_docx)
    with zipfile.ZipFile(TEMPLATE, "r") as zin:
        entries = {name: zin.read(name) for name in zin.namelist()}

    entries["word/document.xml"] = build_document_xml().encode("utf-8")
    entries["word/footer1.xml"] = footer_xml().encode("utf-8")
    entries["word/_rels/document.xml.rels"] = add_relationships(entries["word/_rels/document.xml.rels"])
    entries["[Content_Types].xml"] = ensure_content_types(entries["[Content_Types].xml"])
    for image_name in diagrams:
        entries[f"word/media/{image_name}"] = (MEDIA_DIR / image_name).read_bytes()

    with zipfile.ZipFile(OUT_DOCX, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries.items():
            zout.writestr(name, data)

    print(OUT_DOCX)


if __name__ == "__main__":
    main()

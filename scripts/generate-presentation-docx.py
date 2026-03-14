#!/usr/bin/env python3
"""
Generate a professional Chatr pitch document using python-docx.
Run with: .venv/bin/python scripts/generate-presentation-docx.py
"""
import os
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

OUT = os.path.join(os.path.dirname(__file__), '..', 'Chatr - Product Overview.docx')
SS  = os.path.join(os.path.dirname(__file__), '..', 'screenshots')

NAVY    = RGBColor(0x0F, 0x17, 0x2A)
BLUE    = RGBColor(0x3B, 0x82, 0xF6)
SLATE   = RGBColor(0x33, 0x41, 0x55)
GREY    = RGBColor(0x64, 0x74, 0x8B)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
ACCENT  = RGBColor(0xF9, 0x73, 0x16)
LIGHT   = RGBColor(0xF1, 0xF5, 0xF9)
DIVIDER = RGBColor(0xE2, 0xE8, 0xF0)

doc = Document()

# ── Page setup ────────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Cm(2)
    section.bottom_margin = Cm(1.5)
    section.left_margin   = Cm(2.2)
    section.right_margin  = Cm(2.2)

style = doc.styles['Normal']
style.font.name = 'Calibri'
style.font.size = Pt(10.5)
style.font.color.rgb = SLATE
style.paragraph_format.space_after = Pt(6)
style.paragraph_format.line_spacing = 1.15

# ── Helpers ───────────────────────────────────────────────────────────────────
def add_heading(text, level=1):
    h = doc.add_paragraph()
    h.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = h.add_run(text)
    if level == 1:
        run.font.size = Pt(22)
        run.font.color.rgb = NAVY
        run.bold = True
        h.paragraph_format.space_before = Pt(20)
        h.paragraph_format.space_after = Pt(8)
    elif level == 2:
        run.font.size = Pt(15)
        run.font.color.rgb = SLATE
        run.bold = True
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(12)
        run.font.color.rgb = GREY
        run.bold = True
        h.paragraph_format.space_before = Pt(10)
        h.paragraph_format.space_after = Pt(3)
    return h

def add_para(text, bold=False, italic=False, size=10.5, color=SLATE, after=6, align=None):
    p = doc.add_paragraph()
    if align: p.alignment = align
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.color.rgb = color
    run.bold = bold
    run.italic = italic
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    return p

def add_mixed(bold_text, normal_text, size=10.5, color=SLATE, after=5):
    p = doc.add_paragraph()
    r1 = p.add_run(bold_text + ' ')
    r1.bold = True; r1.font.size = Pt(size); r1.font.color.rgb = color
    r2 = p.add_run(normal_text)
    r2.font.size = Pt(size); r2.font.color.rgb = color
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing = 1.15
    return p

def add_bullet(text, bold_prefix=''):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r1 = p.add_run(bold_prefix + ' ')
        r1.bold = True; r1.font.size = Pt(10); r1.font.color.rgb = SLATE
    r = p.add_run(text)
    r.font.size = Pt(10); r.font.color.rgb = SLATE
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.line_spacing = 1.1
    return p

def add_img(name, caption='', width=Inches(4.2)):
    path = os.path.join(SS, f'{name}.png')
    if not os.path.exists(path): return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run()
    run.add_picture(path, width=width)
    if caption:
        c = doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = c.add_run(caption)
        r.font.size = Pt(8.5)
        r.font.color.rgb = GREY
        r.italic = True
        c.paragraph_format.space_after = Pt(6)

def add_divider():
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E2E8F0"/></w:pBdr>')
    pPr.append(pBdr)

def add_stat_row(stats):
    """Add a row of stats as a table: [('1,300+', 'Tests'), ('99%', 'Frontend Cov'), ...]"""
    t = doc.add_table(rows=2, cols=len(stats))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (val, label) in enumerate(stats):
        c1 = t.cell(0, i)
        c1.text = ''
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r1 = p1.add_run(val)
        r1.bold = True; r1.font.size = Pt(18); r1.font.color.rgb = BLUE
        c2 = t.cell(1, i)
        c2.text = ''
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r2 = p2.add_run(label)
        r2.font.size = Pt(8); r2.font.color.rgb = GREY
    for row in t.rows:
        for cell in row.cells:
            cell._element.get_or_add_tcPr().append(
                parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC" w:val="clear"/>'))
            for p in cell.paragraphs:
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(1)
    return t

def add_stat_line(label, value):
    p = doc.add_paragraph()
    r1 = p.add_run(label + '  ')
    r1.font.size = Pt(10); r1.font.color.rgb = GREY
    r2 = p.add_run(value)
    r2.font.size = Pt(10.5); r2.font.color.rgb = NAVY; r2.bold = True
    p.paragraph_format.space_after = Pt(1)
    p.paragraph_format.left_indent = Inches(0.25)

# ══════════════════════════════════════════════════════════════════════════════
# TITLE PAGE
# ══════════════════════════════════════════════════════════════════════════════
for _ in range(4): doc.add_paragraph()  # push down

tp = doc.add_paragraph()
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tp.add_run('Chatr')
r.font.size = Pt(48); r.font.color.rgb = NAVY; r.bold = True

tp2 = doc.add_paragraph()
tp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r2 = tp2.add_run('Connect. Chat. Collaborate.')
r2.font.size = Pt(16); r2.font.color.rgb = BLUE
tp2.paragraph_format.space_after = Pt(8)

tp3 = doc.add_paragraph()
tp3.alignment = WD_ALIGN_PARAGRAPH.CENTER
r3 = tp3.add_run('Real-time messaging \u2022 Group chat \u2022 Voice messages \u2022 AI assistant \u2022 Embeddable widget')
r3.font.size = Pt(10); r3.font.color.rgb = GREY
tp3.paragraph_format.space_after = Pt(6)

tp4 = doc.add_paragraph()
tp4.alignment = WD_ALIGN_PARAGRAPH.CENTER
r4 = tp4.add_run('A complete, production-ready messaging platform built, tested, and deployed by a single developer.')
r4.font.size = Pt(10); r4.font.color.rgb = SLATE; r4.italic = True
tp4.paragraph_format.space_after = Pt(16)

add_img('01-landing-page', width=Inches(5.0))

doc.add_page_break()

# ══════════════════════════════════════════════════════════════════════════════
# THE PROBLEM + THE PRODUCT
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Why Chatr Exists')
add_para('Every business needs messaging. Internal teams need to collaborate in real time. Support teams need to talk to customers the moment they have a question. Users expect the same experience they get from WhatsApp and Slack \u2014 instant delivery, read receipts, voice notes, file sharing, and mobile-first design.', size=10.5)
add_para('Most messaging solutions force a choice: use an expensive third-party service with limited customisation, or build from scratch and spend months on infrastructure before writing a single feature.', size=10.5)
add_para('Chatr eliminates that trade-off. It is a fully functional, production-deployed messaging platform that delivers enterprise-grade features at zero licensing cost \u2014 because it is open, extensible, and built on industry-standard technology that any developer can understand on day one.', size=10.5, bold=True)

add_stat_row([
    ('1,300+', 'Automated Tests'),
    ('69,542', 'Lines of Code'),
    ('99%', 'Frontend Coverage'),
    ('22', 'Days to Ship'),
])

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# THE PRODUCT
# ══════════════════════════════════════════════════════════════════════════════
add_heading('The Product')
add_para('Chatr is not a prototype. Every feature shown below is live, tested, and deployed. Here is the main screen \u2014 a single view that demonstrates eight capabilities working together:')
add_img('03-conversations', 'Groups, DMs, AI bot, widget guests, presence, unread badges, and message requests')

add_bullet('Group chats with role management (Owner, Admin, Member) and member counts.', 'Groups \u2014')
add_bullet('One-to-one messaging with online/offline presence and delivery receipts.', 'Direct Messages \u2014')
add_bullet('Luna, the built-in AI chatbot, answers questions and holds conversations.', 'AI Integration \u2014')
add_bullet('Website visitors chat live without an account via the embeddable widget.', 'Widget Guests \u2014')
add_bullet('Messages from unknown contacts land in a separate "Requests" inbox.', 'Message Requests \u2014')
add_bullet('Accepted contacts show "Friend" badges; full search across all conversations.', 'Friends & Search \u2014')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# RICH MESSAGING
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Rich Messaging')
add_para('Modern users expect more than text. Chatr delivers the full messaging experience \u2014 the kind of quality that keeps users engaged and reduces the need for external tools.')

add_img('04-chat-view', 'Voice notes, video, images, and link previews in one conversation')
add_img('04b-chat-view-top', 'Text messages, voice waveforms, and shared media')

add_bullet('Text messages with delivery and read receipts.')
add_bullet('Voice messages with live waveform visualisation and playback.')
add_bullet('Image, video, document, and file sharing up to 50 MB.')
add_bullet('Links auto-expand into rich previews with title, image, and description.')
add_bullet('Ghost typing \u2014 see every character as the other person types.')
add_bullet('Emoji reactions, message replies, edit, and unsend.')
add_bullet('Full offline support \u2014 messages queue and send when the connection returns.')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# GROUPS + FRIENDS
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Groups & Friends')
add_para('Team collaboration requires structure. Chatr provides group chats with a full role system (Owner, Admin, Member), group profiles with avatars and cover images, and the ability to transfer ownership or promote and demote members. The friend system lets users search, connect, block, and manage who can reach them.')

add_img('06-groups', 'Groups with member counts')
add_img('05-friends', 'Friend list with search and management')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# THE COMMERCIAL ANGLE — WIDGET
# ══════════════════════════════════════════════════════════════════════════════
add_heading('The Business Case: Embeddable Widget')
add_para('This is the feature that turns Chatr from a messaging app into a revenue-generating platform.', bold=True, size=11)
add_para('Any website can add live customer support by pasting a single line of code. Visitors enter their name and start chatting \u2014 no account, no email, no friction. Messages flow into the support agent\u2019s Chatr inbox in real time, alongside their normal conversations.')

add_heading('Why this matters commercially', level=2)
add_bullet('Zero barrier to entry for website visitors \u2014 higher engagement than email forms or chatbots.')
add_bullet('Real-time messaging, voice notes, and file sharing \u2014 not limited like most live chat tools.')
add_bullet('24-hour persistent sessions \u2014 visitors can close the tab and resume later.')
add_bullet('Fully white-labelled \u2014 colours, title, greeting, and theme match any brand.')
add_bullet('No dependencies \u2014 works on any website, any tech stack, any framework.')
add_bullet('Visual palette designer with presets and a one-click embed snippet.')

add_para('Competing live chat solutions (Intercom, Drift, Zendesk Chat) charge $39\u2013$99/month per seat. Chatr offers the same core functionality with full ownership and zero recurring cost.', size=10, italic=True, color=GREY, after=8)

add_img('11-widget-intro', 'Widget greeting with name and message fields')
add_img('11b-widget-form-filled', 'Visitor fills in their question')
add_img('11c-widget-chat', 'Message delivered instantly to the agent')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# AI
# ══════════════════════════════════════════════════════════════════════════════
add_heading('AI-Powered Intelligence')
add_mixed('Luna \u2014 Built-in AI Assistant.', 'Powered by OpenAI GPT-4o-mini, Luna holds real conversations, answers questions, and assists users directly from the chat list. No separate app, no context switching.')
add_mixed('Automatic Summaries.', 'When conversations grow long, the system generates concise AI summaries so users can catch up in seconds instead of scrolling through hundreds of messages.')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# SECURITY
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Security & Privacy')
add_para('Enterprise-grade identity verification and granular privacy controls:')
add_bullet('Email verification and phone verification via one-time codes.')
add_bullet('Optional two-factor authentication (QR code, any authenticator app).')
add_bullet('Login verification code on every sign-in attempt.')
add_bullet('Granular privacy \u2014 hide online status, phone, email, name, gender, or join date.')
add_bullet('Full blocking \u2014 blocked users cannot find, message, or view your profile.')
add_bullet('Rate limiting on all sensitive endpoints.')

add_img('02-login', 'Secure login with verification')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# MOBILE + THEMES
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Mobile-First, Beautifully Themed')
add_para('Every screenshot in this document was captured at mobile resolution. Chatr is designed for phones first \u2014 bottom navigation, touch controls, swipe gestures, iOS safe-area support \u2014 and scales seamlessly to desktop. Dark and light themes switch instantly with one tap.')
add_img('18-dark-theme', 'Dark theme')
add_img('19-light-theme', 'Light theme')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# SETTINGS + PROFILE
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Profile & Personalisation')
add_para('Profile image with crop tool, cover photos, display names, privacy toggles, ghost typing, and dark mode \u2014 users own their identity.')
add_img('07-settings', 'Settings')
add_img('08-profile', 'User profile')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# TECHNICAL — REASONS TO ADOPT
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Technical Architecture')
add_para('Chatr is built on the same technology stack trusted by Netflix, Slack, Shopify, and Uber. Every component was chosen for production reliability, developer familiarity, and horizontal scalability.')

add_heading('The Stack', level=2)
add_mixed('Frontend:', 'Next.js 16, React 19, TypeScript, Socket.IO, IndexedDB offline caching, Framer Motion.')
add_mixed('Backend:', 'Node.js, Express, TypeScript, Socket.IO with Redis adapter for multi-instance events.')
add_mixed('Database:', 'PostgreSQL 16 via Prisma ORM \u2014 9 models covering users, messages, groups, friendships, reactions, edits.')
add_mixed('Caching & Pub/Sub:', 'Redis 7 for presence, rate limiting, token blacklisting, and cross-instance broadcasting.')
add_mixed('AI:', 'OpenAI GPT-4o-mini for the chatbot and automatic conversation summaries.')
add_mixed('Storage:', 'AWS S3 with server-side image processing (Sharp) generating multiple resolution variants.')
add_mixed('Deployment:', 'AWS EC2 (PM2 cluster mode), RDS, ElastiCache, S3, Nginx reverse proxy.')

add_heading('Why This Stack Matters', level=2)
add_bullet('Any JavaScript/TypeScript developer can contribute immediately \u2014 zero ramp-up time.')
add_bullet('Cluster mode + Redis pub/sub = horizontal scaling without code changes. Add servers, not complexity.')
add_bullet('PostgreSQL + Prisma = type-safe database access with automatic migrations.')
add_bullet('70+ REST endpoints and 40+ WebSocket event types, fully documented via Swagger UI.')
add_bullet('Docker Compose for one-command local development. Production mirrors the dev environment exactly.')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# QUALITY
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Quality Assurance')
add_para('Chatr has the test coverage of a funded engineering team. Over 1,300 automated tests ensure every feature works, every edge case is handled, and every deployment is safe.')

add_stat_row([
    ('1,300+', 'Total Tests'),
    ('855', 'Frontend'),
    ('305', 'Backend'),
    ('156', 'End-to-End'),
])

add_para('')
add_mixed('Frontend (855 tests):', 'Every component, hook, context, form, dialog, and page. Accessibility (ARIA, keyboard, screen reader) tested in every interactive element.')
add_mixed('Backend (305 tests):', 'Every API endpoint, auth flow, database operation, socket handler, email/SMS service, and AI integration.')
add_mixed('End-to-End (156 tests):', 'Playwright drives real browsers (Desktop Chrome + iPhone 14) through complete user journeys. Two test users interact simultaneously to verify real-time delivery.')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Analytics Dashboard')
add_para('A custom-built project intelligence dashboard providing real-time visibility into code health, development velocity, test coverage, security posture, and architecture inventory. Auto-refreshes every 30 seconds.')

add_img('10-dashboard-top', 'Metric cards, code health gauges, commit intelligence', width=Inches(5.5))

add_bullet('17+ metric cards: commits, LOC, files, tests, endpoints, components, models, dependencies, branches.')
add_bullet('Code health gauges: file size, coverage per area, velocity, largest file.')
add_bullet('Commit intelligence: change types, size distribution, weekly trends, biggest commits.')
add_bullet('Contribution heatmap and activity breakdown by hour and day.')
add_bullet('Security audit: dependency vulnerabilities and build health.')
add_bullet('Live test runner with streaming results, filtering, and re-run failed.')

add_img('09-dashboard-full', 'Full dashboard', width=Inches(5.5))

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# DEVELOPER TOOLS
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Developer Experience')
add_bullet('Built-in documentation with search, diagrams, and code examples.', 'Docs \u2014')
add_bullet('Visual preview of all transactional email templates.', 'Email Preview \u2014')
add_bullet('Interactive demos of every UI component.', 'Component Demos \u2014')
add_bullet('Swagger API browser for endpoint testing.', 'API Docs \u2014')
add_bullet('In-app system log viewer with filtering.', 'Logs \u2014')
add_bullet('Docker Compose for one-command local setup.', 'Containers \u2014')

add_img('12-docs', 'Built-in docs')
add_img('13-email-templates', 'Email template preview')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# BY THE NUMBERS
# ══════════════════════════════════════════════════════════════════════════════
add_heading('By the Numbers')

add_stat_line('Automated tests', '1,300+')
add_stat_line('Lines of code', '69,542')
add_stat_line('Source files', '369')
add_stat_line('REST API endpoints', '70+')
add_stat_line('WebSocket event types', '40+')
add_stat_line('UI components', '176 (60+ custom)')
add_stat_line('Database models', '9')
add_stat_line('Authentication methods', '4 (email, SMS, 2FA, login code)')
add_stat_line('File upload limit', '50 MB')
add_stat_line('Media support', 'Images, video, audio, PDF, documents, archives')
add_stat_line('Frontend test coverage', '99%')
add_stat_line('Backend test coverage', '73%')
add_stat_line('E2E browsers', 'Desktop Chrome + iPhone 14')
add_stat_line('Deployment', 'AWS (EC2, RDS, ElastiCache, S3)')
add_stat_line('Offline support', 'IndexedDB cache + message queue')
add_stat_line('Development time', '22 days')
add_stat_line('Total commits', '219')

add_divider()

# ══════════════════════════════════════════════════════════════════════════════
# REASONS TO ADOPT
# ══════════════════════════════════════════════════════════════════════════════
add_heading('Reasons to Adopt')

add_mixed('It\u2019s a complete product.', 'Not a mockup, not a tutorial project, not a proof of concept. Every feature \u2014 messaging, groups, voice, media, AI, widget, offline sync, analytics \u2014 is fully built, integrated, and tested. It works today.')
add_mixed('It generates revenue.', 'The embeddable widget creates a direct customer support channel for any business. One line of code, zero visitor friction, no recurring SaaS fees. That\u2019s a product with real commercial value.')
add_mixed('It\u2019s tested like enterprise software.', '1,300+ automated tests including end-to-end browser journeys across desktop and mobile. Two test users interacting in real time. Automated cleanup. Result caching. This is the quality bar funded teams aim for.')
add_mixed('It\u2019s built on proven technology.', 'React, Node.js, PostgreSQL, Redis, AWS \u2014 the same stack behind Slack, Shopify, and Netflix. Any developer joins and is productive on day one.')
add_mixed('It scales without rewriting.', 'Cluster mode, Redis pub/sub, S3, Nginx. Growing means adding servers, not changing architecture.')
add_mixed('It demonstrates exceptional engineering range.', 'Frontend, backend, real-time infrastructure, AI, cloud deployment, security, accessibility, automated testing, developer tooling, and a custom analytics dashboard \u2014 all designed, built, and shipped by one person in 22 days.')

# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
doc.save(OUT)
n = len([f for f in os.listdir(SS) if f.endswith('.png')]) if os.path.isdir(SS) else 0
print(f'Created: {os.path.abspath(OUT)}')
print(f'  Screenshots embedded from {SS}')

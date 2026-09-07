#!/usr/bin/env python3
"""Generate the Ludo Arena how-to-use PDF."""

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

INK = HexColor("#070b14")
NAVY = HexColor("#10182b")
PANEL = HexColor("#172038")
LINE = HexColor("#2a3b63")
GOLD = HexColor("#e4c16a")
MIST = HexColor("#d7e0f2")
MUTED = HexColor("#9aabc8")


class Rule(Flowable):
    def __init__(self, width, color=GOLD, thickness=1.2):
        super().__init__()
        self.width = width
        self.height = thickness
        self.color = color
        self.thickness = thickness

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


class SectionHeader(Flowable):
    def __init__(self, number, title):
        super().__init__()
        self.number = number
        self.title = title
        self.height = 20

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return availWidth, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(GOLD)
        c.roundRect(0, 1, 16, 16, 3.5, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(8, 5.5, str(self.number))
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(22, 5, self.title.upper())


def make_styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            "CoverKicker",
            fontName="Helvetica",
            fontSize=9,
            textColor=GOLD,
            alignment=TA_CENTER,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=white,
            alignment=TA_CENTER,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            "CoverSub",
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=MIST,
            alignment=TA_CENTER,
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.2,
            textColor=MIST,
            alignment=TA_LEFT,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            "Step",
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.2,
            textColor=MIST,
            leftIndent=2,
            spaceAfter=2,
        )
    )
    styles.add(
        ParagraphStyle(
            "CardBody",
            fontName="Helvetica",
            fontSize=9,
            leading=12.6,
            textColor=MIST,
        )
    )
    styles.add(
        ParagraphStyle(
            "Tip",
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=12,
            textColor=GOLD,
            spaceAfter=0,
        )
    )
    styles.add(
        ParagraphStyle(
            "SmallGold",
            fontName="Helvetica-Bold",
            fontSize=8,
            textColor=GOLD,
            alignment=TA_CENTER,
        )
    )
    return styles


def draw_page(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(INK)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, height - 5, width, 5, fill=1, stroke=0)
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, width, 16 * mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 16 * mm, width, 1, fill=1, stroke=0)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(16 * mm, 8 * mm, "Ludo Arena  ·  How to use this portal")
    canvas.drawRightString(width - 16 * mm, 8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def p(text, style):
    return Paragraph(text, style)


def steps(items, styles):
    return [p(f"<b>{i}.</b>  {item}", styles["Step"]) for i, item in enumerate(items, 1)]


def card_table(cells, content_w, cols=2):
    table = Table(cells, colWidths=[content_w / cols] * cols)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PANEL),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def build(output: Path):
    styles = make_styles()
    width, height = A4
    margin = 16 * mm
    content_w = width - margin * 2

    doc = BaseDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=12 * mm,
        bottomMargin=20 * mm,
        title="How to use Ludo Arena",
        author="Ludo Arena",
        subject="Simple guide to the Ludo Arena portal",
    )
    frame = Frame(margin, 20 * mm, content_w, height - 32 * mm, id="normal")
    doc.addPageTemplates([PageTemplate(id="body", frames=[frame], onPage=draw_page)])

    story = []

    story.append(p("LUDO ARENA", styles["CoverKicker"]))
    story.append(p("How to use this portal", styles["CoverTitle"]))
    story.append(
        p(
            "A short guide for players and organizers.<br/>"
            "Play Ludo, Snakes &amp; Ladders, or Marriage — online, on one device, or on a projector.",
            styles["CoverSub"],
        )
    )
    story.append(Spacer(1, 5 * mm))
    story.append(Rule(content_w, GOLD, 1.2))
    story.append(Spacer(1, 4 * mm))

    story.append(
        card_table(
            [
                [
                    p(
                        "<b>Online match</b><br/>Sign in, open Invitations, and join the table an admin assigned you.",
                        styles["CardBody"],
                    ),
                    p(
                        "<b>Hot-seat</b><br/>No account needed. Pass one device around, or play one-on-one vs Arena AI.",
                        styles["CardBody"],
                    ),
                    p(
                        "<b>Live broadcast</b><br/>Open the projector page and watch the match the admin is showing.",
                        styles["CardBody"],
                    ),
                ]
            ],
            content_w,
            cols=3,
        )
    )
    story.append(Spacer(1, 5 * mm))

    account = [
        SectionHeader(1, "Create an account"),
        Spacer(1, 2 * mm),
        *steps(
            [
                "Open the portal and click <b>Register</b>.",
                "Enter your <b>Name</b>, <b>Email</b>, <b>Password</b>, and confirm the password.",
                "Click <b>Create account</b>. You land on <b>Match invitations</b>.",
                "Optional: open <b>Profile</b> to change the name other players see on the board.",
            ],
            styles,
        ),
        Spacer(1, 1 * mm),
        p(
            "Already registered? Use <b>Sign in</b>. You can still open <b>Hot-seat</b> or <b>Live broadcast</b> without an account.",
            styles["Tip"],
        ),
    ]
    story.append(KeepTogether(account))
    story.append(Spacer(1, 4.5 * mm))

    join = [
        SectionHeader(2, "Join an online match"),
        Spacer(1, 2 * mm),
        p(
            "Online tables are created by an organizer. You do not create rooms yourself.",
            styles["Body"],
        ),
        *steps(
            [
                "Go to <b>Invitations</b>. When you are seated at a table, a card appears there.",
                "Click <b>Join match</b>. If the game already started, click <b>Rejoin match</b>.",
                "Wait in the room. Joining marks you <b>Ready</b>. The organizer starts when everyone is ready.",
                "A short countdown appears, then play begins when the status is <b>LIVE</b>.",
            ],
            styles,
        ),
        Spacer(1, 1 * mm),
        p(
            "Empty list? “No invitations yet” means an admin has not seated you yet.",
            styles["Tip"],
        ),
    ]
    story.append(KeepTogether(join))
    story.append(Spacer(1, 4.5 * mm))

    play = [
        SectionHeader(3, "How to play at the table"),
        Spacer(1, 2 * mm),
        p(
            "On your turn, the table tells you what to do — usually <b>Roll the dice</b>, then tap a highlighted piece. "
            "If you wait too long, the dice may auto-roll.",
            styles["Body"],
        ),
        card_table(
            [
                [
                    p(
                        "<b>Ludo</b><br/>"
                        "• Roll a <b>6</b> to leave the yard.<br/>"
                        "• Tap a glowing piece to move.<br/>"
                        "• A 6 gives another roll. Three 6s in a row skip your turn.<br/>"
                        "• Landing on an opponent (not a safe square) sends them home — and you roll again.<br/>"
                        "• Exact roll to finish. First to get all 4 pieces home wins.",
                        styles["CardBody"],
                    ),
                    p(
                        "<b>Snakes &amp; Ladders</b><br/>"
                        "• Start at <b>GO</b>. Roll a <b>6</b> to enter the board.<br/>"
                        "• Race to square <b>100</b> (exact roll required).<br/>"
                        "• Ladders climb up. Snakes slide you down.<br/>"
                        "• Landing on someone sends them back to 1.<br/>"
                        "• A 6 often means another roll. Toggle <b>3D view</b> / <b>2D view</b> if you like.",
                        styles["CardBody"],
                    ),
                ]
            ],
            content_w,
        ),
        Spacer(1, 2 * mm),
        p(
            "<b>Marriage</b> (online tournaments only): draw from <b>Stock</b> or <b>Discard</b>, arrange melds, then "
            "<b>Discard</b> to end your turn. Use <b>Open</b> when you have three valid Maal sequences. "
            "When you can finish, click <b>Show &amp; win</b>. Dublee wins are off.",
            styles["Body"],
        ),
    ]
    story.append(KeepTogether(play))
    story.append(Spacer(1, 4.5 * mm))

    hotseat = [
        SectionHeader(4, "Hot-seat (one device, no login)"),
        Spacer(1, 2 * mm),
        *steps(
            [
                "Click <b>Hot-seat</b> in the header.",
                "Choose <b>Pass and play</b> (share one device) or <b>Play vs AI</b> (you vs Arena AI).",
                "Pick <b>Ludo</b> or <b>Snakes &amp; Ladders</b>. For Snakes, choose Classic, Easy, Hard, Custom, or Create your own.",
                "Set player count, names, and colors, then click <b>Start match</b>.",
            ],
            styles,
        ),
        Spacer(1, 1 * mm),
        p(
            "During play you can <b>Change setup</b> or <b>Restart</b>. Use <b>Lobby</b> (signed in) or <b>Sign in</b> to leave.",
            styles["Tip"],
        ),
    ]
    story.append(KeepTogether(hotseat))
    story.append(Spacer(1, 4.5 * mm))

    broadcast = [
        SectionHeader(5, "Watch the live broadcast"),
        Spacer(1, 2 * mm),
        *steps(
            [
                "Click <b>Live broadcast</b> (or <b>Broadcast</b> if you are an admin).",
                "If you see <b>Standing by</b>, no match is on the projector yet.",
                "When an admin clicks <b>Broadcast</b> on a live table, this page shows that game full-screen. It is view-only.",
            ],
            styles,
        ),
    ]
    story.append(KeepTogether(broadcast))
    story.append(Spacer(1, 4.5 * mm))

    admin = [
        SectionHeader(6, "For organizers (admin)"),
        Spacer(1, 2 * mm),
        p(
            "Admins see <b>Dashboard</b>, <b>Users</b>, and <b>Tournaments</b> in the header.",
            styles["Body"],
        ),
        card_table(
            [
                [
                    p(
                        "<b>Users</b><br/>"
                        "Create a player or admin with Name, Email, Password. "
                        "Or <b>Download template</b> and upload Excel to create many accounts at once.",
                        styles["CardBody"],
                    ),
                    p(
                        "<b>Tournaments</b><br/>"
                        "Create a tournament (Ludo, Snakes &amp; Ladders, or Marriage). "
                        "Add participants, then seat them with <b>Invite to a group</b> or <b>Split everyone into groups</b>.",
                        styles["CardBody"],
                    ),
                ],
                [
                    p(
                        "<b>Start a table</b><br/>"
                        "Players must join first (they become Ready). Then click <b>Ready</b> if needed and <b>Start</b>. "
                        "You can also Pause, Resume, Restart, Cancel, or Delete.",
                        styles["CardBody"],
                    ),
                    p(
                        "<b>Broadcast &amp; boards</b><br/>"
                        "On the dashboard or spectator page, click <b>Broadcast</b> to send a match to the projector. "
                        "Use <b>Custom boards</b> to save Snakes &amp; Ladders layouts.",
                        styles["CardBody"],
                    ),
                ],
            ],
            content_w,
        ),
    ]
    story.append(KeepTogether(admin))
    story.append(Spacer(1, 4.5 * mm))

    nav_rows = [
        [
            p("<b>You are…</b>", styles["SmallGold"]),
            p("<b>Menu you will see</b>", styles["SmallGold"]),
        ],
        [
            p("Guest", styles["CardBody"]),
            p("Hot-seat  ·  Live broadcast  ·  Sign in  ·  Register", styles["CardBody"]),
        ],
        [
            p("Player", styles["CardBody"]),
            p("Invitations  ·  Live broadcast  ·  Hot-seat  ·  Profile  ·  Sign out", styles["CardBody"]),
        ],
        [
            p("Admin", styles["CardBody"]),
            p("Dashboard  ·  Users  ·  Tournaments  ·  Broadcast  ·  Hot-seat  ·  Sign out", styles["CardBody"]),
        ],
    ]
    nav_table = Table(nav_rows, colWidths=[28 * mm, content_w - 28 * mm])
    nav_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PANEL),
                ("BACKGROUND", (0, 1), (-1, -1), NAVY),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    reference = [
        SectionHeader(7, "Quick reference"),
        Spacer(1, 2 * mm),
        nav_table,
        Spacer(1, 2.5 * mm),
        p(
            "Match statuses you may see: <b>WAITING</b> · <b>READY</b> · <b>LIVE</b> · <b>PAUSED</b> · <b>COMPLETED</b> · <b>CANCELLED</b>.",
            styles["Body"],
        ),
        Rule(content_w, GOLD, 1),
        Spacer(1, 2 * mm),
        p(
            "That is the whole portal: register, wait for an invite, join, roll, and play — "
            "or skip the account and open Hot-seat or the live broadcast.",
            styles["CoverSub"],
        ),
    ]
    story.append(KeepTogether(reference))

    doc.build(story)
    print(f"Wrote {output}")


if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "How-to-use-Ludo-Arena.pdf"
    build(out)

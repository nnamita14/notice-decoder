
import { useState } from "react";
import "./App.css";

function extractEvents(text) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const content = text.trim();

  if (!content) return [];

  const dateMatch = content.match(
    /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/
  );

  const isoMatch = content.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);

  const namedDate = content.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i
  );

  let date = "";

  if (isoMatch) {
    date = isoMatch[0];
  } else if (dateMatch) {
    const [, d, m, y] = dateMatch;
    date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  } else if (namedDate) {
    const month = new Date(
      `${namedDate[2]} 1, ${namedDate[3]}`
    ).getMonth() + 1;

    date = `${namedDate[3]}-${String(month).padStart(2, "0")}-${namedDate[1].padStart(2, "0")}`;
  }

  const timeMatch = content.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i
  );

  let time = "";

  if (timeMatch) {
    let hour = Number(timeMatch[1]);
    const minutes = timeMatch[2] || "00";
    const period = timeMatch[3].toUpperCase();

    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    time = `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  const venueMatch = content.match(
    /\b(?:venue|location|at|room)\s*[:\-]?\s*([^\n,.]+)/i
  );

  const deadlineMatch = content.match(
    /\b(?:deadline|last date|due date|submit by)\s*[:\-]?\s*([^\n,.]+)/i
  );

  const titleLine = lines.find(
    (line) =>
      !/\b(date|time|venue|location|deadline|last date|due date|submit by)\s*:/i.test(line)
  );

  return [{
    id: Date.now(),
    title: (titleLine || "New College Event").replace(/^#+\s*/, ""),
    date,
    time,
    venue: venueMatch ? venueMatch[1].trim() : "",
    deadline: deadlineMatch ? deadlineMatch[1].trim() : "",
  }];
}

function downloadCalendar(event) {
  if (!event.date) {
    alert("Please add a valid event date first.");
    return;
  }

  const date = event.date.replaceAll("-", "");
  const time = event.time
    ? event.time.replace(":", "") + "00"
    : "090000";

  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Notice Decoder//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@notice-decoder`,
    `DTSTART:${date}T${time}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.venue || "Not specified"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "notice-event.ics";
  link.click();

  URL.revokeObjectURL(url);
}

function hasConflict(event, events) {
  if (!event.date || !event.time) return false;

  return events.some((other) => {
    if (other.id === event.id || other.date !== event.date || !other.time) {
      return false;
    }

    return Math.abs(
      Number(event.time.replace(":", "")) -
      Number(other.time.replace(":", ""))
    ) < 100;
  });
}

export default function App() {
  const [notice, setNotice] = useState("");
  const [events, setEvents] = useState([]);
  const [message, setMessage] = useState("");

  function handleExtract() {
    const extracted = extractEvents(notice);

    if (!extracted.length) {
      setMessage("Please paste a college notice first.");
      return;
    }

    setEvents((previous) => [...previous, ...extracted]);
    setMessage("Notice processed. Please verify the extracted details.");
    setNotice("");
  }

  function updateEvent(id, field, value) {
    setEvents((previous) =>
      previous.map((event) =>
        event.id === id ? { ...event, [field]: value } : event
      )
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">N</span>
          <span>Notice<span className="brand-light">Decoder</span></span>
        </div>

        <p className="side-label">WORKSPACE</p>
        <a className="nav-link active" href="#dashboard">▦ Dashboard</a>
        <a className="nav-link" href="#input">▤ Add Notice</a>
        <a className="nav-link" href="#events">◷ My Events</a>

        <div className="sidebar-bottom">
          <div className="profile-icon">ND</div>
          <div>
            <strong>Student Workspace</strong>
            <p>Stay on top of deadlines</p>
          </div>
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="topbar">
          <span>Workspace / Dashboard</span>
          <span className="status-pill">● Prototype</span>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">YOUR COLLEGE, ORGANIZED</p>
            <h1>Never miss an important notice.</h1>
            <p className="subtitle">
              Turn college announcements into organized events and deadlines.
            </p>
          </div>
          <div className="welcome-art">✦</div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Total events</span>
            <strong>{events.length}</strong>
            <small>Events extracted and added</small>
          </div>
          <div className="stat-card">
            <span>Schedule conflicts</span>
            <strong>{events.filter((event) => hasConflict(event, events)).length}</strong>
            <small>Events with possible overlaps</small>
          </div>
          <div className="stat-card">
            <span>Needs review</span>
            <strong>{events.filter((event) => !event.date || !event.time).length}</strong>
            <small>Check missing date or time</small>
          </div>
        </section>

        <section className="panel" id="input">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STEP 01</p>
              <h2>Decode a notice</h2>
              <p>Paste a college announcement to identify its key details.</p>
            </div>
            <span className="panel-icon">↗</span>
          </div>

          <textarea
            value={notice}
            onChange={(event) => setNotice(event.target.value)}
            placeholder={"Example:\nPython Workshop\nDate: 20/10/2026\nTime: 10 AM\nVenue: Lab 2\nRegistration deadline: 19 October"}
          />

          <div className="input-footer">
            <span>Text input · Verify extracted information</span>
            <button className="primary-button" onClick={handleExtract}>
              Extract details <span>→</span>
            </button>
          </div>

          {message && <p className="message">{message}</p>}
        </section>

        <section className="events-section" id="events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">STEP 02</p>
              <h2>Extracted events</h2>
              <p>Review or edit details before exporting to your calendar.</p>
            </div>
            <span className="event-count">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No events yet</h3>
              <p>Paste a notice above and select Extract details to begin.</p>
            </div>
          ) : (
            <div className="event-list">
              {events.map((event) => (
                <article className="event-card" key={event.id}>
                  <div className="event-symbol">▣</div>

                  <div className="event-fields">
                    <label>
                      Event name
                      <input
                        value={event.title}
                        onChange={(e) => updateEvent(event.id, "title", e.target.value)}
                      />
                    </label>

                    <div className="field-grid">
                      <label>
                        Date
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => updateEvent(event.id, "date", e.target.value)}
                        />
                      </label>
                      <label>
                        Time
                        <input
                          type="time"
                          value={event.time}
                          onChange={(e) => updateEvent(event.id, "time", e.target.value)}
                        />
                      </label>
                      <label>
                        Venue
                        <input
                          value={event.venue}
                          placeholder="Add venue"
                          onChange={(e) => updateEvent(event.id, "venue", e.target.value)}
                        />
                      </label>
                      <label>
                        Deadline
                        <input
                          value={event.deadline}
                          placeholder="Add deadline"
                          onChange={(e) => updateEvent(event.id, "deadline", e.target.value)}
                        />
                      </label>
                    </div>

                    {hasConflict(event, events) && (
                      <p className="warning">⚠ Possible schedule conflict. Review event times.</p>
                    )}

                    <button className="secondary-button" onClick={() => downloadCalendar(event)}>
                      ↓ Export calendar (.ics)
                    </button>
                  </div>

                  <button
                    className="delete-button"
                    aria-label="Delete event"
                    onClick={() => setEvents((previous) => previous.filter((item) => item.id !== event.id))}
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer>Notice Decoder · A smarter way to manage college notices.</footer>
      </main>
    </div>
  );
}

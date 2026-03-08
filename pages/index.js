import { useState, useRef, useEffect } from "react";

const INSTRUCTOR_BIO = `The instructor is Dave Cook, a technology leader with over 30 years of experience in data, advanced analytics, and artificial intelligence. He currently supports AI/ML programs across the U.S. Intelligence Community and the Department of Defense and teaches AI at the University of Maryland and Wake Forest University. He is the Chief Innovation Officer for Cornerstone Defense and co-founded the Training Data Project (TDP) in 2023 to advance AI Value Science, a discipline focused on quantifying and measuring the impact and ROI of AI in government and commercial programs. A 19-time Marine Corps Marathon finisher, he views AI as a marathon, not a sprint. Dave serves on DC Mayor Muriel Bowser's AI Advisory Group and holds degrees from Northwestern University, Carnegie Mellon University, and the University of Maryland. He has published multiple refereed papers on AI and is a contributing author to the Amazon #1 bestseller "AI: Work Smarter and Live Better."`;

const DEFAULT_QUESTION = `Welcome to AIN 714! Please introduce yourself and share your thoughts on the following:

(1) What are your top two goals for this course?
(2) Why are you interested in AI Strategy and Innovation?
(3) What is the most interesting recent application of AI you have seen in your field or industry?

There are no wrong answers. I am interested in what and how you think.`;

function buildSystemPrompt(sentenceCount, discussionQuestion) {
  const isFour = sentenceCount === 4;
  const questionPos = isFour ? "THIRD" : "FOURTH";
  const closePos = isFour ? "FOURTH" : "FIFTH";
  const countWord = isFour ? "FOUR" : "FIVE";
  const countLower = isFour ? "four" : "five";

  return `You are Dave Cook, an adjunct professor teaching AIN 714: AI Strategy and Innovation in the Master of Science in AI Program at Wake Forest University's Graduate School of Professional Studies.

About you:
${INSTRUCTOR_BIO}

Your voice is casual, direct, warm, and real, not stiff or academic. You sound like a sharp, experienced mentor who genuinely enjoys their students and brings real-world practitioner credibility to every interaction. You are conversational, encouraging, occasionally playful, and always specific. You use plain language and keep it tight.

The discussion question you asked the class was:
---
${discussionQuestion}
---

When given a student's name and their discussion post, generate a response with EXACTLY these rules:
1. Exactly ${countWord} sentences. No more, no fewer.
2. The FIRST sentence must open by directly addressing the student with a warm casual reaction. Examples: "Hey Lakita, really strong intro here." or "Nice work Marcus, lots to dig into." or "Good stuff here, Jamie." Never summarize or repeat their content in the first sentence. Never start with their goals or what they said.
3. Each sentence must be no more than 15 words.
4. The ${questionPos} sentence must be a genuine curious question sparked by something specific they wrote.
5. The ${closePos} sentence must close warmly, commending the student for a thoughtful response.
6. Use casual openers, contractions, and plain English. No formal or flowery language.
7. Never use em dashes anywhere. Use commas, periods, or conjunctions instead.
8. Use the student's first name EXACTLY ONCE, in the first sentence only.
9. Never summarize or repeat the student's content. React to it, build on it, or push it further.
10. You are always the instructor responding to the student. Never write from the student's perspective.
11. Engage with something specific and interesting from what they wrote, no generic praise.
12. Where it fits naturally, briefly connect their idea to real-world AI practice or strategy.

Return ONLY the ${countLower} sentences, no preamble, no labels, no extra text.`;
}

function buildSummaryPrompt(discussionQuestion) {
  return `You are Dave Cook, an adjunct professor teaching AIN 714: AI Strategy and Innovation at Wake Forest University.

About you:
${INSTRUCTOR_BIO}

You have collected discussion post responses from your graduate students. The discussion question was:
---
${discussionQuestion}
---

Analyze all the student responses and write a warm, engaging class summary that:
1. Highlights the most common themes and goals across students
2. Notes interesting patterns in how students approached the question
3. Calls out 2-3 of the most compelling or creative ideas students mentioned
4. Where natural, connects student observations to real-world AI strategy and practice
5. Ends with an encouraging note about the class as a whole

Write in a casual, direct, mentor tone. Plain English, no jargon, no bullet points. Flowing paragraphs. Under 200 words. This will be shared back with the students.`;
}

export default function WFUResponder() {
  const [discussionQuestion, setDiscussionQuestion] = useState(DEFAULT_QUESTION);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [name, setName] = useState("");
  const [answer, setAnswer] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [view, setView] = useState("responder");
  const responseRef = useRef(null);

  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response]);

  async function callClaude(system, userMessage) {
    const res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, userMessage })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text || "";
  }

  async function generateResponse() {
    if (!name.trim() || !answer.trim()) return;
    setLoading(true);
    setResponse("");
    setError("");
    setCopied(false);
    const sentenceCount = Math.random() < 0.5 ? 4 : 5;
    try {
      const text = await callClaude(
        buildSystemPrompt(sentenceCount, discussionQuestion),
        `Student name: ${name}\n\nStudent's answer:\n${answer}`
      );
      const parts = text.split("---");
      setResponse(parts[parts.length - 1].trim());
      setSubmissions(prev => [...prev, { name: name.trim(), answer: answer.trim() }]);
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
    setLoading(false);
  }

  async function generateSummary() {
    if (submissions.length < 2) return;
    setSummaryLoading(true);
    setSummary("");
    const allResponses = submissions.map((s, i) =>
      `Student ${i + 1} (${s.name}):\n${s.answer}`
    ).join("\n\n---\n\n");
    try {
      const text = await callClaude(
        buildSummaryPrompt(discussionQuestion),
        `Here are the student responses:\n\n${allResponses}`
      );
      setSummary(text.trim());
      setView("summary");
    } catch (e) {
      setSummary(`Error: ${e.message}`);
    }
    setSummaryLoading(false);
  }

  function copyResponse() {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copySummary() {
    navigator.clipboard.writeText(summary);
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 2000);
  }

  function handleNewDiscussion() {
    setDiscussionQuestion("");
    setSubmissions([]);
    setSummary("");
    setResponse("");
    setError("");
    setName("");
    setAnswer("");
    setEditingQuestion(true);
    setView("responder");
  }

  const gold = "#CFB53B";
  const goldFaint = "rgba(207,181,59,0.15)";
  const goldBorder = "rgba(207,181,59,0.4)";
  const black = "#1a1a1a";
  const darkBg = "#111111";
  const cardBg = "#1e1e1e";

  const labelStyle = {
    display: "block",
    color: gold,
    fontSize: "11px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    marginBottom: "8px",
    fontWeight: "600"
  };

  const inputStyle = {
    width: "100%",
    background: "#2a2a2a",
    border: `1.5px solid rgba(207,181,59,0.3)`,
    borderRadius: "6px",
    padding: "12px 16px",
    color: "#f0f0f0",
    fontSize: "15px",
    fontFamily: "Georgia, serif",
    outline: "none",
    boxSizing: "border-box",
    lineHeight: "1.6"
  };

  const btnBase = {
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    letterSpacing: "2px",
    textTransform: "uppercase",
    fontFamily: "Georgia, serif",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s"
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: darkBg,
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "48px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{ textAlign: "center", marginBottom: "28px", maxWidth: "660px" }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: gold, textTransform: "uppercase", marginBottom: "10px", fontWeight: "600" }}>
          Wake Forest University · Graduate School of Professional Studies
        </div>
        <h1 style={{ fontSize: "clamp(20px, 4vw, 32px)", color: "#f5f5f5", fontWeight: "700", margin: "0 0 8px", lineHeight: "1.2" }}>
          AIN 714: AI Strategy & Innovation
        </h1>
        <p style={{ color: "#888", fontSize: "14px", margin: "0 0 4px", fontStyle: "italic" }}>
          Discussion Response Tool
        </p>
        <p style={{ color: "#666", fontSize: "13px", margin: 0 }}>
          Instructor: Dave Cook
        </p>
        <div style={{ width: "60px", height: "3px", background: gold, margin: "16px auto 0" }} />
      </div>

      <div style={{
        background: cardBg, border: `1.5px solid ${goldBorder}`,
        borderRadius: "12px", padding: "24px 28px", width: "100%",
        maxWidth: "660px", boxSizing: "border-box", marginBottom: "20px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={labelStyle}>Discussion Question</div>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              [editingQuestion ? "Done" : "Edit", () => setEditingQuestion(!editingQuestion)],
              ["New Discussion", handleNewDiscussion]
            ].map(([label, fn]) => (
              <button key={label} onClick={fn} style={{
                background: "transparent", border: `1.5px solid ${goldBorder}`,
                borderRadius: "4px", padding: "5px 12px", color: gold,
                fontSize: "10px", letterSpacing: "1.5px", textTransform: "uppercase",
                fontFamily: "Georgia, serif", cursor: "pointer", fontWeight: "600"
              }}>{label}</button>
            ))}
          </div>
        </div>
        {editingQuestion ? (
          <textarea
            value={discussionQuestion}
            onChange={e => setDiscussionQuestion(e.target.value)}
            rows={6}
            placeholder="Paste your discussion question here..."
            style={{ ...inputStyle, resize: "vertical" }}
          />
        ) : (
          <p style={{
            color: "#bbb", fontSize: "14px", lineHeight: "1.7", margin: 0,
            whiteSpace: "pre-wrap", fontStyle: "italic", maxHeight: "120px",
            overflow: "hidden",
            WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)"
          }}>
            {discussionQuestion || "No question set. Click Edit to add one."}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", width: "100%", maxWidth: "660px" }}>
        {["responder", "summary"].map(tab => (
          <button key={tab} onClick={() => setView(tab)} style={{
            ...btnBase,
            flex: 1, padding: "11px",
            background: view === tab ? gold : cardBg,
            border: `1.5px solid ${view === tab ? gold : goldBorder}`,
            color: view === tab ? black : "#888",
          }}>
            {tab === "responder" ? "Respond to Student" : `Class Summary${submissions.length > 0 ? ` (${submissions.length})` : ""}`}
          </button>
        ))}
      </div>

      {view === "responder" && (
        <>
          <div style={{
            background: cardBg, border: `1.5px solid rgba(207,181,59,0.2)`,
            borderRadius: "12px", padding: "36px", width: "100%", maxWidth: "660px",
            boxSizing: "border-box"
          }}>
            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Student Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First and last name"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: "28px" }}>
              <label style={labelStyle}>Student's Response</label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                placeholder="Paste the student's discussion post here..."
                rows={7}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <button
              onClick={generateResponse}
              disabled={loading || !name.trim() || !answer.trim() || !discussionQuestion.trim()}
              style={{
                ...btnBase,
                width: "100%", padding: "14px",
                background: loading || !name.trim() || !answer.trim() || !discussionQuestion.trim() ? "#333" : gold,
                color: loading || !name.trim() || !answer.trim() || !discussionQuestion.trim() ? "#666" : black,
                cursor: loading || !name.trim() || !answer.trim() || !discussionQuestion.trim() ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Generating Response..." : "Generate Response"}
            </button>
          </div>

          {error && (
            <div style={{
              marginTop: "20px", background: "rgba(207,181,59,0.08)",
              border: `1.5px solid ${goldBorder}`, borderRadius: "8px",
              padding: "16px 20px", width: "100%", maxWidth: "660px",
              boxSizing: "border-box", color: gold, fontSize: "14px"
            }}>
              {error}
            </div>
          )}

          {response && (
            <div ref={responseRef} style={{
              marginTop: "28px", background: cardBg,
              border: `2px solid ${gold}`,
              borderRadius: "12px", padding: "32px 36px", width: "100%", maxWidth: "660px",
              boxSizing: "border-box", boxShadow: `0 4px 24px rgba(207,181,59,0.12)`
            }}>
              <div style={{ ...labelStyle, marginBottom: "16px" }}>Suggested Response</div>
              <p style={{ color: "#e8e8e8", fontSize: "17px", lineHeight: "1.85", margin: "0 0 24px", fontStyle: "italic" }}>
                {response}
              </p>
              <button onClick={copyResponse} style={{
                ...btnBase,
                background: copied ? gold : "transparent",
                border: `1.5px solid ${goldBorder}`,
                padding: "8px 18px",
                color: copied ? black : gold,
                fontSize: "11px"
              }}>
                {copied ? "Copied" : "Copy to Clipboard"}
              </button>
            </div>
          )}
        </>
      )}

      {view === "summary" && (
        <div style={{
          background: cardBg, border: `1.5px solid rgba(207,181,59,0.2)`,
          borderRadius: "12px", padding: "36px", width: "100%", maxWidth: "660px",
          boxSizing: "border-box"
        }}>
          {submissions.length < 2 ? (
            <p style={{ color: "#666", fontStyle: "italic", textAlign: "center", margin: 0 }}>
              {submissions.length === 0
                ? "No responses logged yet. Generate at least two replies to enable the class summary."
                : "One response logged. Add at least one more to generate a summary."}
            </p>
          ) : (
            <>
              <div style={{ marginBottom: "20px" }}>
                <div style={labelStyle}>Responses Logged</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {submissions.map((s, i) => (
                    <span key={i} style={{
                      background: goldFaint, border: `1px solid ${goldBorder}`,
                      borderRadius: "20px", padding: "4px 14px", color: gold,
                      fontSize: "13px", fontWeight: "600"
                    }}>{s.name}</span>
                  ))}
                </div>
              </div>
              <button onClick={generateSummary} disabled={summaryLoading} style={{
                ...btnBase,
                width: "100%", padding: "14px",
                background: summaryLoading ? "#333" : gold,
                color: summaryLoading ? "#666" : black,
                cursor: summaryLoading ? "not-allowed" : "pointer",
                marginBottom: summary ? "28px" : "0"
              }}>
                {summaryLoading ? "Generating Summary..." : "Generate Class Summary"}
              </button>
              {summary && (
                <>
                  <div style={{ ...labelStyle, marginTop: "8px" }}>Class Highlights</div>
                  <p style={{ color: "#e8e8e8", fontSize: "16px", lineHeight: "1.9", margin: "0 0 24px" }}>
                    {summary}
                  </p>
                  <button onClick={copySummary} style={{
                    ...btnBase,
                    background: summaryCopied ? gold : "transparent",
                    border: `1.5px solid ${goldBorder}`,
                    padding: "8px 18px",
                    color: summaryCopied ? black : gold,
                    fontSize: "11px"
                  }}>
                    {summaryCopied ? "Copied" : "Copy to Clipboard"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; }
        ::placeholder { color: #555; }
        button:not(:disabled):hover { opacity: 0.88; }
      `}</style>
    </div>
  );
}
